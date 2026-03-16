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
 * 達成率（実績 / 目標）を計算する
 *
 * @category ACH — 実績の目標に対する進捗割合
 * @param actual — 実績値（売上、粗利額等）
 * @param target — 目標値（予算、目標額等）
 * @returns 達成率（1.0 = 100%達成）
 * @range [0, ∞) — 目標超過時は 1.0 を超える
 * @zero target=0 → 0（目標なしは達成率なし）
 *
 * NOTE(pragmatic): 数学的に厳密な不変条件（シャープリー恒等式等）を持たない
 * 実用プリミティブ。変数名 `_pragmatic` 接尾辞は正規の数学的定義ではないことを示す。
 * 参照: references/01-principles/domain-ratio-primitives.md
 */
export function calculateAchievementRate(actual: number, target: number): number {
  return safeDivide(actual, target, 0)
}

/**
 * 前年比（当期値 / 前年同期値）を計算する
 *
 * @category YOY — 当期の前年同期に対する変化割合
 * @param current — 当期の値（売上、客数等）
 * @param previous — 前年同期の値
 * @returns 前年比（1.0 = 前年同水準）
 * @range [0, ∞) — 前年超過時は 1.0 を超える
 * @zero previous=0 → 0（前年データなしは比較不能）
 *
 * NOTE(pragmatic): calculateAchievementRate と数式は同一だが意味が異なる。
 * 達成率は「目標に対する進捗」、前年比は「前年に対する変化」。
 * 参照: references/01-principles/domain-ratio-primitives.md
 */
export function calculateYoYRatio(current: number, previous: number): number {
  return safeDivide(current, previous, 0)
}

/**
 * 構成比（部分 / 全体）を計算する
 *
 * @category SHR — 部分の全体に占める割合
 * @param part — 部分の値（カテゴリ売上、時間帯売上等）
 * @param whole — 全体の値（総売上等）
 * @returns 構成比（0.0〜1.0）
 * @range [0, 1] — 全パーツの合計は 1.0 になる
 * @zero whole=0 → 0（全体ゼロは構成比なし）
 * @invariant Σ calculateShare(partᵢ, whole) = 1（Σ partᵢ = whole の場合）
 *
 * NOTE(pragmatic): 数式は達成率と同一だが、値域制約と合計制約が異なる。
 * 構成比は [0,1] に収まり、全パーツの合計が 1 になるべき。
 * 参照: references/01-principles/domain-ratio-primitives.md
 */
export function calculateShare(part: number, whole: number): number {
  return safeDivide(part, whole, 0)
}

/**
 * 粗利率（粗利 / 売上）を計算する
 *
 * @category GPR — 粗利の売上に対する収益性割合
 * @param grossProfit — 粗利額
 * @param sales — 売上額
 * @returns 粗利率（0.3 = 30%）
 * @range (-∞, 1] — 赤字時は負、売上以上の粗利は通常発生しない
 * @zero sales=0 → 0（売上なしは粗利率なし）
 * @invariant grossProfit = sales × grossProfitRate
 *
 * NOTE(pragmatic): 在庫法・推定法で算出方法が異なるため、
 * この関数は算出済み粗利額と売上額の比率のみを計算する。
 * 参照: references/01-principles/domain-ratio-primitives.md
 */
export function calculateGrossProfitRate(grossProfit: number, sales: number): number {
  return safeDivide(grossProfit, sales, 0)
}

/**
 * 客単価（1客あたり売上）を計算する
 *
 * @category TXV — 1客あたりの売上金額（単位値）
 * @param sales — 売上額
 * @param customers — 客数
 * @returns 客単価（整数、円単位）
 * @range [0, ∞) 整数
 * @zero customers=0 → 0（客数ゼロは客単価なし）
 * @invariant |TV × customers - sales| ≤ customers × 0.5（丸め誤差範囲）
 *
 * NOTE(pragmatic): Math.round による整数化のため、再構成時に丸め誤差が生じる。
 * 参照: references/01-principles/domain-ratio-primitives.md
 */
export function calculateTransactionValue(sales: number, customers: number): number {
  return Math.round(safeDivide(sales, customers, 0))
}

/**
 * PI値（一人当たり点数）= 総点数 ÷ 来店客数
 *
 * @category PIC — 1客あたりの購入点数
 * @param totalQty — 総販売点数
 * @param customers — 客数
 * @returns PI値（小数）
 * @range [0, ∞)
 * @zero customers=0 → 0（客数ゼロはPI値なし）
 *
 * decompose3 の Q に相当: S = C × Q × P̄
 */
export function calculateItemsPerCustomer(totalQty: number, customers: number): number {
  return safeDivide(totalQty, customers, 0)
}

/**
 * 点単価（1点あたり売上）= 総売上 ÷ 総点数
 *
 * @category PPU — 1点あたりの売上金額
 * @param sales — 売上額
 * @param totalQty — 総販売点数
 * @returns 点単価（小数）
 * @range [0, ∞)
 * @zero totalQty=0 → 0（点数ゼロは点単価なし）
 *
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
