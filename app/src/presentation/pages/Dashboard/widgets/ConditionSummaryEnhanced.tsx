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
  computeRateTrend,
} from './ConditionSummaryEnhanced.vm'
import { extractPrevYearCustomerCount } from '@/features/comparison'
import { selectPrevYearSummaryFromFreePeriod } from '@/application/readModels/freePeriod'
import { formatPercent } from '@/domain/formatting'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { ScrollableCardRow } from './ConditionScrollableCardRow'
import { ConditionSummaryBudgetDrill } from './ConditionSummaryBudgetDrill'
import { ConditionSettingsPanelWidget } from './ConditionSettingsPanel'
import { YoYDrillOverlay, type YoYDrillType } from './ConditionSummaryYoYDrill'
import type { DisplayMode } from './conditionSummaryUtils'
import {
  DashWrapper,
  Header,
  HeaderTitle,
  BudgetHeaderRow,
  BudgetHeaderItem,
  BudgetHeaderLabel,
  BudgetHeaderValue,
  BudgetGrowthBadge,
  CardGroupLabel,
  SettingsGear,
  SectionHeader,
  SectionChevron,
  SectionContent,
  CardSkeletonRow,
  CardSkeletonItem,
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
  'qtyCustomerGap',
  'amtCustomerGap',
  'qtyCustomerGap',
  'amtCustomerGap',
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
  const [sectionOpen, setSectionOpen] = useState({ budget: true, yoy: true })

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

  // CTS 販売点数: 事前集計済みの値を使う（raw CTS レコードに直接触れない）
  const { currentCtsQuantity } = ctx

  // Phase 6 Step A: prev-year monthly sales を freePeriodLane.bundle.fact から射影する。
  // bundle 未ロード時 (hasPrevYear=false) は legacy prevYearMonthlyKpi にフォールバック。
  const fpPrevSummary = selectPrevYearSummaryFromFreePeriod(ctx.freePeriodLane?.bundle.fact ?? null)

  // Budget header
  const budgetHeader = useMemo(
    () =>
      buildBudgetHeader(
        ctx.result,
        ctx.prevYearMonthlyKpi,
        ctx.dowGap,
        prevYearMode === 'sameDow' ? 'sameDow' : 'sameDate',
        fpPrevSummary,
      ),
    [ctx.result, ctx.prevYearMonthlyKpi, ctx.dowGap, prevYearMode, fpPrevSummary],
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
    // CTS 販売点数: 当年は経過日数分の事前集計、前年も経過日数キャップ済みの daily から取得
    // （prevYearKpiEntry.ctsQuantity は月全体の値なので使わない — スコープ不一致防止）
    const effectiveDay = elapsedDays ?? calendarDaysInMonth
    const scopedCurQty = currentCtsQuantity.total
    const scopedPrevQty = ctx.prevYear.totalCtsQuantity
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
      curTotalCustomers: (() => {
        const cf = ctx.readModels?.customerFact
        return cf?.status === 'ready' ? cf.data.grandTotalCustomers : ctx.result.totalCustomers
      })(),
      prevTotalCustomers: extractPrevYearCustomerCount(ctx.prevYear),
    })
    // Trend computation (last 7 days vs previous 7 days)
    const trends = new Map<string, { direction: 'up' | 'down' | 'flat'; ratio: string }>()
    const salesTrend = computeTrend(ctx.result.daily, effectiveDay, (r) => r.sales)
    if (salesTrend) trends.set('sales', salesTrend)
    const custTrend = computeTrend(ctx.result.daily, effectiveDay, (r) => r.customers ?? 0)
    if (custTrend) trends.set('customerYoY', custTrend)
    const costTrend = computeTrend(ctx.result.daily, effectiveDay, (r) => r.totalCost)
    if (costTrend) trends.set('totalCost', costTrend)
    // 販売点数: 事前集計済み日別データからトレンド計算
    const itemsTrend = computeTrend(currentCtsQuantity.byDay, effectiveDay, (q: number) => q)
    if (itemsTrend) trends.set('itemsYoY', itemsTrend)
    // 売変率: 加重平均 (discount / grossSales)
    const discountTrend = computeRateTrend(
      ctx.result.daily,
      effectiveDay,
      (r) => r.discountAbsolute,
      (r) => r.grossSales,
    )
    if (discountTrend) trends.set('discountRate', discountTrend)
    // 客単価: 直近7日 vs 前7日の客単価（sales/customers）比
    if (effectiveDay >= 14) {
      let rSales = 0,
        rCust = 0,
        pSales = 0,
        pCust = 0
      for (let d = effectiveDay - 6; d <= effectiveDay; d++) {
        const rec = ctx.result.daily.get(d)
        if (rec) {
          rSales += rec.sales
          rCust += rec.customers ?? 0
        }
      }
      for (let d = effectiveDay - 13; d <= effectiveDay - 7; d++) {
        const rec = ctx.result.daily.get(d)
        if (rec) {
          pSales += rec.sales
          pCust += rec.customers ?? 0
        }
      }
      if (rCust > 0 && pCust > 0) {
        const ratio = rSales / rCust / (pSales / pCust)
        const dir: 'up' | 'down' | 'flat' = ratio >= 1.02 ? 'up' : ratio <= 0.98 ? 'down' : 'flat'
        trends.set('txValue', { direction: dir, ratio: formatPercent(ratio, 2) })
      }
    }
    // 値入率: (allPrice - allCost) / allPrice の加重平均
    const markupTrend = computeRateTrend(
      ctx.result.daily,
      effectiveDay,
      (r) => {
        const allPrice =
          r.purchase.price +
          r.flowers.price +
          r.directProduce.price +
          r.interStoreIn.price +
          r.interStoreOut.price +
          r.interDepartmentIn.price +
          r.interDepartmentOut.price
        const allCost =
          r.purchase.cost +
          r.flowers.cost +
          r.directProduce.cost +
          r.interStoreIn.cost +
          r.interStoreOut.cost +
          r.interDepartmentIn.cost +
          r.interDepartmentOut.cost
        return allPrice - allCost // markup amount (numerator)
      },
      (r) =>
        r.purchase.price +
        r.flowers.price +
        r.directProduce.price +
        r.interStoreIn.price +
        r.interStoreOut.price +
        r.interDepartmentIn.price +
        r.interDepartmentOut.price, // allPrice (denominator)
    )
    if (markupTrend) trends.set('markupRate', markupTrend)

    return buildUnifiedCards(budgetCards, yoyCards, hasMultipleStores, trends)
  }, [
    ctx.result,
    elapsedDays,
    calendarDaysInMonth,
    ctx.fmtCurrency,
    ctx.prevYear,
    ctx.readModels?.customerFact,
    effectiveConfig,
    currentCtsQuantity,
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
          title={
            budgetHeader.grossProfitBudget > 0
              ? undefined
              : '在庫設定ファイルで粗利額予算を入力してください'
          }
        >
          <BudgetHeaderLabel>月間粗利額予算</BudgetHeaderLabel>
          <BudgetHeaderValue>
            {budgetHeader.grossProfitBudget > 0
              ? ctx.fmtCurrency(budgetHeader.grossProfitBudget)
              : '未設定'}
          </BudgetHeaderValue>
        </BudgetHeaderItem>
        <BudgetHeaderItem
          onClick={() => setActiveMetric('gpRate')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          title={
            budgetHeader.grossProfitBudget > 0
              ? undefined
              : '粗利額予算が未設定のため算出できません'
          }
        >
          <BudgetHeaderLabel>月間粗利率予算</BudgetHeaderLabel>
          <BudgetHeaderValue>
            {budgetHeader.grossProfitBudget > 0
              ? formatPercent(budgetHeader.grossProfitRateBudget)
              : '未設定'}
          </BudgetHeaderValue>
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

      {/* Budget metric cards — collapsible + horizontal scroll */}
      {budgetGroup.length > 0 && (
        <>
          <SectionHeader
            onClick={() => setSectionOpen((p) => ({ ...p, budget: !p.budget }))}
            aria-expanded={sectionOpen.budget}
            aria-controls="condition-budget-cards"
          >
            <SectionChevron $open={sectionOpen.budget}>▶</SectionChevron>
            <CardGroupLabel>予算達成</CardGroupLabel>
          </SectionHeader>
          <SectionContent $open={sectionOpen.budget} id="condition-budget-cards">
            <div>
              <ScrollableCardRow cards={budgetGroup} onCardClick={handleCardClick} />
            </div>
          </SectionContent>
        </>
      )}

      {/* YoY / Pace metric cards — collapsible + horizontal scroll */}
      {(() => {
        const yoyLoading = ctx.readModels?.anyLoading ?? false
        if (yoyLoading) {
          return (
            <>
              <SectionHeader
                onClick={() => setSectionOpen((p) => ({ ...p, yoy: !p.yoy }))}
                aria-expanded={sectionOpen.yoy}
                aria-controls="condition-yoy-cards"
              >
                <SectionChevron $open={sectionOpen.yoy}>▶</SectionChevron>
                <CardGroupLabel>前年比較</CardGroupLabel>
              </SectionHeader>
              <SectionContent $open={sectionOpen.yoy} id="condition-yoy-cards">
                <div>
                  <CardSkeletonRow>
                    <CardSkeletonItem />
                    <CardSkeletonItem />
                    <CardSkeletonItem />
                  </CardSkeletonRow>
                </div>
              </SectionContent>
            </>
          )
        }
        if (yoyGroup.length === 0) return null
        return (
          <>
            <SectionHeader
              onClick={() => setSectionOpen((p) => ({ ...p, yoy: !p.yoy }))}
              aria-expanded={sectionOpen.yoy}
              aria-controls="condition-yoy-cards"
            >
              <SectionChevron $open={sectionOpen.yoy}>▶</SectionChevron>
              <CardGroupLabel>前年比較</CardGroupLabel>
            </SectionHeader>
            <SectionContent $open={sectionOpen.yoy} id="condition-yoy-cards">
              <div>
                <ScrollableCardRow cards={yoyGroup} onCardClick={handleCardClick} />
              </div>
            </SectionContent>
          </>
        )
      })()}

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
          currentCtsQuantity={currentCtsQuantity}
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
