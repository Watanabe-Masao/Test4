import { useState, useCallback, useMemo, memo } from 'react'
import styled from 'styled-components'
import { palette } from '@/presentation/theme/tokens'
import {
  formatPercent,
  formatCurrency,
  safeDivide,
  getEffectiveGrossProfitRate,
  formatPointDiff,
} from '@/domain/calculations/utils'
import type { MetricId, StoreResult, CustomCategory, ConditionMetricId } from '@/domain/models'
import { DISCOUNT_TYPES } from '@/domain/models'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import {
  resolveThresholds,
  evaluateSignal,
  isMetricEnabled,
} from '@/domain/calculations/conditionResolver'
import { CONDITION_METRIC_DEFS, CONDITION_METRIC_MAP } from '@/domain/constants/conditionMetrics'
import type { PresetCategoryId } from '@/domain/constants/customCategories'
import {
  UNCATEGORIZED_CATEGORY_ID,
  PRESET_CATEGORY_DEFS,
  isUserCategory,
} from '@/domain/constants/customCategories'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '@/domain/constants/categories'
import { useSettingsStore } from '@/application/stores/settingsStore'
import type { WidgetContext } from './types'
import { ConditionMatrixTable } from './ConditionMatrixTable'

// ─── Styled Components ──────────────────────────────────

const Wrapper = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const Title = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`

const SettingsChip = styled.button`
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) => theme.colors.bg3};
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

const SettingsPanel = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const SettingsSectionTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  &:not(:first-child) {
    margin-top: ${({ theme }) => theme.spacing[3]};
  }
`

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
`

const SettingsField = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

const SettingsLabel = styled.label`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text3};
  white-space: nowrap;
  min-width: 40px;
`

const SettingsInput = styled.input`
  width: 60px;
  font-size: 11px;
  padding: 2px 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  &:focus {
    outline: 1px solid ${({ theme }) => theme.colors.palette.primary};
  }
`

const SettingsUnit = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text4};
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`

const Card = styled.div<{ $borderColor: string; $clickable?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[5]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid ${({ $borderColor }) => $borderColor};
  border-radius: ${({ theme }) => theme.radii.md};
  position: relative;
  ${({ $clickable }) =>
    $clickable &&
    `
    cursor: pointer;
    transition: box-shadow 0.15s, transform 0.15s;
    &:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.10);
      transform: translateY(-1px);
    }
  `}
`

const Signal = styled.div<{ $color: string }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 8px ${({ $color }) => `${$color}60`};
  flex-shrink: 0;
  margin-top: 2px;
`

const CardContent = styled.div`
  flex: 1;
  min-width: 0;
`

const CardLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const CardValue = styled.div<{ $color: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color }) => $color};
`

const CardSub = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

const ChipRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  position: absolute;
  top: ${({ theme }) => theme.spacing[2]};
  right: ${({ theme }) => theme.spacing[2]};
`

const EvidenceChip = styled.button`
  all: unset;
  cursor: pointer;
  font-size: 9px;
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'};
  color: ${({ theme }) => theme.colors.text4};
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.palette.primary};
    color: ${({ theme }) => theme.colors.palette.white};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

// ─── Overlay & Detail Panel ─────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
`

const DetailPanel = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
  min-width: 400px;
  max-width: 720px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`

const DetailHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const DetailTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

const ToggleGroup = styled.div`
  display: inline-flex;
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
`

const ToggleBtn = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text3)};
  transition: all 0.15s;
  &:hover {
    background: ${({ $active, theme }) =>
      $active ? theme.colors.palette.primary : theme.colors.bg4};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

const BTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

const BTh = styled.th`
  text-align: right;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  &:first-child {
    text-align: left;
  }
`

const BTd = styled.td<{ $color?: string; $bold?: boolean }>`
  text-align: right;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  ${({ $bold }) => $bold && 'font-weight: 700;'}
  &:first-child {
    text-align: left;
    font-family: inherit;
  }
`

const BTr = styled.tr<{ $highlight?: boolean }>`
  ${({ $highlight }) =>
    $highlight &&
    `
    font-weight: 700;
    border-top-width: 2px;
  `}
`

const BSignalDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: ${({ theme }) => theme.spacing[2]};
`

const ExpandIcon = styled.span<{ $expanded: boolean }>`
  display: inline-block;
  font-size: 10px;
  margin-right: 4px;
  transition: transform 0.15s;
  transform: rotate(${({ $expanded }) => ($expanded ? '90deg' : '0deg')});
`

const CategoryDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: 4px;
`

const StoreSelect = styled.select`
  width: 100%;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  &:focus {
    outline: 1px solid ${({ theme }) => theme.colors.palette.primary};
  }
`

const StoreOverrideNote = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
  border-radius: ${({ theme }) => theme.radii.sm};
`

const MetricSettingRow = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child {
    border-bottom: none;
  }
`

const MetricSettingHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const MetricToggle = styled.input`
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.colors.palette.primary};
`

const SubRow = styled.tr`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
`

const BarCell = styled.div<{ $ratio: number; $color: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  &::after {
    content: '';
    display: inline-block;
    height: 8px;
    width: ${({ $ratio }) => Math.max(2, $ratio * 100)}%;
    max-width: 80px;
    background: ${({ $color }) => $color}40;
    border-radius: 2px;
  }
`

// Simple breakdown (existing pattern)
const BreakdownRow = styled.div<{ $bold?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[2]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  ${({ $bold }) => $bold && 'font-weight: 700;'}
`

const BreakdownLabel = styled.span`
  color: ${({ theme }) => theme.colors.text2};
`

const BreakdownValue = styled.span<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

const BreakdownSignal = styled.span<{ $color: string }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: ${({ theme }) => theme.spacing[2]};
`

const CloseBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.sm};
  margin-top: ${({ theme }) => theme.spacing[4]};
  display: block;
  width: 100%;
  text-align: center;
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

// ─── Signal Logic ───────────────────────────────────────

type SignalLevel = 'blue' | 'yellow' | 'red' | 'warning'

const SIGNAL_COLORS: Record<SignalLevel, string> = {
  blue: palette.positive,
  yellow: palette.caution,
  red: palette.negative,
  warning: palette.dangerDark,
}

/** レジストリベースのシグナル判定ヘルパー */
function metricSignal(
  value: number,
  metricId: ConditionMetricId,
  config: ConditionSummaryConfig,
  storeId?: string,
): SignalLevel {
  const def = CONDITION_METRIC_MAP.get(metricId)
  if (!def) return 'blue'
  const thresholds = resolveThresholds(config, metricId, storeId)
  return evaluateSignal(value, thresholds, def.direction)
}

// ─── Condition Item Types ──────────────────────────────

interface ConditionItem {
  label: string
  value: string
  sub?: string
  signal: SignalLevel
  metricId?: MetricId
  storeValue?: (sr: StoreResult) => { value: string; signal: SignalLevel }
  detailBreakdown?: 'gpRate' | 'discountRate' | 'markupRate'
}

type DisplayMode = 'rate' | 'amount'

// ─── Helper: Compute GP after consumables ──────────────

function computeGpAfterConsumable(sr: StoreResult): number {
  return sr.invMethodGrossProfitRate != null
    ? safeDivide(sr.invMethodGrossProfit! - sr.totalCostInclusion, sr.totalSales, 0)
    : sr.estMethodMarginRate
}

function computeGpBeforeConsumable(sr: StoreResult): number {
  return getEffectiveGrossProfitRate(sr)
}

function computeGpAmount(sr: StoreResult): number {
  return sr.invMethodGrossProfit ?? sr.estMethodMargin
}

function computeGpAfterConsumableAmount(sr: StoreResult): number {
  return computeGpAmount(sr) - sr.totalCostInclusion
}

// ─── Store breakdown extractors (simple) ───────────────

function customersBreakdown(sr: StoreResult): { value: string; signal: SignalLevel } {
  return {
    value: `${sr.totalCustomers.toLocaleString()}人`,
    signal: 'blue',
  }
}

function txValueBreakdown(sr: StoreResult): { value: string; signal: SignalLevel } {
  const tx = safeDivide(sr.totalSales, sr.totalCustomers, 0)
  return {
    value: `${tx.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}円`,
    signal: 'blue',
  }
}

// ─── Cross-Multiplication (相乗積) helpers ────────────

interface CategoryCrossRow {
  readonly label: string
  readonly cost: number
  readonly price: number
  readonly markupRate: number
  readonly priceShare: number
  readonly crossMultiplication: number
  readonly color: string
}

const CROSS_COLORS: Record<string, string> = {
  market: '#f59e0b',
  lfc: '#3b82f6',
  saladClub: '#22c55e',
  processed: '#a855f7',
  directDelivery: '#06b6d4',
  flowers: '#ec4899',
  directProduce: '#84cc16',
  consumables: '#ea580c',
  interStore: '#f43f5e',
  interDepartment: '#8b5cf6',
  other: '#64748b',
}

const CUSTOM_CROSS_COLORS: Record<PresetCategoryId, string> = {
  market_purchase: '#f59e0b',
  lfc: '#3b82f6',
  salad: '#22c55e',
  processed: '#a855f7',
  consumables: '#ea580c',
  direct_delivery: '#06b6d4',
  other: '#64748b',
  uncategorized: '#94a3b8',
}

/**
 * 標準カテゴリ＋カスタムカテゴリの統合相乗積テーブルを構築する。
 * 相乗積は全カテゴリの総合集計として値入率の内訳を表す。
 */
function buildCrossMult(
  sr: StoreResult,
  supplierCategoryMap: Readonly<Partial<Record<string, CustomCategory>>>,
): CategoryCrossRow[] {
  // 1. 標準カテゴリ
  const items: { label: string; cost: number; price: number; color: string }[] = []
  for (const cat of CATEGORY_ORDER) {
    const pair = sr.categoryTotals.get(cat)
    if (!pair || (pair.cost === 0 && pair.price === 0)) continue
    items.push({
      label: CATEGORY_LABELS[cat],
      cost: pair.cost,
      price: pair.price,
      color: CROSS_COLORS[cat] ?? '#64748b',
    })
  }

  // 2. カスタムカテゴリ（supplierTotals を集約）
  const customAgg = new Map<CustomCategory, { cost: number; price: number }>()
  for (const [, st] of sr.supplierTotals) {
    const customCat = supplierCategoryMap[st.supplierCode] ?? UNCATEGORIZED_CATEGORY_ID
    const existing = customAgg.get(customCat) ?? { cost: 0, price: 0 }
    customAgg.set(customCat, {
      cost: existing.cost + st.cost,
      price: existing.price + st.price,
    })
  }
  const userCategoryLabels = useSettingsStore.getState().settings.userCategoryLabels ?? {}
  for (const cc of PRESET_CATEGORY_DEFS) {
    const pair = customAgg.get(cc.id as CustomCategory)
    if (!pair || (pair.cost === 0 && pair.price === 0)) continue
    items.push({
      label: cc.label,
      cost: pair.cost,
      price: pair.price,
      color: CUSTOM_CROSS_COLORS[cc.id] ?? '#64748b',
    })
  }
  // ユーザーカテゴリ
  for (const [id, pair] of customAgg) {
    if (!isUserCategory(id) || (pair.cost === 0 && pair.price === 0)) continue
    items.push({
      label: userCategoryLabels[id] ?? id.replace('user:', ''),
      cost: pair.cost,
      price: pair.price,
      color: '#14b8a6',
    })
  }

  // 3. 全体で構成比・相乗積を計算
  const totalPrice = items.reduce((sum, d) => sum + d.price, 0)
  const totalAbsPrice = items.reduce((sum, d) => sum + Math.abs(d.price), 0)

  return items.map((d) => ({
    label: d.label,
    cost: d.cost,
    price: d.price,
    markupRate: safeDivide(d.price - d.cost, d.price, 0),
    priceShare: safeDivide(Math.abs(d.price), totalAbsPrice, 0),
    crossMultiplication: safeDivide(d.price - d.cost, totalPrice, 0),
    color: d.color,
  }))
}

// ─── Component ──────────────────────────────────────────

export const ConditionSummaryWidget = memo(function ConditionSummaryWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  const r = ctx.result
  const { onExplain, allStoreResults, stores } = ctx
  const settings = useSettingsStore((s) => s.settings)

  const [breakdownItem, setBreakdownItem] = useState<ConditionItem | null>(null)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('rate')
  const [expandedMarkupStore, setExpandedMarkupStore] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  /** 設定パネルで選択中の店舗（'__global__' = 全店共通） */
  const [settingsStoreId, setSettingsStoreId] = useState<string>('__global__')
  const updateSettings = useSettingsStore((s) => s.updateSettings)

  const hasMultipleStores = allStoreResults.size > 1

  // 旧設定との後方互換: gpDiff/discount の旧フィールドを conditionConfig にマッピング
  const effectiveConfig = useMemo<ConditionSummaryConfig>(() => {
    const base = settings.conditionConfig ?? { global: {}, storeOverrides: {} }
    // conditionConfig が空なら旧設定値をマイグレーション
    const hasLegacyGp = base.global.gpRate?.thresholds == null
    const hasLegacyDiscount = base.global.discountRate?.thresholds == null
    if (!hasLegacyGp && !hasLegacyDiscount) return base

    const migrated = { ...base, global: { ...base.global } }
    if (hasLegacyGp) {
      migrated.global = {
        ...migrated.global,
        gpRate: {
          ...migrated.global.gpRate,
          thresholds: {
            blue: settings.gpDiffBlueThreshold,
            yellow: settings.gpDiffYellowThreshold,
            red: settings.gpDiffRedThreshold,
          },
        },
      }
    }
    if (hasLegacyDiscount) {
      migrated.global = {
        ...migrated.global,
        discountRate: {
          ...migrated.global.discountRate,
          thresholds: {
            blue: settings.discountBlueThreshold,
            yellow: settings.discountYellowThreshold,
            red: settings.discountRedThreshold,
          },
        },
      }
    }
    return migrated
  }, [settings])

  /** 店舗一覧（設定パネル用） */
  const storeEntries = useMemo(() => {
    const entries = [...stores.entries()].sort(([, a], [, b]) =>
      (a.code ?? a.id).localeCompare(b.code ?? b.id),
    )
    return entries
  }, [stores])

  const handleCardClick = useCallback(
    (item: ConditionItem) => {
      if (hasMultipleStores && (item.storeValue || item.detailBreakdown)) {
        setBreakdownItem(item)
      }
    },
    [hasMultipleStores],
  )

  const handleEvidenceClick = useCallback(
    (e: React.MouseEvent, metricId: MetricId) => {
      e.stopPropagation()
      onExplain(metricId)
    },
    [onExplain],
  )

  // GP calculations
  const gpBefore = computeGpBeforeConsumable(r)
  const gpAfter = computeGpAfterConsumable(r)
  const gpDiff = (gpAfter - r.grossProfitRateBudget) * 100 // pt

  /** 閾値ヘルパー: gpRate は差分(pt)で判定するため direction=higher_better で比較 */
  const gpSignal = (diffPt: number, storeId?: string): SignalLevel => {
    const t = resolveThresholds(effectiveConfig, 'gpRate', storeId)
    return evaluateSignal(diffPt, t, 'higher_better')
  }

  /** markupRate は予算差分(pt)で判定 */
  const markupSignal = (rate: number, storeId?: string): SignalLevel => {
    const t = resolveThresholds(effectiveConfig, 'markupRate', storeId)
    const diff = (rate - r.grossProfitRateBudget) * 100
    return evaluateSignal(diff, t, 'higher_better')
  }

  const items: ConditionItem[] = []

  // 1. Gross Profit Rate
  if (isMetricEnabled(effectiveConfig, 'gpRate')) {
    items.push({
      label: '粗利率',
      value: formatPercent(gpAfter),
      sub: `予算 ${formatPercent(r.grossProfitRateBudget)} / 原算前 ${formatPercent(gpBefore)} / 原価算入率 ${formatPercent(r.costInclusionRate)} / 差異 ${formatPointDiff(gpAfter - r.grossProfitRateBudget)}`,
      signal: gpSignal(gpDiff),
      metricId:
        r.invMethodGrossProfitRate != null ? 'invMethodGrossProfitRate' : 'estMethodMarginRate',
      detailBreakdown: 'gpRate',
    })
  }

  // 2. Markup Rate
  if (isMetricEnabled(effectiveConfig, 'markupRate')) {
    items.push({
      label: '値入率',
      value: formatPercent(r.averageMarkupRate),
      sub: `コア値入率 ${formatPercent(r.coreMarkupRate)}`,
      signal: markupSignal(r.averageMarkupRate),
      metricId: 'averageMarkupRate',
      detailBreakdown: 'markupRate',
    })
  }

  // 3. Budget Progress Rate
  if (isMetricEnabled(effectiveConfig, 'budgetProgress')) {
    items.push({
      label: '予算消化率',
      value: formatPercent(r.budgetProgressRate),
      sub: `達成率 ${formatPercent(r.budgetAchievementRate)} / 残予算 ${formatCurrency(r.remainingBudget)}`,
      signal: metricSignal(r.budgetProgressRate, 'budgetProgress', effectiveConfig),
      metricId: 'budgetProgressRate',
      storeValue: (sr) => ({
        value: formatPercent(sr.budgetProgressRate),
        signal: metricSignal(sr.budgetProgressRate, 'budgetProgress', effectiveConfig, sr.storeId),
      }),
    })
  }

  // 4. Projected Achievement
  if (isMetricEnabled(effectiveConfig, 'projectedAchievement')) {
    items.push({
      label: '着地予測達成率',
      value: formatPercent(r.projectedAchievement),
      sub: `予測 ${formatCurrency(r.projectedSales)} / 予算 ${formatCurrency(r.budget)}`,
      signal: metricSignal(r.projectedAchievement, 'projectedAchievement', effectiveConfig),
      metricId: 'projectedSales',
      storeValue: (sr) => ({
        value: formatPercent(sr.projectedAchievement),
        signal: metricSignal(
          sr.projectedAchievement,
          'projectedAchievement',
          effectiveConfig,
          sr.storeId,
        ),
      }),
    })
  }

  // 5. Discount Rate
  if (isMetricEnabled(effectiveConfig, 'discountRate')) {
    items.push({
      label: '売変率',
      value: formatPercent(r.discountRate),
      sub: `売変額 ${formatCurrency(r.totalDiscount)} / 粗売上 ${formatCurrency(r.grossSales)}`,
      signal: metricSignal(r.discountRate, 'discountRate', effectiveConfig),
      metricId: 'discountRate',
      detailBreakdown: 'discountRate',
    })
  }

  // 6. Cost Inclusion Rate
  if (isMetricEnabled(effectiveConfig, 'costInclusion')) {
    items.push({
      label: '原価算入率',
      value: formatPercent(r.costInclusionRate),
      sub: `原価算入費 ${formatCurrency(r.totalCostInclusion)} / 売上 ${formatCurrency(r.totalSales)}`,
      signal: metricSignal(r.costInclusionRate, 'costInclusion', effectiveConfig),
      metricId: 'totalCostInclusion',
      storeValue: (sr) => ({
        value: formatPercent(sr.costInclusionRate),
        signal: metricSignal(sr.costInclusionRate, 'costInclusion', effectiveConfig, sr.storeId),
      }),
    })
  }

  // 7. Sales YoY (NEW)
  const prevYear = ctx.prevYear
  if (
    isMetricEnabled(effectiveConfig, 'salesYoY') &&
    prevYear.hasPrevYear &&
    prevYear.totalSales > 0
  ) {
    const salesYoY = safeDivide(r.totalSales, prevYear.totalSales, 0)
    items.push({
      label: '売上前年比',
      value: formatPercent(salesYoY, 2),
      sub: `当年 ${formatCurrency(r.totalSales)} / 前年 ${formatCurrency(prevYear.totalSales)}`,
      signal: metricSignal(salesYoY, 'salesYoY', effectiveConfig),
      metricId: 'salesTotal',
    })
  }

  // 8. Customer YoY
  if (
    isMetricEnabled(effectiveConfig, 'customerYoY') &&
    prevYear.hasPrevYear &&
    prevYear.totalCustomers > 0 &&
    r.totalCustomers > 0
  ) {
    const custYoY = r.totalCustomers / prevYear.totalCustomers
    items.push({
      label: '客数前年比',
      value: formatPercent(custYoY, 2),
      sub: `${r.totalCustomers.toLocaleString()}人 / 前年${prevYear.totalCustomers.toLocaleString()}人`,
      signal: metricSignal(custYoY, 'customerYoY', effectiveConfig),
      metricId: 'totalCustomers',
      storeValue: customersBreakdown,
    })
  }

  // 9. Transaction Value
  if (isMetricEnabled(effectiveConfig, 'txValue') && r.totalCustomers > 0) {
    const txValue = safeDivide(r.totalSales, r.totalCustomers, 0)
    const prevTxValue =
      prevYear.hasPrevYear && prevYear.totalCustomers > 0
        ? safeDivide(prevYear.totalSales, prevYear.totalCustomers, 0)
        : null
    const txYoY = prevTxValue != null && prevTxValue > 0 ? txValue / prevTxValue : null
    const fmtTx = (v: number) =>
      `${v.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}円`
    items.push({
      label: '客単価',
      value: fmtTx(txValue),
      sub:
        prevTxValue != null
          ? `前年: ${fmtTx(prevTxValue)} (${formatPercent(txYoY!, 2)})`
          : `日平均客数: ${Math.round(r.averageCustomersPerDay)}人`,
      signal: txYoY != null ? metricSignal(txYoY, 'txValue', effectiveConfig) : 'blue',
      metricId: 'totalCustomers',
      storeValue: txValueBreakdown,
    })
  }

  // 10. GP Amount Budget Ratio (NEW)
  if (isMetricEnabled(effectiveConfig, 'gpAmount') && r.grossProfitBudget > 0) {
    const gpAmt = computeGpAfterConsumableAmount(r)
    const gpBudgetRatio = safeDivide(gpAmt, r.grossProfitBudget, 0)
    items.push({
      label: '粗利額予算比',
      value: formatPercent(gpBudgetRatio, 2),
      sub: `粗利額 ${formatCurrency(gpAmt)} / 予算 ${formatCurrency(r.grossProfitBudget)}`,
      signal: metricSignal(gpBudgetRatio, 'gpAmount', effectiveConfig),
    })
  }

  // 11. Daily Sales Achievement (NEW)
  const budgetDailyAvg = ctx.daysInMonth > 0 ? r.budget / ctx.daysInMonth : 0
  if (isMetricEnabled(effectiveConfig, 'dailySales') && budgetDailyAvg > 0) {
    const dailyRatio = safeDivide(r.averageDailySales, budgetDailyAvg, 0)
    items.push({
      label: '日販達成率',
      value: formatPercent(dailyRatio, 2),
      sub: `日販 ${formatCurrency(r.averageDailySales)} / 予算日販 ${formatCurrency(budgetDailyAvg)}`,
      signal: metricSignal(dailyRatio, 'dailySales', effectiveConfig),
    })
  }

  // 12. Required Pace Ratio (NEW)
  if (
    isMetricEnabled(effectiveConfig, 'requiredPace') &&
    r.averageDailySales > 0 &&
    r.requiredDailySales > 0
  ) {
    const paceRatio = safeDivide(r.requiredDailySales, r.averageDailySales, 0)
    items.push({
      label: '必達ペース比',
      value: formatPercent(paceRatio, 2),
      sub: `必要日販 ${formatCurrency(r.requiredDailySales)} / 実績日販 ${formatCurrency(r.averageDailySales)}`,
      signal: metricSignal(paceRatio, 'requiredPace', effectiveConfig),
    })
  }

  // Sort store entries by code
  const sortedStoreEntries = [...allStoreResults.entries()].sort(([, a], [, b]) => {
    const sa = stores.get(a.storeId)
    const sb = stores.get(b.storeId)
    return (sa?.code ?? a.storeId).localeCompare(sb?.code ?? b.storeId)
  })

  // ─── Render detail panels ────────────────────────────

  const renderGpDetailTable = () => (
    <>
      <DetailHeader>
        <DetailTitle>粗利率 — 店舗内訳</DetailTitle>
        <ToggleGroup>
          <ToggleBtn $active={displayMode === 'rate'} onClick={() => setDisplayMode('rate')}>
            率
          </ToggleBtn>
          <ToggleBtn $active={displayMode === 'amount'} onClick={() => setDisplayMode('amount')}>
            金額
          </ToggleBtn>
        </ToggleGroup>
      </DetailHeader>
      <BTable>
        <thead>
          <tr>
            <BTh>店舗名</BTh>
            {displayMode === 'rate' ? (
              <>
                <BTh>粗利率予算</BTh>
                <BTh>原算前粗利率</BTh>
                <BTh>原価算後粗利率</BTh>
                <BTh>差異</BTh>
              </>
            ) : (
              <>
                <BTh>粗利予算額</BTh>
                <BTh>原算前粗利額</BTh>
                <BTh>原価算後粗利額</BTh>
                <BTh>差異</BTh>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedStoreEntries.map(([storeId, sr]) => {
            const store = stores.get(storeId)
            const storeName = store?.name ?? storeId
            const before = computeGpBeforeConsumable(sr)
            const after = computeGpAfterConsumable(sr)
            const diff = (after - sr.grossProfitRateBudget) * 100
            const sig = gpSignal(diff, sr.storeId)
            const sigColor = SIGNAL_COLORS[sig]

            if (displayMode === 'rate') {
              return (
                <BTr key={storeId}>
                  <BTd>
                    <BSignalDot $color={sigColor} />
                    {storeName}
                  </BTd>
                  <BTd>{formatPercent(sr.grossProfitRateBudget)}</BTd>
                  <BTd>{formatPercent(before)}</BTd>
                  <BTd>
                    {formatPercent(after)} ({formatPercent(sr.costInclusionRate)})
                  </BTd>
                  <BTd $color={sigColor}>{formatPointDiff(after - sr.grossProfitRateBudget)}</BTd>
                </BTr>
              )
            }
            // amount mode
            const gpAmt = computeGpAmount(sr)
            const gpAfterAmt = computeGpAfterConsumableAmount(sr)
            const diffAmt = gpAfterAmt - sr.grossProfitBudget
            return (
              <BTr key={storeId}>
                <BTd>
                  <BSignalDot $color={sigColor} />
                  {storeName}
                </BTd>
                <BTd>{formatCurrency(sr.grossProfitBudget)}</BTd>
                <BTd>{formatCurrency(gpAmt)}</BTd>
                <BTd>{formatCurrency(gpAfterAmt)}</BTd>
                <BTd $color={sigColor}>
                  {diffAmt >= 0 ? '+' : ''}
                  {formatCurrency(diffAmt)}
                </BTd>
              </BTr>
            )
          })}
          {/* Total row */}
          {(() => {
            const totalSig = gpSignal(gpDiff)
            const totalColor = SIGNAL_COLORS[totalSig]
            if (displayMode === 'rate') {
              return (
                <BTr $highlight>
                  <BTd $bold>合計</BTd>
                  <BTd $bold>{formatPercent(r.grossProfitRateBudget)}</BTd>
                  <BTd $bold>{formatPercent(gpBefore)}</BTd>
                  <BTd $bold>
                    {formatPercent(gpAfter)} ({formatPercent(r.costInclusionRate)})
                  </BTd>
                  <BTd $bold $color={totalColor}>
                    {formatPointDiff(gpAfter - r.grossProfitRateBudget)}
                  </BTd>
                </BTr>
              )
            }
            const totalGpAmt = computeGpAmount(r)
            const totalAfterAmt = computeGpAfterConsumableAmount(r)
            const totalDiffAmt = totalAfterAmt - r.grossProfitBudget
            return (
              <BTr $highlight>
                <BTd $bold>合計</BTd>
                <BTd $bold>{formatCurrency(r.grossProfitBudget)}</BTd>
                <BTd $bold>{formatCurrency(totalGpAmt)}</BTd>
                <BTd $bold>{formatCurrency(totalAfterAmt)}</BTd>
                <BTd $bold $color={totalColor}>
                  {totalDiffAmt >= 0 ? '+' : ''}
                  {formatCurrency(totalDiffAmt)}
                </BTd>
              </BTr>
            )
          })()}
        </tbody>
      </BTable>
    </>
  )

  const renderDiscountDetailTable = () => {
    return (
      <>
        <DetailHeader>
          <DetailTitle>売変率 — 店舗内訳</DetailTitle>
          <ToggleGroup>
            <ToggleBtn $active={displayMode === 'rate'} onClick={() => setDisplayMode('rate')}>
              率
            </ToggleBtn>
            <ToggleBtn $active={displayMode === 'amount'} onClick={() => setDisplayMode('amount')}>
              金額
            </ToggleBtn>
          </ToggleGroup>
        </DetailHeader>
        <BTable>
          <thead>
            <tr>
              <BTh>店舗名</BTh>
              <BTh>売変率</BTh>
              {DISCOUNT_TYPES.map((dt) => (
                <BTh key={dt.type}>
                  {dt.label}({dt.type})
                </BTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedStoreEntries.map(([storeId, sr]) => {
              const store = stores.get(storeId)
              const storeName = store?.name ?? storeId
              const sig = metricSignal(sr.discountRate, 'discountRate', effectiveConfig, sr.storeId)
              const sigColor = SIGNAL_COLORS[sig]

              return (
                <BTr key={storeId}>
                  <BTd>
                    <BSignalDot $color={sigColor} />
                    {storeName}
                  </BTd>
                  <BTd $color={sigColor}>
                    {displayMode === 'rate'
                      ? formatPercent(sr.discountRate)
                      : formatCurrency(sr.totalDiscount)}
                  </BTd>
                  {DISCOUNT_TYPES.map((dt) => {
                    const entry = sr.discountEntries.find((e) => e.type === dt.type)
                    const amt = entry?.amount ?? 0
                    const rate = sr.grossSales > 0 ? safeDivide(amt, sr.grossSales, 0) : 0
                    return (
                      <BTd key={dt.type}>
                        {displayMode === 'rate' ? formatPercent(rate) : formatCurrency(amt)}
                      </BTd>
                    )
                  })}
                </BTr>
              )
            })}
            {/* Total row */}
            {(() => {
              const totalSig = metricSignal(r.discountRate, 'discountRate', effectiveConfig)
              const totalColor = SIGNAL_COLORS[totalSig]
              return (
                <BTr $highlight>
                  <BTd $bold>合計</BTd>
                  <BTd $bold $color={totalColor}>
                    {displayMode === 'rate'
                      ? formatPercent(r.discountRate)
                      : formatCurrency(r.totalDiscount)}
                  </BTd>
                  {DISCOUNT_TYPES.map((dt) => {
                    const entry = r.discountEntries.find((e) => e.type === dt.type)
                    const amt = entry?.amount ?? 0
                    const rate = r.grossSales > 0 ? safeDivide(amt, r.grossSales, 0) : 0
                    return (
                      <BTd key={dt.type} $bold>
                        {displayMode === 'rate' ? formatPercent(rate) : formatCurrency(amt)}
                      </BTd>
                    )
                  })}
                </BTr>
              )
            })()}
          </tbody>
        </BTable>
      </>
    )
  }

  const renderMarkupDetailTable = () => {
    const toggleStore = (storeId: string) => {
      setExpandedMarkupStore((prev) => (prev === storeId ? null : storeId))
    }

    return (
      <>
        <DetailHeader>
          <DetailTitle>値入率 — 店舗内訳</DetailTitle>
          <ToggleGroup>
            <ToggleBtn $active={displayMode === 'rate'} onClick={() => setDisplayMode('rate')}>
              率
            </ToggleBtn>
            <ToggleBtn $active={displayMode === 'amount'} onClick={() => setDisplayMode('amount')}>
              金額
            </ToggleBtn>
          </ToggleGroup>
        </DetailHeader>
        <BTable>
          <thead>
            <tr>
              <BTh>店舗名</BTh>
              <BTh>平均値入率</BTh>
              <BTh>コア値入率</BTh>
              {displayMode === 'amount' && (
                <>
                  <BTh>原価合計</BTh>
                  <BTh>売価合計</BTh>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedStoreEntries.flatMap(([storeId, sr]) => {
              const store = stores.get(storeId)
              const storeName = store?.name ?? storeId
              const isExpanded = expandedMarkupStore === storeId
              const crossRows = buildCrossMult(sr, settings.supplierCategoryMap)
              const sig = markupSignal(sr.averageMarkupRate, sr.storeId)
              const sigColor = SIGNAL_COLORS[sig]

              const rows: React.ReactNode[] = [
                <BTr
                  key={storeId}
                  onClick={() => toggleStore(storeId)}
                  style={{ cursor: 'pointer' }}
                >
                  <BTd>
                    <ExpandIcon $expanded={isExpanded}>▶</ExpandIcon>
                    <BSignalDot $color={sigColor} />
                    {storeName}
                  </BTd>
                  <BTd $color={sigColor}>{formatPercent(sr.averageMarkupRate)}</BTd>
                  <BTd>{formatPercent(sr.coreMarkupRate)}</BTd>
                  {displayMode === 'amount' && (
                    <>
                      <BTd>{formatCurrency(crossRows.reduce((sum, c) => sum + c.cost, 0))}</BTd>
                      <BTd>{formatCurrency(crossRows.reduce((sum, c) => sum + c.price, 0))}</BTd>
                    </>
                  )}
                </BTr>,
              ]

              // Drill-down: 相乗積テーブル
              if (isExpanded) {
                rows.push(
                  <SubRow key={`${storeId}-header`}>
                    <BTd
                      colSpan={displayMode === 'amount' ? 5 : 3}
                      style={{ padding: '4px 12px', fontSize: '0.7rem', fontWeight: 600 }}
                    >
                      相乗積内訳 （値入率 × 売価構成比 = 相乗積）
                    </BTd>
                  </SubRow>,
                )

                const maxCross = Math.max(
                  ...crossRows.map((c) => Math.abs(c.crossMultiplication)),
                  0.001,
                )

                crossRows.forEach((cr) => {
                  rows.push(
                    <SubRow key={`${storeId}-${cr.label}`}>
                      <BTd style={{ paddingLeft: '28px' }}>
                        <CategoryDot $color={cr.color} />
                        {cr.label}
                      </BTd>
                      <BTd>
                        <BarCell
                          $ratio={Math.abs(cr.crossMultiplication) / maxCross}
                          $color={cr.color}
                        >
                          {formatPercent(cr.crossMultiplication)}
                        </BarCell>
                      </BTd>
                      <BTd>
                        {formatPercent(cr.markupRate)} × {formatPercent(cr.priceShare)}
                      </BTd>
                      {displayMode === 'amount' && (
                        <>
                          <BTd>{formatCurrency(cr.cost)}</BTd>
                          <BTd>{formatCurrency(cr.price)}</BTd>
                        </>
                      )}
                    </SubRow>,
                  )
                })

                // Sub total
                const totalCross = crossRows.reduce((s, c) => s + c.crossMultiplication, 0)
                rows.push(
                  <SubRow key={`${storeId}-total`}>
                    <BTd style={{ paddingLeft: '28px', fontWeight: 700 }}>合計</BTd>
                    <BTd $bold>{formatPercent(totalCross)}</BTd>
                    <BTd $bold>= 平均値入率</BTd>
                    {displayMode === 'amount' && (
                      <>
                        <BTd />
                        <BTd />
                      </>
                    )}
                  </SubRow>,
                )
              }

              return rows
            })}
            {/* Total row */}
            <BTr $highlight>
              <BTd $bold>合計</BTd>
              <BTd $bold>{formatPercent(r.averageMarkupRate)}</BTd>
              <BTd $bold>{formatPercent(r.coreMarkupRate)}</BTd>
              {displayMode === 'amount' && (
                <>
                  <BTd $bold>
                    {formatCurrency(
                      CATEGORY_ORDER.reduce(
                        (sum, cat) => sum + (r.categoryTotals.get(cat)?.cost ?? 0),
                        0,
                      ),
                    )}
                  </BTd>
                  <BTd $bold>
                    {formatCurrency(
                      CATEGORY_ORDER.reduce(
                        (sum, cat) => sum + (r.categoryTotals.get(cat)?.price ?? 0),
                        0,
                      ),
                    )}
                  </BTd>
                </>
              )}
            </BTr>
          </tbody>
        </BTable>
      </>
    )
  }

  const renderSimpleBreakdown = () => {
    if (!breakdownItem || !breakdownItem.storeValue) return null
    return (
      <>
        <DetailTitle style={{ marginBottom: '16px' }}>{breakdownItem.label} — 店舗内訳</DetailTitle>
        {sortedStoreEntries.map(([storeId, sr]) => {
          const store = stores.get(storeId)
          const storeName = store?.name ?? storeId
          const bv = breakdownItem.storeValue!(sr)
          const signalColor = SIGNAL_COLORS[bv.signal]
          return (
            <BreakdownRow key={storeId}>
              <BreakdownLabel>
                <BreakdownSignal $color={signalColor} />
                {storeName}
              </BreakdownLabel>
              <BreakdownValue $color={signalColor}>{bv.value}</BreakdownValue>
            </BreakdownRow>
          )
        })}
        <BreakdownRow $bold>
          <BreakdownLabel>合計</BreakdownLabel>
          <BreakdownValue $color={SIGNAL_COLORS[breakdownItem.signal]}>
            {breakdownItem.value}
          </BreakdownValue>
        </BreakdownRow>
      </>
    )
  }

  /** 閾値変更ハンドラ（新システム: conditionConfig 経由） */
  const handleConditionThresholdChange = useCallback(
    (
      metricId: ConditionMetricId,
      level: 'blue' | 'yellow' | 'red',
      raw: string,
      storeId: string,
    ) => {
      const def = CONDITION_METRIC_MAP.get(metricId)
      if (!def) return
      const v = parseFloat(raw)
      if (isNaN(v)) return
      const internalValue = v / def.displayMultiplier

      const prev = settings.conditionConfig ?? { global: {}, storeOverrides: {} }

      if (storeId === '__global__') {
        const prevMetric = prev.global[metricId] ?? {}
        const newConfig: ConditionSummaryConfig = {
          ...prev,
          global: {
            ...prev.global,
            [metricId]: {
              ...prevMetric,
              thresholds: { ...prevMetric.thresholds, [level]: internalValue },
            },
          },
        }
        updateSettings({ conditionConfig: newConfig })
      } else {
        const prevStore = prev.storeOverrides[storeId] ?? {}
        const prevMetric = prevStore[metricId] ?? {}
        const newConfig: ConditionSummaryConfig = {
          ...prev,
          storeOverrides: {
            ...prev.storeOverrides,
            [storeId]: {
              ...prevStore,
              [metricId]: {
                ...prevMetric,
                thresholds: { ...prevMetric.thresholds, [level]: internalValue },
              },
            },
          },
        }
        updateSettings({ conditionConfig: newConfig })
      }
    },
    [settings.conditionConfig, updateSettings],
  )

  /** メトリクス有効/無効トグル */
  const handleMetricToggle = useCallback(
    (metricId: ConditionMetricId, enabled: boolean, storeId: string) => {
      const prev = settings.conditionConfig ?? { global: {}, storeOverrides: {} }

      if (storeId === '__global__') {
        const prevMetric = prev.global[metricId] ?? {}
        const newConfig: ConditionSummaryConfig = {
          ...prev,
          global: {
            ...prev.global,
            [metricId]: { ...prevMetric, enabled },
          },
        }
        updateSettings({ conditionConfig: newConfig })
      } else {
        const prevStore = prev.storeOverrides[storeId] ?? {}
        const prevMetric = prevStore[metricId] ?? {}
        const newConfig: ConditionSummaryConfig = {
          ...prev,
          storeOverrides: {
            ...prev.storeOverrides,
            [storeId]: {
              ...prevStore,
              [metricId]: { ...prevMetric, enabled },
            },
          },
        }
        updateSettings({ conditionConfig: newConfig })
      }
    },
    [settings.conditionConfig, updateSettings],
  )

  /** 設定パネルで表示する閾値（store override > global > registry default） */
  const getDisplayThreshold = useCallback(
    (metricId: ConditionMetricId, level: 'blue' | 'yellow' | 'red'): string => {
      const def = CONDITION_METRIC_MAP.get(metricId)
      if (!def) return '0'
      const cfg = settings.conditionConfig ?? { global: {}, storeOverrides: {} }
      const storeVal =
        settingsStoreId !== '__global__'
          ? cfg.storeOverrides[settingsStoreId]?.[metricId]?.thresholds?.[level]
          : undefined
      const globalVal = cfg.global[metricId]?.thresholds?.[level]
      const val = storeVal ?? globalVal ?? def.defaults[level]
      return (val * def.displayMultiplier).toFixed(def.inputStep < 1 ? 2 : 0)
    },
    [settings.conditionConfig, settingsStoreId],
  )

  /** メトリクスの有効状態を取得 */
  const getMetricEnabled = useCallback(
    (metricId: ConditionMetricId): boolean => {
      const cfg = settings.conditionConfig ?? { global: {}, storeOverrides: {} }
      if (settingsStoreId !== '__global__') {
        const storeVal = cfg.storeOverrides[settingsStoreId]?.[metricId]?.enabled
        if (storeVal != null) return storeVal
      }
      return cfg.global[metricId]?.enabled ?? true
    },
    [settings.conditionConfig, settingsStoreId],
  )

  /** 店舗オーバーライドか表示（値が global と異なる場合） */
  const isStoreOverride = useCallback(
    (metricId: ConditionMetricId, level: 'blue' | 'yellow' | 'red'): boolean => {
      if (settingsStoreId === '__global__') return false
      const cfg = settings.conditionConfig ?? { global: {}, storeOverrides: {} }
      return cfg.storeOverrides[settingsStoreId]?.[metricId]?.thresholds?.[level] != null
    },
    [settings.conditionConfig, settingsStoreId],
  )

  return (
    <Wrapper aria-label="コンディションサマリー">
      <TitleRow>
        <Title>コンディションサマリー</Title>
        <SettingsChip onClick={() => setShowSettings((p) => !p)}>⚙ 閾値設定</SettingsChip>
      </TitleRow>

      {showSettings && (
        <SettingsPanel>
          {/* 店舗セレクター */}
          <SettingsSectionTitle>対象店舗</SettingsSectionTitle>
          <StoreSelect value={settingsStoreId} onChange={(e) => setSettingsStoreId(e.target.value)}>
            <option value="__global__">全店共通（デフォルト）</option>
            {storeEntries.map(([id, store]) => (
              <option key={id} value={id}>
                {store.name ?? id}
                {settings.conditionConfig?.storeOverrides[id] &&
                Object.keys(settings.conditionConfig.storeOverrides[id]!).length > 0
                  ? ' *'
                  : ''}
              </option>
            ))}
          </StoreSelect>

          {settingsStoreId !== '__global__' && (
            <StoreOverrideNote>未設定の項目は全店共通の値が適用されます</StoreOverrideNote>
          )}

          {/* メトリクスごとの閾値設定 */}
          {CONDITION_METRIC_DEFS.map((def) => {
            const enabled = getMetricEnabled(def.id)
            const dirLabel = def.direction === 'higher_better' ? '≧' : '≦'
            return (
              <MetricSettingRow key={def.id}>
                <MetricSettingHeader>
                  <MetricToggle
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => handleMetricToggle(def.id, e.target.checked, settingsStoreId)}
                  />
                  <SettingsSectionTitle style={{ margin: 0 }}>{def.label}</SettingsSectionTitle>
                </MetricSettingHeader>
                {enabled && (
                  <SettingsGrid>
                    {(['blue', 'yellow', 'red'] as const).map((level) => {
                      const emoji = level === 'blue' ? '🔵' : level === 'yellow' ? '🟡' : '🔴'
                      const hasOverride = isStoreOverride(def.id, level)
                      return (
                        <SettingsField key={level}>
                          <SettingsLabel>
                            {emoji} {dirLabel}
                          </SettingsLabel>
                          <SettingsInput
                            type="number"
                            step={def.inputStep}
                            value={getDisplayThreshold(def.id, level)}
                            onChange={(e) =>
                              handleConditionThresholdChange(
                                def.id,
                                level,
                                e.target.value,
                                settingsStoreId,
                              )
                            }
                            style={hasOverride ? { borderColor: palette.primary } : undefined}
                          />
                          <SettingsUnit>{def.inputUnit}</SettingsUnit>
                        </SettingsField>
                      )
                    })}
                  </SettingsGrid>
                )}
              </MetricSettingRow>
            )
          })}
        </SettingsPanel>
      )}

      <Grid>
        {items.map((item) => {
          const color = SIGNAL_COLORS[item.signal]
          const isClickable = hasMultipleStores && !!(item.storeValue || item.detailBreakdown)
          return (
            <Card
              key={item.label}
              $borderColor={color}
              $clickable={isClickable}
              onClick={isClickable ? () => handleCardClick(item) : undefined}
            >
              <ChipRow>
                {item.metricId && (
                  <EvidenceChip
                    onClick={(e) => handleEvidenceClick(e, item.metricId!)}
                    title="計算根拠を表示"
                  >
                    根拠
                  </EvidenceChip>
                )}
              </ChipRow>
              <Signal $color={color} />
              <CardContent>
                <CardLabel>{item.label}</CardLabel>
                <CardValue $color={color}>{item.value}</CardValue>
                {item.sub && <CardSub>{item.sub}</CardSub>}
              </CardContent>
            </Card>
          )
        })}
      </Grid>

      {/* Detail Overlay */}
      {breakdownItem && (
        <Overlay
          onClick={() => {
            setBreakdownItem(null)
            setExpandedMarkupStore(null)
          }}
        >
          <DetailPanel onClick={(e) => e.stopPropagation()}>
            {breakdownItem.detailBreakdown === 'gpRate'
              ? renderGpDetailTable()
              : breakdownItem.detailBreakdown === 'discountRate'
                ? renderDiscountDetailTable()
                : breakdownItem.detailBreakdown === 'markupRate'
                  ? renderMarkupDetailTable()
                  : renderSimpleBreakdown()}
            <CloseBtn
              onClick={() => {
                setBreakdownItem(null)
                setExpandedMarkupStore(null)
              }}
            >
              閉じる
            </CloseBtn>
          </DetailPanel>
        </Overlay>
      )}

      {/* Condition Matrix (DuckDB) */}
      <ConditionMatrixTable ctx={ctx} />
    </Wrapper>
  )
})
