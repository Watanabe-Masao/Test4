/**
 * カテゴリ別要因分解チャート
 *
 * 部門→ライン→クラスの各階層で要因分解を横棒グラフ+テーブルで表示。
 * クリックで下位階層にドリルダウン可能。
 * 2要素(客数・客単価) / 3要素(客数・点数・単価) / 5要素(+価格・構成比変化) を切替可能。
 */
import { useState, useMemo, useCallback, Fragment, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import type { BarSeriesOption, LineSeriesOption } from 'echarts'
import {
  standardGrid,
  standardTooltip,
} from '@/presentation/components/charts/echartsOptionBuilders'
import { useCurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbSep,
  LegendRow,
  LegendItem,
  LegendDot,
  DecompRow,
  DecompBtn,
} from './CategoryFactorBreakdown.styles'
import type {
  DecompLevel,
  FactorItem,
  WaterfallFactorItem,
  PathEntry,
  DrillLevel,
} from './categoryFactorBreakdown.types'
import { FACTOR_COLORS } from './FactorTooltip'
import { CategoryFactorTable } from './CategoryFactorTable'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import {
  filterRecordsByDrillPath,
  checkHasSubCategories,
  computeFactorItems,
  computeWaterfallItems,
  computeTotals,
} from './categoryFactorBreakdownLogic'

/* ── Component ──────────────────────────────────────── */

export const CategoryFactorBreakdown = memo(function CategoryFactorBreakdown({
  curRecords,
  prevRecords,
  curCustomers = 0,
  prevCustomers = 0,
  compact = false,
  curLabel = '当年',
  prevLabel = '前年',
}: {
  curRecords: readonly CategoryTimeSalesRecord[]
  prevRecords: readonly CategoryTimeSalesRecord[]
  curCustomers?: number
  prevCustomers?: number
  compact?: boolean
  curLabel?: string
  prevLabel?: string
}) {
  const hasCust = curCustomers > 0 && prevCustomers > 0
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const { format: fmtCurrency } = useCurrencyFormat()
  const [drillPath, setDrillPath] = useState<PathEntry[]>([])
  const [decompLevel, setDecompLevel] = useState<DecompLevel | null>(null)

  const currentLevel: DrillLevel =
    drillPath.length === 0 ? 'dept' : drillPath.length === 1 ? 'line' : 'class'

  // Filter records by drill path
  const filtered = useMemo(
    () => filterRecordsByDrillPath(curRecords, prevRecords, drillPath),
    [curRecords, prevRecords, drillPath],
  )

  // Check if level 5 is available (need sub-categories)
  const hasSubCategories = useMemo(
    () => checkHasSubCategories(filtered.cur, currentLevel),
    [filtered.cur, currentLevel],
  )

  const maxLevel: DecompLevel = hasSubCategories ? 5 : 3
  const activeLevel = decompLevel !== null && decompLevel <= maxLevel ? decompLevel : maxLevel

  // Compute factor items
  const items = useMemo(
    () =>
      computeFactorItems(
        filtered,
        currentLevel,
        activeLevel,
        hasCust,
        curCustomers,
        prevCustomers,
        compact,
      ),
    [filtered, currentLevel, compact, hasCust, curCustomers, prevCustomers, activeLevel],
  )

  // Build waterfall ranges
  const waterfallItems = useMemo(
    () => computeWaterfallItems(items, activeLevel, hasCust),
    [items, activeLevel, hasCust],
  )

  // Compute totals for the footer row
  const totals = useMemo(() => computeTotals(items), [items])

  const handleDrill = useCallback(
    (item: FactorItem) => {
      if (!item.hasChildren) return
      setDrillPath((prev) => [...prev, { level: currentLevel, code: item.code, name: item.name }])
    },
    [currentLevel],
  )

  const handleBreadcrumb = useCallback((idx: number) => {
    setDrillPath((prev) => prev.slice(0, idx))
  }, [])

  const handleChartClick = useCallback(
    (params: Record<string, unknown>) => {
      const dataIndex = params.dataIndex as number | undefined
      if (dataIndex == null) return
      const item = waterfallItems[dataIndex]
      if (item) handleDrill(item)
    },
    [waterfallItems, handleDrill],
  )

  if (items.length === 0) return null

  const levelLabel =
    currentLevel === 'dept' ? '部門' : currentLevel === 'line' ? 'ライン' : 'クラス'
  // 品目数と分解要素数に応じて行間を動的に算出
  const ROW_HEIGHT = compact ? 32 : 40
  const chartH = Math.max(compact ? 200 : 280, items.length * ROW_HEIGHT + 60)

  return (
    <div>
      {/* Breadcrumb */}
      {drillPath.length > 0 && (
        <Breadcrumb>
          <BreadcrumbItem onClick={() => handleBreadcrumb(0)}>全体</BreadcrumbItem>
          {drillPath.map((entry, i) => (
            <Fragment key={i}>
              <BreadcrumbSep>&rsaquo;</BreadcrumbSep>
              <BreadcrumbItem
                onClick={() => handleBreadcrumb(i + 1)}
                $active={i === drillPath.length - 1}
              >
                {entry.name}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </Breadcrumb>
      )}

      {/* Decomposition level toggle */}
      <DecompRow>
        <DecompBtn $active={activeLevel === 2} onClick={() => setDecompLevel(2)}>
          客数・客単価
        </DecompBtn>
        <DecompBtn $active={activeLevel === 3} onClick={() => setDecompLevel(3)}>
          客数・点数・単価
        </DecompBtn>
        {maxLevel === 5 && (
          <DecompBtn $active={activeLevel === 5} onClick={() => setDecompLevel(5)}>
            5要素（価格+構成比）
          </DecompBtn>
        )}
      </DecompRow>

      {/* Legend */}
      <LegendRow>
        {hasCust && (
          <LegendItem>
            <LegendDot $color={FACTOR_COLORS.cust} />
            客数効果
          </LegendItem>
        )}
        {activeLevel === 2 && (
          <LegendItem>
            <LegendDot $color={FACTOR_COLORS.ticket} />
            客単価効果
          </LegendItem>
        )}
        {activeLevel >= 3 && (
          <LegendItem>
            <LegendDot $color={FACTOR_COLORS.qty} />
            点数効果
          </LegendItem>
        )}
        {activeLevel === 3 && (
          <LegendItem>
            <LegendDot $color={FACTOR_COLORS.price} />
            単価効果
          </LegendItem>
        )}
        {activeLevel === 5 && (
          <>
            <LegendItem>
              <LegendDot $color={FACTOR_COLORS.price} />
              価格効果
            </LegendItem>
            <LegendItem>
              <LegendDot $color={FACTOR_COLORS.mix} />
              構成比変化効果
            </LegendItem>
          </>
        )}
      </LegendRow>

      {/* Horizontal waterfall x department hybrid chart */}
      <CategoryFactorEChart
        waterfallItems={waterfallItems}
        activeLevel={activeLevel}
        hasCust={hasCust}
        compact={compact}
        chartH={chartH}
        theme={theme}
        fmt={fmt}
        fmtCurrency={fmtCurrency}
        prevLabel={prevLabel}
        curLabel={curLabel}
        onClick={handleChartClick}
      />

      {/* Summary table */}
      <CategoryFactorTable
        items={items}
        totals={totals}
        activeLevel={activeLevel}
        hasCust={hasCust}
        levelLabel={levelLabel}
        prevLabel={prevLabel}
        curLabel={curLabel}
        onDrill={handleDrill}
      />
    </div>
  )
})

/** トルネードチャート: プラス要因を右、マイナス要因を左にスタック表示 */
const CategoryFactorEChart = memo(function CategoryFactorEChart({
  waterfallItems,
  activeLevel,
  hasCust,
  compact,
  chartH,
  theme,
  fmt,
  fmtCurrency,
  prevLabel,
  curLabel,
  onClick,
}: {
  waterfallItems: WaterfallFactorItem[]
  activeLevel: DecompLevel
  hasCust: boolean
  compact: boolean
  chartH: number
  theme: AppTheme
  fmt: (v: number) => string
  fmtCurrency: (v: number | null) => string
  prevLabel: string
  curLabel: string
  onClick: (params: Record<string, unknown>) => void
}) {
  const option = useMemo((): EChartsOption => {
    const names = waterfallItems.map((d) => d.name)
    const barSize = compact ? 18 : 22

    // 要因定義: 名前・色・値取得関数
    type FactorDef = {
      name: string
      color: string
      getValue: (d: WaterfallFactorItem) => number
    }
    const factors: FactorDef[] = []
    if (hasCust)
      factors.push({ name: '客数効果', color: FACTOR_COLORS.cust, getValue: (d) => d.custEffect })
    if (activeLevel === 2)
      factors.push({
        name: '客単価効果',
        color: FACTOR_COLORS.ticket,
        getValue: (d) => d.ticketEffect,
      })
    if (activeLevel >= 3)
      factors.push({ name: '点数効果', color: FACTOR_COLORS.qty, getValue: (d) => d.qtyEffect })
    if (activeLevel === 3)
      factors.push({ name: '単価効果', color: FACTOR_COLORS.price, getValue: (d) => d.priceEffect })
    if (activeLevel === 5) {
      factors.push({
        name: '価格効果',
        color: FACTOR_COLORS.price,
        getValue: (d) => d.pricePureEffect,
      })
      factors.push({
        name: '構成比変化効果',
        color: FACTOR_COLORS.mix,
        getValue: (d) => d.mixEffect,
      })
    }

    // トルネード: プラス要因は右スタック、マイナス要因は左スタック（負値として）
    const seriesList: BarSeriesOption[] = []

    for (const f of factors) {
      // プラス側（右）
      seriesList.push({
        name: f.name,
        type: 'bar',
        stack: 'positive',
        data: waterfallItems.map((d) => {
          const v = f.getValue(d)
          return v > 0 ? v : 0
        }),
        itemStyle: { color: f.color, opacity: 0.9, borderRadius: [2, 2, 2, 2] },
        barWidth: barSize,
        barGap: '-100%',
      })
      // マイナス側（左）— 負値のままスタック
      seriesList.push({
        name: f.name,
        type: 'bar',
        stack: 'negative',
        data: waterfallItems.map((d) => {
          const v = f.getValue(d)
          return v < 0 ? v : 0
        }),
        itemStyle: { color: f.color, opacity: 0.9, borderRadius: [2, 2, 2, 2] },
        barWidth: barSize,
        barGap: '-100%',
      })
    }

    // 効果の純合計（プラス効果 + マイナス効果）の折れ線
    const netTotals = waterfallItems.map((d) => factors.reduce((sum, f) => sum + f.getValue(d), 0))

    const fmtLineLabel = (v: unknown): string => {
      const n = typeof v === 'number' ? v : 0
      if (n === 0) return ''
      return fmt(n)
    }

    const lineSeriesList: LineSeriesOption[] = [
      {
        name: '効果合計',
        type: 'line',
        data: netTotals,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#8b5cf6', width: 2 },
        itemStyle: { color: '#8b5cf6' },
        label: {
          show: true,
          position: 'right',
          formatter: (p) => fmtLineLabel(p.value),
          fontSize: 9,
          color: '#8b5cf6',
          fontFamily: theme.typography.fontFamily.mono,
        },
        z: 10,
      },
    ]

    return {
      grid: {
        ...standardGrid(),
        left: compact ? 60 : 80,
        right: compact ? 50 : 70,
        top: 10,
        bottom: 10,
      },
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'axis' as const,
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params]
          const first = arr[0] as { dataIndex: number } | undefined
          if (!first) return ''
          const item = waterfallItems[first.dataIndex]
          if (!item) return ''

          const pL = prevLabel
          const cL = curLabel
          let html = `<strong style="font-size:13px">${item.name}</strong><br/>`
          html += `<span style="opacity:0.7">${pL}: ${fmtCurrency(item.prevAmount)} → ${cL}: ${fmtCurrency(item.curAmount)}</span><br/>`
          html += `<strong>増減: ${item.totalChange >= 0 ? '+' : ''}${fmtCurrency(item.totalChange)}</strong><br/>`
          html +=
            '<hr style="margin:4px 0;border:none;border-top:1px solid rgba(128,128,128,0.3)"/>'

          let netSum = 0
          for (const fe of factors) {
            const v = fe.getValue(item)
            if (v === 0) continue
            netSum += v
            const sign = v >= 0 ? '+' : ''
            html += `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${fe.color};margin-right:4px"></span>`
            html += `${fe.name}: ${sign}${fmtCurrency(v)}<br/>`
          }
          html +=
            '<hr style="margin:4px 0;border:none;border-top:1px solid rgba(128,128,128,0.3)"/>'
          const netSign = netSum >= 0 ? '+' : ''
          html += `<span style="color:#8b5cf6">● 効果合計: ${netSign}${fmtCurrency(netSum)}</span>`
          if (item.hasChildren)
            html += '<br/><br/><em style="opacity:0.6;font-size:11px">クリックでドリルダウン</em>'
          return html
        },
      },
      xAxis: {
        type: 'value' as const,
        axisLabel: {
          formatter: (v: number) => fmt(v),
          color: theme.colors.text3,
          fontSize: 10,
          fontFamily: theme.typography.fontFamily.mono,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
        splitLine: {
          lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const },
        },
      },
      yAxis: {
        type: 'category' as const,
        data: names,
        inverse: true,
        axisLabel: {
          color: theme.colors.text,
          fontSize: compact ? 9 : 11,
          fontFamily: theme.typography.fontFamily.primary,
          width: compact ? 55 : 75,
          overflow: 'truncate' as const,
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        ...seriesList,
        ...lineSeriesList,
        // 0 基準線（トルネードの中心軸）
        {
          type: 'bar' as const,
          data: [] as number[],
          markLine: {
            silent: true,
            symbol: 'none' as const,
            lineStyle: {
              color: theme.colors.text3,
              width: 1,
              type: 'solid' as const,
              opacity: 0.5,
            },
            data: [{ xAxis: 0 }],
            label: { show: false },
          },
        },
      ],
    }
  }, [waterfallItems, activeLevel, hasCust, compact, theme, fmt, fmtCurrency, prevLabel, curLabel])

  return (
    <EChart
      option={option}
      height={chartH}
      onClick={onClick}
      ariaLabel="カテゴリ別要因分解トルネードチャート"
    />
  )
})
