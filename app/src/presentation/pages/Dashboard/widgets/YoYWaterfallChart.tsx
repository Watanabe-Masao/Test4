/**
 * 比較ウォーターフォールチャート（前年比 / 前週比 対応）
 *
 * 基準売上 → 客数効果 → 客単価効果 → 当期売上 の要因分解を表示。
 * 分類別時間帯データがある場合は部門別の増減も表示する。
 * 期間スライダーで分析対象期間を動的に変更可能。
 * 前週比モード: 選択期間の7日前と比較。
 */
import { useState, useMemo, memo } from 'react'
import { DualPeriodSlider, useDualPeriodRange } from '@/presentation/components/charts'
import {
  calculateItemsPerCustomer,
  calculateAveragePricePerItem,
} from '@/domain/calculations/utils'
import { formatPercent } from '@/domain/formatting'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  categoryTimeRecordsHandler,
  type CategoryTimeRecordsInput,
} from '@/application/queries/cts'
import type { DateRange } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/calendar'
import {
  calculatePrevCtsDateRange,
  aggregatePeriodCurSales,
  aggregatePeriodPrevSales,
  calculatePISummary,
} from './YoYWaterfallChart.logic'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'
import { CategoryFactorBreakdown } from './CategoryFactorBreakdown'
import { decomposePriceMix } from './categoryFactorUtils'
import { aggregateTotalQuantity } from './YoYWaterfallChart.vm'
import type { WidgetContext, ComparisonMode } from './types'
import { wowPrevRange, comparisonLabels } from './types'
import {
  Wrapper,
  Title,
  Subtitle,
  TabRow,
  TabBtn,
  ModeRow,
  ModeBtn,
  DecompRow,
  DecompBtn,
} from './YoYWaterfallChart.styles'
import { AMOUNT_RECONCILIATION_TOLERANCE } from '@/domain/constants'
import type { DecompLevel, ViewMode } from './YoYWaterfallChart.data'
import { buildFactorData, buildCategoryData } from './YoYWaterfallChart.data'
import {
  DecompHelpSection,
  SalesSummaryRow,
  PISummaryRow,
  WaterfallBarChart,
} from './YoYWaterfallChart.subcomponents'

const EMPTY_RECORDS: readonly CategoryTimeSalesRecord[] = []

interface YoYWaterfallProps {
  readonly ctx: WidgetContext
  /** 親から期間を指定する場合（embedded モード） */
  readonly overrideDateRange?: DateRange
  /** embedded モード: スライダー・比較モード切替・タイトルを非表示 */
  readonly embedded?: boolean
}

export const YoYWaterfallChartWidget = memo(function YoYWaterfallChartWidget({
  ctx,
  overrideDateRange,
  embedded,
}: YoYWaterfallProps) {
  const r = ctx.result
  const prevYear = ctx.prevYear
  const [viewMode, setViewMode] = useState<ViewMode>('factor')
  const [decompLevel, setDecompLevel] = useState<DecompLevel | null>(null)
  const [compMode, setCompMode] = useState<ComparisonMode>('yoy')
  const [showHelp, setShowHelp] = useState(false)

  // Period slider state
  const {
    p1Start: dayStart,
    p1End: dayEnd,
    onP1Change: setDayRange,
    p2Start,
    p2End,
    onP2Change,
    p2Enabled,
  } = useDualPeriodRange(ctx.daysInMonth)

  // WoW availability check — canWoW が false なら yoy にフォールバック（派生状態）
  const wowRange = wowPrevRange(dayStart, dayEnd)
  const canWoW = wowRange.isValid
  const activeCompMode: ComparisonMode = compMode === 'wow' && !canWoW ? 'yoy' : compMode
  const labels = comparisonLabels(
    activeCompMode,
    ctx.year,
    dayStart,
    dayEnd,
    ctx.prevYearScope?.dateRange.from.year,
  )

  // ── 共通パイプライン: CTS から当年/比較期間のデータを統一取得 ──

  // 当年 CTS 日付範囲（embedded 時は親から、通常はスライダー連動）
  const curDateRange: DateRange = useMemo(
    () =>
      overrideDateRange ?? {
        from: { year: ctx.year, month: ctx.month, day: dayStart },
        to: { year: ctx.year, month: ctx.month, day: dayEnd },
      },
    [overrideDateRange, ctx.year, ctx.month, dayStart, dayEnd],
  )

  // 比較期間 CTS 日付範囲（前年比: dowOffset 調整済み / 前週比: -7日）
  const dowOffset = ctx.comparisonScope?.dowOffset ?? 0
  const prevCtsDateRange: DateRange | undefined = useMemo(
    () =>
      calculatePrevCtsDateRange(
        activeCompMode,
        canWoW,
        ctx.year,
        ctx.month,
        dayStart,
        dayEnd,
        dowOffset,
        wowRange.prevStart,
        wowRange.prevEnd,
      ),
    [
      activeCompMode,
      canWoW,
      ctx.year,
      ctx.month,
      dayStart,
      dayEnd,
      dowOffset,
      wowRange.prevStart,
      wowRange.prevEnd,
    ],
  )

  const prevIsPrevYear = activeCompMode !== 'wow'

  // CTS クエリ発行（当年 + 比較期間） — QueryHandler 経由
  const curCtsInput = useMemo<CategoryTimeRecordsInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(curDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: ctx.selectedStoreIds.size > 0 ? [...ctx.selectedStoreIds] : undefined,
    }
  }, [curDateRange, ctx.selectedStoreIds])

  const prevCtsInput = useMemo<CategoryTimeRecordsInput | null>(() => {
    if (!prevCtsDateRange) return null
    const { fromKey, toKey } = dateRangeToKeys(prevCtsDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: ctx.selectedStoreIds.size > 0 ? [...ctx.selectedStoreIds] : undefined,
      isPrevYear: prevIsPrevYear,
    }
  }, [prevCtsDateRange, ctx.selectedStoreIds, prevIsPrevYear])

  const prevCtsFallbackInput = useMemo<CategoryTimeRecordsInput | null>(() => {
    if (!prevCtsDateRange || !prevIsPrevYear) return null
    const { fromKey, toKey } = dateRangeToKeys(prevCtsDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: ctx.selectedStoreIds.size > 0 ? [...ctx.selectedStoreIds] : undefined,
    }
  }, [prevCtsDateRange, ctx.selectedStoreIds, prevIsPrevYear])

  const { data: curCtsOutput } = useQueryWithHandler(
    ctx.queryExecutor,
    categoryTimeRecordsHandler,
    curCtsInput,
  )
  const periodCTS = curCtsOutput?.records ?? EMPTY_RECORDS

  const { data: prevCtsOutput } = useQueryWithHandler(
    ctx.queryExecutor,
    categoryTimeRecordsHandler,
    prevCtsInput,
  )
  // フォールバック: 前年データが is_prev_year=false で格納されている場合
  const { data: prevCtsFallbackOutput } = useQueryWithHandler(
    ctx.queryExecutor,
    categoryTimeRecordsHandler,
    prevCtsFallbackInput,
  )
  const periodPrevCTS =
    prevIsPrevYear && (prevCtsOutput?.records ?? []).length === 0
      ? (prevCtsFallbackOutput?.records ?? EMPTY_RECORDS)
      : (prevCtsOutput?.records ?? EMPTY_RECORDS)

  // ── CTS から売上合計を導出（部門内訳と同一データソース） ──
  const periodCurSales = useMemo(
    () => aggregatePeriodCurSales(periodCTS, r.daily, dayStart, dayEnd),
    [periodCTS, r.daily, dayStart, dayEnd],
  )

  const periodPrevSales = useMemo(
    () =>
      aggregatePeriodPrevSales(
        periodPrevCTS,
        activeCompMode,
        r.daily,
        prevYear.daily,
        dayStart,
        dayEnd,
        wowRange.prevStart,
        wowRange.prevEnd,
        ctx.year,
        ctx.month,
      ),
    [
      periodPrevCTS,
      activeCompMode,
      r.daily,
      prevYear.daily,
      dayStart,
      dayEnd,
      wowRange.prevStart,
      wowRange.prevEnd,
      ctx.year,
      ctx.month,
    ],
  )

  // Aggregate total quantity from filtered CTS records (vm 関数に委譲)
  const curTotalQty = useMemo(() => aggregateTotalQuantity(periodCTS), [periodCTS])
  const prevTotalQty = useMemo(() => aggregateTotalQuantity(periodPrevCTS), [periodPrevCTS])

  const hasQuantity = curTotalQty > 0 && prevTotalQty > 0

  // Price/Mix decomposition of unit price change
  const priceMix = useMemo(() => {
    if (periodCTS.length === 0 || periodPrevCTS.length === 0) return null
    return decomposePriceMix(periodCTS, periodPrevCTS)
  }, [periodCTS, periodPrevCTS])

  // Available decomposition levels
  const maxLevel: DecompLevel = priceMix ? 5 : hasQuantity ? 3 : 2
  const activeLevel = decompLevel ?? maxLevel

  // Use period-specific aggregated values
  const curSales = periodCurSales.sales
  const curCust = periodCurSales.customers
  const prevSales = periodPrevSales.sales
  const prevCust = periodPrevSales.customers

  // Comparison availability
  const hasComparison = activeCompMode === 'yoy' ? prevYear.hasPrevYear : canWoW

  // Factor decomposition data (Shapley values)
  const factorData = useMemo(
    () =>
      buildFactorData({
        hasComparison,
        prevSales,
        curSales,
        prevCust,
        curCust,
        hasQuantity,
        curTotalQty,
        prevTotalQty,
        priceMix,
        activeLevel,
        periodCTS,
        periodPrevCTS,
        prevLabel: labels.prevLabel,
        curLabel: labels.curLabel,
      }),
    [
      hasComparison,
      prevSales,
      curSales,
      prevCust,
      curCust,
      hasQuantity,
      curTotalQty,
      prevTotalQty,
      priceMix,
      activeLevel,
      periodCTS,
      periodPrevCTS,
      labels.prevLabel,
      labels.curLabel,
    ],
  )

  // Category-based decomposition data
  const categoryData = useMemo(
    () =>
      buildCategoryData({
        periodCTS,
        periodPrevCTS,
        hasComparison,
        prevSales,
        curSales,
        prevLabel: labels.prevLabel,
        curLabel: labels.curLabel,
      }),
    [
      periodCTS,
      periodPrevCTS,
      hasComparison,
      prevSales,
      curSales,
      labels.prevLabel,
      labels.curLabel,
    ],
  )

  // PI値・点単価（3要素以上の分解時に表示）
  const piSummary = useMemo(
    () =>
      calculatePISummary(
        activeLevel,
        hasQuantity,
        prevCust,
        curCust,
        prevTotalQty,
        curTotalQty,
        prevSales,
        curSales,
        calculateItemsPerCustomer,
        calculateAveragePricePerItem,
      ),
    [activeLevel, hasQuantity, prevCust, curCust, prevTotalQty, curTotalQty, prevSales, curSales],
  )

  // CTS データ整合性チェック: CTS 売上合計と daily 売上合計を比較
  const ctsSalesTotal = periodCTS.reduce((s, rec) => s + rec.totalAmount, 0)
  const ctsCoverageRatio = curSales > 0 ? ctsSalesTotal / curSales : 1
  const hasCtsDataGap = ctsCoverageRatio < 0.5 && curSales > 0

  if (!hasComparison || prevSales <= 0) return null

  const hasCategoryView = categoryData.items.length > 0
  const hasCategoryFactorView = hasQuantity && hasCategoryView
  const data = viewMode === 'category' && hasCategoryView ? categoryData.items : factorData
  if (data.length === 0 && viewMode !== 'categoryFactor') return null

  // データ整合性バリデーション: 額の積み上げなので残差は本来0
  const showResidualWarning =
    viewMode === 'category' &&
    hasCategoryView &&
    categoryData.residualPct > AMOUNT_RECONCILIATION_TOLERANCE

  return (
    <Wrapper
      style={embedded ? { padding: 0, border: 'none', background: 'transparent' } : undefined}
    >
      {!embedded && (
        <>
          <Title>
            {activeCompMode === 'yoy' ? '前年比較' : '前週比較'}ウォーターフォール（要因分解）
          </Title>
          <Subtitle>
            {labels.prevLabel}売上から{labels.curLabel}売上への変動要因を可視化
          </Subtitle>

          <ModeRow>
            <ModeBtn $active={compMode === 'yoy'} onClick={() => setCompMode('yoy')}>
              前年比
            </ModeBtn>
            <ModeBtn
              $active={compMode === 'wow'}
              onClick={() => canWoW && setCompMode('wow')}
              style={canWoW ? undefined : { opacity: 0.4, cursor: 'not-allowed' }}
            >
              前週比
            </ModeBtn>
          </ModeRow>

          <DualPeriodSlider
            min={1}
            max={ctx.daysInMonth}
            p1Start={dayStart}
            p1End={dayEnd}
            onP1Change={setDayRange}
            p2Start={p2Start}
            p2End={p2End}
            onP2Change={onP2Change}
            p2Enabled={p2Enabled}
            elapsedDays={ctx.elapsedDays}
          />
        </>
      )}

      {(hasCategoryView || hasCategoryFactorView) && (
        <TabRow>
          <TabBtn $active={viewMode === 'factor'} onClick={() => setViewMode('factor')}>
            要因分解
          </TabBtn>
          {hasCategoryView && (
            <TabBtn $active={viewMode === 'category'} onClick={() => setViewMode('category')}>
              部門別増減
            </TabBtn>
          )}
          {hasCategoryFactorView && (
            <TabBtn
              $active={viewMode === 'categoryFactor'}
              onClick={() => setViewMode('categoryFactor')}
            >
              部門別要因分解
            </TabBtn>
          )}
        </TabRow>
      )}

      {viewMode === 'factor' && maxLevel >= 3 && (
        <DecompRow>
          <DecompBtn $active={activeLevel === 2} onClick={() => setDecompLevel(2)}>
            客数・客単価
          </DecompBtn>
          <DecompBtn $active={activeLevel === 3} onClick={() => setDecompLevel(3)}>
            客数・点数・単価
          </DecompBtn>
          {maxLevel === 5 && (
            <DecompBtn $active={activeLevel === 5} onClick={() => setDecompLevel(5)}>
              5要素（価格+構成比）
            </DecompBtn>
          )}
        </DecompRow>
      )}

      {viewMode === 'factor' && (
        <DecompHelpSection
          showHelp={showHelp}
          onToggle={() => setShowHelp(!showHelp)}
          activeLevel={activeLevel}
        />
      )}

      {hasCtsDataGap && (
        <div
          style={{
            padding: '6px 12px',
            marginBottom: 8,
            fontSize: '0.6rem',
            color: '#b45309',
            background: 'rgba(245,158,11,0.08)',
            borderRadius: 6,
            border: '1px solid rgba(245,158,11,0.2)',
          }}
        >
          分類別時間帯データ（CTS）が不足しています（カバー率{' '}
          {formatPercent(ctsCoverageRatio, 1)}）。要因分解の精度に影響する可能性があります。
        </div>
      )}

      <SalesSummaryRow
        prevLabel={labels.prevLabel}
        curLabel={labels.curLabel}
        prevSales={prevSales}
        curSales={curSales}
      />

      {piSummary && (
        <PISummaryRow
          prevLabel={labels.prevLabel}
          curLabel={labels.curLabel}
          prevPI={piSummary.prevPI}
          curPI={piSummary.curPI}
          prevPPI={piSummary.prevPPI}
          curPPI={piSummary.curPPI}
        />
      )}

      {showResidualWarning && (
        <div
          style={{
            padding: '6px 12px',
            marginBottom: 8,
            fontSize: '0.6rem',
            color: '#b45309',
            background: 'rgba(245,158,11,0.08)',
            borderRadius: 6,
            border: '1px solid rgba(245,158,11,0.2)',
          }}
        >
          部門合計と全体合計に差異があります（調整{' '}
          {Math.round(categoryData.residual).toLocaleString()}円 /{' '}
          {formatPercent(categoryData.residualPct)}）。データの信頼性を確認してください。
        </div>
      )}

      {viewMode === 'categoryFactor' ? (
        <CategoryFactorBreakdown
          curRecords={periodCTS}
          prevRecords={periodPrevCTS}
          curCustomers={curCust}
          prevCustomers={prevCust}
          curLabel={labels.curLabel}
          prevLabel={labels.prevLabel}
        />
      ) : (
        <WaterfallBarChart data={data} />
      )}
    </Wrapper>
  )
})
