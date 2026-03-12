import { toPct, toComma } from './chartTheme'
import { safeDivide, getEffectiveGrossProfitRate } from '@/domain/calculations/utils'
import type { StoreResult } from '@/domain/models'

// ── Types ──

export type DrillTarget =
  | 'grossSales'
  | 'totalSales'
  | 'cost'
  | 'discount'
  | 'costInclusion'
  | 'gpInv'
  | 'gpEst'
  | 'budget'
  | null

export interface DrillConfig {
  readonly title: string
  readonly color: string
  readonly getValue: (day: number, r: StoreResult) => number
  readonly formatValue: (v: number) => string
  readonly suffix?: string
}

export interface Props {
  result: StoreResult
  prevYearResult?: StoreResult
}

export interface NodeData {
  readonly value: number | null
  readonly yoy?: number | null
}

export interface NodesViewModel {
  readonly grossSales: NodeData
  readonly totalSales: NodeData
  readonly cost: NodeData
  readonly discount: NodeData
  readonly costInclusion: NodeData
  readonly gpInv: NodeData
  readonly gpEst: NodeData
  readonly budget: { readonly value: number }
  readonly discountRate: number
  readonly gpRateInv: number | null
  readonly gpRateEst: number
  readonly markupRate: number
}

export interface DrillDataResult {
  readonly days: ReadonlyArray<{ day: number; value: number; dow: number }>
  readonly config: DrillConfig
  readonly max: number
  readonly total: number
  readonly avg: number
  readonly maxDay: number
  readonly minDay: number
  readonly isMonthlyOnly: boolean
  readonly isBudget?: boolean
}

export interface BudgetDrillViewModel {
  readonly salesDays: number
  readonly budget: number
  readonly actualGp: number
  readonly remaining: number
  readonly achievement: number
}

export interface CumDataRow {
  readonly day: number
  readonly cumSales: number
  readonly cumBudget: number
}

export const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

// ── Formatting ──

export function fmtMan(v: number | null | undefined): string {
  if (v == null) return '-'
  return `${Math.round(v / 10000).toLocaleString()}万`
}

export function fmtSen(v: number): string {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}万`
  return toComma(Math.round(v))
}

// ── YoY ──

function yoy(cur: number, prevVal: number | undefined): number | null {
  if (prevVal == null || prevVal === 0) return null
  return cur / prevVal
}

// ── Nodes computation ──

export function computeNodes(r: StoreResult, prev: StoreResult | undefined): NodesViewModel {
  const grossSales = r.grossSales
  const totalSales = r.totalSales
  const totalCost = r.inventoryCost + r.deliverySalesCost
  const discount = r.totalDiscount
  const costInclusion = r.totalCostInclusion
  const gpInv = r.invMethodGrossProfit
  const gpEst = r.estMethodMargin
  const budget = r.grossProfitBudget

  return {
    grossSales: { value: grossSales, yoy: yoy(grossSales, prev?.grossSales) },
    totalSales: { value: totalSales, yoy: yoy(totalSales, prev?.totalSales) },
    cost: {
      value: totalCost,
      yoy: yoy(totalCost, prev ? prev.inventoryCost + prev.deliverySalesCost : undefined),
    },
    discount: { value: discount, yoy: yoy(discount, prev?.totalDiscount) },
    costInclusion: { value: costInclusion, yoy: yoy(costInclusion, prev?.totalCostInclusion) },
    gpInv: {
      value: gpInv,
      yoy:
        gpInv != null && prev?.invMethodGrossProfit != null
          ? yoy(gpInv, prev.invMethodGrossProfit)
          : null,
    },
    gpEst: { value: gpEst, yoy: yoy(gpEst, prev?.estMethodMargin) },
    budget: { value: budget },
    discountRate: r.discountRate,
    gpRateInv: r.invMethodGrossProfitRate,
    gpRateEst: r.estMethodMarginRate,
    markupRate: r.coreMarkupRate,
  }
}

// ── Node height (relative to grossSales as 100) ──

export function nodeHeight(value: number | null | undefined, base: number): number {
  return Math.round(((value ?? 0) / base) * 160)
}

export function getBase(nodes: NodesViewModel): number {
  return (nodes.grossSales.value as number) || 1
}

// ── Drill configs ──

export interface DrillColorMap {
  readonly grossSales: string
  readonly totalSales: string
  readonly cost: string
  readonly discount: string
  readonly costInclusion: string
  readonly gpInv: string
  readonly gpEst: string
  readonly budget: string
}

export function buildDrillConfigs(
  r: StoreResult,
  colors: DrillColorMap,
): Record<Exclude<DrillTarget, null>, DrillConfig> {
  return {
    grossSales: {
      title: '粗売上 — 日別内訳',
      color: colors.grossSales,
      getValue: (day) => {
        const d = r.daily.get(day)
        return d ? d.grossSales : 0
      },
      formatValue: fmtSen,
    },
    totalSales: {
      title: '純売上 — 日別内訳',
      color: colors.totalSales,
      getValue: (day) => {
        const d = r.daily.get(day)
        return d ? d.sales : 0
      },
      formatValue: fmtSen,
    },
    cost: {
      title: '仕入原価 — 日別内訳',
      color: colors.cost,
      getValue: (day) => {
        const d = r.daily.get(day)
        return d ? d.totalCost : 0
      },
      formatValue: fmtSen,
    },
    discount: {
      title: '売変額 — 日別内訳',
      color: colors.discount,
      getValue: (day) => {
        const d = r.daily.get(day)
        return d ? d.discountAbsolute : 0
      },
      formatValue: fmtSen,
    },
    costInclusion: {
      title: '原価算入費 — 日別内訳',
      color: colors.costInclusion,
      getValue: (day) => {
        const d = r.daily.get(day)
        return d ? d.costInclusion.cost : 0
      },
      formatValue: fmtSen,
    },
    gpInv: {
      title: '粗利（在庫法）— 月次集計',
      color: colors.gpInv,
      getValue: () => r.invMethodGrossProfit ?? 0,
      formatValue: fmtSen,
    },
    gpEst: {
      title: '推定粗利 — 日別内訳（売上 - 仕入原価）',
      color: colors.gpEst,
      getValue: (day) => {
        const d = r.daily.get(day)
        if (!d) return 0
        return d.sales - d.totalCost
      },
      formatValue: fmtSen,
    },
    budget: {
      title: '粗利予算 — 進捗推移',
      color: colors.budget,
      getValue: (day) => {
        const cum = r.dailyCumulative.get(day)
        return cum ? cum.sales : 0
      },
      formatValue: fmtSen,
    },
  }
}

// ── Drill data computation ──

export function computeDrillData(
  drillTarget: DrillTarget,
  drillConfigs: Record<Exclude<DrillTarget, null>, DrillConfig>,
  r: StoreResult,
): DrillDataResult | null {
  if (!drillTarget) return null
  const config = drillConfigs[drillTarget]
  const days: { day: number; value: number; dow: number }[] = []
  let maxVal = 0
  let totalVal = 0
  let maxDay = 0
  let minDay = 0
  let minVal = Infinity
  let maxDayVal = -Infinity
  const salesDays = r.salesDays || r.elapsedDays

  // 在庫法粗利は月次のみ → 日別なし
  if (drillTarget === 'gpInv') {
    return {
      days: [],
      config,
      max: 0,
      total: r.invMethodGrossProfit ?? 0,
      avg: r.invMethodGrossProfit ?? 0,
      maxDay: 0,
      minDay: 0,
      isMonthlyOnly: true,
    }
  }

  // 予算進捗
  if (drillTarget === 'budget') {
    let cumSales = 0
    for (let d = 1; d <= salesDays; d++) {
      const rec = r.daily.get(d)
      const sales = rec?.sales ?? 0
      cumSales += sales
      const budgetCum = r.dailyCumulative.get(d)?.budget ?? 0
      days.push({
        day: d,
        value: cumSales,
        dow: new Date(2026, 0, d).getDay(), // placeholder
      })
      if (budgetCum > maxVal) maxVal = budgetCum
      if (cumSales > maxVal) maxVal = cumSales
    }
    return {
      days,
      config,
      max: maxVal,
      total: r.grossProfitBudget,
      avg: 0,
      maxDay: 0,
      minDay: 0,
      isMonthlyOnly: false,
      isBudget: true,
    }
  }

  for (let d = 1; d <= salesDays; d++) {
    const val = config.getValue(d, r)
    if (val === 0 && !r.daily.has(d)) continue
    const date = new Date(2026, 0, d) // dow placeholder, actual month not critical for dow
    days.push({ day: d, value: val, dow: date.getDay() })
    totalVal += val
    if (val > maxVal) maxVal = val
    if (val > maxDayVal) {
      maxDayVal = val
      maxDay = d
    }
    if (val < minVal) {
      minVal = val
      minDay = d
    }
  }

  return {
    days,
    config,
    max: maxVal,
    total: totalVal,
    avg: days.length > 0 ? totalVal / days.length : 0,
    maxDay,
    minDay,
    isMonthlyOnly: false,
  }
}

// ── Summary card text ──

export function salesCompositionText(nodes: NodesViewModel): string {
  const costRatio = toPct(
    safeDivide(nodes.cost.value as number, nodes.grossSales.value as number, 0),
  )
  const discountRatio = toPct(nodes.discountRate)
  const costInclusionRatio = toPct(
    safeDivide(nodes.costInclusion.value as number, nodes.totalSales.value as number, 0),
  )
  return `原価 ${costRatio} / 売変 ${discountRatio} / 消耗品 ${costInclusionRatio}`
}

export function gpRateTrendText(nodes: NodesViewModel): string {
  if (nodes.gpRateInv != null) {
    return `在庫法: ${toPct(nodes.gpRateInv)}`
  }
  return `推定法（在庫差分率）: ${toPct(nodes.gpRateEst)}`
}

export function shouldShowPrevYearBadge(prev: StoreResult | undefined): boolean {
  if (!prev) return false
  return prev.invMethodGrossProfitRate != null || prev.estMethodMarginRate > 0
}

export function prevYearGpRateIsPositive(r: StoreResult, prev: StoreResult): boolean {
  return getEffectiveGrossProfitRate(r) >= getEffectiveGrossProfitRate(prev)
}

export function prevYearGpRateText(prev: StoreResult): string {
  return `前年 ${toPct(getEffectiveGrossProfitRate(prev))}`
}

// ── Node display helpers ──

export function grossSalesSubText(nodes: NodesViewModel): string {
  return `${toComma(nodes.grossSales.value as number)}円`
}

export function totalSalesSubText(nodes: NodesViewModel): string {
  return `粗売上の${toPct(safeDivide(nodes.totalSales.value as number, nodes.grossSales.value as number, 0))}`
}

export function costSubText(nodes: NodesViewModel): string {
  return `値入率 ${toPct(nodes.markupRate)}`
}

export function discountSubText(nodes: NodesViewModel): string {
  return `売変率 ${toPct(nodes.discountRate)}`
}

export function gpInvSubText(nodes: NodesViewModel): string {
  return nodes.gpRateInv != null ? `粗利率 ${toPct(nodes.gpRateInv)}` : '粗利率 -'
}

export function gpEstSubText(nodes: NodesViewModel): string {
  return `在庫差分率 ${toPct(nodes.gpRateEst)}`
}

export function budgetRemainingText(nodes: NodesViewModel): string {
  return fmtMan(
    (nodes.budget.value as number) -
      ((nodes.gpInv.value as number) ?? (nodes.gpEst.value as number)),
  )
}

// ── Drill through target mapping ──

export function getDrillThroughWidgetId(
  drillTarget: Exclude<DrillTarget, null | 'gpInv' | 'budget'>,
): string | null {
  switch (drillTarget) {
    case 'discount':
      return 'discount-trend'
    case 'gpEst':
      return 'gross-profit-rate'
    case 'cost':
      return 'daily-sales'
    default:
      return null
  }
}

export function getDrillThroughLabel(
  drillTarget: Exclude<DrillTarget, null | 'gpInv' | 'budget'>,
): string {
  switch (drillTarget) {
    case 'discount':
      return '売変内訳分析を表示'
    case 'gpEst':
      return '粗利率推移チャートを表示'
    case 'cost':
      return '日別売上チャートを表示'
    default:
      return ''
  }
}

// ── Budget drill view model ──

export function computeBudgetDrillVm(
  nodes: NodesViewModel,
  result: StoreResult,
): BudgetDrillViewModel {
  const salesDays = result.salesDays || result.elapsedDays
  const budget = nodes.budget.value
  const actualGp = (nodes.gpInv.value as number) ?? (nodes.gpEst.value as number)
  const remaining = budget - actualGp
  const achievement = budget > 0 ? actualGp / budget : 0
  return { salesDays, budget, actualGp, remaining, achievement }
}

export function computeCumData(result: StoreResult, salesDays: number): CumDataRow[] {
  const rows: CumDataRow[] = []
  let cumS = 0
  for (let d = 1; d <= salesDays; d++) {
    const rec = result.daily.get(d)
    cumS += rec?.sales ?? 0
    const cumB = result.dailyCumulative.get(d)?.budget ?? 0
    rows.push({ day: d, cumSales: cumS, cumBudget: cumB })
  }
  return rows
}

export function computeCumDataMax(cumData: ReadonlyArray<CumDataRow>): number {
  return Math.max(...cumData.map((d) => Math.max(d.cumSales, d.cumBudget)), 1)
}
