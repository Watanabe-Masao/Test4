/**
 * KPIテーブル用フォーマットユーティリティ
 *
 * KpiTableWidgets.tsx から分割。
 */

export function fmtPct(v: number): string {
  // 既に小数 (0.2220) なら %表示, 1超えなら既にパーセント値
  const pct = Math.abs(v) <= 1 ? v * 100 : v
  return `${pct.toFixed(2)}%`
}

export function fmtPtDiff(v: number): string {
  // ポイント差異（例: 0.31 → +0.31pt）
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}`
}
