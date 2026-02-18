import { useState, type ReactNode } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell as ReCell, CartesianGrid,
  AreaChart, Area,
} from 'recharts'
import { Button } from '@/presentation/components/common'
import { formatCurrency, formatPercent, formatPointDiff, safeDivide } from '@/domain/calculations/utils'
import { getDailyTotalCost } from '@/domain/models/DailyRecord'
import { calculatePinIntervals } from '@/domain/calculations/pinIntervals'
import type { WidgetContext } from './types'
import {
  ExecGrid, ExecColumn, ExecColHeader, ExecColTag, ExecColTitle, ExecColSub,
  ExecBody, ExecRow, ExecLabel, ExecVal, ExecSub, ExecDividerLine,
  CalWrapper, CalSectionTitle, CalTable, CalTh, CalTd, CalDayNum, CalGrid, CalCell, CalDivider,
  CalDayCell, CalDayHeader, CalActionBtn, CalDataArea,
  PinIndicator, IntervalSummary, IntervalCard, IntervalMetricLabel, IntervalMetricValue,
  PinModalOverlay, PinModalContent, PinModalTitle, PinInputField, PinButtonRow, PinInputLabel,
  DetailModalContent, DetailHeader, DetailTitle, DetailCloseBtn,
  DetailKpiGrid, DetailKpiCard, DetailKpiLabel, DetailKpiValue,
  DetailSection, DetailSectionTitle, DetailRow, DetailLabel, DetailValue,
  DetailBarWrapper, DetailBarRow, DetailBarLabel, DetailBarTrack, DetailBarFill, DetailBarAmount,
  DetailChartWrapper, DetailColumns,
  ForecastToolsGrid, ToolCard, ToolCardTitle, ToolInputGroup, ToolInputField,
  ToolResultSection, ToolResultValue, ToolResultLabel,
  RangeToolbar, RangeLabel, RangeInput,
  RangeSummaryPanel, RangeSummaryTitle, RangeSummaryGrid,
  RangeSummaryItem, RangeSummaryItemLabel, RangeSummaryItemValue,
  RangeCompareContainer, RangeColumn, RangeColumnHeader, RangeColumnDot, RangeColumnTitle,
  RangeMetricRow, RangeMetricLabel, RangeMetricValue,
  RangeCenterCol, RangeCenterHeader,
  CompareBarRow, CompareBarLabel, CompareBarDiff, CompareBarTrack, CompareBarSegment,
  CompareIndicator, CompareIndicatorValue, CompareIndicatorLabel,
} from '../DashboardPage.styles'

/** 千円表記 (コンパクト) */
function fmtSen(n: number): string {
  const sen = Math.round(n / 1_000)
  return `${sen.toLocaleString()}千`
}

/** 千円表記 (符号付き) */
function fmtSenDiff(n: number): string {
  const sen = Math.round(n / 1_000)
  return `${sen >= 0 ? '+' : ''}${sen.toLocaleString()}千`
}

function ExecMetric({ label, value, sub, subColor }: {
  label: string
  value: string
  sub?: string
  subColor?: string
}) {
  return (
    <div>
      <ExecRow>
        <ExecLabel>{label}</ExecLabel>
        <ExecVal>{value}</ExecVal>
      </ExecRow>
      {sub && <ExecSub $color={subColor}>{sub}</ExecSub>}
    </div>
  )
}

export function renderPlanActualForecast(ctx: WidgetContext): ReactNode {
  const r = ctx.result
  const { daysInMonth } = ctx

  let elapsedBudget = 0
  for (let d = 1; d <= r.elapsedDays; d++) {
    elapsedBudget += r.budgetDaily.get(d) ?? 0
  }

  const actualGP = r.invMethodGrossProfit ?? r.estMethodMargin
  const actualGPRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate

  const elapsedGPBudget = r.grossProfitBudget > 0
    ? r.grossProfitBudget * safeDivide(r.elapsedDays, daysInMonth)
    : 0

  const remainingDays = daysInMonth - r.elapsedDays
  const dailyAvgGP = r.salesDays > 0 ? actualGP / r.salesDays : 0
  const projectedGP = actualGP + dailyAvgGP * remainingDays

  const salesAchievement = safeDivide(r.totalSales, elapsedBudget)
  const progressRatio = safeDivide(
    safeDivide(r.totalSales, r.budget),
    safeDivide(r.elapsedDays, daysInMonth),
  )
  const projectedGPAchievement = safeDivide(projectedGP, r.grossProfitBudget)

  return (
    <ExecGrid>
      <ExecColumn>
        <ExecColHeader $color="#6366f1">
          <ExecColTag>PLAN</ExecColTag>
          <ExecColTitle>前提</ExecColTitle>
          <ExecColSub>予算・在庫</ExecColSub>
        </ExecColHeader>
        <ExecBody>
          <ExecMetric label="月間売上予算" value={formatCurrency(r.budget)} />
          <ExecMetric label="月間粗利額予算" value={formatCurrency(r.grossProfitBudget)} />
          <ExecMetric label="月間粗利率予算" value={formatPercent(r.grossProfitRateBudget)} />
          <ExecDividerLine />
          <ExecMetric label="期首在庫" value={formatCurrency(r.openingInventory)} />
          <ExecMetric label="期末在庫目標" value={formatCurrency(r.closingInventory)} />
        </ExecBody>
      </ExecColumn>

      <ExecColumn>
        <ExecColHeader $color="#22c55e">
          <ExecColTag>ACTUAL</ExecColTag>
          <ExecColTitle>現在地</ExecColTitle>
          <ExecColSub>期中実績（{r.elapsedDays}日経過 / {r.salesDays}営業日）</ExecColSub>
        </ExecColHeader>
        <ExecBody>
          <ExecMetric label="期中売上予算" value={formatCurrency(elapsedBudget)} />
          <ExecMetric
            label="期中売上実績"
            value={formatCurrency(r.totalSales)}
            sub={`差異: ${formatCurrency(r.totalSales - elapsedBudget)}`}
            subColor={r.totalSales >= elapsedBudget ? '#22c55e' : '#ef4444'}
          />
          <ExecMetric
            label="売上達成率"
            value={formatPercent(salesAchievement)}
            sub={`進捗比: ${formatPercent(progressRatio)}`}
          />
          {ctx.prevYear.hasPrevYear && ctx.prevYear.totalSales > 0 && (() => {
            const pyRatio = r.totalSales / ctx.prevYear.totalSales
            return (
              <>
                <ExecDividerLine />
                <ExecMetric
                  label="前年同曜日売上"
                  value={formatCurrency(ctx.prevYear.totalSales)}
                />
                <ExecMetric
                  label="前年同曜日比"
                  value={formatPercent(pyRatio)}
                  subColor={pyRatio >= 1 ? '#22c55e' : '#ef4444'}
                />
              </>
            )
          })()}
          <ExecDividerLine />
          <ExecMetric
            label="期中粗利額実績"
            value={formatCurrency(actualGP)}
            sub={`差異: ${formatCurrency(actualGP - elapsedGPBudget)}`}
            subColor={actualGP >= elapsedGPBudget ? '#22c55e' : '#ef4444'}
          />
          <ExecMetric
            label="期中粗利率実績"
            value={formatPercent(actualGPRate)}
            sub={`予算比: ${formatPointDiff(actualGPRate - r.grossProfitRateBudget)}`}
            subColor={actualGPRate >= r.grossProfitRateBudget ? '#22c55e' : '#ef4444'}
          />
          {r.totalConsumable > 0 && (() => {
            // 在庫法: 現在の粗利率は消耗品控除前 → 控除後を計算
            // 推定法: 現在の粗利率は消耗品控除後 → 控除前を計算
            const isInvMethod = r.invMethodGrossProfitRate != null
            const beforeRate = isInvMethod
              ? r.invMethodGrossProfitRate!
              : safeDivide(r.estMethodMargin + r.totalConsumable, r.totalCoreSales, 0)
            const afterRate = isInvMethod
              ? safeDivide(r.invMethodGrossProfit! - r.totalConsumable, r.totalSales, 0)
              : r.estMethodMarginRate
            return (
              <>
                <ExecMetric
                  label="原価算入比（消耗品費）"
                  value={formatCurrency(r.totalConsumable)}
                />
                <ExecMetric
                  label="粗利率（消耗品控除前）"
                  value={formatPercent(beforeRate)}
                />
                <ExecMetric
                  label="原算後粗利率"
                  value={formatPercent(afterRate)}
                  sub={`減算: ${formatPointDiff(beforeRate - afterRate)}`}
                />
              </>
            )
          })()}
        </ExecBody>
      </ExecColumn>

      <ExecColumn>
        <ExecColHeader $color="#f59e0b">
          <ExecColTag>FORECAST</ExecColTag>
          <ExecColTitle>着地</ExecColTitle>
          <ExecColSub>営業日ベース予測</ExecColSub>
        </ExecColHeader>
        <ExecBody>
          <ExecMetric
            label="月末売上着地"
            value={formatCurrency(r.projectedSales)}
            sub={`予算差: ${formatCurrency(r.projectedSales - r.budget)}`}
            subColor={r.projectedSales >= r.budget ? '#22c55e' : '#ef4444'}
          />
          <ExecMetric
            label="着地売上達成率"
            value={formatPercent(r.projectedAchievement)}
          />
          <ExecDividerLine />
          <ExecMetric
            label="月末粗利着地"
            value={formatCurrency(projectedGP)}
            sub={`予算差: ${formatCurrency(projectedGP - r.grossProfitBudget)}`}
            subColor={projectedGP >= r.grossProfitBudget ? '#22c55e' : '#ef4444'}
          />
          <ExecMetric
            label="着地粗利達成率"
            value={formatPercent(projectedGPAchievement)}
          />
        </ExecBody>
      </ExecColumn>
    </ExecGrid>
  )
}

export function MonthlyCalendarWidget({ ctx }: { ctx: WidgetContext }) {
  const { result: r, daysInMonth, year, month, prevYear } = ctx
  const [pins, setPins] = useState<Map<number, number>>(new Map())
  const [pinDay, setPinDay] = useState<number | null>(null)
  const [detailDay, setDetailDay] = useState<number | null>(null)
  const [inputVal, setInputVal] = useState('')
  const [rangeAStart, setRangeAStart] = useState<string>('')
  const [rangeAEnd, setRangeAEnd] = useState<string>('')
  const [rangeBStart, setRangeBStart] = useState<string>('')
  const [rangeBEnd, setRangeBEnd] = useState<string>('')
  const DOW_LABELS = ['月', '火', '水', '木', '金', '土', '日']
  const DOW_NAMES = ['日', '月', '火', '水', '木', '金', '土']

  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = []
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7
  for (let i = 0; i < firstDow; i++) currentWeek.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }

  const cumBudget = new Map<number, number>()
  const cumSales = new Map<number, number>()
  const cumPrevYear = new Map<number, number>()
  let runBudget = 0
  let runSales = 0
  let runPrevYear = 0
  for (let d = 1; d <= daysInMonth; d++) {
    runBudget += r.budgetDaily.get(d) ?? 0
    runSales += (r.daily.get(d)?.sales ?? 0)
    runPrevYear += prevYear.daily.get(d)?.sales ?? 0
    cumBudget.set(d, runBudget)
    cumSales.set(d, runSales)
    cumPrevYear.set(d, runPrevYear)
  }

  // ── Range selection ──
  const parseDay = (v: string) => { const n = parseInt(v, 10); return n >= 1 && n <= daysInMonth ? n : null }
  const rangeA = { start: parseDay(rangeAStart), end: parseDay(rangeAEnd) }
  const rangeB = { start: parseDay(rangeBStart), end: parseDay(rangeBEnd) }

  const calcRange = (start: number | null, end: number | null) => {
    if (start == null || end == null || start > end) return null
    let budget = 0, sales = 0, pySales = 0, salesDaysCount = 0
    for (let d = start; d <= end; d++) {
      budget += r.budgetDaily.get(d) ?? 0
      const daySales = r.daily.get(d)?.sales ?? 0
      sales += daySales
      pySales += prevYear.daily.get(d)?.sales ?? 0
      if (daySales > 0) salesDaysCount++
    }
    const diff = sales - budget
    const ach = safeDivide(sales, budget)
    const pyRatio = safeDivide(sales, pySales)
    const avgDaily = salesDaysCount > 0 ? sales / salesDaysCount : 0
    return { start, end, budget, sales, diff, ach, pySales, pyRatio, salesDaysCount, avgDaily }
  }
  const rangeAData = calcRange(rangeA.start, rangeA.end)
  const rangeBData = calcRange(rangeB.start, rangeB.end)
  const hasAnyRange = rangeAData != null || rangeBData != null

  const isDayInRangeA = (day: number) => rangeA.start != null && rangeA.end != null && day >= rangeA.start && day <= rangeA.end
  const isDayInRangeB = (day: number) => rangeB.start != null && rangeB.end != null && day >= rangeB.start && day <= rangeB.end

  const handleRangeClear = () => {
    setRangeAStart(''); setRangeAEnd('')
    setRangeBStart(''); setRangeBEnd('')
  }

  const sortedPins = [...pins.entries()].sort((a, b) => a[0] - b[0])
  const intervals = calculatePinIntervals(r.daily, r.openingInventory, sortedPins)
  const getIntervalForDay = (day: number) =>
    intervals.find(iv => day >= iv.startDay && day <= iv.endDay)

  const handleOpenPin = (day: number) => {
    setPinDay(day)
    setInputVal(pins.has(day) ? String(pins.get(day)) : '')
  }

  const handlePinConfirm = () => {
    if (pinDay == null) return
    const val = Number(inputVal.replace(/,/g, ''))
    if (isNaN(val) || val < 0) return
    setPins(prev => { const next = new Map(prev); next.set(pinDay, val); return next })
    setPinDay(null)
  }

  const handlePinRemove = () => {
    if (pinDay == null) return
    setPins(prev => { const next = new Map(prev); next.delete(pinDay); return next })
    setPinDay(null)
  }

  // ── Detail modal data ──
  const detailRec = detailDay != null ? r.daily.get(detailDay) : undefined
  const detailBudget = detailDay != null ? (r.budgetDaily.get(detailDay) ?? 0) : 0
  const detailActual = detailRec?.sales ?? 0
  const detailDiff = detailActual - detailBudget
  const detailAch = safeDivide(detailActual, detailBudget)
  const detailCumBudget = detailDay != null ? (cumBudget.get(detailDay) ?? 0) : 0
  const detailCumSales = detailDay != null ? (cumSales.get(detailDay) ?? 0) : 0
  const detailCumDiff = detailCumSales - detailCumBudget
  const detailCumAch = safeDivide(detailCumSales, detailCumBudget)
  const detailPySales = detailDay != null ? (prevYear.daily.get(detailDay)?.sales ?? 0) : 0
  const detailPyRatio = safeDivide(detailActual, detailPySales)
  const detailCumPrevYear = detailDay != null ? (cumPrevYear.get(detailDay) ?? 0) : 0
  const detailCumPyRatio = safeDivide(detailCumSales, detailCumPrevYear)
  const detailDayOfWeek = detailDay != null ? DOW_NAMES[new Date(year, month - 1, detailDay).getDay()] : ''

  // Cumulative chart data (up to detailDay)
  const cumChartData = detailDay != null ? Array.from({ length: detailDay }, (_, i) => {
    const d = i + 1
    return {
      day: d,
      budget: cumBudget.get(d) ?? 0,
      actual: cumSales.get(d) ?? 0,
      prevYear: cumPrevYear.get(d) ?? 0,
    }
  }) : []

  return (
    <CalWrapper>
      <CalSectionTitle>月間カレンダー（{year}年{month}月）- セルクリックで詳細表示 / 📌で在庫ピン止め</CalSectionTitle>

      {/* ── Range Selection Toolbar ── */}
      <RangeToolbar>
        <RangeLabel>期間A:</RangeLabel>
        <RangeInput
          type="text" value={rangeAStart} placeholder="開始"
          onChange={(e) => setRangeAStart(e.target.value)}
        />
        <span>～</span>
        <RangeInput
          type="text" value={rangeAEnd} placeholder="終了"
          onChange={(e) => setRangeAEnd(e.target.value)}
        />
        <span style={{ margin: '0 4px', color: '#9ca3af' }}>|</span>
        <RangeLabel>期間B:</RangeLabel>
        <RangeInput
          type="text" value={rangeBStart} placeholder="開始"
          onChange={(e) => setRangeBStart(e.target.value)}
        />
        <span>～</span>
        <RangeInput
          type="text" value={rangeBEnd} placeholder="終了"
          onChange={(e) => setRangeBEnd(e.target.value)}
        />
        {hasAnyRange && (
          <Button $variant="outline" onClick={handleRangeClear}>クリア</Button>
        )}
      </RangeToolbar>

      {/* ── Range Summary Panel ── */}
      {hasAnyRange && (() => {
        // single-range fallback
        const singleRange = rangeAData && !rangeBData ? rangeAData : !rangeAData && rangeBData ? rangeBData : null
        if (singleRange) {
          return (
            <RangeSummaryPanel>
              <RangeSummaryTitle>期間集計: {singleRange.start}～{singleRange.end}日（{singleRange.salesDaysCount}営業日）</RangeSummaryTitle>
              <div style={{ padding: '16px' }}>
                <RangeSummaryGrid>
                  <RangeSummaryItem>
                    <RangeSummaryItemLabel>売上予算</RangeSummaryItemLabel>
                    <RangeSummaryItemValue>{formatCurrency(singleRange.budget)}</RangeSummaryItemValue>
                  </RangeSummaryItem>
                  <RangeSummaryItem>
                    <RangeSummaryItemLabel>売上実績</RangeSummaryItemLabel>
                    <RangeSummaryItemValue>{formatCurrency(singleRange.sales)}</RangeSummaryItemValue>
                  </RangeSummaryItem>
                  <RangeSummaryItem>
                    <RangeSummaryItemLabel>予算差異</RangeSummaryItemLabel>
                    <RangeSummaryItemValue $color={singleRange.diff >= 0 ? '#22c55e' : '#ef4444'}>{formatCurrency(singleRange.diff)}</RangeSummaryItemValue>
                  </RangeSummaryItem>
                  <RangeSummaryItem>
                    <RangeSummaryItemLabel>予算達成率</RangeSummaryItemLabel>
                    <RangeSummaryItemValue $color={singleRange.ach >= 1 ? '#22c55e' : '#ef4444'}>{formatPercent(singleRange.ach)}</RangeSummaryItemValue>
                  </RangeSummaryItem>
                  {prevYear.hasPrevYear && singleRange.pySales > 0 && (
                    <>
                      <RangeSummaryItem>
                        <RangeSummaryItemLabel>前年同期売上</RangeSummaryItemLabel>
                        <RangeSummaryItemValue>{formatCurrency(singleRange.pySales)}</RangeSummaryItemValue>
                      </RangeSummaryItem>
                      <RangeSummaryItem>
                        <RangeSummaryItemLabel>前年比</RangeSummaryItemLabel>
                        <RangeSummaryItemValue $color={singleRange.pyRatio >= 1 ? '#22c55e' : '#ef4444'}>{formatPercent(singleRange.pyRatio)}</RangeSummaryItemValue>
                      </RangeSummaryItem>
                    </>
                  )}
                  <RangeSummaryItem>
                    <RangeSummaryItemLabel>日平均売上</RangeSummaryItemLabel>
                    <RangeSummaryItemValue>{formatCurrency(singleRange.avgDaily)}</RangeSummaryItemValue>
                  </RangeSummaryItem>
                </RangeSummaryGrid>
              </div>
            </RangeSummaryPanel>
          )
        }
        if (!rangeAData || !rangeBData) return null
        // ── 3-column compare ──
        const cmpColor = (a: number, b: number) => a > b ? '#22c55e' : a < b ? '#ef4444' : '#9ca3af'
        const barPct = (a: number, b: number) => {
          const total = a + b
          if (total === 0) return { a: 50, b: 50 }
          return { a: Math.round(a / total * 100), b: 100 - Math.round(a / total * 100) }
        }
        const salesBar = barPct(rangeAData.sales, rangeBData.sales)
        const budgetBar = barPct(rangeAData.budget, rangeBData.budget)
        const avgBar = barPct(rangeAData.avgDaily, rangeBData.avgDaily)
        const salesDiff = rangeAData.sales - rangeBData.sales
        const avgDiff = rangeAData.avgDaily - rangeBData.avgDaily
        const achDiff = rangeAData.ach - rangeBData.ach
        const pyA = rangeAData.pySales, pyB = rangeBData.pySales
        const pyBar = barPct(pyA, pyB)

        const renderMetricCol = (d: typeof rangeAData) => (
          <>
            <RangeMetricRow>
              <RangeMetricLabel>売上予算</RangeMetricLabel>
              <RangeMetricValue>{formatCurrency(d.budget)}</RangeMetricValue>
            </RangeMetricRow>
            <RangeMetricRow>
              <RangeMetricLabel>売上実績</RangeMetricLabel>
              <RangeMetricValue>{formatCurrency(d.sales)}</RangeMetricValue>
            </RangeMetricRow>
            <RangeMetricRow>
              <RangeMetricLabel>予算差異</RangeMetricLabel>
              <RangeMetricValue $color={d.diff >= 0 ? '#22c55e' : '#ef4444'}>{formatCurrency(d.diff)}</RangeMetricValue>
            </RangeMetricRow>
            <RangeMetricRow>
              <RangeMetricLabel>予算達成率</RangeMetricLabel>
              <RangeMetricValue $color={d.ach >= 1 ? '#22c55e' : '#ef4444'}>{formatPercent(d.ach)}</RangeMetricValue>
            </RangeMetricRow>
            {prevYear.hasPrevYear && d.pySales > 0 && (
              <>
                <RangeMetricRow>
                  <RangeMetricLabel>前年同期</RangeMetricLabel>
                  <RangeMetricValue>{formatCurrency(d.pySales)}</RangeMetricValue>
                </RangeMetricRow>
                <RangeMetricRow>
                  <RangeMetricLabel>前年比</RangeMetricLabel>
                  <RangeMetricValue $color={d.pyRatio >= 1 ? '#22c55e' : '#ef4444'}>{formatPercent(d.pyRatio)}</RangeMetricValue>
                </RangeMetricRow>
              </>
            )}
            <RangeMetricRow>
              <RangeMetricLabel>日平均売上</RangeMetricLabel>
              <RangeMetricValue>{formatCurrency(d.avgDaily)}</RangeMetricValue>
            </RangeMetricRow>
          </>
        )

        return (
          <RangeSummaryPanel>
            <RangeSummaryTitle>
              期間比較分析: {rangeAData.start}～{rangeAData.end}日 vs {rangeBData.start}～{rangeBData.end}日
            </RangeSummaryTitle>
            <RangeCompareContainer>
              {/* ── Left: Period A ── */}
              <RangeColumn>
                <RangeColumnHeader $color="#f59e0b">
                  <RangeColumnDot $color="#f59e0b" />
                  <RangeColumnTitle>期間A: {rangeAData.start}～{rangeAData.end}日（{rangeAData.salesDaysCount}営業日）</RangeColumnTitle>
                </RangeColumnHeader>
                {renderMetricCol(rangeAData)}
              </RangeColumn>

              {/* ── Center: Visual Comparison ── */}
              <RangeCenterCol>
                <RangeCenterHeader>
                  <RangeColumnTitle>A vs B 比較</RangeColumnTitle>
                </RangeCenterHeader>

                {/* Sales comparison bar */}
                <CompareBarRow>
                  <CompareBarLabel>
                    <span>売上実績</span>
                    <CompareBarDiff $color={cmpColor(rangeAData.sales, rangeBData.sales)}>
                      {salesDiff >= 0 ? '+' : ''}{formatCurrency(salesDiff)}
                    </CompareBarDiff>
                  </CompareBarLabel>
                  <CompareBarTrack>
                    <CompareBarSegment $width={`${salesBar.a}%`} $color="#f59e0b">
                      A {fmtSen(rangeAData.sales)}
                    </CompareBarSegment>
                    <CompareBarSegment $width={`${salesBar.b}%`} $color="#6366f1">
                      B {fmtSen(rangeBData.sales)}
                    </CompareBarSegment>
                  </CompareBarTrack>
                  <CompareIndicator $color={cmpColor(rangeAData.sales, rangeBData.sales)}>
                    <CompareIndicatorValue $color={cmpColor(rangeAData.sales, rangeBData.sales)}>
                      {rangeBData.sales > 0 ? formatPercent(rangeAData.sales / rangeBData.sales) : '-'}
                    </CompareIndicatorValue>
                    <CompareIndicatorLabel>A/B 売上比率</CompareIndicatorLabel>
                  </CompareIndicator>
                </CompareBarRow>

                {/* Budget comparison bar */}
                <CompareBarRow>
                  <CompareBarLabel>
                    <span>売上予算</span>
                    <CompareBarDiff $color={cmpColor(rangeAData.budget, rangeBData.budget)}>
                      {rangeAData.budget - rangeBData.budget >= 0 ? '+' : ''}{formatCurrency(rangeAData.budget - rangeBData.budget)}
                    </CompareBarDiff>
                  </CompareBarLabel>
                  <CompareBarTrack>
                    <CompareBarSegment $width={`${budgetBar.a}%`} $color="rgba(245,158,11,0.6)">
                      A {fmtSen(rangeAData.budget)}
                    </CompareBarSegment>
                    <CompareBarSegment $width={`${budgetBar.b}%`} $color="rgba(99,102,241,0.6)">
                      B {fmtSen(rangeBData.budget)}
                    </CompareBarSegment>
                  </CompareBarTrack>
                </CompareBarRow>

                {/* Average daily comparison bar */}
                <CompareBarRow>
                  <CompareBarLabel>
                    <span>日平均売上</span>
                    <CompareBarDiff $color={cmpColor(rangeAData.avgDaily, rangeBData.avgDaily)}>
                      {avgDiff >= 0 ? '+' : ''}{formatCurrency(avgDiff)}
                    </CompareBarDiff>
                  </CompareBarLabel>
                  <CompareBarTrack>
                    <CompareBarSegment $width={`${avgBar.a}%`} $color="#f59e0b">
                      A {fmtSen(rangeAData.avgDaily)}
                    </CompareBarSegment>
                    <CompareBarSegment $width={`${avgBar.b}%`} $color="#6366f1">
                      B {fmtSen(rangeBData.avgDaily)}
                    </CompareBarSegment>
                  </CompareBarTrack>
                </CompareBarRow>

                {/* Achievement rate comparison */}
                <CompareBarRow>
                  <CompareBarLabel>
                    <span>予算達成率</span>
                    <CompareBarDiff $color={cmpColor(rangeAData.ach, rangeBData.ach)}>
                      {formatPointDiff(achDiff)}
                    </CompareBarDiff>
                  </CompareBarLabel>
                  <CompareBarTrack>
                    <CompareBarSegment
                      $width={`${Math.min(rangeAData.ach * 50, 100)}%`}
                      $color={rangeAData.ach >= 1 ? '#22c55e' : '#f59e0b'}
                    >
                      A {formatPercent(rangeAData.ach, 0)}
                    </CompareBarSegment>
                    <CompareBarSegment
                      $width={`${Math.min(rangeBData.ach * 50, 100)}%`}
                      $color={rangeBData.ach >= 1 ? '#22c55e' : '#6366f1'}
                    >
                      B {formatPercent(rangeBData.ach, 0)}
                    </CompareBarSegment>
                  </CompareBarTrack>
                </CompareBarRow>

                {/* Previous year comparison */}
                {prevYear.hasPrevYear && (pyA > 0 || pyB > 0) && (
                  <CompareBarRow>
                    <CompareBarLabel>
                      <span>前年同期売上</span>
                      <CompareBarDiff $color={cmpColor(pyA, pyB)}>
                        {pyA - pyB >= 0 ? '+' : ''}{formatCurrency(pyA - pyB)}
                      </CompareBarDiff>
                    </CompareBarLabel>
                    <CompareBarTrack>
                      <CompareBarSegment $width={`${pyBar.a}%`} $color="rgba(245,158,11,0.5)">
                        A {fmtSen(pyA)}
                      </CompareBarSegment>
                      <CompareBarSegment $width={`${pyBar.b}%`} $color="rgba(99,102,241,0.5)">
                        B {fmtSen(pyB)}
                      </CompareBarSegment>
                    </CompareBarTrack>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <CompareIndicator $color={cmpColor(rangeAData.pyRatio, 1)}>
                        <CompareIndicatorValue $color={cmpColor(rangeAData.pyRatio, 1)}>
                          A前年比 {formatPercent(rangeAData.pyRatio, 0)}
                        </CompareIndicatorValue>
                      </CompareIndicator>
                      <CompareIndicator $color={cmpColor(rangeBData.pyRatio, 1)}>
                        <CompareIndicatorValue $color={cmpColor(rangeBData.pyRatio, 1)}>
                          B前年比 {formatPercent(rangeBData.pyRatio, 0)}
                        </CompareIndicatorValue>
                      </CompareIndicator>
                    </div>
                  </CompareBarRow>
                )}
              </RangeCenterCol>

              {/* ── Right: Period B ── */}
              <RangeColumn>
                <RangeColumnHeader $color="#6366f1">
                  <RangeColumnDot $color="#6366f1" />
                  <RangeColumnTitle>期間B: {rangeBData.start}～{rangeBData.end}日（{rangeBData.salesDaysCount}営業日）</RangeColumnTitle>
                </RangeColumnHeader>
                {renderMetricCol(rangeBData)}
              </RangeColumn>
            </RangeCompareContainer>
          </RangeSummaryPanel>
        )
      })()}

      <CalTable>
        <thead>
          <tr>
            {DOW_LABELS.map((label, i) => (
              <CalTh key={label} $weekend={i >= 5}>{label}</CalTh>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((day, di) => {
                if (day == null) return <CalTd key={di} $empty />
                const rec = r.daily.get(day)
                const budget = r.budgetDaily.get(day) ?? 0
                const actual = rec?.sales ?? 0
                const diff = actual - budget
                const achievement = budget > 0 ? actual / budget : 0
                const isWeekend = di >= 5
                const diffColor = diff >= 0 ? '#22c55e' : '#ef4444'
                const achColor = achievement >= 1 ? '#22c55e' : achievement >= 0.9 ? '#f59e0b' : '#ef4444'
                const hasActual = actual > 0

                const cBudget = cumBudget.get(day) ?? 0
                const cSales = cumSales.get(day) ?? 0
                const cDiff = cSales - cBudget
                const cAch = cBudget > 0 ? cSales / cBudget : 0
                const cDiffColor = cDiff >= 0 ? '#22c55e' : '#ef4444'
                const cAchColor = cAch >= 1 ? '#22c55e' : cAch >= 0.9 ? '#f59e0b' : '#ef4444'

                const isPinned = pins.has(day)
                const interval = isPinned ? getIntervalForDay(day) : undefined
                return (
                  <CalTd key={di} $hasActual={hasActual}>
                    <CalDayCell
                      $pinned={isPinned}
                      $inInterval={!!getIntervalForDay(day)}
                      $rangeColor={isDayInRangeA(day) ? '#f59e0b' : isDayInRangeB(day) ? '#6366f1' : undefined}
                    >
                      <CalDayHeader>
                        <CalDayNum $weekend={isWeekend}>{day}</CalDayNum>
                        <span>
                          <CalActionBtn
                            $color="#6366f1"
                            title="在庫ピン止め"
                            onClick={(e) => { e.stopPropagation(); handleOpenPin(day) }}
                          >
                            {isPinned ? '📌' : '📌'}
                          </CalActionBtn>
                        </span>
                      </CalDayHeader>
                      {(budget > 0 || actual > 0) && (
                        <CalDataArea onClick={() => setDetailDay(day)}>
                          <CalGrid>
                            <CalCell>予 {fmtSen(budget)}</CalCell>
                            <CalCell>実 {fmtSen(actual)}</CalCell>
                            <CalCell $color={diffColor}>差 {fmtSenDiff(diff)}</CalCell>
                            <CalCell $color={achColor}>達 {budget > 0 ? formatPercent(achievement, 0) : '-'}</CalCell>
                            <CalDivider />
                            <CalCell>予累 {fmtSen(cBudget)}</CalCell>
                            <CalCell>実累 {fmtSen(cSales)}</CalCell>
                            <CalCell $color={cDiffColor}>差累 {fmtSenDiff(cDiff)}</CalCell>
                            <CalCell $color={cAchColor}>達累 {cBudget > 0 ? formatPercent(cAch, 0) : '-'}</CalCell>
                            {prevYear.hasPrevYear && (() => {
                              const pySales = prevYear.daily.get(day)?.sales ?? 0
                              const pyRatio = pySales > 0 ? actual / pySales : 0
                              const pyColor = pyRatio >= 1 ? '#22c55e' : pyRatio > 0 ? '#ef4444' : undefined
                              const cPy = cumPrevYear.get(day) ?? 0
                              const cPyRatio = cPy > 0 ? cSales / cPy : 0
                              const cPyColor = cPyRatio >= 1 ? '#22c55e' : cPyRatio > 0 ? '#ef4444' : undefined
                              return pySales > 0 || cPy > 0 ? (
                                <>
                                  <CalDivider />
                                  <CalCell $color="#9ca3af">前同 {fmtSen(pySales)}</CalCell>
                                  <CalCell $color={pyColor}>前比 {pySales > 0 ? formatPercent(pyRatio, 0) : '-'}</CalCell>
                                  <CalCell $color="#9ca3af">前累 {fmtSen(cPy)}</CalCell>
                                  <CalCell $color={cPyColor}>累比 {cPy > 0 ? formatPercent(cPyRatio, 0) : '-'}</CalCell>
                                </>
                              ) : null
                            })()}
                          </CalGrid>
                        </CalDataArea>
                      )}
                      {isPinned && interval && (
                        <PinIndicator>GP {formatPercent(interval.grossProfitRate, 1)}</PinIndicator>
                      )}
                    </CalDayCell>
                  </CalTd>
                )
              })}
            </tr>
          ))}
        </tbody>
      </CalTable>

      {intervals.length > 0 && (
        <IntervalSummary>
          <CalSectionTitle>区間別粗利率（ピン止め計算）</CalSectionTitle>
          {intervals.map((iv, i) => (
            <IntervalCard
              key={i}
              $color={iv.grossProfitRate >= ctx.targetRate ? '#22c55e' : iv.grossProfitRate >= ctx.warningRate ? '#f59e0b' : '#ef4444'}
            >
              <div>
                <IntervalMetricLabel>{iv.startDay}日 ～ {iv.endDay}日</IntervalMetricLabel>
                <IntervalMetricValue>{formatPercent(iv.grossProfitRate)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>売上</IntervalMetricLabel>
                <IntervalMetricValue>{formatCurrency(iv.totalSales)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>粗利</IntervalMetricLabel>
                <IntervalMetricValue>{formatCurrency(iv.grossProfit)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>売上原価</IntervalMetricLabel>
                <IntervalMetricValue>{formatCurrency(iv.cogs)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>期首在庫</IntervalMetricLabel>
                <IntervalMetricValue>{formatCurrency(iv.openingInventory)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>期末在庫</IntervalMetricLabel>
                <IntervalMetricValue>{formatCurrency(iv.closingInventory)}</IntervalMetricValue>
              </div>
            </IntervalCard>
          ))}
        </IntervalSummary>
      )}

      {/* ── Pin Modal (在庫入力) ── */}
      {pinDay != null && (
        <PinModalOverlay onClick={() => setPinDay(null)}>
          <PinModalContent onClick={(e) => e.stopPropagation()}>
            <PinModalTitle>{month}月{pinDay}日 - 期末在庫入力</PinModalTitle>
            <ToolInputGroup>
              <PinInputLabel>期末在庫（原価）</PinInputLabel>
              <PinInputField
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePinConfirm() }}
                placeholder="例: 2000000"
                autoFocus
              />
            </ToolInputGroup>
            <PinButtonRow>
              <Button $variant="primary" onClick={handlePinConfirm}>確定（ピン止め）</Button>
              {pins.has(pinDay) && (
                <Button $variant="outline" onClick={handlePinRemove}>ピン解除</Button>
              )}
              <Button $variant="outline" onClick={() => setPinDay(null)}>キャンセル</Button>
            </PinButtonRow>
          </PinModalContent>
        </PinModalOverlay>
      )}

      {/* ── Detail Modal (日別詳細) ── */}
      {detailDay != null && (
        <PinModalOverlay onClick={() => setDetailDay(null)}>
          <DetailModalContent onClick={(e) => e.stopPropagation()}>
            <DetailHeader>
              <DetailTitle>{month}月{detailDay}日（{detailDayOfWeek}）の詳細</DetailTitle>
              <DetailCloseBtn onClick={() => setDetailDay(null)}>✕</DetailCloseBtn>
            </DetailHeader>

            {/* KPI Cards */}
            <DetailKpiGrid>
              <DetailKpiCard $accent="#6366f1">
                <DetailKpiLabel>予算</DetailKpiLabel>
                <DetailKpiValue>{formatCurrency(detailBudget)}</DetailKpiValue>
              </DetailKpiCard>
              <DetailKpiCard $accent={detailActual >= detailBudget ? '#22c55e' : '#ef4444'}>
                <DetailKpiLabel>実績</DetailKpiLabel>
                <DetailKpiValue>{formatCurrency(detailActual)}</DetailKpiValue>
              </DetailKpiCard>
              <DetailKpiCard $accent={detailDiff >= 0 ? '#22c55e' : '#ef4444'}>
                <DetailKpiLabel>予算差異</DetailKpiLabel>
                <DetailKpiValue $color={detailDiff >= 0 ? '#22c55e' : '#ef4444'}>
                  {formatCurrency(detailDiff)}
                </DetailKpiValue>
              </DetailKpiCard>
              <DetailKpiCard $accent={detailAch >= 1 ? '#22c55e' : detailAch >= 0.9 ? '#f59e0b' : '#ef4444'}>
                <DetailKpiLabel>達成率</DetailKpiLabel>
                <DetailKpiValue $color={detailAch >= 1 ? '#22c55e' : detailAch >= 0.9 ? '#f59e0b' : '#ef4444'}>
                  {formatPercent(detailAch)}
                </DetailKpiValue>
              </DetailKpiCard>
            </DetailKpiGrid>

            {/* Budget vs Actual Bar */}
            <DetailSection>
              <DetailSectionTitle>予算 vs 実績（当日）</DetailSectionTitle>
              {(() => {
                const maxVal = Math.max(detailBudget, detailActual, detailPySales, 1)
                return (
                  <DetailBarWrapper>
                    <DetailBarRow>
                      <DetailBarLabel>予算</DetailBarLabel>
                      <DetailBarTrack>
                        <DetailBarFill $width={(detailBudget / maxVal) * 100} $color="#6366f1">
                          <DetailBarAmount>{fmtSen(detailBudget)}</DetailBarAmount>
                        </DetailBarFill>
                      </DetailBarTrack>
                    </DetailBarRow>
                    <DetailBarRow>
                      <DetailBarLabel>実績</DetailBarLabel>
                      <DetailBarTrack>
                        <DetailBarFill $width={(detailActual / maxVal) * 100} $color="#22c55e">
                          <DetailBarAmount>{fmtSen(detailActual)}（{formatPercent(detailAch)}）</DetailBarAmount>
                        </DetailBarFill>
                      </DetailBarTrack>
                    </DetailBarRow>
                    {prevYear.hasPrevYear && detailPySales > 0 && (
                      <DetailBarRow>
                        <DetailBarLabel>前年</DetailBarLabel>
                        <DetailBarTrack>
                          <DetailBarFill $width={(detailPySales / maxVal) * 100} $color="#9ca3af">
                            <DetailBarAmount>{fmtSen(detailPySales)}（{formatPercent(detailPyRatio)}）</DetailBarAmount>
                          </DetailBarFill>
                        </DetailBarTrack>
                      </DetailBarRow>
                    )}
                  </DetailBarWrapper>
                )
              })()}
            </DetailSection>

            {/* Budget vs Actual Bar (Cumulative) */}
            <DetailSection>
              <DetailSectionTitle>予算 vs 実績（累計）</DetailSectionTitle>
              {(() => {
                const maxVal = Math.max(detailCumBudget, detailCumSales, detailCumPrevYear, 1)
                return (
                  <DetailBarWrapper>
                    <DetailBarRow>
                      <DetailBarLabel>予算</DetailBarLabel>
                      <DetailBarTrack>
                        <DetailBarFill $width={(detailCumBudget / maxVal) * 100} $color="#6366f1">
                          <DetailBarAmount>{fmtSen(detailCumBudget)}</DetailBarAmount>
                        </DetailBarFill>
                      </DetailBarTrack>
                    </DetailBarRow>
                    <DetailBarRow>
                      <DetailBarLabel>実績</DetailBarLabel>
                      <DetailBarTrack>
                        <DetailBarFill $width={(detailCumSales / maxVal) * 100} $color="#22c55e">
                          <DetailBarAmount>{fmtSen(detailCumSales)}（{formatPercent(detailCumAch)}）</DetailBarAmount>
                        </DetailBarFill>
                      </DetailBarTrack>
                    </DetailBarRow>
                    {prevYear.hasPrevYear && detailCumPrevYear > 0 && (
                      <DetailBarRow>
                        <DetailBarLabel>前年</DetailBarLabel>
                        <DetailBarTrack>
                          <DetailBarFill $width={(detailCumPrevYear / maxVal) * 100} $color="#9ca3af">
                            <DetailBarAmount>{fmtSen(detailCumPrevYear)}（{formatPercent(detailCumPyRatio)}）</DetailBarAmount>
                          </DetailBarFill>
                        </DetailBarTrack>
                      </DetailBarRow>
                    )}
                  </DetailBarWrapper>
                )
              })()}
            </DetailSection>

            <DetailColumns>
              {/* Left: Cumulative */}
              <DetailSection>
                <DetailSectionTitle>累計推移（1日〜{detailDay}日）</DetailSectionTitle>
                <DetailChartWrapper>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cumChartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 10000)}万`} width={45} />
                      <Tooltip
                        formatter={(val, name) => [formatCurrency((val as number) ?? 0), name === 'budget' ? '予算' : name === 'actual' ? '実績' : '前年']}
                        labelFormatter={(d) => `${d}日`}
                      />
                      <Area type="monotone" dataKey="budget" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeDasharray="4 4" name="budget" />
                      <Area type="monotone" dataKey="actual" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} name="actual" />
                      {prevYear.hasPrevYear && (
                        <Area type="monotone" dataKey="prevYear" stroke="#9ca3af" fill="none" strokeDasharray="2 2" name="prevYear" />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </DetailChartWrapper>
                <DetailRow>
                  <DetailLabel>予算累計</DetailLabel>
                  <DetailValue>{formatCurrency(detailCumBudget)}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>実績累計</DetailLabel>
                  <DetailValue>{formatCurrency(detailCumSales)}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>累計差異</DetailLabel>
                  <DetailValue $color={detailCumDiff >= 0 ? '#22c55e' : '#ef4444'}>{formatCurrency(detailCumDiff)}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>累計達成率</DetailLabel>
                  <DetailValue $color={detailCumAch >= 1 ? '#22c55e' : '#ef4444'}>{formatPercent(detailCumAch)}</DetailValue>
                </DetailRow>
                {prevYear.hasPrevYear && detailPySales > 0 && (
                  <>
                    <DetailRow>
                      <DetailLabel>前年同曜日</DetailLabel>
                      <DetailValue>{formatCurrency(detailPySales)}</DetailValue>
                    </DetailRow>
                    <DetailRow>
                      <DetailLabel>前年比</DetailLabel>
                      <DetailValue $color={detailPyRatio >= 1 ? '#22c55e' : '#ef4444'}>{formatPercent(detailPyRatio)}</DetailValue>
                    </DetailRow>
                  </>
                )}
              </DetailSection>

              {/* Right: Breakdown */}
              <DetailSection>
                <DetailSectionTitle>売上内訳</DetailSectionTitle>
                {detailRec ? (() => {
                  const totalCost = getDailyTotalCost(detailRec)
                  const items: { label: string; cost: number; price: number }[] = [
                    { label: '仕入（在庫）', cost: detailRec.purchase.cost, price: detailRec.purchase.price },
                    { label: '花', cost: detailRec.flowers.cost, price: detailRec.flowers.price },
                    { label: '産直', cost: detailRec.directProduce.cost, price: detailRec.directProduce.price },
                    { label: '店間入', cost: detailRec.interStoreIn.cost, price: detailRec.interStoreIn.price },
                    { label: '店間出', cost: detailRec.interStoreOut.cost, price: detailRec.interStoreOut.price },
                    { label: '部門間入', cost: detailRec.interDepartmentIn.cost, price: detailRec.interDepartmentIn.price },
                    { label: '部門間出', cost: detailRec.interDepartmentOut.cost, price: detailRec.interDepartmentOut.price },
                  ].filter(item => item.cost !== 0 || item.price !== 0)
                  const totalPrice = items.reduce((sum, item) => sum + Math.abs(item.price), 0)

                  // Category bar chart data
                  const barData = items.map(item => ({
                    name: item.label,
                    cost: item.cost,
                    price: item.price,
                  }))

                  return (
                    <>
                      {barData.length > 0 && (
                        <DetailChartWrapper>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 10000)}万`} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                              <Tooltip formatter={(val, name) => [formatCurrency((val as number) ?? 0), name === 'cost' ? '原価' : '売価']} />
                              <Bar dataKey="cost" fill="#f59e0b" name="cost" barSize={8}>
                                {barData.map((_, i) => <ReCell key={i} fill="#f59e0b" />)}
                              </Bar>
                              <Bar dataKey="price" fill="#6366f1" name="price" barSize={8}>
                                {barData.map((_, i) => <ReCell key={i} fill="#6366f1" />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </DetailChartWrapper>
                      )}
                      {items.map((item) => {
                        const ratio = totalPrice > 0 ? Math.abs(item.price) / totalPrice : 0
                        return (
                          <DetailRow key={item.label}>
                            <DetailLabel>{item.label}</DetailLabel>
                            <DetailValue>
                              {formatCurrency(item.price)} <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>(原 {formatCurrency(item.cost)})</span>
                              <span style={{ color: '#6366f1', fontSize: '0.75rem', marginLeft: '4px' }}>({formatPercent(ratio)})</span>
                            </DetailValue>
                          </DetailRow>
                        )
                      })}
                      <DetailRow>
                        <DetailLabel>総仕入原価</DetailLabel>
                        <DetailValue>{formatCurrency(totalCost)}</DetailValue>
                      </DetailRow>
                      {detailRec.consumable.cost > 0 && (
                        <DetailRow>
                          <DetailLabel>消耗品費</DetailLabel>
                          <DetailValue>{formatCurrency(detailRec.consumable.cost)}</DetailValue>
                        </DetailRow>
                      )}
                      {detailRec.discountAmount !== 0 && (
                        <DetailRow>
                          <DetailLabel>売変額</DetailLabel>
                          <DetailValue $color="#ef4444">{formatCurrency(detailRec.discountAmount)}</DetailValue>
                        </DetailRow>
                      )}
                    </>
                  )
                })() : (
                  <DetailRow>
                    <DetailLabel>データなし</DetailLabel>
                    <DetailValue>-</DetailValue>
                  </DetailRow>
                )}
              </DetailSection>
            </DetailColumns>
          </DetailModalContent>
        </PinModalOverlay>
      )}
    </CalWrapper>
  )
}

export function ForecastToolsWidget({ ctx }: { ctx: WidgetContext }) {
  const r = ctx.result

  const [salesLandingInput, setSalesLandingInput] = useState('')
  const [remainGPRateInput, setRemainGPRateInput] = useState('')
  const [targetGPRateInput, setTargetGPRateInput] = useState('')

  const actualSales = r.totalSales
  const actualGP = r.invMethodGrossProfit ?? r.estMethodMargin
  const actualGPRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate

  const salesLanding = Number(salesLandingInput.replace(/,/g, '')) || 0
  const remainGPRate = Number(remainGPRateInput) / 100 || 0
  const tool1Valid = salesLanding > 0 && remainGPRate > 0
  const remainingSales1 = salesLanding - actualSales
  const remainingGP1 = remainingSales1 * remainGPRate
  const totalGP1 = actualGP + remainingGP1
  const landingGPRate1 = salesLanding > 0 ? totalGP1 / salesLanding : 0

  const targetGPRate = Number(targetGPRateInput) / 100 || 0
  const tool2Valid = targetGPRate > 0
  const projectedTotalSales2 = r.projectedSales
  const targetTotalGP2 = targetGPRate * projectedTotalSales2
  const requiredRemainingGP2 = targetTotalGP2 - actualGP
  const remainingSales2 = projectedTotalSales2 - actualSales
  const requiredRemainingGPRate2 = remainingSales2 > 0 ? requiredRemainingGP2 / remainingSales2 : 0

  return (
    <ForecastToolsGrid>
      <ToolCard $accent="#6366f1">
        <ToolCardTitle>着地見込み計算</ToolCardTitle>
        <ToolInputGroup>
          <PinInputLabel>売上着地見込み（円）</PinInputLabel>
          <ToolInputField
            type="text"
            value={salesLandingInput}
            onChange={(e) => setSalesLandingInput(e.target.value)}
            placeholder={`例: ${Math.round(r.projectedSales)}`}
          />
        </ToolInputGroup>
        <ToolInputGroup>
          <PinInputLabel>残期間の粗利率予測（%）</PinInputLabel>
          <ToolInputField
            type="text"
            value={remainGPRateInput}
            onChange={(e) => setRemainGPRateInput(e.target.value)}
            placeholder={`例: ${(actualGPRate * 100).toFixed(1)}`}
          />
        </ToolInputGroup>
        {tool1Valid && (
          <ToolResultSection>
            <ExecRow>
              <ToolResultLabel>現在売上実績</ToolResultLabel>
              <ToolResultValue>{formatCurrency(actualSales)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>残期間売上</ToolResultLabel>
              <ToolResultValue>{formatCurrency(remainingSales1)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>現在粗利実績</ToolResultLabel>
              <ToolResultValue>{formatCurrency(actualGP)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>残期間粗利見込み</ToolResultLabel>
              <ToolResultValue>{formatCurrency(remainingGP1)}</ToolResultValue>
            </ExecRow>
            <ExecDividerLine />
            <ExecRow>
              <ToolResultLabel>最終売上着地</ToolResultLabel>
              <ToolResultValue $color="#6366f1">{formatCurrency(salesLanding)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>最終粗利額着地</ToolResultLabel>
              <ToolResultValue $color="#22c55e">{formatCurrency(totalGP1)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>最終粗利率着地</ToolResultLabel>
              <ToolResultValue $color={landingGPRate1 >= ctx.targetRate ? '#22c55e' : '#ef4444'}>
                {formatPercent(landingGPRate1)}
              </ToolResultValue>
            </ExecRow>
          </ToolResultSection>
        )}
      </ToolCard>

      <ToolCard $accent="#f59e0b">
        <ToolCardTitle>ゴールシーク（必要粗利率逆算）</ToolCardTitle>
        <ToolInputGroup>
          <PinInputLabel>目標着地粗利率（%）</PinInputLabel>
          <ToolInputField
            type="text"
            value={targetGPRateInput}
            onChange={(e) => setTargetGPRateInput(e.target.value)}
            placeholder={`例: ${(r.grossProfitRateBudget * 100).toFixed(1)}`}
          />
        </ToolInputGroup>
        {tool2Valid && (
          <ToolResultSection>
            <ExecRow>
              <ToolResultLabel>予測月末売上</ToolResultLabel>
              <ToolResultValue>{formatCurrency(projectedTotalSales2)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>目標粗利総額</ToolResultLabel>
              <ToolResultValue>{formatCurrency(targetTotalGP2)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>現在粗利実績</ToolResultLabel>
              <ToolResultValue>{formatCurrency(actualGP)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>残期間必要粗利</ToolResultLabel>
              <ToolResultValue>{formatCurrency(requiredRemainingGP2)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>残期間売上見込み</ToolResultLabel>
              <ToolResultValue>{formatCurrency(remainingSales2)}</ToolResultValue>
            </ExecRow>
            <ExecDividerLine />
            <ExecRow>
              <ToolResultLabel>残期間必要粗利率</ToolResultLabel>
              <ToolResultValue $color={requiredRemainingGPRate2 <= actualGPRate ? '#22c55e' : '#ef4444'}>
                {formatPercent(requiredRemainingGPRate2)}
              </ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>現在粗利率との差</ToolResultLabel>
              <ToolResultValue $color={requiredRemainingGPRate2 <= actualGPRate ? '#22c55e' : '#ef4444'}>
                {formatPointDiff(requiredRemainingGPRate2 - actualGPRate)}
              </ToolResultValue>
            </ExecRow>
          </ToolResultSection>
        )}
      </ToolCard>
    </ForecastToolsGrid>
  )
}
