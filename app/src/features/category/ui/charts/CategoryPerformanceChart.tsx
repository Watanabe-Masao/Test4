import { chartFontSize } from '@/presentation/theme/tokens'
/**
 * カテゴリPI値・偏差値分析
 *
 * PI値（金額PI / 点数PI）と偏差値を算出して横棒チャートで表示する。
 * データは親の Screen Plan hook (usePerformanceIndexPlan) から props で受け取る。
 *
 * @guard H4 component に acquisition logic 禁止
 */
import { useState, useMemo, useCallback, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  standardGrid,
  standardTooltip,
  standardLegend,
} from '@/presentation/components/charts/echartsOptionBuilders'
import { toComma } from '@/presentation/components/charts/chartTheme'
import type { PrevYearScope } from '@/domain/models/calendar'
import type { PairedQueryOutput } from '@/application/queries/PairedQueryContract'
import type { LevelAggregationOutput } from '@/application/queries/cts/LevelAggregationHandler'
import { buildCategoryRows } from './CategoryPerformanceChart.builders'
import { ChartSkeleton } from '@/presentation/components/common/feedback'
import { ChartCard } from '@/presentation/components/charts/ChartCard'
import {
  ToggleRow,
  ViewToggle,
  ViewBtn,
  Sep,
  EmptyMsg,
} from '@/features/category/ui/charts/CategoryPerformanceChart.styles'

type ViewType = 'piRank' | 'deviation' | 'piQtyRank'
export type LevelType = 'department' | 'line' | 'klass'

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

/** ドリルダウン情報 */
export interface CategoryDrillDownInfo {
  readonly code: string
  readonly name: string
  readonly level: LevelType
}

interface Props {
  categoryData: PairedQueryOutput<LevelAggregationOutput> | null
  isLoading: boolean
  prevYearScope?: PrevYearScope
  totalCustomers: number
  level: LevelType
  onLevelChange: (level: LevelType) => void
  /** カテゴリダブルクリック時のドリルダウンコールバック */
  onDrillDown?: (info: CategoryDrillDownInfo) => void
  /** ドリルダウンのパンくず（表示用） */
  breadcrumbs?: readonly { readonly label: string; readonly onClick: () => void }[]
}

const ALL_LABELS: Record<string, string> = {
  piAmount: '金額PI値',
  prevPiAmount: '前年金額PI値',
  piQty: '点数PI値',
  prevPiQty: '前年点数PI値',
  deviation: '金額PI偏差値',
  qtyDeviation: '点数PI偏差値',
}

export const CategoryPerformanceChart = memo(function CategoryPerformanceChart({
  categoryData,
  isLoading,
  prevYearScope,
  totalCustomers,
  level,
  onLevelChange,
  onDrillDown,
  breadcrumbs,
}: Props) {
  const prevTotalCustomers = prevYearScope?.totalCustomers ?? 0
  const theme = useTheme() as AppTheme
  const [view, setView] = useState<ViewType>('piRank')

  const curRecords = categoryData?.current.records ?? null
  const prevRecords = categoryData?.comparison?.records ?? null

  const categoryRows = useMemo(
    () =>
      curRecords
        ? buildCategoryRows(curRecords, prevRecords, totalCustomers, prevTotalCustomers)
        : [],
    [curRecords, prevRecords, totalCustomers, prevTotalCustomers],
  )

  const names = categoryRows.map((r) => r.name)

  // ダブルクリックでドリルダウン（klass レベルでは不可）
  const canDrillDown = level !== 'klass' && onDrillDown != null
  const handleDblClick = useCallback(
    (params: Record<string, unknown>) => {
      if (!canDrillDown || !onDrillDown) return
      const dataIndex = params.dataIndex as number | undefined
      if (dataIndex == null) return
      const row = categoryRows[dataIndex]
      if (!row) return
      onDrillDown({ code: row.code, name: row.name, level })
    },
    [canDrillDown, onDrillDown, categoryRows, level],
  )

  const chartHeight = Math.max(300, categoryRows.length * 28 + 40)

  const titleMap: Record<ViewType, string> = {
    piRank: `金額PI値ランキング（${LEVEL_LABELS[level]}別 / PI = 売上÷客数×1000）`,
    piQtyRank: `点数PI値ランキング（${LEVEL_LABELS[level]}別 / PI = 点数÷客数×1000）`,
    deviation: `カテゴリ偏差値分析（${LEVEL_LABELS[level]}別 / 基準=50）`,
  }

  const option = useMemo(() => {
    const baseGrid = { ...standardGrid(), left: 80, bottom: 30, containLabel: false }
    const baseYAxis = {
      type: 'category' as const,
      data: names,
      inverse: true,
      axisLabel: {
        color: theme.colors.text3,
        fontSize: chartFontSize.axis - 2,
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
            if (!Array.isArray(items) || items.length === 0) return ''
            const categoryName = (items[0] as unknown as Record<string, unknown>).name as string
            const lines = items.map((item) => {
              const label = ALL_LABELS[item.seriesName] ?? item.seriesName
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
          formatter: (name: string) => ALL_LABELS[name] ?? name,
        },
        xAxis: {
          type: 'value' as const,
          min: 20,
          max: 80,
          axisLabel: {
            color: theme.colors.text3,
            fontSize: chartFontSize.axis - 1,
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
      const color = prev != null && val >= prev ? mainColor : theme.colors.palette.orange
      return { value: val, itemStyle: { color } }
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
          if (!Array.isArray(items) || items.length === 0) return ''
          const categoryName = (items[0] as unknown as Record<string, unknown>).name as string
          const lines = items.map((item) => {
            const label = ALL_LABELS[item.seriesName] ?? item.seriesName
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
        formatter: (name: string) => ALL_LABELS[name] ?? name,
      },
      xAxis: {
        type: 'value' as const,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: chartFontSize.axis - 1,
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
  }, [categoryRows, names, view, theme])

  // Loading state
  if (isLoading) {
    return (
      <ChartCard title="カテゴリPI値・偏差値分析" ariaLabel="カテゴリ実績チャート">
        <ChartSkeleton height="360px" />
      </ChartCard>
    )
  }

  if (!curRecords || curRecords.length === 0) {
    return (
      <ChartCard title="カテゴリPI値・偏差値分析" ariaLabel="カテゴリ実績チャート">
        <EmptyMsg>分類別時間帯売上データがありません</EmptyMsg>
      </ChartCard>
    )
  }

  if (totalCustomers <= 0) {
    return (
      <ChartCard title="カテゴリPI値・偏差値分析" ariaLabel="カテゴリ実績チャート">
        <EmptyMsg>客数データがありません（PI値の算出に客数が必要です）</EmptyMsg>
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title={titleMap[view]}
      ariaLabel="カテゴリ実績チャート"
      toolbar={
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
              <ViewBtn key={l} $active={level === l} onClick={() => onLevelChange(l)}>
                {LEVEL_LABELS[l]}
              </ViewBtn>
            ))}
          </ViewToggle>
        </ToggleRow>
      }
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: theme.typography.fontSize.micro,
            color: theme.colors.text3,
            marginBottom: 4,
          }}
        >
          {breadcrumbs.map((bc, i) => (
            <span key={i}>
              {i > 0 && <span style={{ margin: '0 2px' }}> &gt; </span>}
              <button
                onClick={bc.onClick}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.colors.palette.primary,
                  cursor: 'pointer',
                  padding: '0 2px',
                  fontSize: 'inherit',
                  textDecoration: 'underline',
                }}
              >
                {bc.label}
              </button>
            </span>
          ))}
        </div>
      )}
      {canDrillDown && (
        <div
          style={{
            fontSize: theme.typography.fontSize.micro,
            color: theme.colors.text4,
            textAlign: 'right',
            marginBottom: 2,
          }}
        >
          ダブルクリックでドリルダウン
        </div>
      )}
      <EChart
        option={option as EChartsOption}
        height={chartHeight}
        onDblClick={canDrillDown ? handleDblClick : undefined}
        ariaLabel="カテゴリ実績チャート"
      />
    </ChartCard>
  )
})
