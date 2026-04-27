/**
 * 比較ウォーターフォールチャート（前年比 / 前週比 対応）
 *
 * 基準売上 → 客数効果 → 客単価効果 → 当期売上 の要因分解を表示。
 * 分類別時間帯データがある場合は部門別の増減も表示する。
 * 期間スライダーで分析対象期間を動的に変更可能。
 * 前週比モード: 選択期間の7日前と比較。
 *
 * @responsibility R:unclassified
 */
import { useState, useMemo, memo } from 'react'
import { formatPercent } from '@/domain/formatting'
import type { DateRange } from '@/domain/models/calendar'
import { useYoYWaterfallPlan } from '@/application/hooks/plans/useYoYWaterfallPlan'
import { CategoryFactorBreakdown } from './CategoryFactorBreakdown'
import type { ComparisonMode } from './types'
import type { DashboardWidgetContext } from './DashboardWidgetContext'
import { wowPrevRange, comparisonLabels } from './types'
import {
  buildDateRanges,
  buildPeriodAggregates,
  buildPISummary,
} from './YoYWaterfallChart.builders'
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

interface YoYWaterfallProps {
  readonly ctx: DashboardWidgetContext
  /** 親から期間を指定する場合（embedded モード） */
  readonly overrideDateRange?: DateRange
  /** embedded モード: スライダー・比較モード切替・タイトルを非表示 */
  readonly embedded?: boolean
  readonly rangeStart?: number
  readonly rangeEnd?: number
}

export const YoYWaterfallChartWidget = memo(function YoYWaterfallChartWidget({
  ctx,
  overrideDateRange,
  embedded,
  rangeStart: rangeStartProp,
  rangeEnd: rangeEndProp,
}: YoYWaterfallProps) {
  const r = ctx.result
  const prevYear = ctx.prevYear
  const [viewMode, setViewMode] = useState<ViewMode>('factor')
  const [decompLevel, setDecompLevel] = useState<DecompLevel | null>(null)
  const [compMode, setCompMode] = useState<ComparisonMode>('yoy')
  const [showHelp, setShowHelp] = useState(false)

  const dayStart = rangeStartProp ?? 1
  const dayEnd = rangeEndProp ?? ctx.daysInMonth

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

  const dowOffset = ctx.comparisonScope?.dowOffset ?? 0

  // 日付範囲（2→1 useMemo に集約）
  // Phase 2b: 単一契約 `comparison: ComparisonResolvedRange` を受け取る。
  // `comparison.range` / `comparison.provenance` で比較先範囲と由来にアクセスする。
  const { curDateRange, comparison } = useMemo(
    () =>
      buildDateRanges({
        overrideDateRange,
        year: ctx.year,
        month: ctx.month,
        dayStart,
        dayEnd,
        activeCompMode,
        canWoW,
        dowOffset,
        wowPrevStart: wowRange.prevStart,
        wowPrevEnd: wowRange.prevEnd,
        comparisonScope: ctx.comparisonScope ?? null,
      }),
    [
      overrideDateRange,
      ctx.year,
      ctx.month,
      dayStart,
      dayEnd,
      activeCompMode,
      canWoW,
      dowOffset,
      wowRange.prevStart,
      wowRange.prevEnd,
      ctx.comparisonScope,
    ],
  )
  const prevCtsDateRange = comparison.range

  const prevIsPrevYear = activeCompMode !== 'wow'

  // ── Screen Query Plan（fallback-aware comparison） ──
  const plan = useYoYWaterfallPlan(ctx.queryExecutor, {
    curDateRange,
    prevDateRange: prevCtsDateRange,
    selectedStoreIds: ctx.selectedStoreIds,
    isPrevYear: prevIsPrevYear,
  })
  const periodCTS = plan.currentRecords
  const periodPrevCTS = plan.comparisonRecords

  // Phase 6.5-5b: 数量合計は categoryDailyLane bundle から取得する。
  // priceMix 分解は leaf-grain 必須 (Shapley 5-factor) のため CTS を継続利用。
  const categoryDailySeries = ctx.categoryDailyLane?.bundle.currentSeries ?? null
  const categoryDailyPrevSeries = ctx.categoryDailyLane?.bundle.comparisonSeries ?? null

  // ── CTS から売上・数量・Price/Mix を一括導出（5→1 useMemo に集約） ──
  const agg = useMemo(
    () =>
      buildPeriodAggregates({
        periodCTS,
        periodPrevCTS,
        categoryDailySeries,
        categoryDailyPrevSeries,
        activeCompMode,
        daily: r.daily,
        prevDaily: prevYear.daily,
        dayStart,
        dayEnd,
        wowPrevStart: wowRange.prevStart,
        wowPrevEnd: wowRange.prevEnd,
        year: ctx.year,
        month: ctx.month,
      }),
    [
      periodCTS,
      periodPrevCTS,
      categoryDailySeries,
      categoryDailyPrevSeries,
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
  const { periodCurSales, periodPrevSales, curTotalQty, prevTotalQty, priceMix, hasQuantity } = agg

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

  // Category-based decomposition data — Phase 6.5-5b で CategoryDailySeries 経由に移行
  const categoryData = useMemo(
    () =>
      buildCategoryData({
        categoryDailySeries,
        categoryDailyPrevSeries,
        hasComparison,
        prevSales,
        curSales,
        prevLabel: labels.prevLabel,
        curLabel: labels.curLabel,
      }),
    [
      categoryDailySeries,
      categoryDailyPrevSeries,
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
      buildPISummary({
        activeLevel,
        hasQuantity,
        prevCust,
        curCust,
        prevTotalQty,
        curTotalQty,
        prevSales,
        curSales,
      }),
    [activeLevel, hasQuantity, prevCust, curCust, prevTotalQty, curTotalQty, prevSales, curSales],
  )

  // CTS データ整合性チェック: CTS 売上合計と daily 売上合計を比較
  const ctsSalesTotal = periodCTS.reduce((s, rec) => s + rec.totalAmount, 0)
  const ctsCoverageRatio = curSales > 0 ? ctsSalesTotal / curSales : 1
  const hasCtsDataGap = ctsCoverageRatio < 0.5 && curSales > 0

  // 診断用: CTS のカバー店舗数・日数
  const ctsDiag = useMemo(() => {
    if (!hasCtsDataGap) return null
    const ctsStores = new Set<string>()
    const ctsDays = new Set<number>()
    for (const rec of periodCTS) {
      ctsStores.add(rec.storeId)
      ctsDays.add(rec.day)
    }
    let dailyDayCount = 0
    for (const [day] of r.daily) {
      if (day >= dayStart && day <= dayEnd) dailyDayCount++
    }
    return {
      ctsRecordCount: periodCTS.length,
      ctsStoreCount: ctsStores.size,
      ctsDayCount: ctsDays.size,
      dailyDayCount,
    }
  }, [hasCtsDataGap, periodCTS, r.daily, dayStart, dayEnd])

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
          分類別時間帯データ（CTS）が不足しています（カバー率 {formatPercent(ctsCoverageRatio, 1)}
          ）。価格・構成比の分解精度に影響します。
          {ctsDiag && (
            <span style={{ display: 'block', marginTop: 2, opacity: 0.85 }}>
              CTS: {ctsDiag.ctsStoreCount}店舗 × {ctsDiag.ctsDayCount}日分 /{' '}
              {ctsDiag.ctsRecordCount.toLocaleString()}件 — 日別売上: {ctsDiag.dailyDayCount}
              日分。インポート済みデータの対象月・店舗をご確認ください。
            </span>
          )}
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
