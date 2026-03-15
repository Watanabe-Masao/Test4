/**
 * 安全な数値変換（null/undefined/NaN/±Infinity → 0）
 */
export function safeNumber(n: unknown): number {
  if (n == null) return 0
  const num = Number(n)
  return Number.isFinite(num) ? num : 0
}

/**
 * 安全な除算（ゼロ除算防止）
 */
export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  return denominator !== 0 ? numerator / denominator : fallback
}

/**
 * 客単価（1客あたり売上）を計算する
 */
export function calculateTransactionValue(sales: number, customers: number): number {
  return Math.round(safeDivide(sales, customers, 0))
}

/**
 * PI値（一人当たり点数）= 総点数 ÷ 来店客数
 * decompose3 の Q に相当: S = C × Q × P̄
 */
export function calculateItemsPerCustomer(totalQty: number, customers: number): number {
  return safeDivide(totalQty, customers, 0)
}

/**
 * 点単価（1点あたり売上）= 総売上 ÷ 総点数
 * decompose3 の P̄ に相当: S = C × Q × P̄
 */
export function calculateAveragePricePerItem(sales: number, totalQty: number): number {
  return safeDivide(sales, totalQty, 0)
}

/**
 * 移動平均を計算する
 * @param values 値の配列
 * @param window ウィンドウサイズ
 * @returns 各位置の移動平均（先頭 window-1 個は NaN）
 */
export function calculateMovingAverage(values: readonly number[], window: number): number[] {
  return values.map((_, i) => {
    if (i < window - 1) return NaN
    let sum = 0
    for (let j = i - window + 1; j <= i; j++) sum += values[j]
    return sum / window
  })
}

/**
 * 在庫法粗利率（実績）が利用可能ならそれを、なければ推定法マージン率を返す。
 * 在庫法は実際の在庫差から算出するため信頼度が高い。推定法は値入率から推定するため
 * 在庫法が利用できない場合のフォールバックとして使う。
 */
export function getEffectiveGrossProfitRate(result: {
  readonly invMethodGrossProfitRate: number | null
  readonly estMethodMarginRate: number
}): number {
  return result.invMethodGrossProfitRate ?? result.estMethodMarginRate
}

/**
 * 設定データの inventoryDate が対象年月と一致するか判定する。
 * 日付なしやパース不能は後方互換のため true を返す。
 */
export function isSettingsForTargetMonth(
  inventoryDate: string | null,
  targetYear: number,
  targetMonth: number,
): boolean {
  if (!inventoryDate) return true
  const match = inventoryDate.match(/^(\d{4})\/(\d{1,2})\//)
  if (!match) return true
  return Number(match[1]) === targetYear && Number(match[2]) === targetMonth
}

// ── サブモジュール re-export ──

export { maxDayOfRecord, detectDataMaxDay } from './dataDetection'
export type { AverageMode, AveragingContext } from './averageDivisor'
export { computeAverageDivisor, computeActiveDowDivisorMap } from './averageDivisor'
