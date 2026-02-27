/**
 * DuckDB カテゴリ×時間帯分析チャート
 *
 * DuckDB のカテゴリ別時間帯集約クエリを使い、カテゴリ（行）×時間帯（列）の
 * ヒートマップをHTML table で描画する。各カテゴリのピーク時間帯に星マーカーを表示。
 *
 * 表示項目:
 * - カテゴリ×時間帯のヒートマップ（セル色は金額比例）
 * - 階層レベル切替（部門/ライン/クラス）
 * - ピーク時間帯マーカー（★）
 */
import { useMemo, useState, useCallback } from 'react'
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import { useDuckDBCategoryHourly, type CategoryHourlyRow } from '@/application/hooks/useDuckDBQuery'
import { useCurrencyFormatter, toPct } from './chartTheme'

// ── styled-components ──

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const Subtitle = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const ControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`

const ChipGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
`

const ChipLabel = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-right: ${({ theme }) => theme.spacing[1]};
`

const Chip = styled.button<{ $active: boolean }>`
  padding: 2px 8px;
  font-size: 0.6rem;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.2)'
        : 'rgba(99,102,241,0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const HeatmapTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.55rem;
  table-layout: fixed;
`

const HeatmapTh = styled.th`
  padding: 3px 2px;
  text-align: center;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
`

const HeatmapCategoryTh = styled.th`
  padding: 3px 4px;
  text-align: left;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text2};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const HeatmapCell = styled.td<{ $intensity: number; $isPeak: boolean }>`
  padding: 3px 2px;
  text-align: center;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $intensity, theme }) => {
    if ($intensity <= 0) return 'transparent'
    const baseColor = theme.mode === 'dark' ? '99,102,241' : '99,102,241'
    const alpha = Math.min($intensity * 0.7 + 0.05, 0.75)
    return `rgba(${baseColor}, ${alpha})`
  }};
  color: ${({ $intensity, theme }) => ($intensity > 0.5 ? '#ffffff' : theme.colors.text3)};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  position: relative;
  font-weight: ${({ $isPeak }) => ($isPeak ? 700 : 400)};
`

const PeakMarker = styled.span`
  color: #fbbf24;
  font-size: 0.5rem;
  margin-left: 1px;
`

const SummaryRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
  font-size: 0.6rem;
  flex-wrap: wrap;
`

const SummaryItem = styled.div`
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const ScrollContainer = styled.div`
  overflow-x: auto;
  margin: 0 -${({ theme }) => theme.spacing[2]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
`

// ── Constants ──

/** 営業時間帯の範囲 */
const HOUR_START = 6
const HOUR_END = 22

const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => i + HOUR_START)

/** 上位表示カテゴリ数 */
const TOP_CATEGORIES = 10

type HierarchyLevel = 'department' | 'line' | 'klass'

const LEVEL_LABELS: Record<HierarchyLevel, string> = {
  department: '部門',
  line: 'ライン',
  klass: 'クラス',
}

// ── Types ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

interface CategoryHeatmapRow {
  readonly code: string
  readonly name: string
  readonly totalAmount: number
  readonly hourlyAmounts: ReadonlyMap<number, number>
  readonly peakHour: number
  readonly peakAmount: number
  readonly shareOfTotal: number
}

interface HeatmapData {
  readonly categories: CategoryHeatmapRow[]
  readonly maxAmount: number
  readonly globalPeakHour: number
}

// ── Data transformation ──

function buildHeatmapData(rows: readonly CategoryHourlyRow[]): HeatmapData {
  // Aggregate by category
  const catMap = new Map<
    string,
    { name: string; totalAmount: number; hourly: Map<number, number> }
  >()

  for (const row of rows) {
    const existing = catMap.get(row.code) ?? {
      name: row.name,
      totalAmount: 0,
      hourly: new Map<number, number>(),
    }
    existing.totalAmount += row.amount
    existing.hourly.set(row.hour, (existing.hourly.get(row.hour) ?? 0) + row.amount)
    catMap.set(row.code, existing)
  }

  // Sort by total amount, take top N
  const sorted = [...catMap.entries()]
    .map(([code, info]) => ({ code, ...info }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, TOP_CATEGORIES)

  const grandTotal = sorted.reduce((sum, cat) => sum + cat.totalAmount, 0)

  // Find global max for color scaling
  let maxAmount = 0
  const globalHourTotals = new Map<number, number>()

  for (const cat of sorted) {
    for (const [hour, amount] of cat.hourly) {
      if (amount > maxAmount) maxAmount = amount
      globalHourTotals.set(hour, (globalHourTotals.get(hour) ?? 0) + amount)
    }
  }

  // Global peak hour
  let globalPeakHour = HOUR_START
  let globalPeakVal = 0
  for (const [hour, total] of globalHourTotals) {
    if (total > globalPeakVal) {
      globalPeakVal = total
      globalPeakHour = hour
    }
  }

  const categories: CategoryHeatmapRow[] = sorted.map((cat) => {
    let peakHour = HOUR_START
    let peakAmount = 0
    for (const [hour, amount] of cat.hourly) {
      if (amount > peakAmount) {
        peakAmount = amount
        peakHour = hour
      }
    }

    return {
      code: cat.code,
      name: cat.name,
      totalAmount: Math.round(cat.totalAmount),
      hourlyAmounts: cat.hourly,
      peakHour,
      peakAmount: Math.round(peakAmount),
      shareOfTotal: grandTotal > 0 ? cat.totalAmount / grandTotal : 0,
    }
  })

  return { categories, maxAmount, globalPeakHour }
}

// ── Component ──

export function DuckDBCategoryHourlyChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const fmt = useCurrencyFormatter()

  const [level, setLevel] = useState<HierarchyLevel>('department')

  const handleLevelChange = useCallback((newLevel: HierarchyLevel) => {
    setLevel(newLevel)
  }, [])

  const { data: hourlyRows } = useDuckDBCategoryHourly(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
  )

  const heatmapData = useMemo(
    () =>
      hourlyRows
        ? buildHeatmapData(hourlyRows)
        : { categories: [], maxAmount: 0, globalPeakHour: HOUR_START },
    [hourlyRows],
  )

  if (!duckConn || duckDataVersion === 0 || heatmapData.categories.length === 0) {
    return null
  }

  const { categories, maxAmount, globalPeakHour } = heatmapData

  return (
    <Wrapper>
      <Title>カテゴリ×時間帯分析（DuckDB）</Title>
      <Subtitle>カテゴリ別の時間帯売上分布 | ★ = ピーク</Subtitle>

      <ControlRow>
        <ChipGroup>
          <ChipLabel>階層:</ChipLabel>
          {(Object.keys(LEVEL_LABELS) as HierarchyLevel[]).map((l) => (
            <Chip key={l} $active={level === l} onClick={() => handleLevelChange(l)}>
              {LEVEL_LABELS[l]}
            </Chip>
          ))}
        </ChipGroup>
      </ControlRow>

      <ScrollContainer>
        <HeatmapTable>
          <thead>
            <tr>
              <HeatmapCategoryTh>カテゴリ</HeatmapCategoryTh>
              {HOURS.map((h) => (
                <HeatmapTh key={h}>{h}</HeatmapTh>
              ))}
              <HeatmapTh>合計</HeatmapTh>
              <HeatmapTh>構成比</HeatmapTh>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.code}>
                <HeatmapCategoryTh title={cat.name}>{cat.name}</HeatmapCategoryTh>
                {HOURS.map((h) => {
                  const amount = cat.hourlyAmounts.get(h) ?? 0
                  const intensity = maxAmount > 0 ? amount / maxAmount : 0
                  const isPeak = h === cat.peakHour && amount > 0

                  return (
                    <HeatmapCell
                      key={h}
                      $intensity={intensity}
                      $isPeak={isPeak}
                      title={`${cat.name} ${h}時: ${fmt(Math.round(amount))}`}
                    >
                      {amount > 0 ? fmt(Math.round(amount)) : ''}
                      {isPeak && <PeakMarker>★</PeakMarker>}
                    </HeatmapCell>
                  )
                })}
                <HeatmapCell $intensity={0} $isPeak={false}>
                  {fmt(cat.totalAmount)}
                </HeatmapCell>
                <HeatmapCell $intensity={0} $isPeak={false}>
                  {toPct(cat.shareOfTotal)}
                </HeatmapCell>
              </tr>
            ))}
          </tbody>
        </HeatmapTable>
      </ScrollContainer>

      <SummaryRow>
        <SummaryItem>全体ピーク: {globalPeakHour}時</SummaryItem>
        <SummaryItem>表示カテゴリ: {categories.length}件</SummaryItem>
        {categories[0] && (
          <SummaryItem>
            最大: {categories[0].name} (ピーク {categories[0].peakHour}時)
          </SummaryItem>
        )}
      </SummaryRow>
    </Wrapper>
  )
}
