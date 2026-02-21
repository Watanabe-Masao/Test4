/**
 * 安全な数値変換（null/undefined/NaN → 0）
 */
export function safeNumber(n: unknown): number {
  if (n == null) return 0
  const num = Number(n)
  return isNaN(num) ? 0 : num
}

/**
 * 安全な除算（ゼロ除算防止）
 */
export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  return denominator !== 0 ? numerator / denominator : fallback
}

/**
 * 金額フォーマット（四捨五入 → カンマ区切り）
 */
export function formatCurrency(n: number | null): string {
  if (n == null || isNaN(n)) return '-'
  return Math.round(n).toLocaleString('ja-JP')
}

/**
 * 万円表示フォーマット
 */
export function formatManYen(n: number | null): string {
  if (n == null || isNaN(n)) return '-'
  const manYen = Math.round(n / 10_000)
  return `${manYen > 0 ? '+' : ''}${manYen}万円`
}

/**
 * パーセント表示フォーマット
 */
export function formatPercent(n: number | null, decimals = 2): string {
  if (n == null || isNaN(n)) return '-'
  return (n * 100).toFixed(decimals) + '%'
}

/**
 * ポイント差表示フォーマット
 */
export function formatPointDiff(n: number | null, decimals = 1): string {
  if (n == null || isNaN(n)) return '-'
  const pt = n * 100
  return `${pt > 0 ? '+' : ''}${pt.toFixed(decimals)}pt`
}

/**
 * 客単価（1客あたり売上）を計算する
 */
export function calculateTransactionValue(sales: number, customers: number): number {
  return customers > 0 ? Math.round(sales / customers) : 0
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
 * StoreDayRecord から最大日を取得
 */
function maxDayOfRecord(record: { readonly [storeId: string]: { readonly [day: number]: unknown } }): number {
  let max = 0
  for (const storeId of Object.keys(record)) {
    for (const dayStr of Object.keys(record[storeId])) {
      const d = Number(dayStr)
      if (d > max) max = d
    }
  }
  return max
}

/**
 * 予算以外の取込データ（販売金額データ）の最大日を検出する。
 * スライダーのデフォルト値やリセット時のデータ末日として使用。
 */
export function detectDataMaxDay(data: {
  readonly purchase: { readonly [s: string]: { readonly [d: number]: unknown } }
  readonly sales: { readonly [s: string]: { readonly [d: number]: unknown } }
  readonly discount: { readonly [s: string]: { readonly [d: number]: unknown } }
  readonly interStoreIn: { readonly [s: string]: { readonly [d: number]: unknown } }
  readonly interStoreOut: { readonly [s: string]: { readonly [d: number]: unknown } }
  readonly flowers: { readonly [s: string]: { readonly [d: number]: unknown } }
  readonly directProduce: { readonly [s: string]: { readonly [d: number]: unknown } }
  readonly consumables: { readonly [s: string]: { readonly [d: number]: unknown } }
}): number {
  return Math.max(
    0,
    maxDayOfRecord(data.purchase),
    maxDayOfRecord(data.sales),
    maxDayOfRecord(data.discount),
    maxDayOfRecord(data.interStoreIn),
    maxDayOfRecord(data.interStoreOut),
    maxDayOfRecord(data.flowers),
    maxDayOfRecord(data.directProduce),
    maxDayOfRecord(data.consumables),
  )
}
