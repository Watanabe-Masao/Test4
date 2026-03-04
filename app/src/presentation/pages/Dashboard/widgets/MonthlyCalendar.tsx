import { useState, useCallback } from 'react'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { Button } from '@/presentation/components/common'
import { formatCurrency, formatPercent, safeDivide } from '@/domain/calculations/utils'
import { calculatePinIntervals } from '@/application/hooks/usePinIntervals'
import { buildClipBundle } from '@/application/usecases/clipExport/buildClipBundle'
import { downloadClipHtml } from '@/application/usecases/clipExport/downloadClipHtml'
import { fetchCategoryTimeRecords } from '@/application/hooks/duckdb'
import type { WidgetContext } from './types'
import { DayDetailModal } from './DayDetailModal'
import { RangeComparisonPanel } from './RangeComparison'
import { fmtSen } from './drilldownUtils'
import {
  CalWrapper,
  CalSectionTitle,
  CalTable,
  CalTh,
  CalTd,
  CalDayNum,
  CalGrid,
  CalCell,
  CalHeroValue,
  CalAchBar,
  CalMetricRow,
  CalDivider,
  CalDayCell,
  CalDayHeader,
  CalActionBtn,
  CalDataArea,
  PinIndicator,
  IntervalSummary,
  IntervalCard,
  IntervalMetricLabel,
  IntervalMetricValue,
  PinModalOverlay,
  PinModalContent,
  PinModalTitle,
  PinInputField,
  PinButtonRow,
  PinInputLabel,
  ToolInputGroup,
  RangeToolbar,
  RangeLabel,
  RangeInput,
} from '../DashboardPage.styles'

const DOW_LABELS = ['月', '火', '水', '木', '金', '土', '日']

/** 千円表記 (符号付き) */
function fmtSenDiff(n: number): string {
  const sen = Math.round(n / 1_000)
  return `${sen >= 0 ? '+' : ''}${sen.toLocaleString()}千`
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
  const [isExporting, setIsExporting] = useState(false)

  const handleClipExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const storeName = ctx.stores.get(ctx.storeKey)?.name ?? ctx.storeKey
      const curRange = { from: { year, month, day: 1 }, to: { year, month, day: daysInMonth } }
      const prevRange = {
        from: { year: year - 1, month, day: 1 },
        to: { year: year - 1, month, day: daysInMonth },
      }

      let curCts: Awaited<ReturnType<typeof fetchCategoryTimeRecords>> = []
      let prevCts: Awaited<ReturnType<typeof fetchCategoryTimeRecords>> = []

      if (ctx.duckConn) {
        try {
          curCts = await fetchCategoryTimeRecords(ctx.duckConn, curRange, ctx.selectedStoreIds)
        } catch {
          // CTS 取得失敗時は空で継続
        }
        try {
          prevCts = await fetchCategoryTimeRecords(
            ctx.duckConn,
            prevRange,
            ctx.selectedStoreIds,
            true,
          )
        } catch {
          // CTS 取得失敗時は空で継続
        }
      }

      const bundle = buildClipBundle({
        result: r,
        prevYear,
        year,
        month,
        storeName,
        ctsRecords: curCts,
        ctsPrevRecords: prevCts,
      })
      downloadClipHtml(bundle)
    } finally {
      setIsExporting(false)
    }
  }, [
    r,
    prevYear,
    year,
    month,
    daysInMonth,
    ctx.storeKey,
    ctx.stores,
    ctx.duckConn,
    ctx.selectedStoreIds,
  ])

  // Build calendar grid
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

  // Cumulative data (sales + customers)
  const cumBudget = new Map<number, number>()
  const cumSales = new Map<number, number>()
  const cumPrevYear = new Map<number, number>()
  const cumCustomers = new Map<number, number>()
  const cumPrevCustomers = new Map<number, number>()
  let runBudget = 0
  let runSales = 0
  let runPrevYear = 0
  let runCustomers = 0
  let runPrevCustomers = 0
  for (let d = 1; d <= daysInMonth; d++) {
    runBudget += r.budgetDaily.get(d) ?? 0
    runSales += r.daily.get(d)?.sales ?? 0
    runPrevYear += prevYear.daily.get(d)?.sales ?? 0
    runCustomers += r.daily.get(d)?.customers ?? 0
    runPrevCustomers += prevYear.daily.get(d)?.customers ?? 0
    cumBudget.set(d, runBudget)
    cumSales.set(d, runSales)
    cumPrevYear.set(d, runPrevYear)
    cumCustomers.set(d, runCustomers)
    cumPrevCustomers.set(d, runPrevCustomers)
  }

  // (Detailed cumulative/customer/discount/WoW data is displayed in DayDetailModal)

  // Range selection
  const parseDay = (v: string) => {
    const n = parseInt(v, 10)
    return n >= 1 && n <= daysInMonth ? n : null
  }
  const rangeA = { start: parseDay(rangeAStart), end: parseDay(rangeAEnd) }
  const rangeB = { start: parseDay(rangeBStart), end: parseDay(rangeBEnd) }

  const calcRange = (start: number | null, end: number | null) => {
    if (start == null || end == null || start > end) return null
    let budget = 0,
      sales = 0,
      pySales = 0,
      salesDaysCount = 0
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

  const isDayInRangeA = (day: number) =>
    rangeA.start != null && rangeA.end != null && day >= rangeA.start && day <= rangeA.end
  const isDayInRangeB = (day: number) =>
    rangeB.start != null && rangeB.end != null && day >= rangeB.start && day <= rangeB.end

  const handleRangeClear = () => {
    setRangeAStart('')
    setRangeAEnd('')
    setRangeBStart('')
    setRangeBEnd('')
  }

  const handleRangeSwap = () => {
    const tmpS = rangeAStart,
      tmpE = rangeAEnd
    setRangeAStart(rangeBStart)
    setRangeAEnd(rangeBEnd)
    setRangeBStart(tmpS)
    setRangeBEnd(tmpE)
  }

  // Pins & intervals
  const sortedPins = [...pins.entries()].sort((a, b) => a[0] - b[0])
  const intervals = calculatePinIntervals(r.daily, r.openingInventory, sortedPins)
  const getIntervalForDay = (day: number) =>
    intervals.find((iv) => day >= iv.startDay && day <= iv.endDay)

  const handleOpenPin = (day: number) => {
    setPinDay(day)
    setInputVal(pins.has(day) ? String(pins.get(day)) : '')
  }

  const handlePinConfirm = () => {
    if (pinDay == null) return
    const val = Number(inputVal.replace(/,/g, ''))
    if (isNaN(val) || val < 0) return
    setPins((prev) => {
      const next = new Map(prev)
      next.set(pinDay, val)
      return next
    })
    setPinDay(null)
  }

  const handlePinRemove = () => {
    if (pinDay == null) return
    setPins((prev) => {
      const next = new Map(prev)
      next.delete(pinDay)
      return next
    })
    setPinDay(null)
  }

  return (
    <CalWrapper>
      <CalSectionTitle
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <span>
          月間カレンダー（{year}年{month}月）- セルクリックで詳細表示 / 📌で在庫ピン止め
        </span>
        <Button $variant="outline" onClick={handleClipExport} disabled={isExporting}>
          {isExporting ? 'エクスポート中...' : 'HTMLレポート出力'}
        </Button>
      </CalSectionTitle>

      {/* Range Selection Toolbar */}
      <RangeToolbar>
        <RangeLabel>期間A:</RangeLabel>
        <RangeInput
          type="text"
          value={rangeAStart}
          placeholder="開始"
          onChange={(e) => setRangeAStart(e.target.value)}
        />
        <span>～</span>
        <RangeInput
          type="text"
          value={rangeAEnd}
          placeholder="終了"
          onChange={(e) => setRangeAEnd(e.target.value)}
        />
        <Button $variant="outline" onClick={handleRangeSwap} title="A⇄B 入替">
          ⇄
        </Button>
        <RangeLabel>期間B:</RangeLabel>
        <RangeInput
          type="text"
          value={rangeBStart}
          placeholder="開始"
          onChange={(e) => setRangeBStart(e.target.value)}
        />
        <span>～</span>
        <RangeInput
          type="text"
          value={rangeBEnd}
          placeholder="終了"
          onChange={(e) => setRangeBEnd(e.target.value)}
        />
        {hasAnyRange && (
          <Button $variant="outline" onClick={handleRangeClear}>
            クリア
          </Button>
        )}
      </RangeToolbar>

      {/* Range Comparison Panel */}
      {hasAnyRange && (
        <RangeComparisonPanel rangeAData={rangeAData} rangeBData={rangeBData} prevYear={prevYear} />
      )}

      {/* Calendar Table */}
      <CalTable>
        <thead>
          <tr>
            {DOW_LABELS.map((label, i) => (
              <CalTh key={label} $weekend={i >= 5}>
                {label}
              </CalTh>
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
                const dayDiff = actual - budget
                const achievement = budget > 0 ? actual / budget : 0
                const isWeekend = di >= 5
                const diffColor = sc.cond(dayDiff >= 0)
                const hasActual = actual > 0

                const cBudget = cumBudget.get(day) ?? 0
                const cSales = cumSales.get(day) ?? 0
                const cDiff = cSales - cBudget
                const cAch = cBudget > 0 ? cSales / cBudget : 0
                const cDiffColor = sc.cond(cDiff >= 0)
                const cAchColor = sc.achievement(cAch)

                const isPinned = pins.has(day)
                const interval = isPinned ? getIntervalForDay(day) : undefined
                return (
                  <CalTd key={di} $hasActual={hasActual}>
                    <CalDayCell
                      $pinned={isPinned}
                      $inInterval={!!getIntervalForDay(day)}
                      $rangeColor={
                        isDayInRangeA(day)
                          ? palette.warningDark
                          : isDayInRangeB(day)
                            ? palette.primary
                            : undefined
                      }
                      $rangeType={isDayInRangeA(day) ? 'A' : isDayInRangeB(day) ? 'B' : undefined}
                    >
                      <CalDayHeader>
                        <CalDayNum $weekend={isWeekend}>{day}</CalDayNum>
                        <span>
                          <CalActionBtn
                            $color={palette.primary}
                            title="在庫ピン止め"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenPin(day)
                            }}
                          >
                            {isPinned ? '📌' : '📌'}
                          </CalActionBtn>
                        </span>
                      </CalDayHeader>
                      {(budget > 0 || actual > 0) && (
                        <CalDataArea onClick={() => setDetailDay(day)}>
                          <CalGrid>
                            {/* Hero: 実績売上 */}
                            <CalHeroValue>{fmtSen(actual)}</CalHeroValue>
                            {/* 予算差 (符号+色+アイコン) */}
                            <CalMetricRow>
                              <CalCell $color={diffColor} $bold>
                                {dayDiff >= 0 ? '▲' : '▼'} {fmtSenDiff(dayDiff)}
                              </CalCell>
                            </CalMetricRow>
                            {/* 達成率: ミニプログレスバー */}
                            {budget > 0 && <CalAchBar $pct={achievement} />}
                            {/* 前年比 (色+アイコン) */}
                            {prevYear.hasPrevYear &&
                              (() => {
                                const pyDaySales = prevYear.daily.get(day)?.sales ?? 0
                                if (pyDaySales <= 0) return null
                                const pyRatio = actual / pyDaySales
                                const pyColor = pyRatio >= 1 ? sc.positive : sc.negative
                                return (
                                  <CalCell $color={pyColor}>
                                    {pyRatio >= 1 ? '▲' : '▼'} 前年{formatPercent(pyRatio, 0)}
                                  </CalCell>
                                )
                              })()}
                            {/* 累計達成率 (コンパクト) */}
                            {cBudget > 0 && (
                              <>
                                <CalDivider />
                                <CalMetricRow>
                                  <CalCell $color={cAchColor}>
                                    累計 {formatPercent(cAch, 0)}
                                  </CalCell>
                                  <CalCell $color={cDiffColor}>
                                    {cDiff >= 0 ? '+' : ''}
                                    {fmtSen(cDiff)}
                                  </CalCell>
                                </CalMetricRow>
                              </>
                            )}
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

      {/* Interval Summary */}
      {intervals.length > 0 && (
        <IntervalSummary>
          <CalSectionTitle>区間別粗利率（ピン止め計算）</CalSectionTitle>
          {intervals.map((iv, i) => (
            <IntervalCard
              key={i}
              $color={sc.gpRate(iv.grossProfitRate, ctx.targetRate, ctx.warningRate)}
            >
              <div>
                <IntervalMetricLabel>
                  {iv.startDay}日 ～ {iv.endDay}日
                </IntervalMetricLabel>
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

      {/* Pin Modal */}
      {pinDay != null && (
        <PinModalOverlay onClick={() => setPinDay(null)}>
          <PinModalContent onClick={(e) => e.stopPropagation()}>
            <PinModalTitle>
              {month}月{pinDay}日 - 期末在庫入力
            </PinModalTitle>
            <ToolInputGroup>
              <PinInputLabel>期末在庫（原価）</PinInputLabel>
              <PinInputField
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePinConfirm()
                }}
                placeholder="例: 2000000"
                autoFocus
              />
            </ToolInputGroup>
            <PinButtonRow>
              <Button $variant="primary" onClick={handlePinConfirm}>
                確定（ピン止め）
              </Button>
              {pins.has(pinDay) && (
                <Button $variant="outline" onClick={handlePinRemove}>
                  ピン解除
                </Button>
              )}
              <Button $variant="outline" onClick={() => setPinDay(null)}>
                キャンセル
              </Button>
            </PinButtonRow>
          </PinModalContent>
        </PinModalOverlay>
      )}

      {/* Detail Modal */}
      {detailDay != null && (
        <DayDetailModal
          day={detailDay}
          month={month}
          year={year}
          record={r.daily.get(detailDay)}
          budget={r.budgetDaily.get(detailDay) ?? 0}
          cumBudget={cumBudget.get(detailDay) ?? 0}
          cumSales={cumSales.get(detailDay) ?? 0}
          cumPrevYear={cumPrevYear.get(detailDay) ?? 0}
          cumCustomers={cumCustomers.get(detailDay) ?? 0}
          cumPrevCustomers={cumPrevCustomers.get(detailDay) ?? 0}
          prevYear={prevYear}
          duckConn={ctx.duckConn}
          duckDataVersion={ctx.duckDataVersion}
          dailyMap={r.daily}
          selectedStoreIds={ctx.selectedStoreIds}
          onClose={() => setDetailDay(null)}
        />
      )}
    </CalWrapper>
  )
}
