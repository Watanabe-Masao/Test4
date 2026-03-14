/**
 * forecast WASM wrapper (stub)
 *
 * compare 対象 5 関数の WASM adapter。
 * Rust/WASM 実装が完了するまではスタブ。bridge テストではモックされる。
 *
 * compare 対象:
 *   - calculateStdDev
 *   - detectAnomalies
 *   - calculateWMA
 *   - linearRegression
 *   - analyzeTrend
 *
 * compare 対象外（Date 依存）:
 *   - getWeekRanges, calculateDayOfWeekAverages, calculateWeeklySummaries
 *   - projectDowAdjusted, calculateMonthEndProjection, calculateForecast
 */
import type { AnomalyDetectionResult } from '@/domain/calculations/forecast'
import type {
  LinearRegressionResult,
  WMAEntry,
} from '@/domain/calculations/algorithms/advancedForecast'
import type {
  MonthlyDataPoint,
  TrendAnalysisResult,
} from '@/domain/calculations/algorithms/trendAnalysis'

/* ── スタブ実装（WASM 未実装時は bridge からモック経由で呼ばれる） ── */

export function calculateStdDevWasm(values: readonly number[]): { mean: number; stdDev: number } {
  void values
  throw new Error('forecast WASM not yet implemented: calculateStdDev')
}

export function detectAnomaliesWasm(
  dailySales: ReadonlyMap<number, number>,
  threshold?: number,
): readonly AnomalyDetectionResult[] {
  void dailySales
  void threshold
  throw new Error('forecast WASM not yet implemented: detectAnomalies')
}

export function calculateWMAWasm(
  dailySales: ReadonlyMap<number, number>,
  window?: number,
): readonly WMAEntry[] {
  void dailySales
  void window
  throw new Error('forecast WASM not yet implemented: calculateWMA')
}

export function linearRegressionWasm(
  dailySales: ReadonlyMap<number, number>,
): LinearRegressionResult {
  void dailySales
  throw new Error('forecast WASM not yet implemented: linearRegression')
}

export function analyzeTrendWasm(dataPoints: readonly MonthlyDataPoint[]): TrendAnalysisResult {
  void dataPoints
  throw new Error('forecast WASM not yet implemented: analyzeTrend')
}
