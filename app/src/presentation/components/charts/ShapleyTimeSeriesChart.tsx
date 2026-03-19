/**
 * シャープリー分解 時系列チャート (ECharts)
 */
import { memo, useMemo, useState, useCallback } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { DualPeriodSlider } from './DualPeriodSlider'
import { DowPresetSelector } from './DowPresetSelector'
import { useDualPeriodRange } from './useDualPeriodRange'
import type { DailyRecord } from '@/domain/models'
import { useShapleyTimeSeries } from '@/application/hooks'
import { SegmentedControl } from '@/presentation/components/common'
import { ChartCard } from './ChartCard'
import { ChartEmpty } from './ChartState'
import { EChart, type EChartsOption } from './EChart'
import { yenYAxis, standardGrid, standardTooltip, standardLegend, toCommaYen } from './echartsOptionBuilders'

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  year: number
  month: number
  prevYearDaily?: ReadonlyMap<string, { sales: number; discount: number; customers?: number }>
}

type ViewMode = 'cumulative' | 'daily'

const VIEW_OPTIONS: readonly { value: ViewMode; label: string }[] = [
  { value: 'cumulative', label: '累計' },
  { value: 'daily', label: '単日' },
]

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
  const theme = useTheme() as AppTheme
  const [viewMode, setViewMode] = useState<ViewMode>('cumulative')
  const { p1Start: rangeStart, p1End: rangeEnd, onP1Change: setRange, p2Start, p2End, onP2Change, p2Enabled } = useDualPeriodRange(daysInMonth)
  const [selectedDows, setSelectedDows] = useState<number[]>([])
  const handleDowChange = useCallback((dows: number[]) => setSelectedDows(dows), [])

  const { data: shapleyData, hasPrev } = useShapleyTimeSeries(daily, daysInMonth, prevYearDaily, year, month)

  const filteredData = useMemo(() => {
    const dowSet = selectedDows.length > 0 ? new Set(selectedDows) : null
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

  const option = useMemo<EChartsOption>(() => {
    const days = filteredData.map((d) => String(d.day))
    return {
      grid: standardGrid(),
      tooltip: { ...standardTooltip(theme), formatter: (params: unknown) => {
        const items = params as { seriesName: string; value: number | null; name: string }[]
        if (!Array.isArray(items)) return ''
        const header = `<div style="font-weight:600">${items[0]?.name}日</div>`
        const rows = items.filter((i) => i.value != null).map((i) =>
          `<div>${ALL_LABELS[i.seriesName] ?? i.seriesName}: ${toCommaYen(i.value!)}</div>`
        ).join('')
        return header + rows
      }},
      legend: standardLegend(theme),
      xAxis: { type: 'category', data: days, axisLabel: { color: theme.colors.text3, fontSize: 10, fontFamily: theme.typography.fontFamily.mono } },
      yAxis: yenYAxis(theme),
      series: [
        {
          name: custKey,
          type: 'bar',
          data: filteredData.map((d) => (d as unknown as Record<string, unknown>)[custKey] as number ?? null),
          itemStyle: { color: theme.colors.palette.infoDark, opacity: 0.75, borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 14,
        },
        {
          name: ticketKey,
          type: 'bar',
          data: filteredData.map((d) => (d as unknown as Record<string, unknown>)[ticketKey] as number ?? null),
          itemStyle: { color: theme.colors.palette.purple, opacity: 0.75, borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 14,
        },
        {
          name: diffKey,
          type: 'line',
          data: filteredData.map((d) => (d as unknown as Record<string, unknown>)[diffKey] as number ?? null),
          lineStyle: { color: theme.colors.palette.primary, width: 2 },
          itemStyle: { color: theme.colors.palette.primary },
          symbol: 'none',
          connectNulls: true,
        },
      ],
    }
  }, [filteredData, custKey, ticketKey, diffKey, theme])

  if (!hasPrev) {
    return <ChartCard title="客数・客単価 要因分解（シャープリー）"><ChartEmpty message="前年データが必要です" /></ChartCard>
  }

  const toolbar = <SegmentedControl options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} ariaLabel="表示モード" />
  const subtitle = isCum ? '客数効果+客単価効果=売上差' : '日別シャープリー分解'

  return (
    <ChartCard title="客数・客単価 要因分解（シャープリー）" subtitle={subtitle} toolbar={toolbar}>
      <DowPresetSelector selectedDows={selectedDows} onChange={handleDowChange} />
      <EChart option={option} height={280} ariaLabel="シャープリー分解チャート" />
      <DualPeriodSlider min={1} max={daysInMonth} p1Start={rangeStart} p1End={rangeEnd} onP1Change={setRange} p2Start={p2Start} p2End={p2End} onP2Change={onP2Change} p2Enabled={p2Enabled} />
    </ChartCard>
  )
})
