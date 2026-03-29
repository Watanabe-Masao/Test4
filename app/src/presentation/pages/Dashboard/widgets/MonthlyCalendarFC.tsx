/**
 * MonthlyCalendarFC — FullCalendar ベースの月間カレンダー
 *
 * @fullcalendar/react + daygrid + interaction で実装。
 * 既存の MonthlyCalendar.tsx と同じデータ・インタラクションを提供しつつ、
 * ドラッグ範囲選択・ビュー切替などの拡張機能を追加。
 */
import { useCallback, useMemo, memo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DayCellContentArg, DateSelectArg } from '@fullcalendar/core'
import type { DateClickArg } from '@fullcalendar/interaction'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { Button } from '@/presentation/components/common/layout'
import { formatPercent } from '@/domain/formatting'
import { calculateAchievementRate } from '@/domain/calculations/utils'
import { categorizeWeatherCode } from '@/domain/weather/weatherAggregation'
import type { WidgetContext } from './types'
import { DayDetailModal } from './DayDetailModal'
import { RangeComparisonPanel } from './RangeComparison'
import { CalendarCellPreview } from './CalendarCellPreview'
import { fmtSen } from './drilldownUtils'
import { DOW_NAMES, WEATHER_ICONS, fmtSenDiff, calcWeekSummary } from './calendarUtils'
import {
  CalWrapper,
  CalSectionTitle,
  CalGrid,
  CalCell,
  CalHeroValue,
  CalAchBar,
  CalMetricRow,
  CalDivider,
  CalActionBtn,
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
  WeekSummaryGrid,
  WeekSummaryLabel,
  WeekSummaryValue,
} from '../MonthlyCalendar.styles'
import { ToolInputGroup, RangeToolbar, RangeLabel, RangeInput } from '../DashboardPage.styles'
import {
  FCLayout,
  FCCalendarArea,
  FCWeekSummaryCol,
  FCWeekSummaryHeader,
  FCWeekSummaryCell,
  FCCellContent,
  FCDayHeader,
  FCDayNum,
  FCWeatherIcon,
  FCPreviewWrapper,
} from '../MonthlyCalendarFC.styles'
import { useMonthlyCalendarState } from './useMonthlyCalendarState'

export const MonthlyCalendarFCWidget = memo(function MonthlyCalendarFCWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  const { result: r, year, month, prevYear, fmtCurrency } = ctx
  const state = useMonthlyCalendarState(ctx)
  const {
    pins,
    pinDay,
    detailDay,
    hoveredDay,
    inputVal,
    setPinDay,
    setDetailDay,
    setHoveredDay,
    setInputVal,
    rangeAStart,
    rangeAEnd,
    rangeBStart,
    rangeBEnd,
    setRangeAStart,
    setRangeAEnd,
    setRangeBStart,
    setRangeBEnd,
    rangeAData,
    rangeBData,
    hasAnyRange,
    handleRangeClear,
    handleRangeSwap,
    weeks,
    cumBudget,
    cumSales,
    cumPrevYear,
    cumCustomers,
    cumPrevCustomers,
    weatherByDay,
    intervals,
    getIntervalForDay,
    handleOpenPin,
    handlePinConfirm,
    handlePinRemove,
    getPrevYearSales,
    isExporting,
    handleClipExport,
  } = state

  // FullCalendar の初期日付
  const initialDate = useMemo(() => `${year}-${String(month).padStart(2, '0')}-01`, [year, month])

  // ── FullCalendar イベント ──

  const handleDateClick = useCallback(
    (arg: DateClickArg) => {
      const d = arg.date
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        setDetailDay(d.getDate())
      }
    },
    [year, month, setDetailDay],
  )

  const handleDateSelect = useCallback(
    (arg: DateSelectArg) => {
      const start = arg.start
      const end = new Date(arg.end.getTime() - 86400000) // end is exclusive
      if (start.getFullYear() === year && start.getMonth() + 1 === month) {
        setRangeAStart(String(start.getDate()))
        setRangeAEnd(String(end.getDate()))
      }
    },
    [year, month, setRangeAStart, setRangeAEnd],
  )

  // ── セルレンダリング ──

  const renderDayCell = useCallback(
    (arg: DayCellContentArg) => {
      const d = arg.date
      const isOtherMonth = d.getFullYear() !== year || d.getMonth() + 1 !== month
      if (isOtherMonth) return <FCDayNum $dim>{d.getDate()}</FCDayNum>

      const day = d.getDate()
      const rec = r.daily.get(day)
      const budget = r.budgetDaily.get(day) ?? 0
      const actual = rec?.sales ?? 0
      const dayDiff = actual - budget
      const achievement = calculateAchievementRate(actual, budget)
      const diffColor = sc.cond(dayDiff >= 0)

      const cBudget = cumBudget.get(day) ?? 0
      const cSales = cumSales.get(day) ?? 0
      const cDiff = cSales - cBudget
      const cAch = calculateAchievementRate(cSales, cBudget)
      const cDiffColor = sc.cond(cDiff >= 0)
      const cAchColor = sc.achievement(cAch)

      const isPinned = pins.has(day)
      const interval = isPinned ? getIntervalForDay(day) : undefined

      const weather = weatherByDay.get(day)
      const weatherIcon = weather
        ? WEATHER_ICONS[categorizeWeatherCode(weather.dominantWeatherCode)]
        : null

      const pySales = getPrevYearSales(day)

      return (
        <FCCellContent
          onMouseEnter={() => setHoveredDay(day)}
          onMouseLeave={() => setHoveredDay(null)}
        >
          <FCDayHeader>
            <FCDayNum>
              {day}
              {weatherIcon && <FCWeatherIcon>{weatherIcon}</FCWeatherIcon>}
            </FCDayNum>
            <CalActionBtn
              $color={palette.primary}
              title="在庫ピン止め"
              onClick={(e) => {
                e.stopPropagation()
                handleOpenPin(day)
              }}
            >
              📌
            </CalActionBtn>
          </FCDayHeader>

          {(budget > 0 || actual > 0) && (
            <CalGrid>
              <CalHeroValue>{fmtSen(actual)}</CalHeroValue>
              <CalMetricRow>
                <CalCell $color={diffColor} $bold>
                  {dayDiff >= 0 ? '▲' : '▼'} {fmtSenDiff(dayDiff)}
                </CalCell>
              </CalMetricRow>
              {budget > 0 && <CalAchBar $pct={achievement} />}
              {prevYear.hasPrevYear &&
                (() => {
                  if (pySales <= 0) return null
                  const pyRatio = actual / pySales
                  const pyColor = pyRatio >= 1 ? sc.positive : sc.negative
                  return (
                    <CalCell $color={pyColor}>
                      {pyRatio >= 1 ? '▲' : '▼'} 前年{formatPercent(pyRatio, 0)}
                    </CalCell>
                  )
                })()}
              {cBudget > 0 && (
                <>
                  <CalDivider />
                  <CalMetricRow>
                    <CalCell $color={cAchColor}>累計 {formatPercent(cAch, 0)}</CalCell>
                    <CalCell $color={cDiffColor}>
                      {cDiff >= 0 ? '+' : ''}
                      {fmtSen(cDiff)}
                    </CalCell>
                  </CalMetricRow>
                </>
              )}
            </CalGrid>
          )}

          {isPinned && interval && (
            <PinIndicator>GP {formatPercent(interval.grossProfitRate)}</PinIndicator>
          )}

          {hoveredDay === day && (budget > 0 || actual > 0) && (
            <FCPreviewWrapper>
              <CalendarCellPreview
                month={month}
                day={day}
                dayOfWeek={DOW_NAMES[new Date(year, month - 1, day).getDay()]}
                actual={actual}
                budget={budget}
                achievement={achievement}
                dayDiff={dayDiff}
                customers={rec?.customers ?? 0}
                pySales={pySales}
                hasPrevYear={prevYear.hasPrevYear}
                weather={weather}
                weatherIcon={weatherIcon}
                fmtCurrency={fmtCurrency}
              />
            </FCPreviewWrapper>
          )}
        </FCCellContent>
      )
    },
    [
      year,
      month,
      r,
      cumBudget,
      cumSales,
      pins,
      weatherByDay,
      prevYear,
      hoveredDay,
      getIntervalForDay,
      getPrevYearSales,
      handleOpenPin,
      setHoveredDay,
      fmtCurrency,
    ],
  )

  // ── 週計サイドバー ──

  const weekSummaries = useMemo(
    () => weeks.map((week) => calcWeekSummary(week, r, prevYear, year, month)),
    [weeks, r, prevYear, year, month],
  )

  return (
    <CalWrapper>
      <CalSectionTitle
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <span>
          月間カレンダー（{year}年{month}月）- セルクリックで詳細表示 / 📌で在庫ピン止め /
          ドラッグで期間選択
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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRangeAStart(e.target.value)}
        />
        <span>～</span>
        <RangeInput
          type="text"
          value={rangeAEnd}
          placeholder="終了"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRangeAEnd(e.target.value)}
        />
        <Button $variant="outline" onClick={handleRangeSwap} title="A⇄B 入替">
          ⇄
        </Button>
        <RangeLabel>期間B:</RangeLabel>
        <RangeInput
          type="text"
          value={rangeBStart}
          placeholder="開始"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRangeBStart(e.target.value)}
        />
        <span>～</span>
        <RangeInput
          type="text"
          value={rangeBEnd}
          placeholder="終了"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRangeBEnd(e.target.value)}
        />
        {hasAnyRange && (
          <Button $variant="outline" onClick={handleRangeClear}>
            クリア
          </Button>
        )}
      </RangeToolbar>

      {hasAnyRange && (
        <RangeComparisonPanel rangeAData={rangeAData} rangeBData={rangeBData} prevYear={prevYear} />
      )}

      {/* FullCalendar + Week Summary */}
      <FCLayout>
        <FCCalendarArea>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={initialDate}
            locale="ja"
            firstDay={1}
            headerToolbar={false}
            fixedWeekCount={false}
            height="auto"
            selectable
            select={handleDateSelect}
            dateClick={handleDateClick}
            dayCellContent={renderDayCell}
            dayHeaderFormat={{ weekday: 'short' }}
          />
        </FCCalendarArea>

        <FCWeekSummaryCol>
          <FCWeekSummaryHeader>週計</FCWeekSummaryHeader>
          {weekSummaries.map((ws, i) => (
            <FCWeekSummaryCell key={i}>
              {ws.dayCount > 0 && (
                <WeekSummaryGrid>
                  <div>
                    <WeekSummaryLabel>売上</WeekSummaryLabel>
                    <WeekSummaryValue>{fmtSen(ws.wSales)}</WeekSummaryValue>
                  </div>
                  <div>
                    <WeekSummaryLabel>予算差</WeekSummaryLabel>
                    <WeekSummaryValue $color={sc.cond(ws.wDiff >= 0)}>
                      {fmtSenDiff(ws.wDiff)}
                    </WeekSummaryValue>
                  </div>
                  {ws.wBudget > 0 && (
                    <div>
                      <WeekSummaryLabel>達成</WeekSummaryLabel>
                      <WeekSummaryValue $color={sc.achievement(ws.wAch)}>
                        {formatPercent(ws.wAch, 0)}
                      </WeekSummaryValue>
                    </div>
                  )}
                  {prevYear.hasPrevYear && ws.wPySales > 0 && (
                    <div>
                      <WeekSummaryLabel>前年比</WeekSummaryLabel>
                      <WeekSummaryValue $color={sc.cond(ws.wPyRatio >= 1)}>
                        {formatPercent(ws.wPyRatio, 0)}
                      </WeekSummaryValue>
                    </div>
                  )}
                  {ws.wCustomers > 0 && (
                    <div>
                      <WeekSummaryLabel>客数</WeekSummaryLabel>
                      <WeekSummaryValue>{ws.wCustomers.toLocaleString()}</WeekSummaryValue>
                    </div>
                  )}
                </WeekSummaryGrid>
              )}
            </FCWeekSummaryCell>
          ))}
        </FCWeekSummaryCol>
      </FCLayout>

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
                <IntervalMetricValue>{fmtCurrency(iv.totalSales)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>粗利</IntervalMetricLabel>
                <IntervalMetricValue>{fmtCurrency(iv.grossProfit)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>売上原価</IntervalMetricLabel>
                <IntervalMetricValue>{fmtCurrency(iv.cogs)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>期首在庫</IntervalMetricLabel>
                <IntervalMetricValue>{fmtCurrency(iv.openingInventory)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>期末在庫</IntervalMetricLabel>
                <IntervalMetricValue>{fmtCurrency(iv.closingInventory)}</IntervalMetricValue>
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
          queryExecutor={ctx.queryExecutor}
          dataVersion={ctx.duckDataVersion}
          dailyMap={r.daily}
          selectedStoreIds={ctx.selectedStoreIds}
          comparisonScope={ctx.comparisonScope}
          onClose={() => setDetailDay(null)}
        />
      )}
    </CalWrapper>
  )
})
