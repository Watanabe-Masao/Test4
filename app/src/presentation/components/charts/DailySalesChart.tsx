/**
 * DailySalesChart コントローラー
 *
 * 状態管理（ビュー切替・ウォーターフォール・日範囲）と
 * データフック呼び出しを担い、描画は DailySalesChartBody に委譲する。
 */
import { useState, useCallback, memo } from 'react'
import { Wrapper, HeaderRow, Title, ViewToggle, ViewBtn, Sep } from './DailySalesChart.styles'
import { useChartTheme } from './chartTheme'
import { DualPeriodSlider } from './DualPeriodSlider'
import { DowPresetSelector } from './DowPresetSelector'
import { useDualPeriodRange } from './useDualPeriodRange'
import { useDailySalesData } from './useDailySalesData'
import { DailySalesChartBody, type ViewType } from './DailySalesChartBody'
import type { DailyRecord } from '@/domain/models'

export type DailyChartMode = 'sales' | 'discount' | 'all'

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  year: number
  month: number
  prevYearDaily?: ReadonlyMap<number, { sales: number; discount: number; customers?: number }>
  budgetDaily?: ReadonlyMap<number, number>
  mode?: DailyChartMode
}

const VIEW_LABELS: Record<ViewType, string> = {
  standard: '標準',
  prevYearCum: '累計推移',
  vsLastYear: '実績対前年',
}

const VIEW_TITLES: Record<ViewType, string> = {
  standard: '日別売上・売変推移',
  prevYearCum: '累計推移（実績・前年・予算）',
  vsLastYear: '実績対前年',
}

const WF_TITLES: Record<string, string> = {
  standard: '日別売上ウォーターフォール（前日比増減）',
  vsLastYear: '前年差累計ウォーターフォール',
}

const VIEWS: ViewType[] = ['standard', 'prevYearCum', 'vsLastYear']

/** ウォーターフォール対応ビュー */
const WF_VIEWS: ViewType[] = ['standard', 'vsLastYear']

export const DailySalesChart = memo(function DailySalesChart({
  daily,
  daysInMonth,
  year,
  month,
  prevYearDaily,
  budgetDaily,
  mode = 'all',
}: Props) {
  const ct = useChartTheme()
  const [view, setView] = useState<ViewType>(mode === 'all' ? 'standard' : 'standard')
  const [waterfall, setWaterfall] = useState(false)
  /** 累計/単日切替（prevYearCum, vsLastYear 用） */
  const [cumMode, setCumMode] = useState<'cumulative' | 'daily'>('cumulative')
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

  const isWf = waterfall && WF_VIEWS.includes(view)
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
  )

  const needRightAxis = !isWf && view === 'standard'

  const titleText = isWf ? (WF_TITLES[view] ?? VIEW_TITLES[view]) : VIEW_TITLES[view]

  const wfLegendPayload = isWf
    ? (() => {
        if (view === 'vsLastYear') {
          return [
            { value: 'wfYoyUp', type: 'rect' as const, color: ct.colors.success },
            { value: 'wfYoyDown', type: 'rect' as const, color: ct.colors.danger },
          ]
        }
        return [
          { value: 'wfSalesUp', type: 'rect' as const, color: ct.colors.success },
          { value: 'wfSalesDown', type: 'rect' as const, color: ct.colors.danger },
        ]
      })()
    : undefined

  /** 累計/単日切替が有効なビュー */
  const hasCumToggle = view === 'prevYearCum' || view === 'vsLastYear'

  return (
    <Wrapper aria-label="日別売上チャート">
      <HeaderRow>
        <Title>{titleText}</Title>
        <ViewToggle>
          {VIEWS.map((v) => (
            <ViewBtn key={v} $active={view === v} onClick={() => setView(v)}>
              {VIEW_LABELS[v]}
            </ViewBtn>
          ))}
          {hasCumToggle && (
            <>
              <Sep>|</Sep>
              <ViewBtn $active={cumMode === 'cumulative'} onClick={() => setCumMode('cumulative')}>
                累計
              </ViewBtn>
              <ViewBtn $active={cumMode === 'daily'} onClick={() => setCumMode('daily')}>
                単日
              </ViewBtn>
            </>
          )}
          {WF_VIEWS.includes(view) && (
            <>
              <Sep>|</Sep>
              <ViewBtn $active={waterfall} onClick={() => setWaterfall((v) => !v)}>
                WF
              </ViewBtn>
            </>
          )}
        </ViewToggle>
      </HeaderRow>
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
        cumMode={cumMode}
        wfLegendPayload={wfLegendPayload}
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
    </Wrapper>
  )
})
