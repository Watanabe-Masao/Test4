import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { Button } from '@/presentation/components/common/layout'
import { formatPercent } from '@/domain/formatting'
import { calculateAchievementRate } from '@/domain/calculations/utils'
import { categorizeWeatherCode } from '@/domain/calculations/weatherAggregation'
import type { WidgetContext } from './types'
import { DayDetailModal } from './DayDetailModal'
import { RangeComparisonPanel } from './RangeComparison'
import { CalendarCellPreview } from './CalendarCellPreview'
import { fmtSen } from './drilldownUtils'
import { DOW_LABELS, DOW_NAMES, WEATHER_ICONS, fmtSenDiff, calcWeekSummary } from './calendarUtils'
import {
  CalWrapper,
  CalSectionTitle,
  CalTable,
  CalTh,
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
  RangeInput,
  CalWeatherIcon,
  CalCellWrapper,
  CalThWeek,
  CalTdWeek,
  WeekSummaryGrid,
  WeekSummaryLabel,
  WeekSummaryValue,
} from '../DashboardPage.styles'
import { DragTargetBtn, DragHint } from '../MonthlyCalendar.styles'
import { useMonthlyCalendarState } from './useMonthlyCalendarState'

export function MonthlyCalendarWidget({ ctx }: { ctx: WidgetContext }) {
  const { result: r, year, month, prevYear, fmtCurrency } = ctx
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
    isDayInRangeA,
    isDayInRangeB,
    handleRangeClear,
    handleRangeSwap,
    weeks,
    cumBudget,
    cumSales,
    cumPrevYear,
    cumCustomers,
    cumPrevCustomers,
    weatherByDay,
    sortedPins,
    intervals,
    getIntervalForDay,
    handleOpenPin,
    handlePinConfirm,
    handlePinRemove,
    dragRef,
    setDragTarget,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    getPrevYearSales,
    isExporting,
    handleClipExport,
  } = useMonthlyCalendarState(ctx)

  // sortedPins is used indirectly via intervals; silence unused-var lint
  void sortedPins

  return (
    <CalWrapper onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}>
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

      {/* Range Selection Toolbar — ドラッグ選択 + 手入力 */}
      <RangeToolbar>
        <DragTargetBtn
          $active={hasAnyRange && rangeAStart !== ''}
          $color={palette.warningDark}
          onClick={() => setDragTarget('A')}
          title="クリックしてからカレンダーをドラッグで期間A選択"
        >
          期間A
        </DragTargetBtn>
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
        <DragTargetBtn
          $active={hasAnyRange && rangeBStart !== ''}
          $color={palette.primary}
          onClick={() => setDragTarget('B')}
          title="クリックしてからカレンダーをドラッグで期間B選択"
        >
          期間B
        </DragTargetBtn>
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
        <DragHint>セルをドラッグで期間選択</DragHint>
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
            <CalThWeek>週計</CalThWeek>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => {
            const ws = calcWeekSummary(week, r, prevYear, year, month)
            return (
              <tr key={wi}>
                {week.map((day, di) => {
                  if (day == null) return <CalCellWrapper key={di} $empty />
                  const rec = r.daily.get(day)
                  const budget = r.budgetDaily.get(day) ?? 0
                  const actual = rec?.sales ?? 0
                  const dayDiff = actual - budget
                  const achievement_pragmatic = calculateAchievementRate(actual, budget)
                  const isWeekend = di >= 5
                  const diffColor = sc.cond(dayDiff >= 0)
                  const hasActual = actual > 0

                  const cBudget = cumBudget.get(day) ?? 0
                  const cSales = cumSales.get(day) ?? 0
                  const cDiff = cSales - cBudget
                  const cAch = calculateAchievementRate(cSales, cBudget)
                  const cDiffColor = sc.cond(cDiff >= 0)
                  const cAchColor = sc.achievement(cAch)

                  const isPinned = pins.has(day)
                  const interval = isPinned ? getIntervalForDay(day) : undefined

                  // Weather
                  const weather = weatherByDay.get(day)
                  const weatherIcon = weather
                    ? WEATHER_ICONS[categorizeWeatherCode(weather.dominantWeatherCode)]
                    : null

                  // Hover preview data
                  const isHovered = hoveredDay === day
                  const dayCust = rec?.customers ?? 0
                  const pySales = getPrevYearSales(day)
                  const dayOfWeek = DOW_NAMES[new Date(year, month - 1, day).getDay()]

                  return (
                    <CalCellWrapper
                      key={di}
                      $hasActual={hasActual}
                      onMouseEnter={() => {
                        setHoveredDay(day)
                        handleDragEnter(day)
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                      onMouseDown={(e: React.MouseEvent) => {
                        if (e.button === 0) {
                          e.preventDefault()
                          handleDragStart(day, dragRef.current.target)
                        }
                      }}
                      onMouseUp={handleDragEnd}
                    >
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
                          <CalDayNum $weekend={isWeekend}>
                            {day}
                            {weatherIcon && (
                              <CalWeatherIcon
                                title={
                                  weather?.weatherTextDay || weather?.weatherTextNight || undefined
                                }
                              >
                                {weatherIcon}
                              </CalWeatherIcon>
                            )}
                          </CalDayNum>
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
                              {budget > 0 && <CalAchBar $pct={achievement_pragmatic} />}
                              {/* 前年比 (色+アイコン) */}
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
                          <PinIndicator>GP {formatPercent(interval.grossProfitRate)}</PinIndicator>
                        )}
                      </CalDayCell>

                      {/* Hover Preview */}
                      {isHovered && (budget > 0 || actual > 0) && (
                        <CalendarCellPreview
                          month={month}
                          day={day}
                          dayOfWeek={dayOfWeek}
                          actual={actual}
                          budget={budget}
                          achievement={achievement_pragmatic}
                          dayDiff={dayDiff}
                          customers={dayCust}
                          pySales={pySales}
                          hasPrevYear={prevYear.hasPrevYear}
                          weather={weather}
                          weatherIcon={weatherIcon}
                          fmtCurrency={fmtCurrency}
                        />
                      )}
                    </CalCellWrapper>
                  )
                })}
                {/* Week summary column */}
                <CalTdWeek>
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
                </CalTdWeek>
              </tr>
            )
          })}
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
}
