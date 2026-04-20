/**
 * FactorDecompositionPanel — 客数選択時の日別要因分解チャート
 *
 * 日別の売上差を2要素（客数効果・客単価効果）または
 * 3要素（客数効果・点数効果・商品単価効果）に分解し、
 * 積み上げ棒グラフ（ダイバージング・スタック）で表示する。
 *
 * データソース: DuckDB store_day_summary（当期 + 前年）。
 * @responsibility R:chart-view
 */
/**
 * @migration P5: plan hook 経由に移行済み（旧: useDuckDBStoreDaySummary 直接 import）
 */
import { useState, useMemo, memo } from 'react'
import styled, { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { buildPairedQueryInput } from '@/application/hooks/plans/buildPairedQueryInput'
import { useFactorDecompositionPlan } from '@/application/hooks/plans/useFactorDecompositionPlan'
import type { DuckQueryContext } from './SubAnalysisPanel'
import { decompose2, decompose3 } from '@/application/services/factorDecompositionBridge'
import { EChart, type EChartsOption } from './EChart'
import { standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { categoryXAxis, yenYAxis } from './echartsOptionBuilders'
import { lineDefaults } from './builders'
import { toAxisYen } from './chartTheme'

type DecompLevel = 2 | 3

export interface DailyDecomp {
  readonly day: number
  readonly factors: readonly { readonly name: string; readonly value: number }[]
  readonly diff: number
  readonly cumDiff: number
}

/** 日別集約データ */
export interface DayAgg {
  sales: number
  customers: number
  totalQty: number
}

export function aggregateByDay(
  rows: readonly { day: number; sales: number; customers: number; totalQuantity: number }[],
): Map<number, DayAgg> {
  const m = new Map<number, DayAgg>()
  for (const r of rows) {
    const e = m.get(r.day) ?? { sales: 0, customers: 0, totalQty: 0 }
    e.sales += r.sales
    e.customers += r.customers
    e.totalQty += r.totalQuantity
    m.set(r.day, e)
  }
  return m
}

export function buildDailyDecomp(
  curRows: readonly { day: number; sales: number; customers: number; totalQuantity: number }[],
  prevRows: readonly { day: number; sales: number; customers: number; totalQuantity: number }[],
  level: DecompLevel,
): readonly DailyDecomp[] {
  const cur = aggregateByDay(curRows)
  const prev = aggregateByDay(prevRows)
  const allDays = new Set([...cur.keys(), ...prev.keys()])
  const sorted = [...allDays].sort((a, b) => a - b)

  let cumDiff = 0
  return sorted
    .filter((day) => {
      const c = cur.get(day)
      return c != null && c.sales > 0
    })
    .map((day) => {
      const c = cur.get(day) ?? { sales: 0, customers: 0, totalQty: 0 }
      const p = prev.get(day) ?? { sales: 0, customers: 0, totalQty: 0 }
      const diff = c.sales - p.sales
      cumDiff += diff

      if (level === 3 && c.totalQty > 0 && p.totalQty > 0) {
        const d3 = decompose3(p.sales, c.sales, p.customers, c.customers, p.totalQty, c.totalQty)
        return {
          day,
          factors: [
            { name: '客数効果', value: d3.custEffect },
            { name: '点数効果', value: d3.qtyEffect },
            { name: '商品単価効果', value: d3.pricePerItemEffect },
          ],
          diff,
          cumDiff,
        }
      }

      const d2 = decompose2(p.sales, c.sales, p.customers, c.customers)
      return {
        day,
        factors: [
          { name: '客数効果', value: d2.custEffect },
          { name: '客単価効果', value: d2.ticketEffect },
        ],
        diff,
        cumDiff,
      }
    })
}

const FACTOR_COLORS_2 = ['primary', 'orange'] as const
const FACTOR_COLORS_3 = ['primary', 'cyan', 'orange'] as const
const FACTOR_NAMES_2 = ['客数効果', '客単価効果'] as const
const FACTOR_NAMES_3 = ['客数効果', '点数効果', '商品単価効果'] as const

interface Props {
  readonly ctx: DuckQueryContext
}

export const FactorDecompositionPanel = memo(function FactorDecompositionPanel({ ctx }: Props) {
  const { queryExecutor, currentDateRange, selectedStoreIds, prevYearScope } = ctx
  const theme = useTheme() as AppTheme
  const [level, setLevel] = useState<DecompLevel>(2)

  // Phase 5 横展開 第 2 バッチ: PairedQueryInput 組み立ては共通 builder に集約
  const prevDateRange = prevYearScope?.dateRange
  const pairInput = useMemo(
    () => buildPairedQueryInput(currentDateRange, prevDateRange, selectedStoreIds),
    [currentDateRange, prevDateRange, selectedStoreIds],
  )

  const { data: pairOutput } = useFactorDecompositionPlan(queryExecutor, pairInput)
  const curRows = pairOutput?.current?.records ?? null
  const prevRows = pairOutput?.comparison?.records ?? null

  // 3要素が使用可能か（点数データの存在確認）
  const hasQuantity = useMemo(() => {
    if (!curRows || !prevRows) return false
    return curRows.some((r) => r.totalQuantity > 0) && prevRows.some((r) => r.totalQuantity > 0)
  }, [curRows, prevRows])

  const activeLevel: DecompLevel = level === 3 && hasQuantity ? 3 : 2

  const dailyDecomp = useMemo(() => {
    if (!curRows || !prevRows) return []
    return buildDailyDecomp(curRows, prevRows, activeLevel)
  }, [curRows, prevRows, activeLevel])

  const factorNames = activeLevel === 3 ? FACTOR_NAMES_3 : FACTOR_NAMES_2
  const factorColorKeys = activeLevel === 3 ? FACTOR_COLORS_3 : FACTOR_COLORS_2

  const option = useMemo<EChartsOption>(() => {
    const days = dailyDecomp.map((d) => String(d.day))
    const palette = theme.colors.palette

    const series: EChartsOption['series'] = factorNames.map((name, i) => ({
      name,
      type: 'bar' as const,
      stack: 'decomp',
      data: dailyDecomp.map((d) => {
        const f = d.factors.find((ff) => ff.name === name)
        return f?.value ?? 0
      }),
      itemStyle: {
        color: palette[factorColorKeys[i]],
        opacity: 0.75,
        borderRadius: [2, 2, 0, 0],
      },
      barMaxWidth: 16,
    }))

    // 累計差額ライン
    series.push({
      name: '累計差額',
      type: 'line' as const,
      data: dailyDecomp.map((d) => d.cumDiff),
      ...lineDefaults({ color: theme.colors.text2, width: 1.5, dashed: true }),
      connectNulls: true,
    })

    return {
      grid: { ...standardGrid(), top: 30, bottom: 30 },
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'axis',
        formatter: (params: unknown) => {
          const items = params as {
            seriesName: string
            value: number | null
            marker: string
          }[]
          if (!Array.isArray(items) || items.length === 0) return ''
          const dayLabel = (items[0] as unknown as { name: string }).name
          const header = `<div style="font-weight:600;margin-bottom:4px">${dayLabel}日</div>`
          const lines = items
            .filter((it) => it.value != null)
            .map((it) => {
              const val = toAxisYen(it.value as number)
              const sign = (it.value as number) >= 0 ? '+' : ''
              return (
                `<div style="display:flex;justify-content:space-between;gap:12px">` +
                `${it.marker}<span>${it.seriesName}</span>` +
                `<span style="font-weight:600;font-family:monospace">${sign}${val}</span></div>`
              )
            })
            .join('')
          return header + lines
        },
      },
      legend: standardLegend(theme),
      xAxis: categoryXAxis(days, theme),
      yAxis: yenYAxis(theme) as Record<string, unknown>,
      series,
    }
  }, [dailyDecomp, factorNames, factorColorKeys, theme])

  if (dailyDecomp.length === 0) {
    return <NoData>比較データがありません</NoData>
  }

  // サマリー KPI
  const totals = factorNames.map((name) => ({
    name,
    total: dailyDecomp.reduce(
      (s, d) => s + (d.factors.find((f) => f.name === name)?.value ?? 0),
      0,
    ),
  }))
  const totalDiff = totals.reduce((s, t) => s + t.total, 0)

  return (
    <PanelRoot>
      <TopRow>
        <KpiRow>
          <KpiItem>
            <KpiLabel>売上差合計</KpiLabel>
            <KpiValue $positive={totalDiff >= 0}>
              {totalDiff >= 0 ? '+' : ''}
              {toAxisYen(totalDiff)}
            </KpiValue>
          </KpiItem>
          {totals.map((t, i) => (
            <KpiItem key={t.name}>
              <KpiDot $color={theme.colors.palette[factorColorKeys[i]]} />
              <KpiLabel>{t.name}</KpiLabel>
              <KpiValue $positive={t.total >= 0}>
                {t.total >= 0 ? '+' : ''}
                {toAxisYen(t.total)}
              </KpiValue>
            </KpiItem>
          ))}
        </KpiRow>
        {hasQuantity && (
          <LevelToggle>
            <LevelBtn $active={activeLevel === 2} onClick={() => setLevel(2)}>
              2要素
            </LevelBtn>
            <LevelBtn $active={activeLevel === 3} onClick={() => setLevel(3)}>
              3要素
            </LevelBtn>
          </LevelToggle>
        )}
      </TopRow>

      <EChart option={option} height={240} ariaLabel="日別要因分解チャート" />
    </PanelRoot>
  )
})

// ── Styles ──

const NoData = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.text4};
  padding: ${({ theme }) => theme.spacing[4]};
  font-size: 0.75rem;
`

const PanelRoot = styled.div`
  padding: ${({ theme }) => `${theme.spacing[1]} 0`};
`

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
`

const KpiRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`

const KpiItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`

const KpiDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const KpiLabel = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
`

const KpiValue = styled.span<{ $positive: boolean }>`
  font-size: 0.7rem;
  font-weight: 600;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme, $positive }) =>
    $positive ? theme.colors.palette.success : theme.colors.palette.danger};
`

const LevelToggle = styled.div`
  display: flex;
  gap: 2px;
`

const LevelBtn = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  padding: 2px 8px;
  font-size: 0.6rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? theme.interactive.activeBg : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  transition: all 0.15s;

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  }
`
