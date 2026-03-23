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
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { DailyRecord, DailyWeatherSummary, DiscountEntry } from '@/domain/models/record'
import { useDrillDateRange } from '@/application/hooks/useDrillDateRange'
import {
  buildSalesAnalysisContext,
  deriveChildContext,
} from '@/application/models/SalesAnalysisContext'
import type { AnalysisViewEvents, CategoryFocus } from '@/application/models/AnalysisViewEvents'
import {
  buildRootNodeContext,
  deriveNodeContext,
  deriveDeptPatternContext,
  DEFAULT_TOP_DEPARTMENT_POLICY,
} from '@/application/models/AnalysisNodeContext'
import { useCrossChartSelection } from './crossChartSelectionHooks'
import type { RightAxisMode } from './DailySalesChartBodyLogic'
import type { ViewType } from './DailySalesChartBody'
import { DailySalesChart } from './DailySalesChart'
import { TimeSlotChart } from './TimeSlotChart'
import { DeptHourlyChart } from './DeptHourlyChart'
import { SubAnalysisPanel } from './SubAnalysisPanel'
import { ContainedAnalysisPanel, type ContextTag } from './ContainedAnalysisPanel'

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
}

/** ヘッダ固定分の offset（px） */
const SCROLL_OFFSET = 16

export const IntegratedSalesChart = memo(function IntegratedSalesChart(props: Props) {
  const [selectedRange, setSelectedRange] = useState<SelectedRange | null>(null)
  const [rightAxisMode, setRightAxisMode] = useState<RightAxisMode>('quantity')
  const [dailyView, setDailyView] = useState<ViewType>('standard')

  // ── drill scroll 制御 ──
  const parentRef = useRef<HTMLDivElement>(null)
  const drillPanelRef = useRef<HTMLDivElement>(null)

  const canDrill = props.queryExecutor?.isReady === true

  const handleDayRangeSelect = useCallback(
    (startDay: number, endDay: number) => {
      if (canDrill) setSelectedRange({ start: startDay, end: endDay })
    },
    [canDrill],
  )

  const handleBack = useCallback(() => {
    setSelectedRange(null)
    // 戻る時: 親チャート位置へ復帰
    requestAnimationFrame(() => {
      if (parentRef.current) {
        const rect = parentRef.current.getBoundingClientRect()
        window.scrollTo({
          top: window.scrollY + rect.top - SCROLL_OFFSET,
          behavior: 'smooth',
        })
      }
    })
  }, [])

  // DateRange 構築は application 層の hook に委譲（presentation 層でのデータ調停を防止）
  const { dateRange: rangeDateRange, prevYearScope: rangePrevYearScope } = useDrillDateRange(
    selectedRange,
    props.year,
    props.month,
    props.prevYearScope,
  )

  const isDrilled = selectedRange != null && rangeDateRange != null

  // drill 開始時: 子パネル見出しへ自動スクロール
  const prevIsDrilledRef = useRef(false)
  useEffect(() => {
    if (isDrilled && !prevIsDrilledRef.current) {
      requestAnimationFrame(() => {
        if (drillPanelRef.current) {
          const rect = drillPanelRef.current.getBoundingClientRect()
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

  // ── イベント連動 ──

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

  // ── 表示用ラベル ──

  const rangeLabel =
    selectedRange != null
      ? selectedRange.start === selectedRange.end
        ? `${props.month}月${selectedRange.start}日`
        : `${props.month}月${selectedRange.start}〜${selectedRange.end}日`
      : ''

  // 時間帯チャートの継承条件タグ
  const timeSlotContextTags = useMemo<readonly ContextTag[]>(() => {
    if (!selectedRange) return []
    const tags: ContextTag[] = [{ label: '選択日', value: rangeLabel }]
    if (props.prevYearScope) {
      tags.push({ label: '比較', value: '前年同期間' })
    }
    if (props.selectedStoreIds.size > 0) {
      tags.push({ label: '対象店舗', value: `${props.selectedStoreIds.size}店` })
    }
    return tags
  }, [selectedRange, rangeLabel, props.prevYearScope, props.selectedStoreIds])

  return (
    <Wrapper ref={parentRef}>
      {/* ── 日別チャート（常時表示） ── */}
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
      {canDrill && !isDrilled && (
        <DrillHint>日付をクリック or ドラッグで時間帯内訳を表示</DrillHint>
      )}

      {/* ── 時間帯チャート（ドリル時 — 子として包含表示） ── */}
      {isDrilled && drillContext && (
        <ContainedAnalysisPanel
          ref={drillPanelRef}
          emphasized
          title={`時間帯別 前年比較`}
          subtitle={rangeLabel}
          inheritedContext={timeSlotContextTags}
          drillLabel="日別からドリルダウン"
          role="child"
          toolbar={
            <BackButton onClick={handleBack}>
              <BackArrow>←</BackArrow>
              日別に戻る
            </BackButton>
          }
        >
          <TimeSlotChart
            queryExecutor={props.queryExecutor}
            context={drillContext}
            events={childEvents}
          />

          {/* ── 部門別時間帯パターン（孫として包含表示） ── */}
          <ContainedAnalysisPanel
            title="部門別時間帯パターン"
            subtitle={`上位${DEFAULT_TOP_DEPARTMENT_POLICY.count}部門の時間帯別売上 | 積み上げ面グラフ`}
            drillLabel="時間帯からドリルダウン"
            role="grandchild"
          >
            <DeptHourlyChart
              queryExecutor={props.queryExecutor}
              currentDateRange={drillContext.dateRange}
              selectedStoreIds={drillContext.selectedStoreIds}
            />
          </ContainedAnalysisPanel>
        </ContainedAnalysisPanel>
      )}

      {/* ── サブ分析パネル（連動グラフ — 親グラフの下に表示） ── */}
      {dailyView === 'standard' && (
        <SubAnalysisPanel
          mode={rightAxisMode}
          queryExecutor={props.queryExecutor}
          duckConn={null}
          duckDataVersion={0}
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
    </Wrapper>
  )
})

// ── Styles ──

const Wrapper = styled.div`
  position: relative;
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
