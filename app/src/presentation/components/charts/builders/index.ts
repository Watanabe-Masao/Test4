/**
 * ECharts Option Builders — バレルエクスポート
 *
 * 使い方:
 *   import { gridPresets, valueYAxis, tooltipBase, zeroBaseline, barDefaults } from './builders'
 */

// ─── グリッド ──────────────────────────────────────────
export { gridPresets, standardGrid } from './grid'

// ─── 軸 ──────────────────────────────────────────────
export { valueYAxis, categoryXAxis, percentYAxis, yenYAxis } from './axis'
export type { ValueYAxisOptions } from './axis'

// ─── ツールチップ・凡例 ────────────────────────────────
export {
  tooltipBase,
  standardTooltip,
  standardLegend,
  currencyTooltip,
  percentTooltip,
  multiSeriesTooltip,
} from './tooltip'

// ─── マークライン ──────────────────────────────────────
export { zeroBaseline, budgetLine, thresholdLine } from './markLine'
export type { MarkLineOption } from './markLine'

// ─── 系列スタイル ──────────────────────────────────────
export { barDefaults, horizontalBarDefaults, lineDefaults, areaDefaults } from './series'
