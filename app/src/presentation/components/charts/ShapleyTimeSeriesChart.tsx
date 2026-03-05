/**
 * シャープリー分解 時系列チャート
 *
 * 日別の2要素分解（客数効果・客単価効果）を累計で時系列表示する。
 * 前年データが必要。前年データがない場合は空状態を表示。
 */
import { memo, useMemo, useState, useCallback } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from './SafeResponsiveContainer'
import { useChartTheme, tooltipStyle, toComma, useCurrencyFormatter } from './chartTheme'
import { Wrapper, HeaderRow, Title, ViewToggle, ViewBtn, Sep } from './DailySalesChart.styles'
import { DayRangeSlider } from './DayRangeSlider'
import { DowPresetSelector } from './DowPresetSelector'
import { useDayRange } from './useDayRange'
import type { DailyRecord } from '@/domain/models'
import { useShapleyTimeSeries } from '@/application/hooks'

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  year: number
  month: number
  prevYearDaily?: ReadonlyMap<number, { sales: number; discount: number; customers?: number }>
}

type ViewMode = 'cumulative' | 'daily'

const ALL_LABELS: Record<string, string> = {
  custEffect: '客数効果',
  ticketEffect: '客単価効果',
  salesDiff: '売上差',
  custEffectCum: '客数効果（累計）',
  ticketEffectCum: '客単価効果（累計）',
  salesDiffCum: '売上差（累計）',
}

export const ShapleyTimeSeriesChart = memo(function ShapleyTimeSeriesChart({
  daily,
  daysInMonth,
  year,
  month,
  prevYearDaily,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const [viewMode, setViewMode] = useState<ViewMode>('cumulative')
  const [rangeStart, rangeEnd, setRange] = useDayRange(daysInMonth)
  const [selectedDows, setSelectedDows] = useState<number[]>([])
  const handleDowChange = useCallback((dows: number[]) => setSelectedDows(dows), [])

  const { data: shapleyData, hasPrev } = useShapleyTimeSeries(daily, daysInMonth, prevYearDaily)

  const filteredData = useMemo(() => {
    const dowSet =
      selectedDows.length > 0 && year != null && month != null ? new Set(selectedDows) : null
    return shapleyData.filter((d) => {
      if (d.day < rangeStart || d.day > rangeEnd) return false
      if (dowSet) {
        const dow = new Date(year, month - 1, d.day).getDay()
        if (!dowSet.has(dow)) return false
      }
      return true
    })
  }, [shapleyData, rangeStart, rangeEnd, selectedDows, year, month])

  const isCum = viewMode === 'cumulative'
  const custKey = isCum ? 'custEffectCum' : 'custEffect'
  const ticketKey = isCum ? 'ticketEffectCum' : 'ticketEffect'
  const diffKey = isCum ? 'salesDiffCum' : 'salesDiff'

  if (!hasPrev) {
    return (
      <Wrapper aria-label="シャープリー分解チャート">
        <HeaderRow>
          <Title>客数・客単価 要因分解（シャープリー）</Title>
        </HeaderRow>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '300px',
            color: ct.textMuted,
            fontSize: ct.fontSize.sm,
          }}
        >
          前年データが必要です
        </div>
      </Wrapper>
    )
  }

  return (
    <Wrapper aria-label="シャープリー分解チャート">
      <HeaderRow>
        <Title>客数・客単価 要因分解（シャープリー）</Title>
        <ViewToggle>
          <ViewBtn $active={viewMode === 'cumulative'} onClick={() => setViewMode('cumulative')}>
            累計
          </ViewBtn>
          <ViewBtn $active={viewMode === 'daily'} onClick={() => setViewMode('daily')}>
            単日
          </ViewBtn>
          <Sep>|</Sep>
          <span
            style={{
              fontSize: '0.55rem',
              color: ct.textMuted,
              padding: '3px 4px',
            }}
          >
            {isCum ? '客数効果+客単価効果=売上差' : '日別シャープリー分解'}
          </span>
        </ViewToggle>
      </HeaderRow>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <DowPresetSelector selectedDows={selectedDows} onChange={handleDowChange} />
      </div>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="82%">
        <ComposedChart
          data={filteredData as unknown as Record<string, unknown>[]}
          margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{
              fill: ct.textMuted,
              fontSize: ct.fontSize.xs,
              fontFamily: ct.monoFamily,
            }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{
              fill: ct.textMuted,
              fontSize: ct.fontSize.xs,
              fontFamily: ct.monoFamily,
            }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmt}
            width={50}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value, name) => {
              if (value == null) return ['-', ALL_LABELS[name as string] ?? String(name)]
              return [toComma(value as number), ALL_LABELS[name as string] ?? String(name)]
            }}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => ALL_LABELS[value] ?? value}
          />
          <ReferenceLine yAxisId="left" y={0} stroke={ct.grid} strokeOpacity={0.5} />

          {/* 客数効果: 青系の棒 */}
          <Bar
            yAxisId="left"
            dataKey={custKey}
            fill={ct.colors.info}
            radius={[2, 2, 0, 0]}
            maxBarSize={14}
            opacity={0.75}
          />
          {/* 客単価効果: 紫系の棒 */}
          <Bar
            yAxisId="left"
            dataKey={ticketKey}
            fill={ct.colors.purple}
            radius={[2, 2, 0, 0]}
            maxBarSize={14}
            opacity={0.75}
          />
          {/* 売上差: 線 */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey={diffKey}
            stroke={ct.colors.primary}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
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
