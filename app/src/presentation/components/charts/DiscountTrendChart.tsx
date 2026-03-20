/**
 * 売変内訳分析チャート (ECharts)
 */
import { useState, useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { useCurrencyFormat, toPct } from './chartTheme'
import { DualPeriodSlider } from './DualPeriodSlider'
import { useDualPeriodRange } from './useDualPeriodRange'
import type { DailyRecord, DiscountEntry } from '@/domain/models/record'
import { DISCOUNT_TYPES } from '@/domain/models/record'
import { formatPercent } from '@/domain/formatting'
import { calculateShare } from '@/domain/calculations/utils'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import { ChartCard } from './ChartCard'
import { EChart, type EChartsOption } from './EChart'
import { yenYAxis, standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { categoryXAxis, valueYAxis, lineDefaults } from './builders'
import { KpiGrid, KpiCard, KpiLabel, KpiValue, KpiSub } from './DiscountTrendChart.styles'

const DISCOUNT_COLORS = ['#ef4444', '#f97316', '#eab308', '#a855f7'] as const

type ViewMode = 'stacked' | 'individual'

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  discountEntries?: readonly DiscountEntry[]
  totalGrossSales?: number
  year: number
  month: number
  prevYearDaily?: ReadonlyMap<
    string,
    { sales: number; discount: number; discountEntries?: Record<string, number> }
  >
}

function buildDiscountData(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  year: number,
  month: number,
  prevYearDaily?: ReadonlyMap<
    string,
    { sales: number; discount: number; discountEntries?: Record<string, number> }
  >,
) {
  let cumDiscount = 0,
    cumGrossSales = 0,
    prevCumDiscount = 0,
    prevCumGrossSales = 0
  const result: Record<string, number | boolean | null>[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    cumDiscount += rec?.discountAbsolute ?? 0
    cumGrossSales += rec?.grossSales ?? 0
    const cumRate = calculateShare(cumDiscount, cumGrossSales)
    const prevEntry = prevYearDaily?.get(toDateKeyFromParts(year, month, d))
    prevCumDiscount += prevEntry?.discount ?? 0
    prevCumGrossSales += prevEntry?.sales ?? 0
    const prevCumRate =
      prevCumGrossSales > 0 ? calculateShare(prevCumDiscount, prevCumGrossSales) : null

    const entry: Record<string, number | boolean | null> = {
      day: d,
      discount: rec?.discountAbsolute ?? 0,
      cumRate,
      prevCumRate,
      hasSales: rec ? rec.sales > 0 : false,
    }
    for (const dt of DISCOUNT_TYPES) {
      entry[`d${dt.type}`] = rec?.discountEntries?.find((e) => e.type === dt.type)?.amount ?? 0
      if (prevYearDaily && prevEntry?.discountEntries) {
        entry[`prevD${dt.type}`] = prevEntry.discountEntries[dt.type] ?? 0
      }
    }
    result.push(entry)
  }
  return result
}

export const DiscountTrendChart = memo(function DiscountTrendChart({
  daily,
  daysInMonth,
  discountEntries,
  totalGrossSales,
  year,
  month,
  prevYearDaily,
}: Props) {
  const theme = useTheme() as AppTheme
  const { format: fmtCurrency } = useCurrencyFormat()
  const {
    p1Start: rangeStart,
    p1End: rangeEnd,
    onP1Change: setRange,
    p2Start,
    p2End,
    onP2Change,
    p2Enabled,
  } = useDualPeriodRange(daysInMonth)
  const [viewMode, setViewMode] = useState<ViewMode>('stacked')
  const [activeCode, setActiveCode] = useState<string>('71')

  const allData = useMemo(
    () => buildDiscountData(daily, daysInMonth, year, month, prevYearDaily),
    [daily, daysInMonth, year, month, prevYearDaily],
  )

  const data = useMemo(
    () => allData.filter((d) => (d.day as number) >= rangeStart && (d.day as number) <= rangeEnd),
    [allData, rangeStart, rangeEnd],
  )
  const hasData = allData.some((d) => (d.discount as number) > 0)
  const hasPrev = !!prevYearDaily
  const activeType = DISCOUNT_TYPES.find((dt) => dt.type === activeCode)
  const activeLbl = activeType?.label ?? ''
  const activeColorIdx = DISCOUNT_TYPES.findIndex((dt) => dt.type === activeCode)

  const option = useMemo<EChartsOption>(() => {
    const days = data.map((d) => String(d.day))
    const series: EChartsOption['series'] = []

    if (viewMode === 'stacked') {
      DISCOUNT_TYPES.forEach((dt, i) => {
        series.push({
          name: dt.label,
          type: 'bar',
          stack: 'discount',
          yAxisIndex: 0,
          data: data.map((d) => (d[`d${dt.type}`] as number) ?? 0),
          itemStyle: { color: DISCOUNT_COLORS[i % DISCOUNT_COLORS.length] },
          barMaxWidth: 16,
        })
      })
    } else {
      if (hasPrev) {
        series.push({
          name: `前年${activeLbl}`,
          type: 'bar',
          yAxisIndex: 0,
          data: data.map((d) => (d[`prevD${activeCode}`] as number) ?? 0),
          itemStyle: {
            color: DISCOUNT_COLORS[activeColorIdx] ?? '#ef4444',
            opacity: 0.3,
            borderRadius: [3, 3, 0, 0],
          },
          barMaxWidth: 20,
        })
      }
      series.push({
        name: activeLbl,
        type: 'bar',
        yAxisIndex: 0,
        data: data.map((d) => (d[`d${activeCode}`] as number) ?? 0),
        itemStyle: {
          color: DISCOUNT_COLORS[activeColorIdx] ?? '#ef4444',
          borderRadius: [3, 3, 0, 0],
        },
        barMaxWidth: 20,
      })
    }

    series.push({
      name: '累計売変率',
      type: 'line',
      yAxisIndex: 1,
      data: data.map((d) => d.cumRate as number),
      ...lineDefaults({ color: theme.colors.palette.orange }),
      connectNulls: true,
    })
    if (hasPrev) {
      series.push({
        name: '前年累計売変率',
        type: 'line',
        yAxisIndex: 1,
        data: data.map((d) => d.prevCumRate as number | null),
        ...lineDefaults({ color: theme.chart.previousYear, width: 1.5, dashed: true }),
        connectNulls: true,
      })
    }

    return {
      grid: standardGrid(),
      tooltip: standardTooltip(theme),
      legend: { ...standardLegend(theme), type: 'scroll' },
      xAxis: categoryXAxis(days, theme),
      yAxis: [
        yenYAxis(theme) as Record<string, unknown>,
        valueYAxis(theme, {
          formatter: (v: number) => toPct(v),
          position: 'right',
          showSplitLine: false,
        }) as Record<string, unknown>,
      ],
      series,
    }
  }, [data, viewMode, activeCode, activeLbl, activeColorIdx, hasPrev, theme])

  const kpiEntries = discountEntries ?? []
  const totalDiscount = kpiEntries.reduce((s, e) => s + e.amount, 0)

  if (!hasData) return null

  const titleText =
    viewMode === 'stacked' ? '売変内訳分析（種別積上 / 累計売変率）' : `${activeLbl} 日別推移`

  const toolbar = (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      <button
        style={{
          padding: '2px 8px',
          fontSize: '0.6rem',
          border: `1px solid ${viewMode === 'stacked' ? theme.colors.palette.primary : theme.colors.border}`,
          borderRadius: theme.radii.sm,
          background: viewMode === 'stacked' ? theme.interactive.activeBg : 'transparent',
          color: viewMode === 'stacked' ? theme.colors.palette.primary : theme.colors.text3,
          cursor: 'pointer',
        }}
        onClick={() => setViewMode('stacked')}
      >
        全種別
      </button>
      {DISCOUNT_TYPES.map((dt, i) => (
        <button
          key={dt.type}
          style={{
            padding: '2px 8px',
            fontSize: '0.6rem',
            border: `1px solid ${viewMode === 'individual' && activeCode === dt.type ? DISCOUNT_COLORS[i] : theme.colors.border}`,
            borderRadius: theme.radii.sm,
            background:
              viewMode === 'individual' && activeCode === dt.type
                ? `${DISCOUNT_COLORS[i]}1f`
                : 'transparent',
            color:
              viewMode === 'individual' && activeCode === dt.type
                ? DISCOUNT_COLORS[i]
                : theme.colors.text3,
            cursor: 'pointer',
          }}
          onClick={() => {
            setViewMode('individual')
            setActiveCode(dt.type)
          }}
        >
          {dt.label}
        </button>
      ))}
    </div>
  )

  return (
    <ChartCard title={titleText} toolbar={toolbar}>
      {kpiEntries.length > 0 && (
        <KpiGrid>
          {DISCOUNT_TYPES.map((dt, i) => {
            const entry = kpiEntries.find((e) => e.type === dt.type)
            const amt = entry?.amount ?? 0
            const pct = totalDiscount > 0 ? amt / totalDiscount : 0
            const rate =
              totalGrossSales && totalGrossSales > 0 ? calculateShare(amt, totalGrossSales) : 0
            return (
              <KpiCard key={dt.type} $color={DISCOUNT_COLORS[i]}>
                <KpiLabel>
                  {dt.label}（{dt.type}）
                </KpiLabel>
                <KpiValue>{fmtCurrency(amt)}</KpiValue>
                <KpiSub>
                  構成比: {formatPercent(pct)} / 売変率: {formatPercent(rate)}
                </KpiSub>
              </KpiCard>
            )
          })}
        </KpiGrid>
      )}

      <EChart option={option} height={280} ariaLabel="売変推移チャート" />

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
