/**
 * IntegratedSalesChart — 売上推移分析ユニットの正本コンテナ
 *
 * 日別売上（overview）と時間帯別売上（drilldown）、部門別時間帯パターン（孫）を
 * 同じ分析文脈の下で束ねる包含型ウィジェット。
 *
 * 設計原則:
 * - 親が SalesAnalysisContext を構築し、配下の派生ビューに配る
 * - 子/孫は文脈を consume only（比較文脈の再計算禁止）
 * - 日別チャートは常時表示、時間帯は包含表示（ドリル時のみ）
 * - 部門別時間帯パターンは孫として時間帯の下に包含
 * - 右軸モードに応じてサブ分析パネルを動的配置
 *
 * 状態管理・データ取得は useIntegratedSalesState に分離。
 */
import { memo, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { WeatherPersister } from '@/application/queries/weather'
import type { DailyRecord, DailyWeatherSummary, DiscountEntry } from '@/domain/models/record'
import { useIntegratedSalesState } from './useIntegratedSalesState'
import { DailySalesChart } from './DailySalesChart'
import { TimeSlotChart } from './TimeSlotChart'
import { SubAnalysisPanel } from './SubAnalysisPanel'
import { SubTabContent } from './IntegratedSalesSubTabs'
import { YoYWaterfallChartWidget } from '@/presentation/pages/Dashboard/widgets/YoYWaterfallChart'
import { useCurrencyFormat } from './chartTheme'
import { formatPercent } from '@/domain/formatting'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import { TabGroup, Tab, TabWrapper } from './TimeSlotSalesChart.styles'
import {
  Wrapper,
  DrillNav,
  NavItem,
  NavSep,
  DrillHint,
  RangeActionBox,
  RangeActionLabel,
  RangeActionBtnGroup,
  RangeActionBtn,
  DrillPeriodBadge,
  DayDrillClose,
} from './IntegratedSalesChart.styles'

interface Props {
  // DailySalesChart props
  readonly daily: ReadonlyMap<number, DailyRecord>
  readonly daysInMonth: number
  readonly year: number
  readonly month: number
  readonly prevYearDaily?: ReadonlyMap<
    string,
    {
      sales: number
      discount: number
      customers?: number
      discountEntries?: Record<string, number>
    }
  >
  readonly budgetDaily?: ReadonlyMap<number, number>
  // SubAnalysisPanel（売変分析）用
  readonly discountEntries?: readonly DiscountEntry[]
  readonly totalGrossSales?: number
  // TimeSlotChart / DeptHourlyChart / SubAnalysisPanel props
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly dowOffset?: number
  readonly weatherDaily?: readonly DailyWeatherSummary[]
  readonly prevYearWeatherDaily?: readonly DailyWeatherSummary[]
  /** 天気データ永続化コールバック（TimeSlotChart ETRN フォールバック用） */
  readonly weatherPersist?: WeatherPersister | null
  /** WidgetContext（要因分析 embedded 用 — 親から渡す） */
  readonly widgetCtx?: import('@/presentation/pages/Dashboard/widgets/types').WidgetContext
}

export const IntegratedSalesChart = memo(function IntegratedSalesChart(props: Props) {
  const {
    // state
    rightAxisMode,
    setRightAxisMode,
    dailyView,
    setDailyView,
    drillLevel,
    slideDirection,
    clickedDay,
    setClickedDay,
    subTab,
    setSubTab,
    pendingRange,
    drillEnd,
    setDrillEnd,
    showMovingAverage,
    setShowMovingAverage,
    // refs
    parentRef,
    drillPanelRef,
    // derived
    canDrill,
    isDrilled,
    dailyQuantity,
    drillContext,
    analysisContext,
    drillTabDateRange,
    maOverlays,
    rangeLabel,
    // handlers
    handleDayClick,
    handleDayRangeSelect,
    handleRangeToTimeSlot,
    handleDblClickToTimeSlot,
    handleRangeCancel,
    handleDrillToTimeSlot,
    handleBackToDaily,
  } = useIntegratedSalesState({
    queryExecutor: props.queryExecutor,
    currentDateRange: props.currentDateRange,
    selectedStoreIds: props.selectedStoreIds,
    prevYearScope: props.prevYearScope,
    year: props.year,
    month: props.month,
    daysInMonth: props.daysInMonth,
  })

  const { format: fmtCurrency } = useCurrencyFormat()

  // ── pendingRange / clickedDay の統合範囲 ──
  const effectiveRange =
    pendingRange ?? (clickedDay != null ? { start: clickedDay, end: drillEnd ?? clickedDay } : null)

  // ── 選択範囲のサマリー（RangeActionBox + 要因分解に使用） ──
  const rangeSummary = useMemo(() => {
    if (!pendingRange) return null
    const { start, end } = pendingRange
    let curSales = 0
    let prevSales = 0
    let curCustomers = 0
    let prevCustomers = 0
    for (let d = start; d <= end; d++) {
      const rec = props.daily.get(d)
      if (rec) {
        curSales += rec.sales ?? 0
        curCustomers += rec.customers ?? 0
      }
      if (props.prevYearDaily) {
        const key = toDateKeyFromParts(props.year, props.month, d)
        const prev = props.prevYearDaily.get(key)
        if (prev) {
          prevSales += prev.sales ?? 0
          prevCustomers += prev.customers ?? 0
        }
      }
    }
    const diff = curSales - prevSales
    const yoy = prevSales > 0 ? curSales / prevSales : null
    return { curSales, prevSales, diff, yoy, curCustomers, prevCustomers }
  }, [pendingRange, props.daily, props.prevYearDaily, props.year, props.month])

  return (
    <Wrapper ref={parentRef}>
      {/* ── パンくずナビ（ドリル時） ── */}
      {isDrilled && drillContext && (
        <DrillNav ref={drillPanelRef}>
          <NavItem $active={drillLevel === 0} onClick={handleBackToDaily}>
            日別売上
          </NavItem>
          <NavSep>›</NavSep>
          <NavItem $active={drillLevel >= 1} onClick={handleDrillToTimeSlot}>
            時間帯別分析（{rangeLabel}）
          </NavItem>
        </DrillNav>
      )}

      {/* ── レベル切替（横スライドアニメーション） ── */}
      <AnimatePresence mode="wait" custom={slideDirection}>
        {drillLevel === 0 && (
          <motion.div
            key="level-0"
            custom={slideDirection}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
          >
            <DailySalesChart
              daily={props.daily}
              daysInMonth={props.daysInMonth}
              year={props.year}
              month={props.month}
              prevYearDaily={props.prevYearDaily}
              budgetDaily={props.budgetDaily}
              onDayRangeSelect={canDrill ? handleDayRangeSelect : undefined}
              onDayClick={canDrill ? handleDayClick : undefined}
              onDblClickToTimeSlot={canDrill ? handleDblClickToTimeSlot : undefined}
              weatherDaily={props.weatherDaily}
              prevYearWeatherDaily={props.prevYearWeatherDaily}
              dowOffset={props.dowOffset}
              dailyQuantity={dailyQuantity}
              rightAxisMode={rightAxisMode}
              onRightAxisModeChange={setRightAxisMode}
              onViewChange={setDailyView}
              maOverlays={maOverlays}
              showMovingAverage={showMovingAverage}
              onShowMovingAverageChange={setShowMovingAverage}
              hasActiveSelection={pendingRange != null}
            />
            {canDrill && (
              <DrillHint>クリックでカテゴリ分析 / ダブルクリック or ドラッグで時間帯内訳</DrillHint>
            )}

            {/* 範囲選択BOX */}
            {pendingRange != null && (
              <RangeActionBox>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <RangeActionLabel>
                      {props.month}月{pendingRange.start}日
                      {pendingRange.start !== pendingRange.end && `〜${pendingRange.end}日`}
                      を選択しました
                    </RangeActionLabel>
                    <RangeActionBtnGroup>
                      <RangeActionBtn onClick={handleRangeToTimeSlot}>時間帯売上</RangeActionBtn>
                      <RangeActionBtn $secondary onClick={handleRangeCancel}>
                        選択解除
                      </RangeActionBtn>
                    </RangeActionBtnGroup>
                  </div>
                  {rangeSummary && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 16,
                        fontSize: '0.7rem',
                        fontFamily: 'monospace',
                        color: 'inherit',
                        opacity: 0.85,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>
                        当期売上: <b>{fmtCurrency(rangeSummary.curSales)}</b>
                      </span>
                      <span>
                        前年売上: <b>{fmtCurrency(rangeSummary.prevSales)}</b>
                      </span>
                      <span style={{ color: rangeSummary.diff >= 0 ? '#10b981' : '#ef4444' }}>
                        差額:{' '}
                        <b>
                          {rangeSummary.diff >= 0 ? '+' : ''}
                          {fmtCurrency(rangeSummary.diff)}
                        </b>
                      </span>
                      {rangeSummary.yoy != null && (
                        <span style={{ color: rangeSummary.yoy >= 1 ? '#10b981' : '#ef4444' }}>
                          前年比: <b>{formatPercent(rangeSummary.yoy, 2)}</b>
                        </span>
                      )}
                      <span>
                        当期客数: <b>{rangeSummary.curCustomers.toLocaleString()}人</b>
                      </span>
                      <span>
                        前年客数: <b>{rangeSummary.prevCustomers.toLocaleString()}人</b>
                      </span>
                    </div>
                  )}
                </div>
              </RangeActionBox>
            )}

            {/* 要因分析（独立表示 — 標準ビュー時のみ） */}
            {dailyView === 'standard' && props.widgetCtx && props.queryExecutor?.isReady && (
              <YoYWaterfallChartWidget
                ctx={props.widgetCtx}
                overrideDateRange={drillTabDateRange ?? undefined}
                embedded
                rangeStart={effectiveRange?.start}
                rangeEnd={effectiveRange?.end}
              />
            )}

            {/* 子: 標準ビュー + 右軸モードに応じた分析パネル */}
            {dailyView === 'standard' &&
              props.queryExecutor?.isReady &&
              (rightAxisMode === 'quantity' || rightAxisMode === 'customers' ? (
                /* 標準 + 点数/客数 → カテゴリ分析 / ドリルダウン分析 */
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <TabGroup>
                      {(['trend', 'bar', 'drilldown'] as const).map((key) => (
                        <TabWrapper key={key}>
                          {subTab === key && (
                            <motion.div
                              layoutId="sub-tab-pill"
                              className="tab-indicator"
                              style={{ position: 'absolute', inset: 0, borderRadius: 'inherit' }}
                              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                            />
                          )}
                          <Tab $active={subTab === key} onClick={() => setSubTab(key)}>
                            {key === 'trend'
                              ? '日次推移'
                              : key === 'bar'
                                ? 'カテゴリ棒'
                                : 'ドリルダウン分析'}
                          </Tab>
                        </TabWrapper>
                      ))}
                    </TabGroup>
                    {clickedDay != null && (
                      <DrillPeriodBadge>
                        {props.month}月{clickedDay}
                        {drillEnd != null && drillEnd !== clickedDay ? `〜${drillEnd}` : ''}日
                        <DayDrillClose
                          onClick={() => {
                            setClickedDay(null)
                            setDrillEnd(null)
                          }}
                        >
                          ✕
                        </DayDrillClose>
                      </DrillPeriodBadge>
                    )}
                  </div>
                  <SubTabContent
                    subTab={subTab}
                    queryExecutor={props.queryExecutor}
                    dateRange={analysisContext.dateRange}
                    selectedStoreIds={analysisContext.selectedStoreIds}
                    comparisonScope={analysisContext.comparisonScope}
                    weatherDaily={props.weatherDaily}
                    daily={props.daily}
                    daysInMonth={props.daysInMonth}
                    year={props.year}
                    month={props.month}
                    prevYearDaily={props.prevYearDaily}
                    discountEntries={props.discountEntries}
                    totalGrossSales={props.totalGrossSales}
                  />
                </div>
              ) : (
                /* 標準 + 売変/気温/降水量 → 対応する SubAnalysisPanel のみ */
                <SubAnalysisPanel
                  mode={rightAxisMode}
                  queryExecutor={props.queryExecutor}
                  currentDateRange={analysisContext.dateRange}
                  selectedStoreIds={analysisContext.selectedStoreIds}
                  prevYearScope={analysisContext.comparisonScope}
                  weatherDaily={props.weatherDaily}
                  daily={props.daily}
                  daysInMonth={props.daysInMonth}
                  year={props.year}
                  month={props.month}
                  prevYearDaily={props.prevYearDaily}
                  discountEntries={props.discountEntries}
                  totalGrossSales={props.totalGrossSales}
                />
              ))}
          </motion.div>
        )}

        {drillLevel >= 1 && isDrilled && drillContext && (
          <motion.div
            key="level-1"
            custom={slideDirection}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
          >
            <TimeSlotChart
              queryExecutor={props.queryExecutor}
              context={drillContext}
              weatherPersist={props.weatherPersist}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Wrapper>
  )
})

// ── Animation ──

const SLIDE_OFFSET = 60

const slideVariants = {
  enter: (dir: number) => ({ x: dir * SLIDE_OFFSET, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -SLIDE_OFFSET, opacity: 0 }),
}

const slideTransition = { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const }
