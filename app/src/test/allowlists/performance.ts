/**
 * Screen Runtime 許可リスト — pair handler 消費側の分類
 *
 * @invariant INV-RUN-02 Comparison Integrity — pair handler 消費側の分類を追跡
 */
import type { AllowlistEntry } from './types'

// ════════════════════════════════════════════════════════════════════
// §1. pair handler 消費側
// ════════════════════════════════════════════════════════════════════

/**
 * 単一呼び出しで比較なし。base handler の直接使用が正当。
 * pair handler への移行は不要（比較意味論がない）。
 */
export const pairJustifiedSingle: readonly AllowlistEntry[] = [
  // ── 以下5件は plan hook 経由に移行済みのため除去 ──
  // CumulativeChart.tsx → useCumulativeChartPlan 経由
  // WeatherAnalysisPanel.tsx → useWeatherAnalysisPlan 経由
  // useDeptHourlyChartData.ts → useDeptHourlyChartPlan 経由
  // CategoryHourlyChart.tsx → useCategoryHourlyChartPlan 経由
  // CategoryMixChart.tsx → useCategoryMixChartPlan 経由
  {
    path: 'application/hooks/useHeatmapPlan.ts',
    reason: 'levelAggregationHandler × 3 ドロップダウン用（比較なし）。plan hook が一元管理',
    category: 'justified',
    removalCondition: '除去不要 — ドロップダウン候補取得は pair 不要',
    lifecycle: 'permanent',
  },
  {
    path: 'application/hooks/usePerformanceIndexPlan.ts',
    reason: 'storeCategoryPIHandler 単一呼び出し（比較なし）。levelAggregation は pair 化済み',
    category: 'justified',
    removalCondition: '除去不要 — 比較なしの正当な base handler 使用',
    lifecycle: 'permanent',
  },
]

/**
 * 後方互換: Gate 4 enforcement guard が参照する統合リスト。
 * pairJustifiedSingle のみ（pairExceptionDesign は全件卒業済み）。
 */
export const nonPairableConsumers: readonly AllowlistEntry[] = [...pairJustifiedSingle]
