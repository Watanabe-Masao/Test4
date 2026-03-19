/**
 * カテゴリPI値・偏差値分析
 *
 * queryLevelAggregation で階層別集約データを取得し、
 * PI値（金額PI / 点数PI）と偏差値を算出して横棒チャートで表示する。
 */
import { useState, useMemo, memo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart, type EChartsOption } from './EChart'
import { standardTooltip, standardLegend } from './echartsOptionBuilders'
import { toComma, toDevScore } from './chartTheme'
import type { DateRange, PrevYearScope } from '@/domain/models'
import { useDuckDBLevelAggregation } from '@/application/hooks/duckdb'
import { calculateStdDev } from '@/application/hooks/useStatistics'
import { ChartSkeleton } from '@/presentation/components/common'
import {
  Wrapper,
  HeaderRow,
  Title,
  ToggleRow,
  ViewToggle,
  ViewBtn,
  Sep,
  EmptyMsg,
} from './CategoryPerformanceChart.styles'

type ViewType = 'piRank' | 'deviation' | 'piQtyRank'
type LevelType = 'department' | 'line' | 'klass'

const VIEW_LABELS: Record<ViewType, string> = {
  piRank: '金額PI値',
  piQtyRank: '点数PI値',
  deviation: '偏差値',
}

const LEVEL_LABELS: Record<LevelType, string> = {
  department: '部門',
  line: 'ライン',
  klass: 'クラス',
}

interface Props {
  duckConn: AsyncDuckDBConnection | null
  duckDataVersion: number
  currentDateRange: DateRange
  prevYearScope?: PrevYearScope
  selectedStoreIds: ReadonlySet<string>
  totalCustomers: number
}

interface CategoryRow {
  code: string
  name: string
  amount: number
  quantity: number
  piAmount: number
  piQty: number
  prevPiAmount: number | null
  prevPiQty: number | null
  deviation: number | null
  qtyDeviation: number | null
}

export const CategoryPerformanceChart = memo(function CategoryPerformanceChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  prevYearScope,
  selectedStoreIds,
  totalCustomers,
}: Props) {
  const prevYearDateRange = prevYearScope?.dateRange
  const prevTotalCustomers = prevYearScope?.totalCustomers ?? 0
  const theme = useTheme() as AppTheme
  const [view, setView] = useState<ViewType>('piRank')
  const [level, setLevel] = useState<LevelType>('department')

  // DuckDB: 当年レベル別集約
  const curAgg = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
  )

  // DuckDB: 前年レベル別集約
  const prevAgg = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    prevYearDateRange,
    selectedStoreIds,
    level,
    undefined,
    true, // isPrevYear
  )

  const categoryRows = useMemo(() => {
    if (!curAgg.data || curAgg.data.length === 0 || totalCustomers <= 0) return []

    const prevMap = new Map<string, { amount: number; quantity: number }>()
    if (prevAgg.data && prevTotalCustomers > 0) {
      for (const row of prevAgg.data) {
        prevMap.set(row.code, { amount: row.amount, quantity: row.quantity })
      }
    }

    const rows: CategoryRow[] = []
    const piAmounts: number[] = []
    const piQtys: number[] = []

    for (const entry of curAgg.data) {
      const piAmount = (entry.amount / totalCustomers) * 1000
      const piQty = (entry.quantity / totalCustomers) * 1000

      let prevPiAmount: number | null = null
      let prevPiQty: number | null = null
      if (prevTotalCustomers > 0) {
        const prev = prevMap.get(entry.code)
        if (prev) {
          prevPiAmount = (prev.amount / prevTotalCustomers) * 1000
          prevPiQty = (prev.quantity / prevTotalCustomers) * 1000
        }
      }

      piAmounts.push(piAmount)
      piQtys.push(piQty)

      rows.push({
        code: entry.code,
        name: entry.name || entry.code,
        amount: entry.amount,
        quantity: entry.quantity,
        piAmount,
        piQty,
        prevPiAmount,
        prevPiQty,
        deviation: null,
        qtyDeviation: null,
      })
    }

    // Compute deviation scores
    const amtStat = calculateStdDev(piAmounts)
    const qtyStat = calculateStdDev(piQtys)

    for (const row of rows) {
      if (amtStat.stdDev > 0) {
        row.deviation = toDevScore((row.piAmount - amtStat.mean) / amtStat.stdDev)
      }
      if (qtyStat.stdDev > 0) {
        row.qtyDeviation = toDevScore((row.piQty - qtyStat.mean) / qtyStat.stdDev)
      }
    }

    // Sort by piAmount descending, limit to top 20
    rows.sort((a, b) => b.piAmount - a.piAmount)
    return rows.slice(0, 20)
  }, [curAgg.data, prevAgg.data, totalCustomers, prevTotalCustomers])

  // Loading state
  if (curAgg.isLoading) {
    return (
      <Wrapper aria-label="カテゴリ実績チャート">
        <HeaderRow>
          <Title>カテゴリPI値・偏差値分析</Title>
        </HeaderRow>
        <ChartSkeleton height="360px" />
      </Wrapper>
    )
  }

  if (!curAgg.data || curAgg.data.length === 0) {
    return (
      <Wrapper aria-label="カテゴリ実績チャート">
        <HeaderRow>
          <Title>カテゴリPI値・偏差値分析</Title>
        </HeaderRow>
        <EmptyMsg>分類別時間帯売上データがありません</EmptyMsg>
      </Wrapper>
    )
  }

  if (totalCustomers <= 0) {
    return (
      <Wrapper aria-label="カテゴリ実績チャート">
        <HeaderRow>
          <Title>カテゴリPI値・偏差値分析</Title>
        </HeaderRow>
        <EmptyMsg>客数データがありません（PI値の算出に客数が必要です）</EmptyMsg>
      </Wrapper>
    )
  }

  const allLabels: Record<string, string> = {
    piAmount: '金額PI値',
    prevPiAmount: '前年金額PI値',
    piQty: '点数PI値',
    prevPiQty: '前年点数PI値',
    deviation: '金額PI偏差値',
    qtyDeviation: '点数PI偏差値',
  }

  const chartHeight = Math.max(300, categoryRows.length * 28 + 40)

  const titleMap: Record<ViewType, string> = {
    piRank: `金額PI値ランキング（${LEVEL_LABELS[level]}別 / PI = 売上÷客数×1000）`,
    piQtyRank: `点数PI値ランキング（${LEVEL_LABELS[level]}別 / PI = 点数÷客数×1000）`,
    deviation: `カテゴリ偏差値分析（${LEVEL_LABELS[level]}別 / 基準=50）`,
  }

  const names = categoryRows.map((r) => r.name)

  const option = useMemo(() => {
    const baseGrid = { left: 80, right: 20, top: 30, bottom: 30, containLabel: false }
    const baseYAxis = {
      type: 'category' as const,
      data: names,
      inverse: true,
      axisLabel: {
        color: theme.colors.text3,
        fontSize: 8,
        fontFamily: theme.typography.fontFamily.primary,
        width: 70,
        overflow: 'truncate' as const,
      },
      axisLine: { show: false },
      axisTick: { show: false },
    }

    if (view === 'deviation') {
      const barData = (categoryRows as unknown as Record<string, unknown>[]).map((entry) => {
        const d = (entry.deviation as number | null) ?? 50
        const color =
          d >= 60
            ? theme.colors.palette.success
            : d >= 50
              ? theme.colors.palette.primary
              : d >= 40
                ? theme.colors.palette.warning
                : theme.colors.palette.danger
        return { value: entry.deviation, itemStyle: { color, opacity: 0.7 } }
      })

      const lineData = (categoryRows as unknown as Record<string, unknown>[]).map(
        (entry) => entry.qtyDeviation as number | null,
      )

      return {
        grid: baseGrid,
        tooltip: {
          ...standardTooltip(theme),
          trigger: 'axis' as const,
          formatter: (params: unknown) => {
            const items = params as { seriesName: string; value: number | null; marker: string }[]
            const categoryName = (items[0] as unknown as Record<string, unknown>).name as string
            const lines = items.map((item) => {
              const label = allLabels[item.seriesName] ?? item.seriesName
              const val = item.value != null ? (item.value as number).toFixed(1) : '-'
              return `${item.marker} ${label}: ${val}`
            })
            return `<strong>${categoryName}</strong><br/>${lines.join('<br/>')}`
          },
        },
        legend: {
          ...standardLegend(theme),
          data: [
            { name: 'deviation', icon: 'roundRect' },
            { name: 'qtyDeviation', icon: 'circle' },
          ],
          formatter: (name: string) => allLabels[name] ?? name,
        },
        xAxis: {
          type: 'value' as const,
          min: 20,
          max: 80,
          axisLabel: {
            color: theme.colors.text3,
            fontSize: 9,
            fontFamily: theme.typography.fontFamily.mono,
          },
          axisLine: { lineStyle: { color: theme.colors.border } },
          axisTick: { show: false },
          splitLine: {
            lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const },
          },
        },
        yAxis: baseYAxis,
        series: [
          {
            name: 'deviation',
            type: 'bar' as const,
            data: barData,
            barWidth: 10,
            itemStyle: { borderRadius: [0, 3, 3, 0] },
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { type: 'solid' as const },
              data: [
                {
                  xAxis: 50,
                  lineStyle: {
                    color: theme.colors.border,
                    width: 1.5,
                    opacity: 0.7,
                    type: 'solid' as const,
                  },
                },
                {
                  xAxis: 60,
                  lineStyle: {
                    color: theme.colors.palette.success,
                    width: 1,
                    opacity: 0.3,
                    type: 'dashed' as const,
                  },
                },
                {
                  xAxis: 40,
                  lineStyle: {
                    color: theme.colors.palette.danger,
                    width: 1,
                    opacity: 0.3,
                    type: 'dashed' as const,
                  },
                },
              ],
            },
          },
          {
            name: 'qtyDeviation',
            type: 'line' as const,
            data: lineData,
            smooth: true,
            lineStyle: { color: theme.colors.palette.purple, width: 2 },
            itemStyle: { color: theme.colors.palette.purple },
            symbol: 'circle',
            symbolSize: 6,
          },
        ],
      }
    }

    // piRank / piQtyRank views
    const isPiAmount = view === 'piRank'
    const mainKey = isPiAmount ? 'piAmount' : 'piQty'
    const prevKey = isPiAmount ? 'prevPiAmount' : 'prevPiQty'
    const mainColor = isPiAmount ? theme.colors.palette.primary : theme.colors.palette.info

    const mainData = (categoryRows as unknown as Record<string, unknown>[]).map((entry) => {
      const val = entry[mainKey] as number
      const prev = entry[prevKey] as number | null
      const color = prev != null && val >= prev ? mainColor : theme.colors.palette.slateDark
      return { value: val, itemStyle: { color, opacity: 0.7 } }
    })

    const prevData = (categoryRows as unknown as Record<string, unknown>[]).map(
      (entry) => entry[prevKey] as number | null,
    )

    return {
      grid: baseGrid,
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'axis' as const,
        formatter: (params: unknown) => {
          const items = params as { seriesName: string; value: number | null; marker: string }[]
          const categoryName = (items[0] as unknown as Record<string, unknown>).name as string
          const lines = items.map((item) => {
            const label = allLabels[item.seriesName] ?? item.seriesName
            const val = item.value != null ? toComma(Math.round(item.value as number)) : '-'
            return `${item.marker} ${label}: ${val}`
          })
          return `<strong>${categoryName}</strong><br/>${lines.join('<br/>')}`
        },
      },
      legend: {
        ...standardLegend(theme),
        data: [
          { name: mainKey, icon: 'roundRect' },
          { name: prevKey, icon: 'roundRect' },
        ],
        formatter: (name: string) => allLabels[name] ?? name,
      },
      xAxis: {
        type: 'value' as const,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: 9,
          fontFamily: theme.typography.fontFamily.mono,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
        axisTick: { show: false },
        splitLine: {
          lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const },
        },
      },
      yAxis: baseYAxis,
      series: [
        {
          name: mainKey,
          type: 'bar' as const,
          data: mainData,
          barWidth: 10,
          itemStyle: { borderRadius: [0, 3, 3, 0] },
        },
        {
          name: prevKey,
          type: 'bar' as const,
          data: prevData,
          barWidth: 6,
          itemStyle: {
            color: theme.colors.palette.slate,
            opacity: 0.35,
            borderRadius: [0, 2, 2, 0],
          },
        },
      ],
    }
  }, [categoryRows, names, view, theme, allLabels])

  return (
    <Wrapper aria-label="カテゴリ実績チャート">
      <HeaderRow>
        <Title>{titleMap[view]}</Title>
        <ToggleRow>
          <ViewToggle>
            {(Object.keys(VIEW_LABELS) as ViewType[]).map((v) => (
              <ViewBtn key={v} $active={view === v} onClick={() => setView(v)}>
                {VIEW_LABELS[v]}
              </ViewBtn>
            ))}
          </ViewToggle>
          <Sep>|</Sep>
          <ViewToggle>
            {(Object.keys(LEVEL_LABELS) as LevelType[]).map((l) => (
              <ViewBtn key={l} $active={level === l} onClick={() => setLevel(l)}>
                {LEVEL_LABELS[l]}
              </ViewBtn>
            ))}
          </ViewToggle>
        </ToggleRow>
      </HeaderRow>

      <EChart option={option as EChartsOption} height={chartHeight} ariaLabel="カテゴリ実績チャート" />
    </Wrapper>
  )
})
