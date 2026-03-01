/**
 * DailySalesChart コントローラー
 *
 * 状態管理（ビュー切替・ウォーターフォール・日範囲）と
 * データフック呼び出しを担い、描画は DailySalesChartBody に委譲する。
 */
import { useState, useCallback, memo } from 'react'
import {
  Wrapper,
  HeaderRow,
  Title,
  ViewToggle,
  ViewBtn,
  Sep,
  GroupLabel,
} from './DailySalesChart.styles'
import { useChartTheme } from './chartTheme'
import { DayRangeSlider } from './DayRangeSlider'
import { DowPresetSelector } from './DowPresetSelector'
import { useDayRange } from './useDayRange'
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
  mode?: DailyChartMode
}

const VIEW_LABELS: Record<ViewType, string> = {
  standard: '標準',
  salesOnly: '売上',
  discountOnly: '売変',
  discountImpact: '売変分析',
  customers: '客数',
  txValue: '客単価',
  prevYearCum: '前年比累計',
  movingAvg: '移動平均',
  area: 'エリア',
}

/** 指標グループ定義（2段トグルの1段目） */
const INDICATOR_GROUPS: { label: string; views: ViewType[] }[] = [
  { label: '売上系', views: ['standard', 'salesOnly', 'area', 'prevYearCum'] },
  { label: '売変系', views: ['discountOnly', 'discountImpact', 'movingAvg'] },
  { label: '客数系', views: ['customers', 'txValue'] },
]

const VIEW_TITLES: Record<ViewType, string> = {
  standard: '日別売上・売変推移',
  salesOnly: '日別売上推移（当年 vs 前年）',
  discountOnly: '日別売変推移（当年 vs 前年）',
  discountImpact: '売変インパクト分析（バー: 日別売変額 / ライン: 累計売変率）',
  customers: '日別客数・客単価推移',
  txValue: '日別客単価推移',
  prevYearCum: '当年 vs 前年同曜日（累計売上推移）',
  movingAvg: '7日移動平均推移',
  area: '日別売上推移（エリア）',
}

const WF_TITLES: Record<string, string> = {
  standard: '日別売上ウォーターフォール（前日比増減）',
  salesOnly: '日別売上ウォーターフォール（前日比増減）',
  discountOnly: '日別売変ウォーターフォール（前日比増減）',
  customers: '日別客数ウォーターフォール（前日比増減）',
}

const MODE_TO_VIEW: Record<DailyChartMode, ViewType> = {
  all: 'standard',
  sales: 'salesOnly',
  discount: 'discountOnly',
}

/** ウォーターフォール対応ビュー */
const WF_VIEWS: ViewType[] = ['standard', 'salesOnly', 'discountOnly', 'customers']

export const DailySalesChart = memo(function DailySalesChart({
  daily,
  daysInMonth,
  year,
  month,
  prevYearDaily,
  mode = 'all',
}: Props) {
  const ct = useChartTheme()
  const [view, setView] = useState<ViewType>(() => MODE_TO_VIEW[mode])
  const [showSalesMa, setShowSalesMa] = useState(false)
  const [waterfall, setWaterfall] = useState(false)
  const [rangeStart, rangeEnd, setRange] = useDayRange(daysInMonth)
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
  )

  const needRightAxis =
    !isWf &&
    (view === 'standard' ||
      view === 'discountOnly' ||
      view === 'customers' ||
      view === 'discountImpact' ||
      (view === 'movingAvg' && showSalesMa))

  const titleText = isWf ? (WF_TITLES[view] ?? VIEW_TITLES[view]) : VIEW_TITLES[view]

  const wfLegendPayload = isWf
    ? (() => {
        const prefix =
          view === 'customers' ? 'wfCust' : view === 'discountOnly' ? 'wfDisc' : 'wfSales'
        return [
          { value: `${prefix}Up`, type: 'rect' as const, color: ct.colors.success },
          { value: `${prefix}Down`, type: 'rect' as const, color: ct.colors.danger },
        ]
      })()
    : undefined

  return (
    <Wrapper aria-label="日別売上チャート">
      <HeaderRow>
        <Title>{titleText}</Title>
        <ViewToggle>
          {INDICATOR_GROUPS.map((grp, gi) => (
            <span key={gi} style={{ display: 'inline-flex', alignItems: 'center' }}>
              {gi > 0 && <Sep>|</Sep>}
              <GroupLabel>{grp.label}</GroupLabel>
              {grp.views.map((v) => (
                <ViewBtn key={v} $active={view === v} onClick={() => setView(v)}>
                  {VIEW_LABELS[v]}
                </ViewBtn>
              ))}
            </span>
          ))}
          {view === 'movingAvg' && (
            <>
              <Sep>|</Sep>
              <ViewBtn $active={showSalesMa} onClick={() => setShowSalesMa((v) => !v)}>
                売上MA
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
        showSalesMa={showSalesMa}
        wfLegendPayload={wfLegendPayload}
      />
      <DayRangeSlider
        min={1}
        max={daysInMonth}
        start={rangeStart}
        end={rangeEnd}
        onChange={setRange}
      />
    </Wrapper>
  )
})
