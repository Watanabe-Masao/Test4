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
import { useDuckDBCategoryTimeRecords } from '@/application/hooks/duckdb'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import type { DateRange } from '@/domain/models/calendar'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'
import { CategoryFactorBreakdown } from './CategoryFactorBreakdown'
import { decomposePriceMix } from './categoryFactorUtils'
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
import type { DecompLevel, ViewMode } from './YoYWaterfallChart.data'
import { buildFactorData, buildCategoryData } from './YoYWaterfallChart.data'
import {
  DecompHelpSection,
  SalesSummaryRow,
  PISummaryRow,
  WaterfallBarChart,
} from './YoYWaterfallChart.subcomponents'

const EMPTY_RECORDS: readonly CategoryTimeSalesRecord[] = []

export const YoYWaterfallChartWidget = memo(function YoYWaterfallChartWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
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
    ctx.comparisonFrame.previous.from.year,
  )

  // 期間指定に基づいて当年の売上・客数を日別データから再集計
  const periodCurSales = useMemo(() => {
    let sales = 0
    let customers = 0
    for (const [day, rec] of r.daily) {
      if (day >= dayStart && day <= dayEnd) {
        sales += rec.sales
        customers += rec.customers ?? 0
      }
    }
    return { sales, customers }
  }, [r.daily, dayStart, dayEnd])

  // 比較期間の売上・客数（前年比 or 前週比で切替）
  const periodPrevSales = useMemo(() => {
    let sales = 0
    let customers = 0
    if (activeCompMode === 'wow') {
      // 前週比: 同月の dayStart-7 ~ dayEnd-7
      for (const [day, rec] of r.daily) {
        if (day >= wowRange.prevStart && day <= wowRange.prevEnd) {
          sales += rec.sales
          customers += rec.customers ?? 0
        }
      }
    } else {
      // 前年比
      for (let d = dayStart; d <= dayEnd; d++) {
        const entry = prevYear.daily.get(toDateKeyFromParts(ctx.year, ctx.month, d))
        if (entry) {
          sales += entry.sales
          customers += entry.customers
        }
      }
    }
    return { sales, customers }
  }, [
    activeCompMode,
    r.daily,
    prevYear.daily,
    dayStart,
    dayEnd,
    wowRange.prevStart,
    wowRange.prevEnd,
    ctx.year,
    ctx.month,
  ])

  // 期間指定でCTSレコードをDuckDBから取得
  const curDateRange: DateRange = useMemo(
    () => ({
      from: { year: ctx.year, month: ctx.month, day: dayStart },
      to: { year: ctx.year, month: ctx.month, day: dayEnd },
    }),
    [ctx.year, ctx.month, dayStart, dayEnd],
  )

  const curCtsResult = useDuckDBCategoryTimeRecords(
    ctx.duckConn,
    ctx.duckDataVersion,
    curDateRange,
    ctx.selectedStoreIds,
  )
  const periodCTS = curCtsResult.data ?? EMPTY_RECORDS

  // 比較期間のCTSレコード（前年比 or 前週比で切替）
  const prevCtsDateRange: DateRange | undefined = useMemo(() => {
    if (activeCompMode === 'wow') {
      if (!canWoW) return undefined
      return {
        from: { year: ctx.year, month: ctx.month, day: wowRange.prevStart },
        to: { year: ctx.year, month: ctx.month, day: wowRange.prevEnd },
      }
    }
    // dowOffset を使って正確な比較日を計算（同曜日モードでも正しい期間を特定）
    const startDate = new Date(ctx.year, ctx.month - 1, dayStart)
    const endDate = new Date(ctx.year, ctx.month - 1, dayEnd)
    const offsetMs = ctx.comparisonFrame.dowOffset * 86400000
    const prevStart = new Date(startDate.getTime() + offsetMs)
    const prevEnd = new Date(endDate.getTime() + offsetMs)
    return {
      from: {
        year: prevStart.getFullYear(),
        month: prevStart.getMonth() + 1,
        day: prevStart.getDate(),
      },
      to: {
        year: prevEnd.getFullYear(),
        month: prevEnd.getMonth() + 1,
        day: prevEnd.getDate(),
      },
    }
  }, [
    activeCompMode,
    canWoW,
    ctx.year,
    ctx.month,
    ctx.comparisonFrame.dowOffset,
    dayStart,
    dayEnd,
    wowRange.prevStart,
    wowRange.prevEnd,
  ])

  const prevIsPrevYear = activeCompMode !== 'wow'
  const prevCtsResult = useDuckDBCategoryTimeRecords(
    ctx.duckConn,
    ctx.duckDataVersion,
    prevCtsDateRange,
    ctx.selectedStoreIds,
    prevIsPrevYear,
  )
  // フォールバック: 前年データが is_prev_year=false で格納されている場合
  const prevCtsFallbackResult = useDuckDBCategoryTimeRecords(
    ctx.duckConn,
    ctx.duckDataVersion,
    prevCtsDateRange,
    ctx.selectedStoreIds,
  )
  const periodPrevCTS =
    prevIsPrevYear && (prevCtsResult.data ?? []).length === 0
      ? (prevCtsFallbackResult.data ?? EMPTY_RECORDS)
      : (prevCtsResult.data ?? EMPTY_RECORDS)

  // Aggregate total quantity from filtered CTS records
  const curTotalQty = useMemo(
    () => periodCTS.reduce((s, rec) => s + rec.totalQuantity, 0),
    [periodCTS],
  )

  const prevTotalQty = useMemo(
    () => periodPrevCTS.reduce((s, rec) => s + rec.totalQuantity, 0),
    [periodPrevCTS],
  )

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
  const piSummary = useMemo(() => {
    if (activeLevel < 3 || !hasQuantity || prevCust <= 0 || curCust <= 0) return null
    const prevPI = calculateItemsPerCustomer(prevTotalQty, prevCust)
    const curPI = calculateItemsPerCustomer(curTotalQty, curCust)
    const prevPPI = calculateAveragePricePerItem(prevSales, prevTotalQty)
    const curPPI = calculateAveragePricePerItem(curSales, curTotalQty)
    return { prevPI, curPI, prevPPI, curPPI }
  }, [activeLevel, hasQuantity, prevCust, curCust, prevTotalQty, curTotalQty, prevSales, curSales])

  if (!hasComparison || prevSales <= 0) return null

  const hasCategoryView = categoryData.length > 0
  const hasCategoryFactorView = hasQuantity && hasCategoryView
  const data = viewMode === 'category' && hasCategoryView ? categoryData : factorData
  if (data.length === 0 && viewMode !== 'categoryFactor') return null

  return (
    <Wrapper>
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
