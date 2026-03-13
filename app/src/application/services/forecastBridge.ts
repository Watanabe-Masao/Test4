/**
 * forecast モード切替ディスパッチャ (Bridge)
 *
 * factorDecompositionBridge と同一パターン。
 * 現時点では ts-only モードのみ。WASM 実装後に dual-run-compare を追加する。
 *
 * bridge の責務: mode dispatch, Map→Array 変換, fallback
 * bridge に含めないもの: metrics, timings, cache, mode persistence
 */
import {
  calculateForecast as calculateForecastTS,
  calculateWeeklySummaries as calculateWeeklySummariesTS,
  calculateDayOfWeekAverages as calculateDayOfWeekAveragesTS,
  detectAnomalies as detectAnomaliesTS,
  calculateStdDev as calculateStdDevTS,
  getWeekRanges as getWeekRangesTS,
} from '@/domain/calculations/forecast'
import type {
  ForecastInput,
  ForecastResult,
  WeeklySummary,
  DayOfWeekAverage,
  AnomalyDetectionResult,
} from '@/domain/calculations/forecast'

import {
  calculateMonthEndProjection as calculateMonthEndProjectionTS,
  linearRegression as linearRegressionTS,
  calculateWMA as calculateWMATS,
} from '@/domain/calculations/algorithms/advancedForecast'
import type {
  MonthEndProjection,
  LinearRegressionResult,
  WMAEntry,
} from '@/domain/calculations/algorithms/advancedForecast'

import { analyzeTrend as analyzeTrendTS } from '@/domain/calculations/algorithms/trendAnalysis'
import type {
  MonthlyDataPoint,
  TrendAnalysisResult,
} from '@/domain/calculations/algorithms/trendAnalysis'

// Re-export types for consumer convenience
export type {
  ForecastInput,
  ForecastResult,
  WeeklySummary,
  DayOfWeekAverage,
  AnomalyDetectionResult,
  MonthEndProjection,
  LinearRegressionResult,
  WMAEntry,
  MonthlyDataPoint,
  TrendAnalysisResult,
}

/* ── 公開関数（ts-only） ────────────────────────── */

/**
 * 予測分析（週別集計 + 曜日別平均 + 異常値検出）
 *
 * Bridge エントリポイント 1: 基本予測
 */
export function calculateForecast(input: ForecastInput): ForecastResult {
  // TODO: Phase 7 で dual-run-compare / wasm-only を追加
  return calculateForecastTS(input)
}

/**
 * 月末予測（複数手法 + 信頼区間）
 *
 * Bridge エントリポイント 2: 月末予測
 */
export function calculateMonthEndProjection(
  year: number,
  month: number,
  dailySales: ReadonlyMap<number, number>,
): MonthEndProjection {
  return calculateMonthEndProjectionTS(year, month, dailySales)
}

/**
 * トレンド分析（複数月横断）
 *
 * Bridge エントリポイント 3: トレンド分析
 * 入力が POJO なので Map 変換不要。
 */
export function analyzeTrend(dataPoints: readonly MonthlyDataPoint[]): TrendAnalysisResult {
  return analyzeTrendTS(dataPoints)
}

/* ── 個別関数（bridge 経由で統一アクセス可能にする） ── */

export function calculateWeeklySummaries(input: ForecastInput): readonly WeeklySummary[] {
  return calculateWeeklySummariesTS(input)
}

export function calculateDayOfWeekAverages(input: ForecastInput): readonly DayOfWeekAverage[] {
  return calculateDayOfWeekAveragesTS(input)
}

export function detectAnomalies(
  dailySales: ReadonlyMap<number, number>,
  threshold?: number,
): readonly AnomalyDetectionResult[] {
  return detectAnomaliesTS(dailySales, threshold)
}

export function calculateStdDev(values: readonly number[]): { mean: number; stdDev: number } {
  return calculateStdDevTS(values)
}

export function linearRegression(dailySales: ReadonlyMap<number, number>): LinearRegressionResult {
  return linearRegressionTS(dailySales)
}

export function calculateWMA(
  dailySales: ReadonlyMap<number, number>,
  window?: number,
): readonly WMAEntry[] {
  return calculateWMATS(dailySales, window)
}

// getWeekRanges は Date 依存のカレンダー計算。WASM 化対象外のため直接委譲。
export function getWeekRanges(
  year: number,
  month: number,
): readonly { weekNumber: number; startDay: number; endDay: number }[] {
  return getWeekRangesTS(year, month)
}
