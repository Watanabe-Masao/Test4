/**
 * KPIテーブル用フォーマットユーティリティ
 *
 * KpiTableWidgets.tsx から分割。
 * パーセント基本フォーマットは domain/formatting に委譲。
 */
import { formatPercent } from '@/domain/formatting'

/** パーセントフォーマット（formatPercent に委譲、常に比率値×100で表示） */
export const fmtPct = (v: number): string => formatPercent(v)

export function fmtPtDiff(v: number): string {
  // ポイント差異（例: 0.31 → +0.31pt）
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}`
}
