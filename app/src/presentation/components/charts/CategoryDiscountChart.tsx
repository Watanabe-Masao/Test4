/**
 * CategoryDiscountChart — カテゴリ別売変分析チャート
 *
 * 部門/ライン/クラス別の売変内訳（71政策/72レジ/73廃棄/74試食）を
 * 積み上げ横棒グラフ + 売変率テーブルで表示。
 *
 * DiscountTrendChart から日付クリックでドリルダウン表示。
 */
import { memo, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import type { DateRange } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { AppTheme } from '@/presentation/theme/theme'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  categoryDiscountHandler,
  type CategoryDiscountInput,
} from '@/application/queries/cts/CategoryDiscountHandler'
import { DISCOUNT_TYPES } from '@/domain/models/record'
import { formatPercent } from '@/domain/formatting'
import { useCurrencyFormat } from './chartTheme'
import { SegmentedControl } from '@/presentation/components/common/layout'
import { ChartCard } from './ChartCard'
import { ChartLoading, ChartEmpty } from './ChartState'
import { EChart, type EChartsOption } from './EChart'
import { standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'

type Level = 'department' | 'line' | 'klass'

const LEVEL_OPTIONS: readonly { value: Level; label: string }[] = [
  { value: 'department', label: '部門' },
  { value: 'line', label: 'ライン' },
  { value: 'klass', label: 'クラス' },
]

const DISCOUNT_COLORS: Record<string, string> = {
  '71': '#ef4444',
  '72': '#f59e0b',
  '73': '#22c55e',
  '74': '#8b5cf6',
}

interface Props {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  /** タイトルに表示する日付ラベル（ドリルダウン元から渡される） */
  readonly dateLabel?: string
}

export const CategoryDiscountChart = memo(function CategoryDiscountChart({
  queryExecutor,
  currentDateRange,
  selectedStoreIds,
  dateLabel,
}: Props) {
  const theme = useTheme() as AppTheme
  const cf = useCurrencyFormat()
  const [level, setLevel] = useState<Level>('department')

  const storeIds = useMemo(
    () => (selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined),
    [selectedStoreIds],
  )

  const input = useMemo<CategoryDiscountInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return { dateFrom: fromKey, dateTo: toKey, storeIds, level }
  }, [currentDateRange, storeIds, level])

  const { data: output, isLoading } = useQueryWithHandler(
    queryExecutor,
    categoryDiscountHandler,
    input,
  )

  const records = useMemo(() => output?.records ?? [], [output])

  const option = useMemo((): EChartsOption => {
    if (records.length === 0) return {}

    const categories = records.map((r) => r.name || r.code)

    return {
      grid: { ...standardGrid(), left: 100, bottom: 30 },
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const items = params as { seriesName: string; value: number; marker: string }[]
          if (!Array.isArray(items) || items.length === 0) return ''
          const cat = (items[0] as unknown as { name: string }).name ?? ''
          const total = items.reduce((s, i) => s + (i.value ?? 0), 0)
          const rows = items
            .filter((i) => i.value > 0)
            .map(
              (i) =>
                `<div style="display:flex;justify-content:space-between;gap:12px">` +
                `${i.marker}<span>${i.seriesName}</span>` +
                `<span style="font-weight:600;font-family:monospace">${cf.formatWithUnit(i.value)}</span></div>`,
            )
            .join('')
          return (
            `<div style="font-weight:600;margin-bottom:4px">${cat}</div>` +
            rows +
            `<div style="margin-top:4px;border-top:1px solid rgba(128,128,128,0.3);padding-top:4px;font-weight:600">` +
            `合計: ${cf.formatWithUnit(total)}</div>`
          )
        },
      },
      legend: { ...standardLegend(theme), bottom: 0 },
      xAxis: {
        type: 'value' as const,
        axisLabel: {
          color: theme.colors.text4,
          formatter: (v: number) => cf.formatWithUnit(v),
        },
        splitLine: { lineStyle: { color: theme.colors.border } },
      },
      yAxis: {
        type: 'category' as const,
        data: categories.reverse(),
        axisLabel: {
          color: theme.colors.text,
          width: 90,
          overflow: 'truncate' as const,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
      },
      series: DISCOUNT_TYPES.map((dt) => ({
        name: dt.label,
        type: 'bar' as const,
        stack: 'discount',
        data: [...records].reverse().map((r) => {
          switch (dt.type) {
            case '71':
              return r.discount71
            case '72':
              return r.discount72
            case '73':
              return r.discount73
            case '74':
              return r.discount74
            default:
              return 0
          }
        }),
        itemStyle: { color: DISCOUNT_COLORS[dt.type] },
        barWidth: '60%',
      })),
    }
  }, [records, theme, cf])

  const title = dateLabel ? `${dateLabel} カテゴリ別売変分析` : 'カテゴリ別売変分析'

  if (isLoading && records.length === 0) {
    return (
      <ChartCard title={title}>
        <ChartLoading />
      </ChartCard>
    )
  }

  if (!queryExecutor?.isReady || records.length === 0) {
    return (
      <ChartCard title={title}>
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  const chartH = Math.max(200, records.length * 28 + 60)

  return (
    <ChartCard
      title={title}
      subtitle="部門/ライン/クラス別の売変内訳"
      toolbar={
        <SegmentedControl
          options={LEVEL_OPTIONS}
          value={level}
          onChange={setLevel}
          ariaLabel="階層レベル"
        />
      }
    >
      <EChart option={option} height={chartH} ariaLabel="カテゴリ別売変分析" />

      {/* 売変率テーブル */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: theme.typography.fontSize.xs,
          marginTop: 8,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: 'left',
                padding: '4px 8px',
                borderBottom: `2px solid ${theme.colors.border}`,
                color: theme.colors.text3,
              }}
            >
              カテゴリ
            </th>
            <th
              style={{
                textAlign: 'right',
                padding: '4px 8px',
                borderBottom: `2px solid ${theme.colors.border}`,
                color: theme.colors.text3,
              }}
            >
              売変合計
            </th>
            <th
              style={{
                textAlign: 'right',
                padding: '4px 8px',
                borderBottom: `2px solid ${theme.colors.border}`,
                color: theme.colors.text3,
              }}
            >
              売変率
            </th>
            <th
              style={{
                textAlign: 'right',
                padding: '4px 8px',
                borderBottom: `2px solid ${theme.colors.border}`,
                color: theme.colors.text3,
              }}
            >
              構成比
            </th>
            {DISCOUNT_TYPES.map((dt) => (
              <th
                key={dt.type}
                style={{
                  textAlign: 'right',
                  padding: '4px 8px',
                  borderBottom: `2px solid ${theme.colors.border}`,
                  color: DISCOUNT_COLORS[dt.type],
                }}
              >
                {dt.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const rate = r.salesAmount > 0 ? r.discountTotal / r.salesAmount : 0
            const totalDiscount = records.reduce((s, x) => s + x.discountTotal, 0)
            const share = totalDiscount > 0 ? r.discountTotal / totalDiscount : 0
            return (
              <tr key={r.code} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                <td style={{ padding: '4px 8px', fontWeight: 600 }}>{r.name || r.code}</td>
                <td
                  style={{
                    textAlign: 'right',
                    padding: '4px 8px',
                    fontFamily: theme.typography.fontFamily.mono,
                  }}
                >
                  {cf.formatWithUnit(r.discountTotal)}
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    padding: '4px 8px',
                    fontFamily: theme.typography.fontFamily.mono,
                  }}
                >
                  {formatPercent(rate)}
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    padding: '4px 8px',
                    fontFamily: theme.typography.fontFamily.mono,
                  }}
                >
                  {formatPercent(share)}
                </td>
                {DISCOUNT_TYPES.map((dt) => {
                  const val =
                    dt.type === '71'
                      ? r.discount71
                      : dt.type === '72'
                        ? r.discount72
                        : dt.type === '73'
                          ? r.discount73
                          : r.discount74
                  return (
                    <td
                      key={dt.type}
                      style={{
                        textAlign: 'right',
                        padding: '4px 8px',
                        fontFamily: theme.typography.fontFamily.mono,
                        color: val > 0 ? theme.colors.text : theme.colors.text4,
                      }}
                    >
                      {val > 0 ? cf.formatWithUnit(val) : '—'}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </ChartCard>
  )
})
