/**
 * ドリルダウン前年比較ウォーターフォール
 *
 * DayDetailModal 内で日別の前年比較要因分解を表示する。
 * 客数効果 / 客単価効果 / 部門別増減の2ビューを提供。
 *
 * @responsibility R:unclassified
 */
import { useState, useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  yenYAxis,
  standardGrid,
  standardTooltip,
} from '@/presentation/components/charts/echartsOptionBuilders'
import { useCurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import {
  calculateItemsPerCustomer,
  calculateAveragePricePerItem,
} from '@/domain/calculations/utils'
import { decompose2, decompose3, decompose5 } from '@/application/hooks/calculation'
import { CategoryFactorBreakdown } from './CategoryFactorBreakdown'
import { recordsToCategoryQtyAmt } from './categoryFactorUtils'
import { buildRecordAggregates } from './DrilldownWaterfall.builders'
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import { DetailSectionTitle } from '../DashboardPage.styles'
import { sc } from '@/presentation/theme/semanticColors'
import {
  Section,
  TabRow,
  TabBtn,
  PiRow,
  PiItem,
  DecompRow,
  DecompBtn,
} from './DrilldownWaterfall.styles'

interface WaterfallItem {
  name: string
  value: number
  base: number
  bar: number
  isTotal?: boolean
}

type ViewMode = 'factor' | 'category' | 'categoryFactor'
type DecompLevel = 2 | 3 | 5

export function DrilldownWaterfall({
  actual,
  pySales,
  dayCust,
  pyCust,
  dayRecords,
  prevDayRecords,
  curLabel = '当年',
  prevLabel = '前年',
}: {
  actual: number
  pySales: number
  dayCust: number
  pyCust: number
  dayRecords: readonly CategoryLeafDailyEntry[]
  prevDayRecords: readonly CategoryLeafDailyEntry[]
  curLabel?: string
  prevLabel?: string
}) {
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const { format: fmtCurrency } = useCurrencyFormat()
  const [viewMode, setViewMode] = useState<ViewMode>('factor')
  const [decompLevel, setDecompLevel] = useState<DecompLevel | null>(null)

  // 3 useMemo → 1: curTotalQty + prevTotalQty + priceMix を一括計算
  const { curTotalQty, prevTotalQty, hasQuantity, priceMix } = useMemo(
    () => buildRecordAggregates(dayRecords, prevDayRecords),
    [dayRecords, prevDayRecords],
  )

  // Available decomposition levels
  const maxLevel: DecompLevel = priceMix ? 5 : hasQuantity ? 3 : 2
  const activeLevel = decompLevel ?? maxLevel

  const factorData = useMemo((): WaterfallItem[] => {
    if (pySales <= 0) return []

    const items: WaterfallItem[] = []
    items.push({ name: prevLabel, value: pySales, base: 0, bar: pySales, isTotal: true })

    let running = pySales
    const push = (name: string, value: number) => {
      items.push({
        name,
        value,
        base: value >= 0 ? running : running + value,
        bar: Math.abs(value),
      })
      running += value
    }

    if (pyCust > 0 && dayCust > 0) {
      if (activeLevel === 2) {
        const d = decompose2(pySales, actual, pyCust, dayCust)
        push('客数効果', d.custEffect)
        push('客単価効果', d.ticketEffect)
      } else if (activeLevel === 3 || !priceMix) {
        if (hasQuantity) {
          const d = decompose3(pySales, actual, pyCust, dayCust, prevTotalQty, curTotalQty)
          push('客数効果', d.custEffect)
          push('点数効果', d.qtyEffect)
          push('単価効果', d.pricePerItemEffect)
        } else {
          const d = decompose2(pySales, actual, pyCust, dayCust)
          push('客数効果', d.custEffect)
          push('客単価効果', d.ticketEffect)
        }
      } else {
        // 5-factor: full 4-variable Shapley
        if (hasQuantity) {
          const d = decompose5(
            pySales,
            actual,
            pyCust,
            dayCust,
            prevTotalQty,
            curTotalQty,
            recordsToCategoryQtyAmt(dayRecords),
            recordsToCategoryQtyAmt(prevDayRecords),
          )
          if (d) {
            push('客数効果', d.custEffect)
            push('点数効果', d.qtyEffect)
            push('価格効果', d.priceEffect)
            push('構成比変化', d.mixEffect)
          }
        }
      }
    } else {
      push('増減', actual - pySales)
    }

    items.push({ name: curLabel, value: actual, base: 0, bar: actual, isTotal: true })
    return items
  }, [
    actual,
    pySales,
    dayCust,
    pyCust,
    hasQuantity,
    curTotalQty,
    prevTotalQty,
    priceMix,
    activeLevel,
    dayRecords,
    prevDayRecords,
    curLabel,
    prevLabel,
  ])

  // 部門別増減データ: actual/pySales にアンカーし、部門差分はCTSから取得
  const categoryData = useMemo((): WaterfallItem[] => {
    if (dayRecords.length === 0 || prevDayRecords.length === 0) return []
    if (pySales <= 0) return []

    const curDepts = new Map<string, { name: string; amount: number }>()
    for (const rec of dayRecords) {
      const code = rec.deptCode
      const ex = curDepts.get(code) ?? { name: rec.deptName || code, amount: 0 }
      ex.amount += rec.totalAmount
      curDepts.set(code, ex)
    }

    const prevDepts = new Map<string, { name: string; amount: number }>()
    for (const rec of prevDayRecords) {
      const code = rec.deptCode
      const ex = prevDepts.get(code) ?? { name: rec.deptName || code, amount: 0 }
      ex.amount += rec.totalAmount
      prevDepts.set(code, ex)
    }

    const allCodes = new Set([...curDepts.keys(), ...prevDepts.keys()])
    const diffs: { name: string; diff: number }[] = []
    for (const code of allCodes) {
      const cur = curDepts.get(code)?.amount ?? 0
      const prev = prevDepts.get(code)?.amount ?? 0
      const name = curDepts.get(code)?.name ?? prevDepts.get(code)?.name ?? code
      if (Math.abs(cur - prev) > 0) {
        diffs.push({ name, diff: cur - prev })
      }
    }
    diffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))

    const items: WaterfallItem[] = []
    items.push({ name: prevLabel, value: pySales, base: 0, bar: pySales, isTotal: true })

    let running = pySales
    for (const d of diffs.slice(0, 6)) {
      items.push({
        name: d.name,
        value: d.diff,
        base: d.diff >= 0 ? running : running + d.diff,
        bar: Math.abs(d.diff),
      })
      running += d.diff
    }

    const rest = diffs.slice(6)
    if (rest.length > 0) {
      const otherDiff = rest.reduce((s, d) => s + d.diff, 0)
      if (Math.abs(otherDiff) > 0) {
        items.push({
          name: `他(${rest.length})`,
          value: otherDiff,
          base: otherDiff >= 0 ? running : running + otherDiff,
          bar: Math.abs(otherDiff),
        })
        running += otherDiff
      }
    }

    // データソース差異の端数調整
    const residual = actual - running
    if (Math.abs(residual) >= 1) {
      items.push({
        name: '調整',
        value: residual,
        base: residual >= 0 ? running : running + residual,
        bar: Math.abs(residual),
      })
      running += residual
    }

    items.push({ name: curLabel, value: actual, base: 0, bar: actual, isTotal: true })

    return items
  }, [dayRecords, prevDayRecords, actual, pySales, curLabel, prevLabel])

  // PI値・点単価（3要素以上の分解時に表示）
  const piSummary = useMemo(() => {
    if (activeLevel < 3 || !hasQuantity || pyCust <= 0 || dayCust <= 0) return null
    const prevPI = calculateItemsPerCustomer(prevTotalQty, pyCust)
    const curPI = calculateItemsPerCustomer(curTotalQty, dayCust)
    const prevPPI = calculateAveragePricePerItem(pySales, prevTotalQty)
    const curPPI = calculateAveragePricePerItem(actual, curTotalQty)
    return { prevPI, curPI, prevPPI, curPPI }
  }, [activeLevel, hasQuantity, pyCust, dayCust, prevTotalQty, curTotalQty, pySales, actual])

  if (pySales <= 0 || factorData.length === 0) return null

  const hasCategoryView = categoryData.length > 0
  const hasCategoryFactorView = hasQuantity && dayRecords.length > 0 && prevDayRecords.length > 0
  const data = viewMode === 'category' && hasCategoryView ? categoryData : factorData

  const colors = {
    positive: sc.positive,
    negative: sc.negative,
    total: '#6366f1',
  }

  return (
    <Section>
      <DetailSectionTitle>{prevLabel}比較ウォーターフォール</DetailSectionTitle>

      {(hasCategoryView || hasCategoryFactorView) && (
        <TabRow>
          <TabBtn $active={viewMode === 'factor'} onClick={() => setViewMode('factor')}>
            要因分解
          </TabBtn>
          {hasCategoryView && (
            <TabBtn $active={viewMode === 'category'} onClick={() => setViewMode('category')}>
              部門別増減
            </TabBtn>
          )}
          {hasCategoryFactorView && (
            <TabBtn
              $active={viewMode === 'categoryFactor'}
              onClick={() => setViewMode('categoryFactor')}
            >
              部門別要因
            </TabBtn>
          )}
        </TabRow>
      )}

      {viewMode === 'factor' && maxLevel >= 3 && (
        <DecompRow>
          <DecompBtn $active={activeLevel === 2} onClick={() => setDecompLevel(2)}>
            客数・客単価
          </DecompBtn>
          <DecompBtn $active={activeLevel === 3} onClick={() => setDecompLevel(3)}>
            客数・点数・単価
          </DecompBtn>
          {maxLevel === 5 && (
            <DecompBtn $active={activeLevel === 5} onClick={() => setDecompLevel(5)}>
              5要素
            </DecompBtn>
          )}
        </DecompRow>
      )}

      {piSummary && viewMode === 'factor' && (
        <PiRow>
          <span>
            PI値: {piSummary.prevPI.toFixed(1)}点 →{' '}
            <PiItem $color={sc.cond(piSummary.curPI >= piSummary.prevPI)}>
              {piSummary.curPI.toFixed(1)}点
            </PiItem>
          </span>
          <span>
            点単価: {fmtCurrency(Math.round(piSummary.prevPPI))}→{' '}
            <PiItem $color={sc.cond(piSummary.curPPI >= piSummary.prevPPI)}>
              {fmtCurrency(Math.round(piSummary.curPPI))}
            </PiItem>
          </span>
        </PiRow>
      )}

      {viewMode === 'categoryFactor' ? (
        <CategoryFactorBreakdown
          curRecords={dayRecords}
          prevRecords={prevDayRecords}
          curCustomers={dayCust}
          prevCustomers={pyCust}
          curLabel={curLabel}
          prevLabel={prevLabel}
          compact
        />
      ) : (
        <DrilldownWaterfallEChart
          data={data}
          colors={colors}
          theme={theme}
          fmt={fmt}
          fmtCurrency={fmtCurrency}
        />
      )}
    </Section>
  )
}

/** Inner EChart component for the waterfall rendering */
function DrilldownWaterfallEChart({
  data,
  colors,
  theme,
  fmt,
  fmtCurrency,
}: {
  data: WaterfallItem[]
  colors: { positive: string; negative: string; total: string }
  theme: AppTheme
  fmt: (v: number) => string
  fmtCurrency: (v: number | null) => string
}) {
  const option = useMemo((): EChartsOption => {
    const names = data.map((d) => d.name)
    const needsRotation = data.length > 5
    return {
      grid: {
        ...standardGrid(),
        top: 24,
        bottom: needsRotation ? 50 : 25,
        left: 12,
        right: 12,
      },
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'axis' as const,
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params]
          const p =
            (arr as { dataIndex: number; seriesIndex?: number }[]).find(
              (s) => s.seriesIndex === 1,
            ) ?? (arr[0] as { dataIndex: number } | undefined)
          if (!p) return ''
          const item = data[p.dataIndex]
          if (!item) return ''
          return `${item.name}<br/>${fmtCurrency(item.value)}`
        },
      },
      xAxis: {
        type: 'category' as const,
        data: names,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: 9,
          fontFamily: theme.typography.fontFamily.primary,
          rotate: needsRotation ? -25 : 0,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
        axisTick: { show: false },
      },
      yAxis: yenYAxis(theme),
      series: [
        // 透明ベース（ウォーターフォールの浮遊バー効果）
        {
          type: 'bar' as const,
          stack: 'wf',
          data: data.map((d) => d.base),
          itemStyle: { color: 'transparent', borderColor: 'transparent' },
          emphasis: { disabled: true },
          barWidth: '60%',
        },
        // 表示バー
        {
          type: 'bar' as const,
          stack: 'wf',
          data: data.map((d) => {
            const color = d.isTotal
              ? colors.total
              : d.value >= 0
                ? colors.positive
                : colors.negative
            return {
              value: d.bar,
              itemStyle: { color, opacity: 0.85 },
            }
          }),
          barWidth: '60%',
          label: {
            show: true,
            position: 'top' as const,
            formatter: (params: unknown) => {
              const p = params as { dataIndex: number }
              const item = data[p.dataIndex]
              return item ? fmt(item.value) : ''
            },
            fontSize: 9,
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamily.mono,
          },
        },
      ],
    }
  }, [data, theme, colors, fmt, fmtCurrency])

  return <EChart option={option} height={240} ariaLabel="ドリルダウンウォーターフォールチャート" />
}
