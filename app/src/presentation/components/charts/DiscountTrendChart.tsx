/**
 * 売変内訳分析チャート (ECharts)
 *
 * @migration unify-period-analysis Phase 5 三段構造: data builder
 *   (`buildDiscountData`) を `DiscountTrendChartLogic.ts` に抽出し、
 *   `ChartRenderModel<DiscountPoint>` 共通契約に揃えた。chart は
 *   `model.points` を描画にだけ使う。
 * @responsibility R:unclassified
 */
import { useState, useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { useCurrencyFormat, toPct } from './chartTheme'
import type { DailyRecord, DiscountEntry } from '@/domain/models/record'
import { DISCOUNT_TYPES } from '@/domain/models/record'
import { formatPercent } from '@/domain/formatting'
import { calculateShare } from '@/domain/calculations/utils'
import { ChartCard } from './ChartCard'
import { EChart, type EChartsOption } from './EChart'
import { yenYAxis, standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { categoryXAxis, valueYAxis, lineDefaults } from './builders'
import { KpiGrid, KpiCard, KpiLabel, KpiValue, KpiSub } from './DiscountTrendChart.styles'
import { buildDiscountData, type DiscountPoint } from './DiscountTrendChartLogic'

/** DiscountType (71-74) → theme.chart.semantic.* の色キー。
 *  DISCOUNT_TYPES の配列順と対応 (71=[0] 政策 / 72=[1] レジ / 73=[2] 廃棄 / 74=[3] 試食)。 */
const DISCOUNT_COLOR_KEYS = [
  'discountPolicy',
  'discountRegister',
  'discountWaste',
  'discountSampling',
] as const satisfies ReadonlyArray<keyof AppTheme['chart']['semantic']>

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

  // Phase 5 三段構造: data builder は DiscountTrendChartLogic.ts に剥離
  const renderModel = useMemo(
    () => buildDiscountData(daily, daysInMonth, year, month, prevYearDaily),
    [daily, daysInMonth, year, month, prevYearDaily],
  )
  const allData = renderModel.points

  const data = useMemo<readonly DiscountPoint[]>(
    () => allData.filter((d) => d.day >= rangeStart && d.day <= rangeEnd),
    [allData, rangeStart, rangeEnd],
  )
  const hasData = allData.some((d) => d.discount > 0)
  const hasPrev = renderModel.flags?.hasComparison === true
  const activeType = DISCOUNT_TYPES.find((dt) => dt.type === activeCode)
  const activeLbl = activeType?.label ?? ''
  const activeColorIdx = DISCOUNT_TYPES.findIndex((dt) => dt.type === activeCode)

  const option = useMemo<EChartsOption>(() => {
    const days = data.map((d) => String(d.day))
    const series: EChartsOption['series'] = []
    const colorOf = (i: number): string =>
      theme.chart.semantic[DISCOUNT_COLOR_KEYS[i] ?? 'discountPolicy']
    const activeColor = colorOf(activeColorIdx)

    if (viewMode === 'stacked') {
      DISCOUNT_TYPES.forEach((dt, i) => {
        series.push({
          name: dt.label,
          type: 'bar',
          stack: 'discount',
          yAxisIndex: 0,
          data: data.map((d) => d.byType[dt.type] ?? 0),
          itemStyle: { color: colorOf(i) },
          barMaxWidth: 16,
        })
      })
    } else {
      if (hasPrev) {
        series.push({
          name: `前年${activeLbl}`,
          type: 'bar',
          yAxisIndex: 0,
          data: data.map((d) => d.prevByType?.[activeCode] ?? 0),
          itemStyle: {
            color: theme.chart.semantic.discountPrev,
            borderRadius: [3, 3, 0, 0],
          },
          barMaxWidth: 20,
        })
      }
      series.push({
        name: activeLbl,
        type: 'bar',
        yAxisIndex: 0,
        data: data.map((d) => d.byType[activeCode] ?? 0),
        itemStyle: {
          color: activeColor,
          borderRadius: [3, 3, 0, 0],
        },
        barMaxWidth: 20,
      })
    }

    // 累計売変率ライン（stacked: 全体 / individual: 選択種別）
    const cumRateLabel = viewMode === 'individual' ? `累計${activeLbl}率` : '累計売変率'
    const prevCumRateLabel = viewMode === 'individual' ? `前年累計${activeLbl}率` : '前年累計売変率'
    const getCumRate = (d: DiscountPoint): number | null =>
      viewMode === 'individual' ? (d.cumRateByType[activeCode] ?? null) : d.cumRate
    const getPrevCumRate = (d: DiscountPoint): number | null =>
      viewMode === 'individual' ? (d.prevCumRateByType?.[activeCode] ?? null) : d.prevCumRate

    series.push({
      name: cumRateLabel,
      type: 'line',
      yAxisIndex: 1,
      data: data.map((d) => getCumRate(d)),
      ...lineDefaults({ color: theme.chart.semantic.cumulativeDiscountRate }),
      connectNulls: true,
    })
    if (hasPrev) {
      series.push({
        name: prevCumRateLabel,
        type: 'line',
        yAxisIndex: 1,
        data: data.map((d) => getPrevCumRate(d)),
        ...lineDefaults({
          color: theme.chart.semantic.cumulativeDiscountRatePrev,
          width: 1.5,
          dashed: true,
        }),
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
      {DISCOUNT_TYPES.map((dt, i) => {
        const c = theme.chart.semantic[DISCOUNT_COLOR_KEYS[i] ?? 'discountPolicy']
        const isActive = viewMode === 'individual' && activeCode === dt.type
        return (
          <button
            key={dt.type}
            style={{
              padding: '2px 8px',
              fontSize: '0.6rem',
              border: `1px solid ${isActive ? c : theme.colors.border}`,
              borderRadius: theme.radii.sm,
              background: isActive ? `${c}1f` : 'transparent',
              color: isActive ? c : theme.colors.text3,
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
        )
      })}
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
            const c = theme.chart.semantic[DISCOUNT_COLOR_KEYS[i] ?? 'discountPolicy']
            return (
              <KpiCard key={dt.type} $color={c}>
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
