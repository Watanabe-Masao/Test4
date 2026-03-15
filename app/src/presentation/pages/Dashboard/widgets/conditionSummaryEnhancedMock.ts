/**
 * コンディションサマリー強化版 — モックデータ
 * 実データ統合時に置き換え予定
 */

// ─── 型定義 ──────────────────────────────────────────────

export interface StoreMetrics {
  readonly salesBudget: number
  readonly salesActual: number
  readonly salesLY: number
  readonly gpBudget: number
  readonly gpActual: number
  readonly gpLY: number
  readonly gpRateBudget: number
  readonly gpRateActual: number
  readonly gpRateLY: number
}

export type MetricKey = 'sales' | 'gp' | 'gpRate'

export interface MetricConfig {
  readonly label: string
  readonly icon: string
  readonly color: string
  readonly isRate: boolean
  readonly getBudget: (d: StoreMetrics) => number
  readonly getActual: (d: StoreMetrics) => number
  readonly getLY: (d: StoreMetrics) => number
}

export interface StoreRow {
  readonly store: string
  readonly budget: number
  readonly actual: number
  readonly ly: number
  readonly ach: number
  readonly diff: number
  readonly yoy: number
}

// ─── 定数 ───────────────────────────────────────────────

export const STORES = ['01店', '07店', '24店'] as const
export const TOTAL_DAYS = 28
export const ELAPSED_DAYS = 20

// ─── 日別売上予算（28日間 × 3店舗）────────────────────

const DAILY_SALES_BUDGET: Record<string, readonly number[]> = {
  '01店': [
    95, 88, 102, 110, 115, 130, 135, 92, 85, 100, 108, 112, 128, 132, 90, 87, 98, 106, 110, 125,
    130, 88, 84, 96, 104, 108, 122, 128,
  ],
  '07店': [
    140, 130, 150, 158, 165, 185, 192, 135, 128, 148, 155, 162, 180, 188, 132, 125, 145, 152, 160,
    178, 185, 130, 122, 142, 150, 158, 175, 182,
  ],
  '24店': [
    105, 98, 112, 118, 122, 140, 145, 100, 95, 110, 115, 120, 136, 142, 98, 93, 108, 113, 118, 134,
    138, 96, 90, 105, 110, 115, 130, 135,
  ],
}

const GP_RATE_BUDGET: Record<string, number> = {
  '01店': 0.15,
  '07店': 0.18,
  '24店': 0.16,
}

// ─── 疑似乱数ベースの実績生成 ──────────────────────────

function seed(i: number): number {
  return Math.sin(i * 7.3 + 2.1) * 0.5 + 0.5
}

function generateDailyActuals(): {
  salesActual: Record<string, readonly number[]>
  gpRateActual: Record<string, readonly number[]>
  salesLY: Record<string, readonly number[]>
  gpRateLY: Record<string, readonly number[]>
} {
  const salesActual: Record<string, number[]> = {}
  const gpRateActual: Record<string, number[]> = {}
  const salesLY: Record<string, number[]> = {}
  const gpRateLY: Record<string, number[]> = {}

  for (const store of STORES) {
    const budgetRate = GP_RATE_BUDGET[store]
    const budget = DAILY_SALES_BUDGET[store]

    salesActual[store] = budget.map((b, i) => {
      const variance = 0.92 + seed(i + store.charCodeAt(0)) * 0.16
      return Math.round(b * variance)
    })
    gpRateActual[store] = budget.map((_, i) => {
      const variance = -0.015 + seed(i * 3 + store.charCodeAt(1)) * 0.03
      return budgetRate + variance
    })
    salesLY[store] = budget.map((b, i) => {
      const variance = 0.88 + seed(i * 2 + store.charCodeAt(0) + 50) * 0.14
      return Math.round(b * variance)
    })
    gpRateLY[store] = budget.map((_, i) => {
      const variance = -0.02 + seed(i * 5 + store.charCodeAt(1) + 30) * 0.03
      return budgetRate + variance
    })
  }

  return { salesActual, gpRateActual, salesLY, gpRateLY }
}

const { salesActual, gpRateActual, salesLY, gpRateLY } = generateDailyActuals()

// ─── 集計関数 ──────────────────────────────────────────

export function aggregate(days: number): Record<string, StoreMetrics> {
  const result: Record<string, StoreMetrics> = {}

  for (const store of STORES) {
    const sBudget = DAILY_SALES_BUDGET[store].slice(0, days).reduce((a, b) => a + b, 0)
    const sActual = salesActual[store].slice(0, days).reduce((a, b) => a + b, 0)
    const sLY = salesLY[store].slice(0, days).reduce((a, b) => a + b, 0)

    const gpRateBudgetVal = GP_RATE_BUDGET[store]
    const gpBudgetVal = Math.round(sBudget * gpRateBudgetVal * 10) / 10

    let gpActualVal = 0
    for (let i = 0; i < days; i++) {
      gpActualVal += salesActual[store][i] * gpRateActual[store][i]
    }
    gpActualVal = Math.round(gpActualVal * 10) / 10

    let gpLYVal = 0
    for (let i = 0; i < days; i++) {
      gpLYVal += salesLY[store][i] * gpRateLY[store][i]
    }
    gpLYVal = Math.round(gpLYVal * 10) / 10

    result[store] = {
      salesBudget: sBudget,
      salesActual: sActual,
      salesLY: sLY,
      gpBudget: gpBudgetVal,
      gpActual: gpActualVal,
      gpLY: gpLYVal,
      gpRateBudget: gpRateBudgetVal * 100,
      gpRateActual: sActual > 0 ? (gpActualVal / sActual) * 100 : 0,
      gpRateLY: sLY > 0 ? (gpLYVal / sLY) * 100 : 0,
    }
  }

  // 全店合計
  const totSB = STORES.reduce((s, st) => s + result[st].salesBudget, 0)
  const totSA = STORES.reduce((s, st) => s + result[st].salesActual, 0)
  const totSL = STORES.reduce((s, st) => s + result[st].salesLY, 0)
  const totGB = STORES.reduce((s, st) => s + result[st].gpBudget, 0)
  const totGA = STORES.reduce((s, st) => s + result[st].gpActual, 0)
  const totGL = STORES.reduce((s, st) => s + result[st].gpLY, 0)

  result._total = {
    salesBudget: totSB,
    salesActual: totSA,
    salesLY: totSL,
    gpBudget: Math.round(totGB * 10) / 10,
    gpActual: Math.round(totGA * 10) / 10,
    gpLY: Math.round(totGL * 10) / 10,
    gpRateBudget: totSB > 0 ? (totGB / totSB) * 100 : 0,
    gpRateActual: totSA > 0 ? (totGA / totSA) * 100 : 0,
    gpRateLY: totSL > 0 ? (totGL / totSL) * 100 : 0,
  }

  return result
}

export const MONTHLY = aggregate(TOTAL_DAYS)
export const ELAPSED = aggregate(ELAPSED_DAYS)

// ─── Metric 設定 ────────────────────────────────────────

export const METRICS: Record<MetricKey, MetricConfig> = {
  sales: {
    label: '売上',
    icon: '📊',
    color: '#3b82f6',
    isRate: false,
    getBudget: (d) => d.salesBudget,
    getActual: (d) => d.salesActual,
    getLY: (d) => d.salesLY,
  },
  gp: {
    label: '粗利額',
    icon: '💰',
    color: '#8b5cf6',
    isRate: false,
    getBudget: (d) => d.gpBudget,
    getActual: (d) => d.gpActual,
    getLY: (d) => d.gpLY,
  },
  gpRate: {
    label: '粗利率',
    icon: '📈',
    color: '#06b6d4',
    isRate: true,
    getBudget: (d) => d.gpRateBudget,
    getActual: (d) => d.gpRateActual,
    getLY: (d) => d.gpRateLY,
  },
}

// ─── フォーマッタ ───────────────────────────────────────

export function fmtValue(n: number, isRate: boolean): string {
  if (isRate) return `${n.toFixed(2)}%`
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

export function fmtResult(val: number, isRate: boolean): string {
  if (isRate) return `${val >= 0 ? '+' : ''}${val.toFixed(2)}pp`
  return `${val.toFixed(1)}%`
}

// ─── シグナル判定 ───────────────────────────────────────

export function achievementColor(val: number): string {
  if (val >= 100) return '#10b981'
  if (val >= 97) return '#eab308'
  return '#ef4444'
}

export function rateDiffColor(val: number): string {
  if (val >= 0) return '#10b981'
  if (val >= -0.5) return '#eab308'
  return '#ef4444'
}

export function resultColor(val: number, isRate: boolean): string {
  return isRate ? rateDiffColor(val) : achievementColor(val)
}

// ─── 粗利率予算（店舗別） ──────────────────────────────

export { GP_RATE_BUDGET }

// ─── 行データ計算 ───────────────────────────────────────

export function computeRow(
  store: string,
  dataset: Record<string, StoreMetrics>,
  m: MetricConfig,
): StoreRow {
  const d = dataset[store]
  const budget = m.getBudget(d)
  const actual = m.getActual(d)
  const ly = m.getLY(d)
  const ach = m.isRate ? actual - budget : (actual / budget) * 100
  const diff = actual - budget
  const yoy = m.isRate ? actual - ly : (actual / ly) * 100
  return { store, budget, actual, ly, ach, diff, yoy }
}

export function computeTotal(
  dataset: Record<string, StoreMetrics>,
  m: MetricConfig,
): Omit<StoreRow, 'store'> {
  const d = dataset._total
  const budget = m.getBudget(d)
  const actual = m.getActual(d)
  const ly = m.getLY(d)
  const ach = m.isRate ? actual - budget : (actual / budget) * 100
  const diff = actual - budget
  const yoy = m.isRate ? actual - ly : (actual / ly) * 100
  return { budget, actual, ly, ach, diff, yoy }
}
