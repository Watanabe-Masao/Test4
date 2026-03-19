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
import { standardGrid, standardTooltip } from '@/presentation/components/charts/echartsOptionBuilders'
import { useCurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import {
  decompose2,
  decompose3,
  decompose5 as decompose5Domain,
  decomposePriceMix as decomposePriceMixDomain,
} from '@/application/hooks/calculation'
import type { CategoryTimeSalesRecord } from '@/domain/models'
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
  const filtered = useMemo(() => {
    let fc = curRecords
    let fp = prevRecords
    for (const entry of drillPath) {
      if (entry.level === 'dept') {
        fc = fc.filter((r) => r.department.code === entry.code)
        fp = fp.filter((r) => r.department.code === entry.code)
      } else if (entry.level === 'line') {
        fc = fc.filter((r) => r.line.code === entry.code)
        fp = fp.filter((r) => r.line.code === entry.code)
      }
    }
    return { cur: fc, prev: fp }
  }, [curRecords, prevRecords, drillPath])

  // Check if level 5 is available (need sub-categories)
  const hasSubCategories = useMemo(() => {
    if (currentLevel === 'class') return false
    const childKeys = new Set<string>()
    for (const r of filtered.cur) {
      if (currentLevel === 'dept') {
        childKeys.add(`${r.department.code}|${r.line.code}`)
      } else {
        childKeys.add(`${r.line.code}|${r.klass.code}`)
      }
      if (childKeys.size > 1) return true
    }
    return false
  }, [filtered.cur, currentLevel])

  const maxLevel: DecompLevel = hasSubCategories ? 5 : 3
  const activeLevel = decompLevel !== null && decompLevel <= maxLevel ? decompLevel : maxLevel

  // Compute factor items
  const items = useMemo((): FactorItem[] => {
    const keyOf = (r: CategoryTimeSalesRecord) => {
      if (currentLevel === 'dept')
        return { code: r.department.code, name: r.department.name || r.department.code }
      if (currentLevel === 'line') return { code: r.line.code, name: r.line.name || r.line.code }
      return { code: r.klass.code, name: r.klass.name || r.klass.code }
    }

    const curG = new Map<string, { name: string; qty: number; amt: number }>()
    for (const r of filtered.cur) {
      const k = keyOf(r)
      const ex = curG.get(k.code) ?? { name: k.name, qty: 0, amt: 0 }
      ex.qty += r.totalQuantity
      ex.amt += r.totalAmount
      curG.set(k.code, ex)
    }

    const prevG = new Map<string, { name: string; qty: number; amt: number }>()
    for (const r of filtered.prev) {
      const k = keyOf(r)
      const ex = prevG.get(k.code) ?? { name: k.name, qty: 0, amt: 0 }
      ex.qty += r.totalQuantity
      ex.amt += r.totalAmount
      prevG.set(k.code, ex)
    }

    const childCheck = (code: string): boolean => {
      if (currentLevel === 'class') return false
      if (currentLevel === 'dept') {
        const lines = new Set<string>()
        for (const r of filtered.cur) {
          if (r.department.code === code) lines.add(r.line.code)
          if (lines.size > 1) return true
        }
        return false
      }
      const klasses = new Set<string>()
      for (const r of filtered.cur) {
        if (r.line.code === code) klasses.add(r.klass.code)
        if (klasses.size > 1) return true
      }
      return false
    }

    // Helper: get child-level key for sub-category decomposition
    const childKeyOf = (r: CategoryTimeSalesRecord) => {
      if (currentLevel === 'dept') return `${r.line.code}|${r.klass.code}`
      return r.klass.code
    }

    // Helper: filter records by group code at current level
    const filterByGroup = (recs: readonly CategoryTimeSalesRecord[], code: string) => {
      if (currentLevel === 'dept') return recs.filter((r) => r.department.code === code)
      if (currentLevel === 'line') return recs.filter((r) => r.line.code === code)
      return recs.filter((r) => r.klass.code === code)
    }

    const allCodes = new Set([...curG.keys(), ...prevG.keys()])
    const result: FactorItem[] = []

    for (const code of allCodes) {
      const c = curG.get(code)
      const p = prevG.get(code)
      const cQty = c?.qty ?? 0,
        cAmt = c?.amt ?? 0
      const pQty = p?.qty ?? 0,
        pAmt = p?.amt ?? 0
      const name = c?.name ?? p?.name ?? code

      let custEffect = 0
      let ticketEffect = 0
      let qtyEffect = 0
      let priceEffect = 0
      let pricePureEffect = 0
      let mixEffect = 0

      if (activeLevel === 2) {
        // 2-factor Shapley: 客数効果 + 客単価効果
        if (hasCust && pAmt > 0) {
          const d = decompose2(pAmt, cAmt, prevCustomers, curCustomers)
          custEffect = d.custEffect
          ticketEffect = d.ticketEffect
        } else {
          ticketEffect = cAmt - pAmt
        }
      } else if (activeLevel === 3) {
        // 3-factor Shapley: 客数効果 + 点数効果 + 単価効果
        if (hasCust && pQty > 0) {
          const d = decompose3(pAmt, cAmt, prevCustomers, curCustomers, pQty, cQty)
          custEffect = d.custEffect
          qtyEffect = d.qtyEffect
          priceEffect = d.pricePerItemEffect
        } else if (pQty > 0 && cQty > 0) {
          // No customer data: 2-factor Shapley on qty x price
          const d = decompose2(pAmt, cAmt, pQty, cQty)
          qtyEffect = d.custEffect // qty dimension
          priceEffect = d.ticketEffect // price dimension
        } else {
          priceEffect = cAmt - pAmt
        }
      } else {
        // 5-factor: full 4-variable Shapley (C, Q, p, s)
        const curSub = filterByGroup(filtered.cur, code)
        const prevSub = filterByGroup(filtered.prev, code)
        const curQA = curSub.map((r) => ({
          key: childKeyOf(r),
          qty: r.totalQuantity,
          amt: r.totalAmount,
        }))
        const prevQA = prevSub.map((r) => ({
          key: childKeyOf(r),
          qty: r.totalQuantity,
          amt: r.totalAmount,
        }))

        if (hasCust && pQty > 0) {
          const d = decompose5Domain(
            pAmt,
            cAmt,
            prevCustomers,
            curCustomers,
            pQty,
            cQty,
            curQA,
            prevQA,
          )
          if (d) {
            custEffect = d.custEffect
            qtyEffect = d.qtyEffect
            pricePureEffect = d.priceEffect
            mixEffect = d.mixEffect
          } else {
            const d3 = decompose3(pAmt, cAmt, prevCustomers, curCustomers, pQty, cQty)
            custEffect = d3.custEffect
            qtyEffect = d3.qtyEffect
            pricePureEffect = d3.pricePerItemEffect
          }
        } else if (pQty > 0 && cQty > 0) {
          // No customer data: treat Q as first dimension
          const pm = decomposePriceMixDomain(curQA, prevQA)
          const d = decompose2(pAmt, cAmt, pQty, cQty)
          qtyEffect = d.custEffect // qty dimension
          const unitPriceTotal = d.ticketEffect // price dimension

          if (pm) {
            const pmSum = pm.priceEffect + pm.mixEffect
            const share = Math.abs(pmSum) > 0.01 ? pm.priceEffect / pmSum : 0.5
            pricePureEffect = unitPriceTotal * share
            mixEffect = unitPriceTotal * (1 - share)
          } else {
            pricePureEffect = unitPriceTotal
          }
        } else {
          pricePureEffect = cAmt - pAmt
        }
      }

      result.push({
        name,
        code,
        _level: activeLevel,
        custEffect,
        ticketEffect,
        qtyEffect,
        priceEffect,
        pricePureEffect,
        mixEffect,
        totalChange: cAmt - pAmt,
        prevAmount: pAmt,
        curAmount: cAmt,
        hasChildren: childCheck(code),
      })
    }

    result.sort((a, b) => Math.abs(b.totalChange) - Math.abs(a.totalChange))
    return result.slice(0, compact ? 8 : 12)
  }, [filtered, currentLevel, compact, hasCust, curCustomers, prevCustomers, activeLevel])

  // Build waterfall ranges: each effect's [start, end] for sub-waterfall per row
  const waterfallItems = useMemo((): WaterfallFactorItem[] => {
    return items.map((item) => {
      type Step = { key: string; value: number }
      const steps: Step[] = []

      if (hasCust) steps.push({ key: 'cust', value: item.custEffect })
      if (activeLevel === 2) steps.push({ key: 'ticket', value: item.ticketEffect })
      if (activeLevel >= 3) steps.push({ key: 'qty', value: item.qtyEffect })
      if (activeLevel === 3) steps.push({ key: 'price', value: item.priceEffect })
      if (activeLevel === 5) {
        steps.push({ key: 'pricePure', value: item.pricePureEffect })
        steps.push({ key: 'mix', value: item.mixEffect })
      }

      let pos = 0
      const ranges = new Map<string, [number, number]>()
      for (const step of steps) {
        const end = pos + step.value
        ranges.set(step.key, [pos, end])
        pos = end
      }

      const nil: [number, number] = [0, 0]
      return {
        ...item,
        custRange: ranges.get('cust') ?? nil,
        ticketRange: ranges.get('ticket') ?? nil,
        qtyRange: ranges.get('qty') ?? nil,
        priceRange: ranges.get('price') ?? nil,
        pricePureRange: ranges.get('pricePure') ?? nil,
        mixRange: ranges.get('mix') ?? nil,
      }
    })
  }, [items, activeLevel, hasCust])

  // Compute totals for the footer row
  const totals = useMemo(() => {
    const t = {
      prevAmount: 0,
      curAmount: 0,
      totalChange: 0,
      custEffect: 0,
      ticketEffect: 0,
      qtyEffect: 0,
      priceEffect: 0,
      pricePureEffect: 0,
      mixEffect: 0,
    }
    for (const item of items) {
      t.prevAmount += item.prevAmount
      t.curAmount += item.curAmount
      t.totalChange += item.totalChange
      t.custEffect += item.custEffect
      t.ticketEffect += item.ticketEffect
      t.qtyEffect += item.qtyEffect
      t.priceEffect += item.priceEffect
      t.pricePureEffect += item.pricePureEffect
      t.mixEffect += item.mixEffect
    }
    return t
  }, [items])

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
  const chartH = Math.max(compact ? 180 : 240, items.length * (compact ? 28 : 34) + 40)

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

/** Inner EChart component for horizontal factor bar chart */
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
    const barSize = compact ? 16 : 20

    // Build series for each active factor
    type BarSeries = {
      name: string
      type: 'bar'
      data: number[][]
      itemStyle: { color: string; opacity: number }
      barWidth: number
      stack: string
    }
    const seriesList: BarSeries[] = []

    if (hasCust) {
      seriesList.push({
        name: '客数効果',
        type: 'bar' as const,
        data: waterfallItems.map((d) => [d.custRange[0], d.custRange[1]]),
        itemStyle: { color: FACTOR_COLORS.cust, opacity: 0.85 },
        barWidth: barSize,
        stack: 'factor',
      })
    }

    if (activeLevel === 2) {
      seriesList.push({
        name: '客単価効果',
        type: 'bar' as const,
        data: waterfallItems.map((d) => [d.ticketRange[0], d.ticketRange[1]]),
        itemStyle: { color: FACTOR_COLORS.ticket, opacity: 0.85 },
        barWidth: barSize,
        stack: 'factor',
      })
    }

    if (activeLevel >= 3) {
      seriesList.push({
        name: '点数効果',
        type: 'bar' as const,
        data: waterfallItems.map((d) => [d.qtyRange[0], d.qtyRange[1]]),
        itemStyle: { color: FACTOR_COLORS.qty, opacity: 0.85 },
        barWidth: barSize,
        stack: 'factor',
      })
    }

    if (activeLevel === 3) {
      seriesList.push({
        name: '単価効果',
        type: 'bar' as const,
        data: waterfallItems.map((d) => [d.priceRange[0], d.priceRange[1]]),
        itemStyle: { color: FACTOR_COLORS.price, opacity: 0.85 },
        barWidth: barSize,
        stack: 'factor',
      })
    }

    if (activeLevel === 5) {
      seriesList.push({
        name: '価格効果',
        type: 'bar' as const,
        data: waterfallItems.map((d) => [d.pricePureRange[0], d.pricePureRange[1]]),
        itemStyle: { color: FACTOR_COLORS.price, opacity: 0.85 },
        barWidth: barSize,
        stack: 'factor',
      })
      seriesList.push({
        name: '構成比変化効果',
        type: 'bar' as const,
        data: waterfallItems.map((d) => [d.mixRange[0], d.mixRange[1]]),
        itemStyle: { color: FACTOR_COLORS.mix, opacity: 0.85 },
        barWidth: barSize,
        stack: 'factor',
      })
    }

    return {
      grid: {
        ...standardGrid(),
        left: compact ? 60 : 80,
        top: 5,
        bottom: 5,
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
          let html = `<strong>${item.name}</strong><br/>`
          html += `${pL}: ${fmtCurrency(item.prevAmount)}<br/>`
          html += `${cL}: ${fmtCurrency(item.curAmount)}<br/>`
          html += `増減: ${item.totalChange >= 0 ? '+' : ''}${fmtCurrency(item.totalChange)}`
          if (item.hasChildren) html += '<br/><em>クリックでドリルダウン</em>'
          return html
        },
      },
      xAxis: {
        type: 'value' as const,
        axisLabel: {
          formatter: (v: number) => fmt(v),
          color: theme.colors.text3,
          fontSize: 9,
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
          fontSize: 9,
          fontFamily: theme.typography.fontFamily.primary,
          width: compact ? 55 : 75,
          overflow: 'truncate' as const,
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: seriesList,
    }
  }, [waterfallItems, activeLevel, hasCust, compact, theme, fmt, fmtCurrency, prevLabel, curLabel])

  return (
    <EChart
      option={option}
      height={chartH}
      onClick={onClick}
      ariaLabel="カテゴリ別要因分解チャート"
    />
  )
})
