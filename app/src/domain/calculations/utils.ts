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
