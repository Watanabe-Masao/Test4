/**
 * CategoryDiscountChart — カテゴリ別売変分析チャート
 *
 * 部門/ライン/クラス別の売変内訳（71政策/72レジ/73廃棄/74試食）を
 * 積み上げ横棒グラフ + 売変率散布図（第二軸）+ 売変率テーブルで表示。
 *
 * ダブルクリックで下位レベルにドリルダウン（部門→ライン→クラス）。
 * 前年比較対応。
 *
 * @guard H5 visible-only query — collapsible 時、非表示で取得を抑制
 * @guard H6 ChartCard は通知のみ — onVisibilityChange で visible 状態を受け取る
 */
import { memo, useMemo, useState, useCallback } from 'react'
import { useTheme } from 'styled-components'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { AppTheme } from '@/presentation/theme/theme'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import {
  useCategoryDiscountChartPlan,
  type CategoryDiscountInput,
  type PairedInput,
} from '@/features/category'
import { DISCOUNT_TYPES } from '@/domain/models/record'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { SegmentedControl } from '@/presentation/components/common/layout'
import { ChartCard } from '@/presentation/components/charts/ChartCard'
import { ChartLoading, ChartEmpty } from '@/presentation/components/charts/ChartState'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  standardGrid,
  standardTooltip,
  standardLegend,
} from '@/presentation/components/charts/echartsOptionBuilders'
import {
  CategoryDiscountTable,
  type SortKey,
  type SortDir,
  type DrillState,
} from '@/features/category/ui/charts/CategoryDiscountTable'
import { sortDiscountRecords } from './CategoryDiscountChart.builders'

type Level = 'department' | 'line' | 'klass'

const LEVEL_OPTIONS: readonly { value: Level; label: string }[] = [
  { value: 'department', label: '部門' },
  { value: 'line', label: 'ライン' },
  { value: 'klass', label: 'クラス' },
]

const NEXT_LEVEL: Record<Level, Level | null> = {
  department: 'line',
  line: 'klass',
  klass: null,
}

const LEVEL_COLUMN: Record<Level, string> = {
  department: 'department_name',
  line: 'line_name',
  klass: 'class_name',
}

/** テーマトークンから売変種別の色を取得 */
function discountColors(theme: AppTheme): Record<string, string> {
  return {
    '71': theme.colors.palette.dangerDark,
    '72': theme.colors.palette.warningDark,
    '73': theme.colors.palette.successDark,
    '74': theme.colors.palette.purpleDark,
  }
}

interface Props {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  /** タイトルに表示する日付ラベル（ドリルダウン元から渡される） */
  readonly dateLabel?: string
  /** 親の種別フィルター（null = 全種別表示） */
  readonly discountTypeFilter?: string | null
}

export const CategoryDiscountChart = memo(function CategoryDiscountChart({
  queryExecutor,
  currentDateRange,
  selectedStoreIds,
  prevYearScope,
  dateLabel,
  discountTypeFilter,
}: Props) {
  const theme = useTheme() as AppTheme
  const cf = useCurrencyFormat()
  const [drill, setDrill] = useState<DrillState>({
    level: 'department',
    breadcrumbs: [],
  })
  const dtColors = useMemo(() => discountColors(theme), [theme])
  const [sortKey, setSortKey] = useState<SortKey>('discountTotal')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  // INV-RUN-05: collapsible 時の取得抑制（H5/H6）
  const [visible, setVisible] = useState(true)

  const storeIds = useMemo(
    () => (selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined),
    [selectedStoreIds],
  )

  // pair handler で当年+前年を並列取得
  // INV-RUN-05: visible=false 時は input=null で取得を抑制
  const pairInput = useMemo<PairedInput<CategoryDiscountInput> | null>(() => {
    if (!visible) return null
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    const base: PairedInput<CategoryDiscountInput> = {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds,
      level: drill.level,
      parentFilter: drill.parentFilter,
    }
    if (prevYearScope?.dateRange) {
      const { fromKey: pFrom, toKey: pTo } = dateRangeToKeys(prevYearScope.dateRange)
      return { ...base, comparisonDateFrom: pFrom, comparisonDateTo: pTo }
    }
    return base
  }, [visible, currentDateRange, prevYearScope, storeIds, drill.level, drill.parentFilter])

  const { data: pairOutput, isLoading } = useCategoryDiscountChartPlan(queryExecutor, pairInput)
  const output = pairOutput?.current ?? null
  const prevOutput = pairOutput?.comparison ?? null

  // 前年データを code → row で索引
  const prevByCode = useMemo(() => {
    const map = new Map<
      string,
      import('@/infrastructure/duckdb/queries/categoryDiscount').CategoryDiscountRow
    >()
    for (const r of prevOutput?.records ?? []) {
      map.set(r.code, r)
    }
    return map
  }, [prevOutput])

  const records = useMemo(
    () => sortDiscountRecords(output?.records ?? [], sortKey, sortDir, prevByCode),
    [output, sortKey, sortDir, prevByCode],
  )

  // ダブルクリックでドリルダウン
  const handleDblClick = useCallback(
    (params: Record<string, unknown>) => {
      const name = params.name as string | undefined
      if (!name) return
      const nextLevel = NEXT_LEVEL[drill.level]
      if (!nextLevel) return
      setDrill({
        level: nextLevel,
        parentFilter: { column: LEVEL_COLUMN[drill.level], value: name },
        breadcrumbs: [...drill.breadcrumbs, name],
      })
    },
    [drill],
  )

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
      } else {
        setSortKey(key)
        setSortDir('desc')
      }
    },
    [sortKey],
  )

  // パンくずクリックで戻る
  const handleBreadcrumbClick = useCallback((index: number) => {
    if (index < 0) {
      // ルートに戻る
      setDrill({ level: 'department', breadcrumbs: [] })
      return
    }
    const levels: Level[] = ['department', 'line', 'klass']
    const targetLevel = levels[index + 1] ?? 'line'
    setDrill((prev) => ({
      level: targetLevel,
      parentFilter:
        index >= 0
          ? { column: LEVEL_COLUMN[levels[index]], value: prev.breadcrumbs[index] }
          : undefined,
      breadcrumbs: prev.breadcrumbs.slice(0, index + 1),
    }))
  }, [])

  const option = useMemo((): EChartsOption => {
    if (records.length === 0) return {}

    const categories = records.map((r) => r.name || r.code)
    const reversed = [...records].reverse()
    const reversedCategories = [...categories].reverse()

    // 売変率（第二軸用）
    const discountRates = reversed.map((r) =>
      r.salesAmount > 0 ? Math.round((r.discountTotal / r.salesAmount) * 10000) / 100 : 0,
    )

    const barSeries = DISCOUNT_TYPES.filter(
      (dt) => discountTypeFilter == null || dt.type === discountTypeFilter,
    ).map((dt) => ({
      name: dt.label,
      type: 'bar' as const,
      stack: 'discount',
      data: reversed.map((r) => {
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
      itemStyle: { color: dtColors[dt.type] },
      barWidth: '60%',
    }))

    // 前年売変合計（当年バーの上にマーカーで表示 — 重なりを避ける）
    const prevBarData = reversed.map((r) => {
      const prev = prevByCode.get(r.code)
      return prev ? prev.discountTotal : null
    })
    const hasPrevData = prevBarData.some((v) => v != null)

    const series: EChartsOption['series'] = [...barSeries]

    if (hasPrevData) {
      // 前年位置を「|」マーカーで表示（バーと重ならない）
      series.push({
        name: '前年売変',
        type: 'scatter' as const,
        data: prevBarData,
        symbol: 'rect',
        symbolSize: [3, 18],
        itemStyle: { color: theme.colors.text3 },
        z: 15,
      } as EChartsOption['series'] extends readonly (infer T)[] ? T : never)
    }

    // 売変率散布図（第二軸）
    series.push({
      name: '売変率',
      type: 'scatter' as const,
      yAxisIndex: 0,
      xAxisIndex: 1,
      data: discountRates,
      symbol: 'diamond',
      symbolSize: 8,
      itemStyle: { color: theme.colors.palette.orange },
      z: 20,
    } as EChartsOption['series'] extends readonly (infer T)[] ? T : never)

    return {
      grid: { ...standardGrid(), left: 100, right: 60, bottom: 30 },
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const items = params as {
            seriesName: string
            value: number
            marker: string
            seriesType: string
          }[]
          if (!Array.isArray(items) || items.length === 0) return ''
          const cat = (items[0] as unknown as { name: string }).name ?? ''
          const barItems = items.filter(
            (i) => i.seriesType === 'bar' && i.seriesName !== '前年売変',
          )
          const prevItem = items.find((i) => i.seriesName === '前年売変')
          const rateItem = items.find((i) => i.seriesName === '売変率')
          const total = barItems.reduce((s, i) => s + (i.value ?? 0), 0)
          const rows = barItems
            .filter((i) => i.value !== 0)
            .map(
              (i) =>
                `<div style="display:flex;justify-content:space-between;gap:12px">` +
                `${i.marker}<span>${i.seriesName}</span>` +
                `<span style="font-weight:600;font-family:monospace">${cf.formatWithUnit(i.value)}</span></div>`,
            )
            .join('')
          let footer =
            `<div style="margin-top:4px;border-top:1px solid rgba(128,128,128,0.3);padding-top:4px;font-weight:600">` +
            `合計: ${cf.formatWithUnit(total)}</div>`
          if (prevItem?.value != null) {
            footer += `<div style="color:#9ca3af">前年: ${cf.formatWithUnit(prevItem.value)}</div>`
          }
          if (rateItem?.value != null) {
            footer += `<div style="color:${theme.colors.palette.orange}">売変率: ${rateItem.value}%</div>`
          }
          return `<div style="font-weight:600;margin-bottom:4px">${cat}</div>` + rows + footer
        },
      },
      legend: { ...standardLegend(theme), bottom: 0 },
      xAxis: [
        {
          type: 'value' as const,
          axisLabel: {
            color: theme.colors.text4,
            formatter: (v: number) => cf.formatWithUnit(v),
          },
          splitLine: { lineStyle: { color: theme.colors.border } },
        },
        {
          type: 'value' as const,
          position: 'top' as const,
          axisLabel: {
            color: theme.colors.palette.orange,
            formatter: (v: number) => `${v}%`,
          },
          splitLine: { show: false },
        },
      ],
      yAxis: {
        type: 'category' as const,
        data: reversedCategories,
        axisLabel: {
          color: theme.colors.text,
          width: 90,
          overflow: 'truncate' as const,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
        triggerEvent: true,
      },
      series,
    }
  }, [records, prevByCode, theme, cf, dtColors, discountTypeFilter])

  const title = (() => {
    const base = dateLabel ? `${dateLabel} カテゴリ別売変分析` : 'カテゴリ別売変分析'
    if (drill.breadcrumbs.length === 0) return base
    return `${base}（${drill.breadcrumbs.join(' > ')}）`
  })()

  const isEmpty = !queryExecutor?.isReady || records.length === 0
  const showLoading = isLoading && records.length === 0

  const chartH = Math.max(200, records.length * 28 + 60)

  return (
    <ChartCard
      title={title}
      subtitle="部門/ライン/クラス別の売変内訳（ダブルクリックでドリルダウン）"
      collapsible
      onVisibilityChange={setVisible}
      toolbar={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {drill.breadcrumbs.length > 0 && (
            <button
              style={{
                padding: '2px 8px',
                fontSize: theme.typography.fontSize.micro,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radii.sm,
                background: 'transparent',
                color: theme.colors.palette.primary,
                cursor: 'pointer',
              }}
              onClick={() => handleBreadcrumbClick(drill.breadcrumbs.length - 2)}
            >
              ← 戻る
            </button>
          )}
          <SegmentedControl
            options={LEVEL_OPTIONS}
            value={drill.level}
            onChange={(v) => setDrill({ level: v, breadcrumbs: [] })}
            ariaLabel="階層レベル"
          />
        </div>
      }
    >
      {showLoading ? (
        <ChartLoading />
      ) : isEmpty ? (
        <ChartEmpty message="データをインポートしてください" />
      ) : (
        <>
          <EChart
            option={option}
            height={chartH}
            ariaLabel="カテゴリ別売変分析"
            onDblClick={handleDblClick}
          />
          <CategoryDiscountTable
            records={records}
            prevByCode={prevByCode}
            drill={drill}
            setDrill={setDrill}
            sortKey={sortKey}
            sortDir={sortDir}
            toggleSort={toggleSort}
            dtColors={dtColors}
            theme={theme}
            cf={cf}
          />
        </>
      )}
    </ChartCard>
  )
})
