/**
 * コンディションサマリー（統一版）
 *
 * 予算達成メトリクス（売上・粗利額・粗利率・値入率・売変率）と
 * 前年比メトリクス（客数・販売点数・客単価・必要ベース比）を
 * 統一カードレジストリで管理。カードの並び替えは CONDITION_CARD_ORDER の変更で即反映。
 */
import { useState, useMemo, memo, useCallback } from 'react'
import type { DashboardWidgetContext } from './DashboardWidgetContext'
import {
  type MetricKey,
  type ConditionCardId,
  buildBudgetHeader,
  buildAllConditionCards,
} from './ConditionSummaryEnhanced.vm'
import { extractPrevYearCustomerCount } from '@/features/comparison'
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

/**
 * SP-B ADR-B-002: full ctx passthrough を絞り込み props 化。
 * 本 widget は ctx の多数の field を deep に使用するため Pick で narrow。
 * body 内では `const ctx = props` で従来の `ctx.X` access を温存。
 */
export type ConditionSummaryEnhancedProps = Pick<
  DashboardWidgetContext,
  | 'elapsedDays'
  | 'year'
  | 'month'
  | 'comparisonScope'
  | 'currentCtsQuantity'
  | 'result'
  | 'prevYearMonthlyKpi'
  | 'dowGap'
  | 'allStoreResults'
  | 'fmtCurrency'
  | 'prevYear'
  | 'prevYearStoreCostPrice'
  | 'readModels'
  | 'stores'
  | 'onPrevYearDetail'
  | 'daysInMonth'
  // sub-component (BudgetDrill / YoYDrill) で参照される追加 field
  | 'prevYearScope'
  | 'dataMaxDay'
  | 'queryExecutor'
>

export const ConditionSummaryEnhanced = memo(function ConditionSummaryEnhanced(
  props: ConditionSummaryEnhancedProps,
) {
  const ctx = props
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

  // Budget header
  // 月間ラベル (月間前年売上・予算前年比) は月全体粒度を保つため、期間スコープの
  // FreePeriodReadModel.comparisonSummary を使わず、prevYearMonthlyKpi から
  // selectMonthlyPrevYearSales 経由で取得する。詳細は buildBudgetHeader のコメント。
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

  // Unified card array (order controlled by CONDITION_CARD_ORDER).
  // 詳細な組み立ては builder 側 (buildAllConditionCards) に委譲。
  const customerFact = ctx.readModels?.customerFact
  const resolveCurTotalCustomers = useCallback(
    (effectiveDay: number) => {
      if (customerFact?.status === 'ready') {
        // grandTotalCustomers は月全体の値なので、スライダーの effectiveDay でスコープする
        let sum = 0
        for (const row of customerFact.data.daily) {
          if (row.day <= effectiveDay) sum += row.customers
        }
        return sum
      }
      return ctx.result.totalCustomers
    },
    [customerFact, ctx.result.totalCustomers],
  )
  const allCards = useMemo(
    () =>
      buildAllConditionCards({
        result: ctx.result,
        elapsedDays,
        calendarDaysInMonth,
        fmtCurrency: ctx.fmtCurrency,
        prevYear: ctx.prevYear,
        prevYearStoreCostPrice: ctx.prevYearStoreCostPrice,
        effectiveConfig,
        currentCtsQuantity,
        hasMultipleStores,
        resolveCurTotalCustomers,
        prevTotalCustomers: extractPrevYearCustomerCount(ctx.prevYear),
      }),
    [
      ctx.result,
      elapsedDays,
      calendarDaysInMonth,
      ctx.fmtCurrency,
      ctx.prevYear,
      ctx.prevYearStoreCostPrice,
      effectiveConfig,
      currentCtsQuantity,
      hasMultipleStores,
      resolveCurTotalCustomers,
    ],
  )

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
