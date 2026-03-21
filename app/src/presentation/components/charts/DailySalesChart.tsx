/**
 * DailySalesChart コントローラー
 *
 * 3モード構成:
 *   標準 — 日別売上棒+前年棒+売変線+移動平均線
 *   累計 — 当期累計・前年累計・予算の累計Area
 *   差分 — 前年差累計ウォーターフォール
 *
 * 状態管理とデータフック呼び出しを担い、描画は DailySalesChartBody に委譲する。
 */
import { useState, useCallback, memo } from 'react'
import { ChartCard } from './ChartCard'
import { ViewToggle, ViewBtn, Sep } from './DailySalesChart.styles'
import { useChartTheme } from './chartTheme'
import { DualPeriodSlider } from './DualPeriodSlider'
import { DowPresetSelector } from './DowPresetSelector'
import { useDualPeriodRange } from './useDualPeriodRange'
import { useDailySalesData, type DiffTarget } from './useDailySalesData'
import { DailySalesChartBody, type ViewType } from './DailySalesChartBody'
import type { DailyRecord } from '@/domain/models/record'

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
}

const VIEW_LABELS: Record<ViewType, string> = {
  standard: '標準',
  cumulative: '累計',
  difference: '差分',
  rate: '達成率',
}

const VIEW_TITLES: Record<ViewType, Record<DiffTarget, string>> = {
  standard: { yoy: '日別売上・売変推移', budget: '日別売上・売変推移' },
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
}: Props) {
  const ct = useChartTheme()
  const [view, setView] = useState<ViewType>('standard')
  const [diffTarget, setDiffTarget] = useState<DiffTarget>('yoy')
  const {
    p1Start: rangeStart,
    p1End: rangeEnd,
    onP1Change: setRange,
    p2Start,
    p2End,
    onP2Change,
    p2Enabled,
  } = useDualPeriodRange(daysInMonth)
  const [selectedDows, setSelectedDows] = useState<number[]>([])
  const handleDowChange = useCallback((dows: number[]) => setSelectedDows(dows), [])

  const isWf = view === 'difference'
  const { data, hasPrev } = useDailySalesData(
    daily,
    daysInMonth,
    prevYearDaily,
    isWf,
    rangeStart,
    rangeEnd,
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
    </ViewToggle>
  )

  return (
    <ChartCard
      title={VIEW_TITLES[view][diffTarget]}
      toolbar={toolbar}
      ariaLabel="日別売上チャート"
      height={400}
    >
      <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
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
      />
      <DualPeriodSlider
        min={1}
        max={daysInMonth}
        p1Start={rangeStart}
        p1End={rangeEnd}
        onP1Change={setRange}
        p2Start={p2Start}
        p2End={p2End}
        onP2Change={onP2Change}
        p2Enabled={p2Enabled}
      />
    </ChartCard>
  )
})
