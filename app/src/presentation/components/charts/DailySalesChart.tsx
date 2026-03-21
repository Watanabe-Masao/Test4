/**
 * DailySalesChart コントローラー
 *
 * 3モード構成:
 *   標準 — 日別売上棒+前年棒+右軸切替（点数/客数/売変/気温）
 *   累計 — 当期累計・前年累計・予算の累計Area
 *   差分 — 前年差累計ウォーターフォール
 *
 * 状態管理とデータフック呼び出しを担い、描画は DailySalesChartBody に委譲する。
 */
import { useState, useCallback, memo } from 'react'
import { ChartCard } from './ChartCard'
import { ViewToggle, ViewBtn, Sep, GroupLabel } from './DailySalesChart.styles'
import { useChartTheme } from './chartTheme'
import { DowPresetSelector } from './DowPresetSelector'
import { useDailySalesData, type DiffTarget } from './useDailySalesData'
import { DailySalesChartBody, type ViewType } from './DailySalesChartBody'
import { RIGHT_AXIS_OPTIONS, type RightAxisMode } from './DailySalesChartBodyLogic'
import type { DailyRecord, DailyWeatherSummary } from '@/domain/models/record'

export type DailyChartMode = 'sales' | 'discount' | 'all'

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  year: number
  month: number
  prevYearDaily?: ReadonlyMap<string, { sales: number; discount: number; customers?: number }>
  budgetDaily?: ReadonlyMap<number, number>
  mode?: DailyChartMode
  /** バークリックまたはドラッグ選択で日付範囲を通知（時間帯ドリルダウン連動用） */
  onDayRangeSelect?: (startDay: number, endDay: number) => void
  /** 天気データ（X軸に天気アイコン+気温を表示） */
  weatherDaily?: readonly DailyWeatherSummary[]
  /** 前年天気データ（X軸に前年天気+気温線を表示） */
  prevYearWeatherDaily?: readonly DailyWeatherSummary[]
  /** 右軸モード（親から制御する場合） */
  rightAxisMode?: RightAxisMode
  /** 右軸モード変更通知（親でサブパネル連動に使用） */
  onRightAxisModeChange?: (mode: RightAxisMode) => void
  /** ビュータイプ変更通知（親でサブパネル表示制御に使用） */
  onViewChange?: (view: ViewType) => void
}

const VIEW_LABELS: Record<ViewType, string> = {
  standard: '標準',
  cumulative: '累計',
  difference: '差分',
  rate: '達成率',
}

const VIEW_TITLES: Record<ViewType, Record<DiffTarget, string>> = {
  standard: { yoy: '日別売上推移', budget: '日別売上推移' },
  cumulative: {
    yoy: '累計推移（実績・前年・予算・売変）',
    budget: '累計推移（実績・前年・予算・売変）',
  },
  difference: { yoy: '前年差ウォーターフォール', budget: '予算差ウォーターフォール' },
  rate: { yoy: '予算達成率・前年比推移', budget: '予算達成率・前年比推移' },
}

const DIFF_LABELS: Record<DiffTarget, string> = {
  yoy: '前年差',
  budget: '予算差',
}

const DIFF_TARGETS: DiffTarget[] = ['yoy', 'budget']

const VIEWS: ViewType[] = ['standard', 'cumulative', 'difference', 'rate']

export const DailySalesChart = memo(function DailySalesChart({
  daily,
  daysInMonth,
  year,
  month,
  prevYearDaily,
  budgetDaily,
  onDayRangeSelect,
  weatherDaily,
  prevYearWeatherDaily,
  rightAxisMode: controlledRightAxisMode,
  onRightAxisModeChange,
  onViewChange,
}: Props) {
  const ct = useChartTheme()
  const [view, setViewInternal] = useState<ViewType>('standard')
  const [diffTarget, setDiffTarget] = useState<DiffTarget>('yoy')
  const [selectedDows, setSelectedDows] = useState<number[]>([])
  const [internalRightAxisMode, setInternalRightAxisMode] = useState<RightAxisMode>('quantity')
  const handleDowChange = useCallback((dows: number[]) => setSelectedDows(dows), [])

  // controlled / uncontrolled 両対応
  const rightAxisMode = controlledRightAxisMode ?? internalRightAxisMode
  const setRightAxisMode = useCallback(
    (mode: RightAxisMode) => {
      setInternalRightAxisMode(mode)
      onRightAxisModeChange?.(mode)
    },
    [onRightAxisModeChange],
  )
  const setView = useCallback(
    (v: ViewType) => {
      setViewInternal(v)
      onViewChange?.(v)
    },
    [onViewChange],
  )

  const isWf = view === 'difference'
  const { data, hasPrev } = useDailySalesData(
    daily,
    daysInMonth,
    prevYearDaily,
    isWf,
    1,
    daysInMonth,
    year,
    month,
    selectedDows,
    budgetDaily,
    diffTarget,
  )

  // Rate mode uses single % axis; all other modes use dual axes
  const needRightAxis = view !== 'rate'

  const wfLegendPayload = isWf
    ? [
        { value: 'wfYoyUp', type: 'rect' as const, color: ct.colors.success },
        { value: 'wfYoyDown', type: 'rect' as const, color: ct.colors.danger },
      ]
    : undefined

  // 気温モードは天気データの有無に関わらず常に表示（データなしの場合はサブパネルで案内）
  const availableOptions = RIGHT_AXIS_OPTIONS

  const toolbar = (
    <ViewToggle>
      {VIEWS.map((v) => (
        <ViewBtn key={v} $active={view === v} onClick={() => setView(v)}>
          {VIEW_LABELS[v]}
        </ViewBtn>
      ))}
      {view === 'difference' && (
        <>
          <Sep>|</Sep>
          {DIFF_TARGETS.map((dt) => (
            <ViewBtn key={dt} $active={diffTarget === dt} onClick={() => setDiffTarget(dt)}>
              {DIFF_LABELS[dt]}
            </ViewBtn>
          ))}
        </>
      )}
      {view === 'standard' && (
        <>
          <Sep>|</Sep>
          <GroupLabel>右軸</GroupLabel>
          {availableOptions.map((o) => (
            <ViewBtn
              key={o.mode}
              $active={rightAxisMode === o.mode}
              onClick={() => setRightAxisMode(o.mode)}
            >
              {o.label}
            </ViewBtn>
          ))}
        </>
      )}
    </ViewToggle>
  )

  return (
    <ChartCard
      title={VIEW_TITLES[view][diffTarget]}
      toolbar={toolbar}
      ariaLabel="日別売上チャート"
    >
      <div style={{ display: 'flex', gap: '12px', marginBottom: '4px', flexWrap: 'wrap' }}>
        <DowPresetSelector selectedDows={selectedDows} onChange={handleDowChange} />
      </div>
      <DailySalesChartBody
        data={data}
        view={view}
        isWf={isWf}
        hasPrev={hasPrev}
        ct={ct}
        needRightAxis={needRightAxis}
        wfLegendPayload={wfLegendPayload}
        onDayRangeSelect={onDayRangeSelect}
        weatherDaily={weatherDaily}
        prevYearWeatherDaily={prevYearWeatherDaily}
        year={year}
        month={month}
        rightAxisMode={rightAxisMode}
      />
    </ChartCard>
  )
})
