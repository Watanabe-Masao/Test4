import { useState } from 'react'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { Button } from '@/presentation/components/common'
import {
  formatCurrency,
  formatPercent,
  safeDivide,
  calculateTransactionValue,
} from '@/domain/calculations/utils'
import { calculatePinIntervals } from '@/domain/calculations/pinIntervals'
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

  // Cumulative discount rate
  const cumDiscount = new Map<number, number>()
  const cumGrossSales = new Map<number, number>()
  let runDiscount = 0
  let runGrossSales = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const rec = r.daily.get(d)
    runDiscount += rec?.discountAmount ?? 0
    runGrossSales += rec?.grossSales ?? 0
    cumDiscount.set(d, runDiscount)
    cumGrossSales.set(d, runGrossSales)
  }

  // Moving average transaction value (5-day window)
  const movingAvgTxVal = new Map<number, number>()
  const WINDOW = 5
  for (let d = 1; d <= daysInMonth; d++) {
    let totalSales = 0
    let totalCust = 0
    let count = 0
    for (let i = Math.max(1, d - WINDOW + 1); i <= d; i++) {
      const rec = r.daily.get(i)
      if (rec && rec.sales > 0 && (rec.customers ?? 0) > 0) {
        totalSales += rec.sales
        totalCust += rec.customers ?? 0
        count++
      }
    }
    if (count > 0 && totalCust > 0) {
      movingAvgTxVal.set(d, calculateTransactionValue(totalSales, totalCust))
    }
  }

  // Remaining budget target: how much per remaining sales day is needed
  const elapsedDays = r.elapsedDays
  const remainingSalesDays = r.salesDays - elapsedDays
  const remainingBudget = r.remainingBudget
  const dailyTargetForRemaining = remainingSalesDays > 0 ? remainingBudget / remainingSalesDays : 0

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
      <CalSectionTitle>
        月間カレンダー（{year}年{month}月）- セルクリックで詳細表示 / 📌で在庫ピン止め
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
                const achColor = sc.achievement(achievement)
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
                            <CalCell>予 {fmtSen(budget)}</CalCell>
                            <CalCell>実 {fmtSen(actual)}</CalCell>
                            <CalCell $color={diffColor}>差 {fmtSenDiff(dayDiff)}</CalCell>
                            <CalCell $color={achColor}>
                              達 {budget > 0 ? formatPercent(achievement, 0) : '-'}
                            </CalCell>
                            <CalDivider />
                            <CalCell>予累 {fmtSen(cBudget)}</CalCell>
                            <CalCell>実累 {fmtSen(cSales)}</CalCell>
                            <CalCell $color={cDiffColor}>差累 {fmtSenDiff(cDiff)}</CalCell>
                            <CalCell $color={cAchColor}>
                              達累 {cBudget > 0 ? formatPercent(cAch, 0) : '-'}
                            </CalCell>
                            {prevYear.hasPrevYear &&
                              (() => {
                                const pyDaySales = prevYear.daily.get(day)?.sales ?? 0
                                const pyRatio = pyDaySales > 0 ? actual / pyDaySales : 0
                                const pyColor =
                                  pyRatio >= 1 ? sc.positive : pyRatio > 0 ? sc.negative : undefined
                                const cPy = cumPrevYear.get(day) ?? 0
                                const cPyRatio = cPy > 0 ? cSales / cPy : 0
                                const cPyColor =
                                  cPyRatio >= 1
                                    ? sc.positive
                                    : cPyRatio > 0
                                      ? sc.negative
                                      : undefined
                                return pyDaySales > 0 || cPy > 0 ? (
                                  <>
                                    <CalDivider />
                                    <CalCell $color={palette.slate}>
                                      前同 {fmtSen(pyDaySales)}
                                    </CalCell>
                                    <CalCell $color={pyColor}>
                                      前比 {pyDaySales > 0 ? formatPercent(pyRatio, 0) : '-'}
                                    </CalCell>
                                    <CalCell $color={palette.slate}>前累 {fmtSen(cPy)}</CalCell>
                                    <CalCell $color={cPyColor}>
                                      累比 {cPy > 0 ? formatPercent(cPyRatio, 0) : '-'}
                                    </CalCell>
                                  </>
                                ) : null
                              })()}
                            {(() => {
                              const wowPrevDay = day - 7
                              if (wowPrevDay < 1) return null
                              const wowDaySales = r.daily.get(wowPrevDay)?.sales ?? 0
                              if (wowDaySales <= 0 && actual <= 0) return null
                              const wowRatio = wowDaySales > 0 ? actual / wowDaySales : 0
                              const wowColor =
                                wowRatio >= 1 ? sc.positive : wowRatio > 0 ? sc.negative : undefined
                              return wowDaySales > 0 ? (
                                <>
                                  <CalDivider />
                                  <CalCell $color={palette.slate}>
                                    週同 {fmtSen(wowDaySales)}
                                  </CalCell>
                                  <CalCell $color={wowColor}>
                                    週比 {wowDaySales > 0 ? formatPercent(wowRatio, 0) : '-'}
                                  </CalCell>
                                </>
                              ) : null
                            })()}
                            {(() => {
                              const dayCust = rec?.customers ?? 0
                              if (dayCust <= 0) return null
                              const dayTxVal = calculateTransactionValue(actual, dayCust)
                              const pyCust = prevYear.hasPrevYear
                                ? (prevYear.daily.get(day)?.customers ?? 0)
                                : 0
                              const custYoY = pyCust > 0 ? dayCust / pyCust : 0
                              const custYoYColor =
                                custYoY >= 1 ? sc.positive : custYoY > 0 ? sc.negative : undefined
                              const cCust = cumCustomers.get(day) ?? 0
                              const cPyCust = cumPrevCustomers.get(day) ?? 0
                              const cCustYoY = cPyCust > 0 ? cCust / cPyCust : 0
                              const cCustYoYColor =
                                cCustYoY >= 1 ? sc.positive : cCustYoY > 0 ? sc.negative : undefined
                              const maVal = movingAvgTxVal.get(day)
                              return (
                                <>
                                  <CalDivider />
                                  <CalCell $color={palette.cyanDark}>客 {dayCust}</CalCell>
                                  <CalCell $color={palette.purpleDark}>
                                    単 {dayTxVal.toLocaleString()}
                                  </CalCell>
                                  {pyCust > 0 && (
                                    <CalCell $color={custYoYColor}>
                                      客前比 {formatPercent(custYoY, 0)}
                                    </CalCell>
                                  )}
                                  {maVal && (
                                    <CalCell $color={palette.purple}>
                                      移平単 {maVal.toLocaleString()}
                                    </CalCell>
                                  )}
                                  <CalCell $color={palette.cyanDark}>累客 {cCust}</CalCell>
                                  {cPyCust > 0 && (
                                    <CalCell $color={cCustYoYColor}>
                                      累客比 {formatPercent(cCustYoY, 0)}
                                    </CalCell>
                                  )}
                                </>
                              )
                            })()}
                            {(() => {
                              // 日別・累計売変率
                              const dayDiscount = rec?.discountAmount ?? 0
                              const dayGrossSales = rec?.grossSales ?? 0
                              if (dayDiscount <= 0 && dayGrossSales <= 0) return null
                              const dayDiscountRate = actual > 0 ? dayDiscount / actual : 0
                              const cDiscAmt = cumDiscount.get(day) ?? 0
                              const cTotalSales = cumSales.get(day) ?? 0
                              const cDiscountRate = cTotalSales > 0 ? cDiscAmt / cTotalSales : 0
                              const discColor =
                                dayDiscountRate > 0.05
                                  ? sc.negative
                                  : dayDiscountRate > 0.03
                                    ? '#eab308'
                                    : sc.positive
                              const cDiscColor =
                                cDiscountRate > 0.05
                                  ? sc.negative
                                  : cDiscountRate > 0.03
                                    ? '#eab308'
                                    : sc.positive
                              return (
                                <>
                                  <CalDivider />
                                  <CalCell $color={discColor}>
                                    売変 {formatPercent(dayDiscountRate, 1)}
                                  </CalCell>
                                  <CalCell $color={cDiscColor}>
                                    累変 {formatPercent(cDiscountRate, 1)}
                                  </CalCell>
                                </>
                              )
                            })()}
                            {(() => {
                              // 残日数ペース（経過日以降の未来日のみ表示）
                              if (day <= elapsedDays || dailyTargetForRemaining <= 0) return null
                              return (
                                <>
                                  <CalDivider />
                                  <CalCell $color={palette.slate}>
                                    要日 {fmtSen(dailyTargetForRemaining)}
                                  </CalCell>
                                </>
                              )
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
          ctsIndex={ctx.ctsIndex}
          prevCtsIndex={ctx.prevCtsIndex}
          dailyMap={r.daily}
          selectedStoreIds={ctx.selectedStoreIds}
          onClose={() => setDetailDay(null)}
        />
      )}
    </CalWrapper>
  )
}
