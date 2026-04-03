/**
 * ChartViewMode — 日別チャートの表示モード型定義
 *
 * presentation 層の DailySalesChartBody / DailySalesChartBodyLogic から抽出。
 * plan hook（application 層）が参照できるよう domain 層に配置。
 * 純粋な型定義のみ。依存なし。
 */

/** 日別チャートの表示切替（標準 / 累計 / 差分 / 前年比率） */
export type DailyViewType = 'standard' | 'cumulative' | 'difference' | 'rate'

/**
 * 後方互換エイリアス — presentation 層では ViewType として使用されている。
 * 新規コードでは DailyViewType を推奨。
 */
export type ViewType = DailyViewType

/** 日別チャートの右軸に表示するデータの種類 */
export type RightAxisMode = 'quantity' | 'customers' | 'discount' | 'temperature'
