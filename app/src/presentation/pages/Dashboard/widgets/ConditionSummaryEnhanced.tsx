/**
 * コンディションサマリー（統一版）
 *
 * 予算達成メトリクス（売上・粗利額・粗利率・値入率・売変率）と
 * 前年比メトリクス（客数・販売点数・客単価・必要ベース比）を
 * 統一カードレジストリで管理。カードの並び替えは CONDITION_CARD_ORDER の変更で即反映。
 */
import { useState, useMemo, memo, useCallback } from 'react'
import type { WidgetContext } from './types'
import {
  type MetricKey,
  type ConditionCardId,
  buildCardSummaries,
  buildBudgetHeader,
  buildYoYCards,
  buildUnifiedCards,
} from './ConditionSummaryEnhanced.vm'
import { formatPercent } from '@/domain/formatting'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useDataStore } from '@/application/stores/dataStore'
import { ConditionCardShell } from './ConditionCardShell'
import { ConditionSummaryBudgetDrill } from './ConditionSummaryBudgetDrill'
import { ConditionMatrixTable } from './ConditionMatrixTable'
import { ConditionSettingsPanelWidget } from './ConditionSettingsPanel'
import { CustomerYoYDetailTable } from './conditionPanelYoY'
import { TxValueDetailTable } from './conditionPanelSalesDetail'
import type { DisplayMode } from './conditionSummaryUtils'
import {
  DashWrapper,
  Header,
  HeaderMeta,
  HeaderTitle,
  CardGridRow,
  BudgetHeaderRow,
  BudgetHeaderItem,
  BudgetHeaderLabel,
  BudgetHeaderValue,
  BudgetGrowthBadge,
  CardGroupLabel,
  SettingsGear,
  DrillOverlay,
  DrillPanel,
  DrillCloseBtn,
  DrillHeader,
  DrillTitle,
  DrillBody,
  Footer,
  FooterNote,
  LegendDot,
  LegendGroup,
  LegendItem,
} from './ConditionSummaryEnhanced.styles'

// ─── Card click handler type map ────────────────────────

const BUDGET_METRIC_IDS: ReadonlySet<string> = new Set([
  'sales',
  'gp',
  'gpRate',
  'markupRate',
  'discountRate',
])
const YOY_DRILL_IDS: ReadonlySet<string> = new Set(['customerYoY', 'txValue'])

// ─── Component ──────────────────────────────────────────

export const ConditionSummaryEnhanced = memo(function ConditionSummaryEnhanced({
  ctx,
}: {
  readonly ctx: WidgetContext
}) {
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null)
  const [yoyDrill, setYoYDrill] = useState<'customerYoY' | 'txValue' | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('rate')
  const [expandedStore, setExpandedStore] = useState<string | null>(null)

  const { elapsedDays } = ctx
  // ctx.daysInMonth は effectiveEndDay（elapsedDays でキャップ済み）のため、
  // 予算按分には暦上の月日数を使用する
  const calendarDaysInMonth = new Date(ctx.year, ctx.month, 0).getDate()
  const prevYearMode =
    ctx.comparisonScope?.alignmentMode === 'sameDayOfWeek' ? 'sameDow' : 'sameDate'

  const settings = useSettingsStore((s) => s.settings)

  // 旧設定との後方互換
  const effectiveConfig = useMemo<ConditionSummaryConfig>(() => {
    const base = settings.conditionConfig ?? { global: {}, storeOverrides: {} }
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

  // CTS data for items YoY
  const ctsRecords = useDataStore((s) => s.data.categoryTimeSales.records)
  const prevCtsRecords = useDataStore((s) => s.data.prevYearCategoryTimeSales.records)

  // Budget header
  const budgetHeader = useMemo(
    () =>
      buildBudgetHeader(
        ctx.result,
        ctx.prevYearMonthlyKpi,
        ctx.dowGap,
        prevYearMode === 'sameDow' ? 'sameDow' : 'sameDate',
      ),
    [ctx.result, ctx.prevYearMonthlyKpi, ctx.dowGap, prevYearMode],
  )

  const hasMultipleStores = ctx.allStoreResults.size > 1

  // Unified card array (order controlled by CONDITION_CARD_ORDER)
  const allCards = useMemo(() => {
    const budgetCards = buildCardSummaries(
      ctx.result,
      elapsedDays,
      calendarDaysInMonth,
      ctx.fmtCurrency,
    )
    // CTS レコードを経過日数でスコープ（販売点数前年比の整合性確保）
    const effectiveDay = elapsedDays ?? calendarDaysInMonth
    const scopedCurQty = ctsRecords
      .filter((rec) => rec.day <= effectiveDay)
      .reduce((sum, rec) => sum + rec.totalQuantity, 0)
    const scopedPrevQty = prevCtsRecords
      .filter((rec) => rec.day <= effectiveDay)
      .reduce((sum, rec) => sum + rec.totalQuantity, 0)
    const yoyCards = buildYoYCards({
      result: ctx.result,
      prevYear: ctx.prevYear,
      config: effectiveConfig,
      ctsCurrentQty: scopedCurQty,
      ctsPrevQty: scopedPrevQty,
      fmtCurrency: ctx.fmtCurrency,
    })
    return buildUnifiedCards(budgetCards, yoyCards, hasMultipleStores)
  }, [
    ctx.result,
    elapsedDays,
    calendarDaysInMonth,
    ctx.fmtCurrency,
    ctx.prevYear,
    effectiveConfig,
    ctsRecords,
    prevCtsRecords,
    hasMultipleStores,
  ])

  // Group cards by section for display
  const budgetGroup = useMemo(() => allCards.filter((c) => c.group === 'budget'), [allCards])
  const yoyGroup = useMemo(() => allCards.filter((c) => c.group === 'yoy'), [allCards])

  // Card click dispatch
  const handleCardClick = useCallback((id: ConditionCardId) => {
    if (BUDGET_METRIC_IDS.has(id)) {
      setActiveMetric(id as MetricKey)
    } else if (YOY_DRILL_IDS.has(id)) {
      setYoYDrill(id as 'customerYoY' | 'txValue')
    }
  }, [])

  const handleBudgetClose = useCallback(() => setActiveMetric(null), [])

  const sortedStoreEntries = useMemo(
    () =>
      [...ctx.allStoreResults.entries()].sort(([, a], [, b]) => {
        const sa = ctx.stores.get(a.storeId)
        const sb = ctx.stores.get(b.storeId)
        return (sa?.code ?? a.storeId).localeCompare(sb?.code ?? b.storeId)
      }),
    [ctx.allStoreResults, ctx.stores],
  )

  return (
    <DashWrapper>
      {/* Header */}
      <Header>
        <div>
          <HeaderMeta>CONDITION SUMMARY</HeaderMeta>
          <HeaderTitle>コンディションサマリー</HeaderTitle>
        </div>
        <SettingsGear onClick={() => setShowSettings((p) => !p)} title="閾値設定">
          ⚙
        </SettingsGear>
      </Header>

      {showSettings && <ConditionSettingsPanelWidget stores={ctx.stores} />}

      {/* Budget context row */}
      <BudgetHeaderRow>
        <BudgetHeaderItem
          onClick={() => setActiveMetric('sales')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
        >
          <BudgetHeaderLabel>月間売上予算</BudgetHeaderLabel>
          <BudgetHeaderValue>{ctx.fmtCurrency(budgetHeader.monthlyBudget)}</BudgetHeaderValue>
        </BudgetHeaderItem>
        <BudgetHeaderItem
          onClick={() => setActiveMetric('gp')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
        >
          <BudgetHeaderLabel>月間粗利額予算</BudgetHeaderLabel>
          <BudgetHeaderValue>{ctx.fmtCurrency(budgetHeader.grossProfitBudget)}</BudgetHeaderValue>
        </BudgetHeaderItem>
        <BudgetHeaderItem
          onClick={() => setActiveMetric('gpRate')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
        >
          <BudgetHeaderLabel>月間粗利率予算</BudgetHeaderLabel>
          <BudgetHeaderValue>{formatPercent(budgetHeader.grossProfitRateBudget)}</BudgetHeaderValue>
        </BudgetHeaderItem>
        {budgetHeader.prevYearMonthlySales != null && (
          <BudgetHeaderItem>
            <BudgetHeaderLabel>月間前年売上</BudgetHeaderLabel>
            <BudgetHeaderValue>
              {ctx.fmtCurrency(budgetHeader.prevYearMonthlySales)}
            </BudgetHeaderValue>
          </BudgetHeaderItem>
        )}
        {budgetHeader.budgetVsPrevYear != null && (
          <BudgetHeaderItem>
            <BudgetHeaderLabel>予算前年比</BudgetHeaderLabel>
            <BudgetGrowthBadge $positive={budgetHeader.budgetVsPrevYear >= 1}>
              {formatPercent(budgetHeader.budgetVsPrevYear)}
            </BudgetGrowthBadge>
          </BudgetHeaderItem>
        )}
        {prevYearMode === 'sameDate' && budgetHeader.dowGap && (
          <>
            <BudgetHeaderItem
              onClick={() => ctx.onPrevYearDetail('sameDate')}
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
            >
              <BudgetHeaderLabel>曜日GAP({budgetHeader.dowGap.label})</BudgetHeaderLabel>
              <BudgetHeaderValue>
                {ctx.fmtCurrency(budgetHeader.dowGap.avgImpact)}
              </BudgetHeaderValue>
            </BudgetHeaderItem>
            {budgetHeader.dowGap.actualImpact != null && (
              <BudgetHeaderItem
                onClick={() => ctx.onPrevYearDetail('sameDate')}
                style={{ cursor: 'pointer' }}
                role="button"
                tabIndex={0}
              >
                <BudgetHeaderLabel>曜日GAP(実日)</BudgetHeaderLabel>
                <BudgetHeaderValue>
                  {ctx.fmtCurrency(budgetHeader.dowGap.actualImpact)}
                </BudgetHeaderValue>
              </BudgetHeaderItem>
            )}
          </>
        )}
      </BudgetHeaderRow>

      {/* Budget metric cards */}
      {budgetGroup.length > 0 && (
        <>
          <CardGroupLabel>予算達成</CardGroupLabel>
          <CardGridRow>
            {budgetGroup.map((card) => (
              <ConditionCardShell
                key={card.id}
                card={card}
                onClick={() => handleCardClick(card.id)}
              />
            ))}
          </CardGridRow>
        </>
      )}

      {/* YoY / Pace metric cards */}
      {yoyGroup.length > 0 && (
        <>
          <CardGroupLabel>前年比較</CardGroupLabel>
          <CardGridRow>
            {yoyGroup.map((card) => (
              <ConditionCardShell
                key={card.id}
                card={card}
                onClick={() => handleCardClick(card.id)}
              />
            ))}
          </CardGridRow>
        </>
      )}

      {/* Condition Matrix (DuckDB) */}
      <ConditionMatrixTable ctx={ctx} />

      {/* Budget drill-down overlay */}
      {activeMetric && (
        <ConditionSummaryBudgetDrill
          ctx={ctx}
          activeMetric={activeMetric}
          onClose={handleBudgetClose}
        />
      )}

      {/* YoY drill-down overlay */}
      {yoyDrill && (
        <DrillOverlay
          onClick={() => {
            setYoYDrill(null)
            setExpandedStore(null)
          }}
        >
          <DrillPanel onClick={(e) => e.stopPropagation()}>
            <DrillHeader>
              <DrillTitle>
                {yoyDrill === 'customerYoY' ? '客数前年比' : '客単価前年比'} 店別詳細
              </DrillTitle>
              <DrillCloseBtn
                onClick={() => {
                  setYoYDrill(null)
                  setExpandedStore(null)
                }}
                aria-label="閉じる"
              >
                ✕
              </DrillCloseBtn>
            </DrillHeader>
            <DrillBody>
              {yoyDrill === 'customerYoY' ? (
                <CustomerYoYDetailTable
                  sortedStoreEntries={sortedStoreEntries}
                  stores={ctx.stores}
                  result={ctx.result}
                  effectiveConfig={effectiveConfig}
                  displayMode={displayMode}
                  onDisplayModeChange={setDisplayMode}
                  settings={settings}
                  prevYear={ctx.prevYear}
                  prevYearMonthlyKpi={ctx.prevYearMonthlyKpi}
                  expandedStore={expandedStore}
                  onExpandToggle={(id) => setExpandedStore((prev) => (prev === id ? null : id))}
                  dataMaxDay={ctx.dataMaxDay}
                />
              ) : (
                <TxValueDetailTable
                  sortedStoreEntries={sortedStoreEntries}
                  stores={ctx.stores}
                  result={ctx.result}
                  effectiveConfig={effectiveConfig}
                  displayMode={displayMode}
                  onDisplayModeChange={setDisplayMode}
                  settings={settings}
                  expandedStore={expandedStore}
                  onExpandToggle={(id) => setExpandedStore((prev) => (prev === id ? null : id))}
                />
              )}
            </DrillBody>
            <Footer>
              <FooterNote>
                {yoyDrill === 'customerYoY'
                  ? '前年同曜日比 • 単位：人'
                  : '客単価 = 売上 ÷ 客数 • 単位：円'}
              </FooterNote>
              <LegendGroup>
                {[
                  { color: '#10b981', label: '達成' },
                  { color: '#eab308', label: '微未達' },
                  { color: '#ef4444', label: '未達' },
                ].map((item) => (
                  <LegendItem key={item.label}>
                    <LegendDot $color={item.color} />
                    {item.label}
                  </LegendItem>
                ))}
              </LegendGroup>
            </Footer>
          </DrillPanel>
        </DrillOverlay>
      )}
    </DashWrapper>
  )
})
