/**
 * ECharts Option ビルダー — 後方互換バレル
 *
 * 実装は builders/ に移動済み。既存の import パスを壊さないための re-export。
 * 新規コードは builders/ から直接 import すること。
 * @responsibility R:chart-option
 */

// ─── 共通フォーマッタ ──────────────────────────────────

/** 金額を万円表示（軸ラベル用） */
export function toAxisManYen(value: number): string {
  return `${Math.round(value / 10000)}万`
}

/** 金額をカンマ区切り（ツールチップ用） */
export function toCommaYen(value: number): string {
  return `${Math.round(value).toLocaleString('ja-JP')}円`
}

// ─── builders/ からの re-export ─────────────────────────

export { standardGrid } from './builders/grid'
export { yenYAxis, categoryXAxis } from './builders/axis'
export { standardTooltip, standardLegend } from './builders/tooltip'
