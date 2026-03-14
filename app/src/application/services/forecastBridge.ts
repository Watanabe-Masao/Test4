/**
 * forecast モード切替ディスパッチャ (Bridge)
 *
 * grossProfitBridge / budgetAnalysisBridge と同一パターン。
 * 3モードディスパッチ:
 *   - ts-only: TS 実装のみ
 *   - wasm-only: WASM のみ（初期化未完了時は TS フォールバック）
 *   - dual-run-compare: 両方実行→結果比較→差分ログ→TS 結果を返却
 *
 * compare 対象（5 関数 — Date 非依存の pure core）:
 *   - calculateStdDev, detectAnomalies, calculateWMA, linearRegression, analyzeTrend
 *
 * compare 対象外（Date 依存 — 直接委譲）:
 *   - calculateForecast, calculateMonthEndProjection, calculateWeeklySummaries
 *   - calculateDayOfWeekAverages, getWeekRanges
 *
 * bridge の責務: mode dispatch, fallback, dual-run compare, logging
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

import { getExecutionMode, getWasmState, getForecastWasmExports } from './wasmEngine'
import type { WasmState, ExecutionMode } from './wasmEngine'
import {
  calculateStdDevWasm,
  detectAnomaliesWasm,
  calculateWMAWasm,
  linearRegressionWasm,
  analyzeTrendWasm,
} from './forecastWasm'
import { recordCall, recordMismatch, recordNullMismatch } from './dualRunObserver'

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

/* ── dual-run 差分ログフォーマット ────────────── */

type ForecastFnName =
  | 'calculateStdDev'
  | 'detectAnomalies'
  | 'calculateWMA'
  | 'linearRegression'
  | 'analyzeTrend'

export interface ForecastMismatchLog {
  readonly function: ForecastFnName
  readonly inputSummary: Record<string, number | undefined>
  readonly tsResult: Record<string, number | string>
  readonly wasmResult: Record<string, number | string>
  readonly diffs: Record<string, number | string>
  readonly maxAbsDiff: number
  readonly invariantTs: 'ok' | 'violated'
  readonly invariantWasm: 'ok' | 'violated'
  readonly wasmState: WasmState
  readonly executionMode: ExecutionMode
}

/* ── 内部ヘルパー ─────────────────────────────── */

function isWasmReady(): boolean {
  return getForecastWasmExports() !== null
}

function isDualRun(): boolean {
  return import.meta.env.DEV && getExecutionMode() === 'dual-run-compare' && isWasmReady()
}

function checkFinite(fields: Record<string, number>): 'ok' | 'violated' {
  for (const v of Object.values(fields)) {
    if (!Number.isFinite(v)) return 'violated'
  }
  return 'ok'
}

function compareNumericResults(
  fnName: ForecastFnName,
  tsFields: Record<string, number>,
  wasmFields: Record<string, number>,
  inputSummary: Record<string, number | undefined>,
  invariantChecker?: (fields: Record<string, number>) => 'ok' | 'violated',
): void {
  const diffs: Record<string, number> = {}
  let maxAbsDiff = 0

  for (const key of Object.keys(tsFields)) {
    const diff = (wasmFields[key] ?? 0) - tsFields[key]
    diffs[key] = diff
    maxAbsDiff = Math.max(maxAbsDiff, Math.abs(diff))
  }

  const invariantTs = invariantChecker ? invariantChecker(tsFields) : checkFinite(tsFields)
  const invariantWasm = invariantChecker ? invariantChecker(wasmFields) : checkFinite(wasmFields)

  if (maxAbsDiff > 1e-10 || invariantTs === 'violated' || invariantWasm === 'violated') {
    const log: ForecastMismatchLog = {
      function: fnName,
      inputSummary,
      tsResult: tsFields,
      wasmResult: wasmFields,
      diffs,
      maxAbsDiff,
      invariantTs,
      invariantWasm,
      wasmState: getWasmState(),
      executionMode: getExecutionMode(),
    }
    console.warn('[forecast dual-run mismatch]', log)
    recordMismatch(fnName, maxAbsDiff, invariantTs, invariantWasm, inputSummary)
  }
}

/* ── compare 対象: 5 関数 ────────────────────── */

/**
 * 標準偏差
 */
export function calculateStdDev(values: readonly number[]): { mean: number; stdDev: number } {
  if (import.meta.env.DEV) recordCall('calculateStdDev')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return calculateStdDevTS(values)
  }

  if (mode === 'wasm-only') {
    return calculateStdDevWasm(values)
  }

  // dual-run-compare
  const tsResult = calculateStdDevTS(values)
  if (isDualRun()) {
    const wasmResult = calculateStdDevWasm(values)
    compareNumericResults(
      'calculateStdDev',
      { mean: tsResult.mean, stdDev: tsResult.stdDev },
      { mean: wasmResult.mean, stdDev: wasmResult.stdDev },
      { valueCount: values.length },
      (fields) => {
        if (!Number.isFinite(fields.mean) || !Number.isFinite(fields.stdDev)) return 'violated'
        if (fields.stdDev < 0) return 'violated'
        return 'ok'
      },
    )
  }
  return tsResult
}

/**
 * 異常値検出
 */
export function detectAnomalies(
  dailySales: ReadonlyMap<number, number>,
  threshold?: number,
): readonly AnomalyDetectionResult[] {
  if (import.meta.env.DEV) recordCall('detectAnomalies')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return detectAnomaliesTS(dailySales, threshold)
  }

  if (mode === 'wasm-only') {
    return detectAnomaliesWasm(dailySales, threshold)
  }

  // dual-run-compare
  const tsResult = detectAnomaliesTS(dailySales, threshold)
  if (isDualRun()) {
    const wasmResult = detectAnomaliesWasm(dailySales, threshold)

    // 件数差は意味差
    if (tsResult.length !== wasmResult.length) {
      console.warn('[forecast dual-run mismatch]', {
        function: 'detectAnomalies',
        kind: 'semantic-mismatch',
        tsCount: tsResult.length,
        wasmCount: wasmResult.length,
        wasmState: getWasmState(),
        executionMode: getExecutionMode(),
      })
      recordNullMismatch('detectAnomalies')
    } else {
      // 順序・値の比較
      let maxAbsDiff = 0
      const diffs: Record<string, number> = {}
      for (let i = 0; i < tsResult.length; i++) {
        const ts = tsResult[i]
        const wasm = wasmResult[i]
        if (ts.day !== wasm.day) {
          console.warn('[forecast dual-run mismatch]', {
            function: 'detectAnomalies',
            kind: 'semantic-mismatch',
            reason: 'order-mismatch',
            index: i,
            tsDay: ts.day,
            wasmDay: wasm.day,
          })
          recordNullMismatch('detectAnomalies')
          return tsResult
        }
        const zDiff = Math.abs(wasm.zScore - ts.zScore)
        diffs[`zScore[${i}]`] = zDiff
        maxAbsDiff = Math.max(maxAbsDiff, zDiff)
      }
      if (maxAbsDiff > 1e-10) {
        compareNumericResults(
          'detectAnomalies',
          diffs,
          Object.fromEntries(Object.keys(diffs).map((k) => [k, 0])),
          { entryCount: dailySales.size, threshold: threshold ?? 2.0 },
        )
      }
    }
  }
  return tsResult
}

/**
 * 加重移動平均
 */
export function calculateWMA(
  dailySales: ReadonlyMap<number, number>,
  window?: number,
): readonly WMAEntry[] {
  if (import.meta.env.DEV) recordCall('calculateWMA')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return calculateWMATS(dailySales, window)
  }

  if (mode === 'wasm-only') {
    return calculateWMAWasm(dailySales, window)
  }

  // dual-run-compare
  const tsResult = calculateWMATS(dailySales, window)
  if (isDualRun()) {
    const wasmResult = calculateWMAWasm(dailySales, window)

    if (tsResult.length !== wasmResult.length) {
      console.warn('[forecast dual-run mismatch]', {
        function: 'calculateWMA',
        kind: 'semantic-mismatch',
        tsLength: tsResult.length,
        wasmLength: wasmResult.length,
      })
      recordNullMismatch('calculateWMA')
    } else {
      let maxAbsDiff = 0
      for (let i = 0; i < tsResult.length; i++) {
        maxAbsDiff = Math.max(maxAbsDiff, Math.abs(wasmResult[i].wma - tsResult[i].wma))
      }
      if (maxAbsDiff > 1e-10) {
        compareNumericResults(
          'calculateWMA',
          { maxWmaDiff: maxAbsDiff },
          { maxWmaDiff: 0 },
          { entryCount: dailySales.size, window: window ?? 5 },
        )
      }
    }
  }
  return tsResult
}

/**
 * 線形回帰
 */
export function linearRegression(dailySales: ReadonlyMap<number, number>): LinearRegressionResult {
  if (import.meta.env.DEV) recordCall('linearRegression')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return linearRegressionTS(dailySales)
  }

  if (mode === 'wasm-only') {
    return linearRegressionWasm(dailySales)
  }

  // dual-run-compare
  const tsResult = linearRegressionTS(dailySales)
  if (isDualRun()) {
    const wasmResult = linearRegressionWasm(dailySales)
    compareNumericResults(
      'linearRegression',
      { slope: tsResult.slope, intercept: tsResult.intercept, rSquared: tsResult.rSquared },
      { slope: wasmResult.slope, intercept: wasmResult.intercept, rSquared: wasmResult.rSquared },
      { entryCount: dailySales.size },
      (fields) => {
        if (!Number.isFinite(fields.slope) || !Number.isFinite(fields.intercept)) return 'violated'
        if (!Number.isFinite(fields.rSquared)) return 'violated'
        if (fields.rSquared < 0 || fields.rSquared > 1) return 'violated'
        return 'ok'
      },
    )
  }
  return tsResult
}

/**
 * トレンド分析（複数月横断）
 * 入力が POJO なので Map 変換不要。
 */
export function analyzeTrend(dataPoints: readonly MonthlyDataPoint[]): TrendAnalysisResult {
  if (import.meta.env.DEV) recordCall('analyzeTrend')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return analyzeTrendTS(dataPoints)
  }

  if (mode === 'wasm-only') {
    return analyzeTrendWasm(dataPoints)
  }

  // dual-run-compare
  const tsResult = analyzeTrendTS(dataPoints)
  if (isDualRun()) {
    const wasmResult = analyzeTrendWasm(dataPoints)

    // trend direction は exact match（意味差）
    if (tsResult.overallTrend !== wasmResult.overallTrend) {
      console.warn('[forecast dual-run mismatch]', {
        function: 'analyzeTrend',
        kind: 'semantic-mismatch',
        tsTrend: tsResult.overallTrend,
        wasmTrend: wasmResult.overallTrend,
        wasmState: getWasmState(),
        executionMode: getExecutionMode(),
      })
      recordNullMismatch('analyzeTrend')
    }

    // 数値フィールド比較
    compareNumericResults(
      'analyzeTrend',
      { averageMonthlySales: tsResult.averageMonthlySales },
      { averageMonthlySales: wasmResult.averageMonthlySales },
      { dataPointCount: dataPoints.length },
    )
  }
  return tsResult
}

/* ── compare 対象外: Date 依存関数（直接委譲） ── */

/**
 * 予測分析（週別集計 + 曜日別平均 + 異常値検出）
 * Date 依存のため compare 対象外。直接委譲。
 */
export function calculateForecast(input: ForecastInput): ForecastResult {
  return calculateForecastTS(input)
}

/**
 * 月末予測（複数手法 + 信頼区間）
 * Date 依存のため compare 対象外。直接委譲。
 */
export function calculateMonthEndProjection(
  year: number,
  month: number,
  dailySales: ReadonlyMap<number, number>,
): MonthEndProjection {
  return calculateMonthEndProjectionTS(year, month, dailySales)
}

/**
 * 週別サマリー
 * Date 依存のため compare 対象外。直接委譲。
 */
export function calculateWeeklySummaries(input: ForecastInput): readonly WeeklySummary[] {
  return calculateWeeklySummariesTS(input)
}

/**
 * 曜日別平均
 * Date 依存のため compare 対象外。直接委譲。
 */
export function calculateDayOfWeekAverages(input: ForecastInput): readonly DayOfWeekAverage[] {
  return calculateDayOfWeekAveragesTS(input)
}

/**
 * 週番号計算
 * Date 依存のため compare 対象外。直接委譲。
 */
export function getWeekRanges(
  year: number,
  month: number,
): readonly { weekNumber: number; startDay: number; endDay: number }[] {
  return getWeekRangesTS(year, month)
}
