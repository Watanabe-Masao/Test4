/**
 * 時間帯分析ユーティリティ — バレル + フォーマット関数
 *
 * 純粋計算（findCoreTime, findTurnaroundHour, buildHourlyMap）は
 * domain/calculations/timeSlotCalculations.ts に移設済み。
 * 本ファイルは presentation 固有のフォーマット関数 + re-export のバレル。
 *
 * @see F1: バレルで後方互換
 */

// Domain 計算関数の re-export（後方互換）
export {
  findCoreTime,
  findTurnaroundHour,
  buildHourlyMap,
} from '@/domain/calculations/timeSlotCalculations'

/** コアタイム表示用フォーマット (例: "11〜13時") */
export function formatCoreTime(ct: { startHour: number; endHour: number } | null): string {
  if (!ct) return '-'
  return `${ct.startHour}〜${ct.endHour}時`
}

/** 折り返し時間帯表示用フォーマット (例: "12時台") */
export function formatTurnaroundHour(hour: number | null): string {
  if (hour == null) return '-'
  return `${hour}時台`
}
