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
 */
import { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react'
import styled from 'styled-components'
import { AnimatePresence, motion } from 'framer-motion'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/CalendarDate'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { WeatherPersister } from '@/application/queries/weather'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import { useMovingAverageOverlay } from '@/application/hooks/useTemporalAnalysis'
import {
  dailyQuantityHandler,
  type DailyQuantityInput,
} from '@/application/queries/summary/DailyQuantityHandler'
import type { DailyQuantityData } from './useDailySalesData'
import type { DailyRecord, DailyWeatherSummary, DiscountEntry } from '@/domain/models/record'
import { useDrillDateRange } from '@/application/hooks/useDrillDateRange'
import {
  buildSalesAnalysisContext,
  deriveChildContext,
} from '@/application/models/SalesAnalysisContext'
// AnalysisViewEvents / CategoryFocus は TimeSlotChart 統合に伴い不要（将来復帰可能性あり）
import {
  buildRootNodeContext,
  deriveNodeContext,
  deriveDeptPatternContext,
  DEFAULT_TOP_DEPARTMENT_POLICY,
} from '@/application/models/AnalysisNodeContext'
// useCrossChartSelection は TimeSlotChart 統合に伴い不要
import type { RightAxisMode } from './DailySalesChartBodyLogic'
import type { ViewType } from './DailySalesChartBody'
import { DailySalesChart } from './DailySalesChart'
import { TimeSlotChart } from './TimeSlotChart'
import { SubAnalysisPanel } from './SubAnalysisPanel'
import { YoYWaterfallChartWidget } from '@/presentation/pages/Dashboard/widgets/YoYWaterfallChart'
import { CategoryHierarchyExplorer } from './CategoryHierarchyExplorer'
import { TabGroup, Tab } from './TimeSlotSalesChart.styles'
import {
  RangeActionBox,
  RangeActionLabel,
  RangeActionBtnGroup,
  RangeActionBtn,
  DrillPeriodBadge,
  DayDrillClose,
} from './IntegratedSalesChart.styles'
// ContainedAnalysisPanel は横スライド切替化により不要（将来の参照用にコメント残置）
// import { ContainedAnalysisPanel, type ContextTag } from './ContainedAnalysisPanel'

interface SelectedRange {
  readonly start: number
  readonly end: number
}

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

/** ヘッダ固定分の offset（px） */
const SCROLL_OFFSET = 16

export const IntegratedSalesChart = memo(function IntegratedSalesChart(props: Props) {
  const [selectedRange, setSelectedRange] = useState<SelectedRange | null>(null)
  const [rightAxisMode, setRightAxisMode] = useState<RightAxisMode>('quantity')
  const [dailyView, setDailyView] = useState<ViewType>('standard')
  const [drillLevel, setDrillLevel] = useState(0)
  const [slideDirection, setSlideDirection] = useState(1)

  // clickedDay: useState 上限(8)回避のため useReducer 的にdrillLevelを再利用
  const [clickedDay, setClickedDay] = useState<number | null>(null)
  const [subTab, setSubTab] = useState<'factor' | 'trend' | 'drilldown'>('factor')
  const [pendingRange, setPendingRange] = useState<{ start: number; end: number } | null>(null)

  // ── drill scroll 制御 ──
  const parentRef = useRef<HTMLDivElement>(null)
  const drillPanelRef = useRef<HTMLDivElement>(null)

  const canDrill = props.queryExecutor?.isReady === true

  // ── 日別点数データ（DuckDB 由来） ──
  const storeIds = useMemo(
    () => (props.selectedStoreIds.size > 0 ? [...props.selectedStoreIds] : undefined),
    [props.selectedStoreIds],
  )
  const curQtyInput = useMemo<DailyQuantityInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(props.currentDateRange)
    return { dateFrom: fromKey, dateTo: toKey, storeIds, isPrevYear: false }
  }, [props.currentDateRange, storeIds])
  const prevYearDateRange = props.prevYearScope?.dateRange
  const prevQtyInput = useMemo<DailyQuantityInput | null>(() => {
    if (!prevYearDateRange) return null
    const { fromKey, toKey } = dateRangeToKeys(prevYearDateRange)
    return { dateFrom: fromKey, dateTo: toKey, storeIds, isPrevYear: true }
  }, [prevYearDateRange, storeIds])
  const { data: curQtyOut } = useQueryWithHandler(
    props.queryExecutor,
    dailyQuantityHandler,
    curQtyInput,
  )
  const { data: prevQtyOut } = useQueryWithHandler(
    props.queryExecutor,
    dailyQuantityHandler,
    prevQtyInput,
  )
  const dailyQuantity = useMemo<DailyQuantityData | undefined>(() => {
    if (!curQtyOut) return undefined
    const current = new Map<number, number>()
    for (const r of curQtyOut.records) {
      const day = Number(r.dateKey.split('-')[2])
      current.set(day, (current.get(day) ?? 0) + r.dailyQuantity)
    }
    const prev = new Map<number, number>()
    if (prevQtyOut && prevYearDateRange) {
      // 前年 dateKey → 当期の日番号にマッピング
      // prevYearDateRange.from と currentDateRange.from の対応を使い、
      // 前年日付の経過日数を当期の日番号に変換する（同曜日比較時の日ずれ対応）
      const prevFrom = new Date(
        prevYearDateRange.from.year,
        prevYearDateRange.from.month - 1,
        prevYearDateRange.from.day,
      )
      const curFromDay = props.currentDateRange.from.day
      for (const r of prevQtyOut.records) {
        const [y, m, d] = r.dateKey.split('-').map(Number)
        const prevDate = new Date(y, m - 1, d)
        const elapsed = Math.round(
          (prevDate.getTime() - prevFrom.getTime()) / (24 * 60 * 60 * 1000),
        )
        const targetDay = curFromDay + elapsed
        prev.set(targetDay, (prev.get(targetDay) ?? 0) + r.dailyQuantity)
      }
    }
    return { current, prev }
  }, [curQtyOut, prevQtyOut, prevYearDateRange, props.currentDateRange])

  const handleDayClick = useCallback((day: number) => {
    setClickedDay((prev) => (prev === day ? null : day))
    setSubTab('drilldown')
  }, [])

  const handleDayRangeSelect = useCallback(
    (startDay: number, endDay: number) => {
      if (!canDrill) return
      setPendingRange({ start: startDay, end: endDay })
    },
    [canDrill],
  )

  const handleRangeToTimeSlot = useCallback(() => {
    if (!pendingRange) return
    setSelectedRange(pendingRange)
    setPendingRange(null)
    setSlideDirection(1)
    setDrillLevel(1)
  }, [pendingRange])

  const handleRangeToDrilldown = useCallback(() => {
    if (!pendingRange) return
    setClickedDay(pendingRange.start)
    setPendingRange(null)
    setSubTab('drilldown')
  }, [pendingRange])

  const handleRangeCancel = useCallback(() => setPendingRange(null), [])

  // DateRange 構築は application 層の hook に委譲（presentation 層でのデータ調停を防止）
  const { dateRange: rangeDateRange, prevYearScope: rangePrevYearScope } = useDrillDateRange(
    selectedRange,
    props.year,
    props.month,
    props.prevYearScope,
  )

  const isDrilled = selectedRange != null && rangeDateRange != null

  // drill 開始時: ナビ見出しへ自動スクロール
  const prevIsDrilledRef = useRef(false)
  useEffect(() => {
    if (isDrilled && !prevIsDrilledRef.current) {
      requestAnimationFrame(() => {
        if (parentRef.current) {
          const rect = parentRef.current.getBoundingClientRect()
          window.scrollTo({
            top: window.scrollY + rect.top - SCROLL_OFFSET,
            behavior: 'smooth',
          })
        }
      })
    }
    prevIsDrilledRef.current = isDrilled
  }, [isDrilled])

  // ── 分析文脈の構築 ──

  // 親文脈（日別売上推移）: 常に currentDateRange を使用
  const parentContext = useMemo(
    () =>
      buildSalesAnalysisContext(
        props.currentDateRange,
        props.selectedStoreIds,
        props.prevYearScope,
      ),
    [props.currentDateRange, props.selectedStoreIds, props.prevYearScope],
  )

  // 子文脈（時間帯 — ドリル時のみ）: 親から dateRange を上書き派生
  const drillContext = useMemo(() => {
    if (!isDrilled || !rangeDateRange) return null
    return deriveChildContext(parentContext, rangeDateRange, rangePrevYearScope ?? undefined)
  }, [isDrilled, rangeDateRange, rangePrevYearScope, parentContext])

  // 要因分析/ドリルダウン分析用の日付範囲（クリック日 or 全期間）
  const drillDateRange = useMemo<DateRange>(() => {
    if (clickedDay != null) {
      return {
        from: { year: props.year, month: props.month, day: clickedDay },
        to: { year: props.year, month: props.month, day: pendingRange?.end ?? clickedDay },
      }
    }
    return props.currentDateRange
  }, [clickedDay, pendingRange, props.year, props.month, props.currentDateRange])

  // AnalysisNodeContext（ノード階層モデル）
  const dailyNode = useMemo(
    () => buildRootNodeContext(parentContext, 'daily-sales'),
    [parentContext],
  )

  const timeSlotNode = useMemo(
    () =>
      isDrilled && drillContext
        ? deriveNodeContext(dailyNode, 'time-slot', {
            overrideBase: drillContext,
            focus: selectedRange
              ? {
                  kind: 'day-range' as const,
                  startDay: selectedRange.start,
                  endDay: selectedRange.end,
                }
              : undefined,
          })
        : null,
    [dailyNode, isDrilled, drillContext, selectedRange],
  )

  // deptPatternNode は将来の孫コンポーネント context 対応時に使用予定
  // 現在は DeptHourlyChart が従来 props で動作するため、ノード構築のみ行う
  const deptPatternNode = useMemo(
    () =>
      timeSlotNode ? deriveDeptPatternContext(timeSlotNode, DEFAULT_TOP_DEPARTMENT_POLICY) : null,
    [timeSlotNode],
  )
  void deptPatternNode

  // SubAnalysisPanel 用の文脈（ドリル時は drill 範囲、未ドリル時は親）
  const subPanelContext = drillContext ?? parentContext

  // ── 移動平均 overlay（Phase 5: 売上7日MA） ──
  // 対象: 当期売上のみ / standard view 前提 / 比較系列・売変率には載せない
  // chart は overlay series を受けるだけで rolling 計算を知らない
  const [showMovingAverage, setShowMovingAverage] = useState(true)
  const temporalScope = useMemo(
    () => ({ currentDateRange: props.currentDateRange, selectedStoreIds: props.selectedStoreIds }),
    [props.currentDateRange, props.selectedStoreIds],
  )
  const { data: maOutput } = useMovingAverageOverlay(
    props.queryExecutor ?? null,
    temporalScope,
    showMovingAverage,
  )
  const movingAverageSeries = maOutput?.anchorSeries

  // ── 表示用ラベル ──

  const rangeLabel =
    selectedRange != null
      ? selectedRange.start === selectedRange.end
        ? `${props.month}月${selectedRange.start}日`
        : `${props.month}月${selectedRange.start}〜${selectedRange.end}日`
      : ''

  // ── ドリルレベル管理（横スライド切替） ──
  // 0: 日別売上, 1: 時間帯別, 2: 部門別+カテゴリ別
  const setDrillWithDirection = useCallback(
    (next: number) => {
      setSlideDirection(next > drillLevel ? 1 : -1)
      setDrillLevel(next)
    },
    [drillLevel],
  )

  const handleDrillToTimeSlot = useCallback(() => setDrillWithDirection(1), [setDrillWithDirection])
  const handleBackToDaily = useCallback(() => {
    setDrillWithDirection(0)
    setSelectedRange(null)
    requestAnimationFrame(() => {
      if (parentRef.current) {
        const rect = parentRef.current.getBoundingClientRect()
        window.scrollTo({
          top: window.scrollY + rect.top - SCROLL_OFFSET,
          behavior: 'smooth',
        })
      }
    })
  }, [setDrillWithDirection])

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
              weatherDaily={props.weatherDaily}
              prevYearWeatherDaily={props.prevYearWeatherDaily}
              dowOffset={props.dowOffset}
              dailyQuantity={dailyQuantity}
              rightAxisMode={rightAxisMode}
              onRightAxisModeChange={setRightAxisMode}
              onViewChange={setDailyView}
              movingAverageSeries={movingAverageSeries}
              showMovingAverage={showMovingAverage}
              onShowMovingAverageChange={setShowMovingAverage}
            />
            {canDrill && (
              <DrillHint>クリックでカテゴリ分析 / ダブルクリック or ドラッグで時間帯内訳</DrillHint>
            )}

            {/* 範囲選択BOX */}
            {pendingRange != null && (
              <RangeActionBox>
                <RangeActionLabel>
                  {props.month}月{pendingRange.start}日
                  {pendingRange.start !== pendingRange.end && `〜${pendingRange.end}日`}
                  を選択しました
                </RangeActionLabel>
                <RangeActionBtnGroup>
                  <RangeActionBtn onClick={handleRangeToTimeSlot}>時間帯売上</RangeActionBtn>
                  <RangeActionBtn onClick={handleRangeToDrilldown}>ドリルダウン分析</RangeActionBtn>
                  <RangeActionBtn $secondary onClick={handleRangeCancel}>
                    キャンセル
                  </RangeActionBtn>
                </RangeActionBtnGroup>
              </RangeActionBox>
            )}

            {/* 子パネル: 標準ビュー + 右軸モードに応じて切替 */}
            {dailyView === 'standard' &&
              props.queryExecutor?.isReady &&
              (rightAxisMode === 'quantity' || rightAxisMode === 'customers' ? (
                /* 標準 + 点数/客数 → 要因分析 / カテゴリ分析 / ドリルダウン分析 */
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <TabGroup>
                      <Tab $active={subTab === 'factor'} onClick={() => setSubTab('factor')}>
                        要因分析
                      </Tab>
                      <Tab $active={subTab === 'trend'} onClick={() => setSubTab('trend')}>
                        カテゴリ分析
                      </Tab>
                      <Tab $active={subTab === 'drilldown'} onClick={() => setSubTab('drilldown')}>
                        ドリルダウン分析
                      </Tab>
                    </TabGroup>
                    {clickedDay != null && (subTab === 'drilldown' || subTab === 'factor') && (
                      <DrillPeriodBadge>
                        {props.month}月{clickedDay}
                        {pendingRange && pendingRange.start !== pendingRange.end
                          ? `〜${pendingRange.end}`
                          : ''}
                        日<DayDrillClose onClick={() => setClickedDay(null)}>✕</DayDrillClose>
                      </DrillPeriodBadge>
                    )}
                  </div>
                  {subTab === 'factor' && props.widgetCtx && (
                    <YoYWaterfallChartWidget
                      ctx={props.widgetCtx}
                      overrideDateRange={drillDateRange}
                      embedded
                    />
                  )}
                  {subTab === 'trend' && (
                    <SubAnalysisPanel
                      mode={rightAxisMode}
                      queryExecutor={props.queryExecutor}
                      currentDateRange={subPanelContext.dateRange}
                      selectedStoreIds={subPanelContext.selectedStoreIds}
                      prevYearScope={subPanelContext.comparisonScope}
                      weatherDaily={props.weatherDaily}
                      daily={props.daily}
                      daysInMonth={props.daysInMonth}
                      year={props.year}
                      month={props.month}
                      prevYearDaily={props.prevYearDaily}
                      discountEntries={props.discountEntries}
                      totalGrossSales={props.totalGrossSales}
                    />
                  )}
                  {subTab === 'drilldown' && (
                    <CategoryHierarchyExplorer
                      queryExecutor={props.queryExecutor}
                      currentDateRange={drillDateRange}
                      prevYearScope={props.prevYearScope}
                      selectedStoreIds={props.selectedStoreIds}
                    />
                  )}
                </div>
              ) : (
                /* 標準 + 売変/気温/降水量 → 対応する SubAnalysisPanel のみ */
                <SubAnalysisPanel
                  mode={rightAxisMode}
                  queryExecutor={props.queryExecutor}
                  currentDateRange={subPanelContext.dateRange}
                  selectedStoreIds={subPanelContext.selectedStoreIds}
                  prevYearScope={subPanelContext.comparisonScope}
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

// ── Styles ──

const Wrapper = styled.div`
  position: relative;
`

const DrillNav = styled.nav`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[4]} 0;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

const NavItem = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[5]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-weight: ${({ $active, theme }) =>
    $active ? theme.typography.fontWeight.bold : theme.typography.fontWeight.normal};
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.palette.primary)};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(0,0,0,0.05)'
      : 'transparent'};
  transition: all 0.15s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

const NavSep = styled.span`
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

const DrillHint = styled.div`
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: ${({ theme }) => theme.spacing[1]};
  opacity: 0.7;
`
