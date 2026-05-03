/**
 * forecast WASM analytic-authoritative bridge
 *
 * @semanticClass analytic
 * @bridgeKind analytics
 * @contractId ANA-002 (advancedForecast), ANA-004 (trendAnalysis), ANA-005 (correlation), ANA-006 (forecast)
 *
 * WASM が ready なら WASM 実装を使用し、未初期化時は TS にフォールバックする。
 * public API と import path は従来と同一。
 *
 * WASM analytic-authoritative 対象（5 関数 — Date 非依存の pure core）:
 *   - calculateStdDev, detectAnomalies, calculateWMA, linearRegression, analyzeTrend
 *
 * TS 直接委譲（Date 依存 — WASM 対象外）:
 *   - calculateForecast, calculateMonthEndProjection, calculateWeeklySummaries
 *   - calculateDayOfWeekAverages, getWeekRanges
 *
 * @see references/03-implementation/contract-definition-policy.md — 契約定義ポリシー
 * @see references/01-foundation/semantic-classification-policy.md — 意味分類ポリシー
 *
 * @responsibility R:unclassified
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

import { getForecastWasmExports } from './wasmEngine'
import {
  calculateStdDevWasm,
  detectAnomaliesWasm,
  calculateWMAWasm,
  linearRegressionWasm,
  analyzeTrendWasm,
} from './forecastWasm'

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

function isWasmReady(): boolean {
  return getForecastWasmExports() !== null
}

/* ── WASM authoritative: 5 pure 関数 ─────────── */

export function calculateStdDev(values: readonly number[]): { mean: number; stdDev: number } {
  if (isWasmReady()) return calculateStdDevWasm(values)
  return calculateStdDevTS(values)
}

export function detectAnomalies(
  dailySales: ReadonlyMap<number, number>,
  threshold?: number,
): readonly AnomalyDetectionResult[] {
  if (isWasmReady()) return detectAnomaliesWasm(dailySales, threshold)
  return detectAnomaliesTS(dailySales, threshold)
}

export function calculateWMA(
  dailySales: ReadonlyMap<number, number>,
  window?: number,
): readonly WMAEntry[] {
  if (isWasmReady()) return calculateWMAWasm(dailySales, window)
  return calculateWMATS(dailySales, window)
}

export function linearRegression(dailySales: ReadonlyMap<number, number>): LinearRegressionResult {
  if (isWasmReady()) return linearRegressionWasm(dailySales)
  return linearRegressionTS(dailySales)
}

export function analyzeTrend(dataPoints: readonly MonthlyDataPoint[]): TrendAnalysisResult {
  if (isWasmReady()) return analyzeTrendWasm(dataPoints)
  return analyzeTrendTS(dataPoints)
}

/* ── TS 直接委譲: Date 依存関数（WASM 対象外） ── */

export function calculateForecast(input: ForecastInput): ForecastResult {
  return calculateForecastTS(input)
}

export function calculateMonthEndProjection(
  year: number,
  month: number,
  dailySales: ReadonlyMap<number, number>,
): MonthEndProjection {
  return calculateMonthEndProjectionTS(year, month, dailySales)
}

export function calculateWeeklySummaries(input: ForecastInput): readonly WeeklySummary[] {
  return calculateWeeklySummariesTS(input)
}

export function calculateDayOfWeekAverages(input: ForecastInput): readonly DayOfWeekAverage[] {
  return calculateDayOfWeekAveragesTS(input)
}

export function getWeekRanges(
  year: number,
  month: number,
): readonly { weekNumber: number; startDay: number; endDay: number }[] {
  return getWeekRangesTS(year, month)
}
