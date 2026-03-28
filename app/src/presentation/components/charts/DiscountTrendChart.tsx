/**
 * 売変内訳分析チャート (ECharts)
 */
import { useState, useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { useCurrencyFormat, toPct } from './chartTheme'
// DualPeriodSlider は削除（親チャートの期間指定に統合）
// useDualPeriodRange は削除（スライダー期間指定廃止）
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
  /** サブパネル埋め込み時に ChartCard ラッパーを省略する */
  embedded?: boolean
  /** 日付クリック → カテゴリ別売変ドリルダウン */
  onDayClick?: (day: number) => void
  /** 範囲ドラッグ選択 */
  onDayRangeSelect?: (startDay: number, endDay: number) => void
  /** 種別フィルター変更を親に通知（null = 全種別） */
  onFilterChange?: (discountType: string | null) => void
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
  // 種別ごとの累計（個別モード用）
  const typeCum: Record<string, number> = {}
  const prevTypeCum: Record<string, number> = {}
  for (const dt of DISCOUNT_TYPES) {
    typeCum[dt.type] = 0
    prevTypeCum[dt.type] = 0
  }
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
      const curAmt = rec?.discountEntries?.find((e) => e.type === dt.type)?.amount ?? 0
      entry[`d${dt.type}`] = curAmt
      typeCum[dt.type] += curAmt
      // 種別累計売変率 = 種別累計 / 総売上累計
      entry[`cumRate${dt.type}`] =
        cumGrossSales > 0 ? calculateShare(typeCum[dt.type], cumGrossSales) : null
      if (prevYearDaily && prevEntry?.discountEntries) {
        const prevAmt = prevEntry.discountEntries[dt.type] ?? 0
        entry[`prevD${dt.type}`] = prevAmt
        prevTypeCum[dt.type] += prevAmt
        entry[`prevCumRate${dt.type}`] =
          prevCumGrossSales > 0 ? calculateShare(prevTypeCum[dt.type], prevCumGrossSales) : null
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
  embedded,
  onDayClick,
  onDayRangeSelect,
  onFilterChange,
}: Props) {
  const theme = useTheme() as AppTheme
  const { format: fmtCurrency } = useCurrencyFormat()
  const rangeStart = 1
  const rangeEnd = daysInMonth
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

    // 累計売変率ライン（stacked: 全体 / individual: 選択種別）
    const cumRateKey = viewMode === 'individual' ? `cumRate${activeCode}` : 'cumRate'
    const prevCumRateKey = viewMode === 'individual' ? `prevCumRate${activeCode}` : 'prevCumRate'
    const cumRateLabel = viewMode === 'individual' ? `累計${activeLbl}率` : '累計売変率'
    const prevCumRateLabel = viewMode === 'individual' ? `前年累計${activeLbl}率` : '前年累計売変率'

    series.push({
      name: cumRateLabel,
      type: 'line',
      yAxisIndex: 1,
      data: data.map((d) => d[cumRateKey] as number),
      ...lineDefaults({ color: theme.colors.palette.orange }),
      connectNulls: true,
    })
    if (hasPrev) {
      series.push({
        name: prevCumRateLabel,
        type: 'line',
        yAxisIndex: 1,
        data: data.map((d) => d[prevCumRateKey] as number | null),
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
        onClick={() => {
          setViewMode('stacked')
          onFilterChange?.(null)
        }}
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
            onFilterChange?.(dt.type)
          }}
        >
          {dt.label}
        </button>
      ))}
    </div>
  )

  const content = (
    <>
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

      <EChart
        option={
          onDayRangeSelect
            ? {
                ...option,
                brush: {
                  toolbox: [],
                  xAxisIndex: 0,
                  brushStyle: {
                    borderWidth: 1,
                    color: 'rgba(59,130,246,0.15)',
                    borderColor: 'rgba(59,130,246,0.5)',
                  },
                  throttleType: 'debounce' as const,
                  throttleDelay: 300,
                },
              }
            : option
        }
        height={280}
        onClick={
          onDayClick
            ? (params: Record<string, unknown>) => {
                const day = params.name as number | undefined
                if (day != null && day >= 1) onDayClick(Number(day))
              }
            : undefined
        }
        onBrushEnd={
          onDayRangeSelect
            ? (params: Record<string, unknown>) => {
                const areas = (params as { areas?: { coordRange?: number[] }[] }).areas
                if (!areas?.[0]?.coordRange) return
                const [start, end] = areas[0].coordRange
                onDayRangeSelect(Math.min(start, end) + 1, Math.max(start, end) + 1)
              }
            : undefined
        }
        enableBrushClickEmulation={!!onDayRangeSelect}
        ariaLabel="売変推移チャート"
      />
    </>
  )

  if (embedded) {
    return (
      <>
        {toolbar}
        {content}
      </>
    )
  }

  return (
    <ChartCard title={titleText} toolbar={toolbar}>
      {content}
    </ChartCard>
  )
})
