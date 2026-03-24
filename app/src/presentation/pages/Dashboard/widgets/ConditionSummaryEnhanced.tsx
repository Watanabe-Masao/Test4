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
  computeTrend,
} from './ConditionSummaryEnhanced.vm'
import { formatPercent } from '@/domain/formatting'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useDataStore } from '@/application/stores/dataStore'
import { ConditionCardShell } from './ConditionCardShell'
import { ConditionSummaryBudgetDrill } from './ConditionSummaryBudgetDrill'
import { ConditionSettingsPanelWidget } from './ConditionSettingsPanel'
import { YoYDrillOverlay, type YoYDrillType } from './ConditionSummaryYoYDrill'
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
} from './ConditionSummaryEnhanced.styles'

// ─── Card click handler type map ────────────────────────

const BUDGET_METRIC_IDS: ReadonlySet<string> = new Set([
  'sales',
  'gp',
  'gpRate',
  'markupRate',
  'discountRate',
])
const YOY_DRILL_IDS: ReadonlySet<string> = new Set([
  'customerYoY',
  'txValue',
  'itemsYoY',
  'requiredPace',
  'totalCost',
])

// ─── Component ──────────────────────────────────────────

export const ConditionSummaryEnhanced = memo(function ConditionSummaryEnhanced({
  ctx,
}: {
  readonly ctx: WidgetContext
}) {
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null)
  const [yoyDrill, setYoYDrill] = useState<YoYDrillType | null>(null)
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
    // 前年総仕入: prevYearStoreCostPrice の cost 合計
    const prevYearTotalCost =
      ctx.prevYearStoreCostPrice != null && ctx.prevYearStoreCostPrice.size > 0
        ? [...ctx.prevYearStoreCostPrice.values()].reduce((s, v) => s + v.cost, 0)
        : undefined
    const yoyCards = buildYoYCards({
      result: ctx.result,
      prevYear: ctx.prevYear,
      config: effectiveConfig,
      ctsCurrentQty: scopedCurQty,
      ctsPrevQty: scopedPrevQty,
      fmtCurrency: ctx.fmtCurrency,
      prevYearTotalCost,
      elapsedDays: effectiveDay,
      daysInMonth: calendarDaysInMonth,
    })
    // Trend computation (last 7 days vs previous 7 days)
    const trends = new Map<string, { direction: 'up' | 'down' | 'flat'; ratio: string }>()
    const salesTrend = computeTrend(ctx.result.daily, effectiveDay, (r) => r.sales)
    if (salesTrend) trends.set('sales', salesTrend)
    const custTrend = computeTrend(ctx.result.daily, effectiveDay, (r) => r.customers ?? 0)
    if (custTrend) trends.set('customerYoY', custTrend)
    const costTrend = computeTrend(ctx.result.daily, effectiveDay, (r) => r.totalCost)
    if (costTrend) trends.set('totalCost', costTrend)

    return buildUnifiedCards(budgetCards, yoyCards, hasMultipleStores, trends)
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
    ctx.prevYearStoreCostPrice,
  ])

  // Group cards by section for display
  const budgetGroup = useMemo(() => allCards.filter((c) => c.group === 'budget'), [allCards])
  const yoyGroup = useMemo(() => allCards.filter((c) => c.group === 'yoy'), [allCards])

  // Card click dispatch
  const handleCardClick = useCallback((id: ConditionCardId) => {
    if (BUDGET_METRIC_IDS.has(id)) {
      setActiveMetric(id as MetricKey)
    } else if (YOY_DRILL_IDS.has(id)) {
      setYoYDrill(id as YoYDrillType)
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
          <BudgetHeaderItem
            onClick={() => ctx.onPrevYearDetail(prevYearMode)}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
          >
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
        {prevYearMode === 'sameDow' && budgetHeader.dowGap?.actualImpact != null && (
          <BudgetHeaderItem
            onClick={() => ctx.onPrevYearDetail('sameDow')}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
          >
            <BudgetHeaderLabel>境界日GAP</BudgetHeaderLabel>
            <BudgetHeaderValue>
              {ctx.fmtCurrency(budgetHeader.dowGap.actualImpact)}
            </BudgetHeaderValue>
          </BudgetHeaderItem>
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
        <YoYDrillOverlay
          yoyDrill={yoyDrill}
          ctx={ctx}
          sortedStoreEntries={sortedStoreEntries}
          effectiveConfig={effectiveConfig}
          displayMode={displayMode}
          setDisplayMode={setDisplayMode}
          settings={settings}
          expandedStore={expandedStore}
          setExpandedStore={setExpandedStore}
          ctsRecords={ctsRecords}
          prevCtsRecords={prevCtsRecords}
          effectiveDay={elapsedDays ?? calendarDaysInMonth}
          onClose={() => {
            setYoYDrill(null)
            setExpandedStore(null)
          }}
        />
      )}
    </DashWrapper>
  )
})
