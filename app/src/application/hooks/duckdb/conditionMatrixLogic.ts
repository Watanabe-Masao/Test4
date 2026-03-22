/**
 * コンディションマトリクス算出ロジック（純粋関数）
 *
 * useConditionMatrix から抽出。ConditionMatrixRow[] を
 * 5期間比較マトリクスに変換する純粋関数群。
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 */
import type { ConditionMatrixRow } from '@/infrastructure/duckdb'

/** マトリクスセル: 比率 + シグナル判定用の実値 */
export interface MatrixCell {
  /** 比率（1.0 = 変化なし、> 1 = 増加、< 1 = 減少）。比較不能時は null */
  readonly ratio: number | null
  readonly current: number
  readonly comparison: number
}

/** 1行分のマトリクスデータ（全指標列を持つ） */
export interface MatrixRowData {
  readonly label: string
  readonly sales: MatrixCell
  readonly quantity: MatrixCell
  readonly customers: MatrixCell
  readonly txValue: MatrixCell
  readonly discountRate: MatrixCell
  readonly totalCost: MatrixCell
}

/** トレンド方向 */
export type TrendDirection = 'up' | 'down' | 'flat'

/** トレンド方向セル */
export interface TrendDirectionCell {
  readonly direction: TrendDirection
  readonly ratio: number | null
}

/** トレンド方向行 */
export interface TrendDirectionRow {
  readonly label: string
  readonly sales: TrendDirectionCell
  readonly quantity: TrendDirectionCell
  readonly customers: TrendDirectionCell
  readonly txValue: TrendDirectionCell
  readonly discountRate: TrendDirectionCell
  readonly totalCost: TrendDirectionCell
}

/** 全体のマトリクス結果 */
export interface ConditionMatrixResult {
  readonly yoy: MatrixRowData
  readonly wow: MatrixRowData
  readonly trendRatio: MatrixRowData
  readonly trendDirection: TrendDirectionRow
  /** トレンドの各半期間の日数（曜日バイアス警告判定用） */
  readonly trendHalfDays: number
}

// ── ヘルパー ──

function cell(cur: number, prev: number): MatrixCell {
  return {
    ratio: prev > 0 ? cur / prev : null,
    current: cur,
    comparison: prev,
  }
}

function rateCell(curRate: number, prevRate: number): MatrixCell {
  return {
    ratio: prevRate > 0 ? curRate / prevRate : null,
    current: curRate,
    comparison: prevRate,
  }
}

function txValue(sales: number, customers: number): number {
  return customers > 0 ? sales / customers : 0
}

interface PeriodMetricsLocal {
  readonly sales: number
  readonly quantity: number
  readonly customers: number
  readonly discountRate: number
  readonly totalCost: number
}

function buildRow(label: string, cur: PeriodMetricsLocal, prev: PeriodMetricsLocal): MatrixRowData {
  return {
    label,
    sales: cell(cur.sales, prev.sales),
    quantity: cell(cur.quantity, prev.quantity),
    customers: cell(cur.customers, prev.customers),
    txValue: cell(txValue(cur.sales, cur.customers), txValue(prev.sales, prev.customers)),
    discountRate: rateCell(cur.discountRate, prev.discountRate),
    totalCost: cell(cur.totalCost, prev.totalCost),
  }
}

export function avgMetrics(
  rows: readonly ConditionMatrixRow[],
  period: 'cur' | 'py' | 'pw' | 'tr' | 'tp',
): PeriodMetricsLocal {
  if (rows.length === 0) {
    return { sales: 0, quantity: 0, customers: 0, discountRate: 0, totalCost: 0 }
  }
  const totalSales = rows.reduce((s, r) => s + r[`${period}Sales`], 0)
  const totalCustomers = rows.reduce((s, r) => s + r[`${period}Customers`], 0)
  const totalDiscount = rows.reduce((s, r) => s + r[`${period}Discount`], 0)
  const grossSales = totalSales + totalDiscount
  const totalQuantity = rows.reduce((s, r) => s + r[`${period}Quantity`], 0)
  const totalCost = rows.reduce((s, r) => s + r[`${period}TotalCost`], 0)
  return {
    sales: totalSales,
    quantity: totalQuantity,
    customers: totalCustomers,
    discountRate: grossSales > 0 ? totalDiscount / grossSales : 0,
    totalCost,
  }
}

function directionFromRatio(ratio: number | null): TrendDirection {
  if (ratio == null) return 'flat'
  if (ratio >= 1.02) return 'up'
  if (ratio < 0.98) return 'down'
  return 'flat'
}

function toDirectionCell(c: MatrixCell): TrendDirectionCell {
  return { direction: directionFromRatio(c.ratio), ratio: c.ratio }
}

/**
 * ConditionMatrixRow[] から表示用マトリクスを構築する
 *
 * @param rows     全店舗分のクエリ結果
 * @param totalDays 全体の期間日数（トレンド半期間の計算用）
 */
export function buildConditionMatrix(
  rows: readonly ConditionMatrixRow[],
  totalDays: number,
): ConditionMatrixResult {
  const cur = avgMetrics(rows, 'cur')
  const py = avgMetrics(rows, 'py')
  const pw = avgMetrics(rows, 'pw')
  const tr = avgMetrics(rows, 'tr')
  const tp = avgMetrics(rows, 'tp')

  const yoy = buildRow('前年比', cur, py)
  const wow = buildRow('前週比', cur, pw)
  const trendRatio = buildRow('トレンド', tr, tp)

  const trendDirection: TrendDirectionRow = {
    label: 'トレンド方向',
    sales: toDirectionCell(trendRatio.sales),
    quantity: toDirectionCell(trendRatio.quantity),
    customers: toDirectionCell(trendRatio.customers),
    txValue: toDirectionCell(trendRatio.txValue),
    discountRate: toDirectionCell(trendRatio.discountRate),
    totalCost: toDirectionCell(trendRatio.totalCost),
  }

  const trendHalfDays = Math.floor(totalDays / 2)

  return { yoy, wow, trendRatio, trendDirection, trendHalfDays }
}
