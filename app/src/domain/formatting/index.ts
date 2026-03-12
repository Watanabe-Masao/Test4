/**
 * ドメイン知識に基づく数値フォーマット関数
 *
 * 小売業の指標表示に特化した整形ロジック。
 * 純粋関数のみ（副作用なし、外部依存なし）。
 */

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
 * パーセント表示フォーマット（小数第2位まで）
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
 * 客数フォーマット（カンマ区切り + 人）
 */
export function formatCustomers(n: number | null): string {
  if (n == null || isNaN(n)) return '-'
  return `${Math.round(n).toLocaleString('ja-JP')}人`
}

/**
 * 客単価フォーマット（カンマ区切り + 円）
 */
export function formatTransactionValue(n: number | null, decimals = 0): string {
  if (n == null || isNaN(n)) return '-'
  return `${n.toLocaleString('ja-JP', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}円`
}
