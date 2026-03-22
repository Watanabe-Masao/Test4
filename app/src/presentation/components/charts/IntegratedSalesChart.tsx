/**
 * IntegratedSalesChart — 売上推移分析ユニットの正本コンテナ
 *
 * 日別売上（overview）と時間帯別売上（drilldown）を
 * 同じ分析文脈の下で束ねる包含型ウィジェット。
 *
 * SalesAnalysisContext を構築し、配下の派生ビューに配る。
 * 日別チャートのバークリック/ドラッグで時間帯ドリルダウンに遷移。
 * 右軸モードに応じてサブ分析パネルを動的配置。
 */
import { useState, useCallback, useMemo, memo } from 'react'
import styled, { keyframes, css } from 'styled-components'
import type { AsyncDuckDBConnection, AsyncDuckDB } from '@duckdb/duckdb-wasm'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { DailyRecord, DailyWeatherSummary, DiscountEntry } from '@/domain/models/record'
import { useDrillDateRange } from '@/application/hooks/useDrillDateRange'
import { buildSalesAnalysisContext } from '@/application/models/SalesAnalysisContext'
import type { AnalysisViewEvents, CategoryFocus } from '@/application/models/AnalysisViewEvents'
import { useCrossChartSelection } from './crossChartSelectionHooks'
import type { RightAxisMode } from './DailySalesChartBodyLogic'
import type { ViewType } from './DailySalesChartBody'
import { DailySalesChart } from './DailySalesChart'
import { TimeSlotChart } from './TimeSlotChart'
import { SubAnalysisPanel } from './SubAnalysisPanel'

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
  // TimeSlotChart props
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDb?: AsyncDuckDB | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly dowOffset?: number
  readonly weatherDaily?: readonly DailyWeatherSummary[]
  readonly prevYearWeatherDaily?: readonly DailyWeatherSummary[]
}

export const IntegratedSalesChart = memo(function IntegratedSalesChart(props: Props) {
  const [selectedRange, setSelectedRange] = useState<SelectedRange | null>(null)
  const [rightAxisMode, setRightAxisMode] = useState<RightAxisMode>('quantity')
  const [dailyView, setDailyView] = useState<ViewType>('standard')

  const canDrill = props.duckConn != null && props.duckDataVersion > 0

  const handleDayRangeSelect = useCallback(
    (startDay: number, endDay: number) => {
      if (canDrill) setSelectedRange({ start: startDay, end: endDay })
    },
    [canDrill],
  )

  const handleBack = useCallback(() => setSelectedRange(null), [])

  // DateRange 構築は application 層の hook に委譲（presentation 層でのデータ調停を防止）
  const { dateRange: rangeDateRange, prevYearScope: rangePrevYearScope } = useDrillDateRange(
    selectedRange,
    props.year,
    props.month,
    props.prevYearScope,
  )

  const isDrilled = selectedRange != null && rangeDateRange != null

  // 売上推移分析ユニットの共通文脈を構築
  // ドリル時は rangeDateRange、未ドリル時は currentDateRange を使用
  const analysisContext = useMemo(
    () =>
      buildSalesAnalysisContext(
        isDrilled && rangeDateRange ? rangeDateRange : props.currentDateRange,
        props.selectedStoreIds,
        isDrilled && rangePrevYearScope ? rangePrevYearScope : props.prevYearScope,
        selectedRange ? { startDay: selectedRange.start, endDay: selectedRange.end } : undefined,
      ),
    [
      isDrilled,
      rangeDateRange,
      rangePrevYearScope,
      props.currentDateRange,
      props.selectedStoreIds,
      props.prevYearScope,
      selectedRange,
    ],
  )

  // 子ビューからのイベントを CrossChartSelectionContext に伝播
  const { highlightTimeSlot, highlightCategory } = useCrossChartSelection()

  const childEvents = useMemo<AnalysisViewEvents>(
    () => ({
      onSelectHour: (hour: number) => highlightTimeSlot({ hour }),
      onSelectCategory: (focus: CategoryFocus) =>
        highlightCategory({
          departmentCode: focus.level === 'department' ? focus.code : undefined,
          lineCode: focus.level === 'line' ? focus.code : undefined,
          klassCode: focus.level === 'klass' ? focus.code : undefined,
          name: focus.name,
        }),
      onClearSelection: () => {
        highlightTimeSlot(null)
        highlightCategory(null)
      },
    }),
    [highlightTimeSlot, highlightCategory],
  )

  // 戻るボタンのラベル
  const rangeLabel =
    selectedRange != null
      ? selectedRange.start === selectedRange.end
        ? `${props.month}月${selectedRange.start}日`
        : `${props.month}月${selectedRange.start}〜${selectedRange.end}日`
      : ''

  return (
    <Wrapper>
      {/* 日別チャート */}
      <ViewPane $active={!isDrilled} $direction="left">
        <DailySalesChart
          daily={props.daily}
          daysInMonth={props.daysInMonth}
          year={props.year}
          month={props.month}
          prevYearDaily={props.prevYearDaily}
          budgetDaily={props.budgetDaily}
          onDayRangeSelect={canDrill ? handleDayRangeSelect : undefined}
          weatherDaily={props.weatherDaily}
          prevYearWeatherDaily={props.prevYearWeatherDaily}
          dowOffset={props.dowOffset}
          rightAxisMode={rightAxisMode}
          onRightAxisModeChange={setRightAxisMode}
          onViewChange={setDailyView}
        />
        {canDrill && <DrillHint>日付をクリック or ドラッグで時間帯内訳を表示</DrillHint>}
      </ViewPane>

      {/* 時間帯チャート（ドリルダウン先 — 親グラフとして先に表示） */}
      {isDrilled && (
        <ViewPane $active $direction="right">
          <BackButton onClick={handleBack}>
            <BackArrow>←</BackArrow>
            {rangeLabel}の時間帯別 → 日別に戻る
          </BackButton>
          <TimeSlotChart
            duckConn={props.duckConn}
            duckDb={props.duckDb}
            duckDataVersion={props.duckDataVersion}
            context={analysisContext}
            events={childEvents}
          />
        </ViewPane>
      )}

      {/* サブ分析パネル（連動グラフ — 親グラフの下に表示） */}
      {dailyView === 'standard' && (
        <SubAnalysisPanel
          mode={rightAxisMode}
          duckConn={props.duckConn}
          duckDataVersion={props.duckDataVersion}
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
      )}
    </Wrapper>
  )
})

// ── Styles ──

const zoomIn = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`

const slideBack = keyframes`
  0% {
    opacity: 0;
    transform: translateX(-16px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
`

const Wrapper = styled.div`
  position: relative;
  overflow: hidden;
`

const ViewPane = styled.div<{ $active: boolean; $direction: 'left' | 'right' }>`
  display: ${({ $active }) => ($active ? 'block' : 'none')};
  ${({ $active, $direction }) =>
    $active
      ? css`
          animation: ${$direction === 'right' ? zoomIn : slideBack} 0.35s
            cubic-bezier(0.2, 0.9, 0.3, 1) both;
        `
      : css`
          animation: none;
        `}
`

const BackButton = styled.button`
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.palette.primary};
  padding: 4px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
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

const BackArrow = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
`

const DrillHint = styled.div`
  text-align: center;
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-top: ${({ theme }) => theme.spacing[1]};
  opacity: 0.7;
`
