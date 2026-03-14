/**
 * Metric Definition Registry の実利用ユーティリティ
 *
 * METRIC_DEFS の authoritativeOwner / fallbackRule / warningRule を
 * 実際の計算結果に適用し、正式値の判定と警告の解決を行う。
 *
 * ## 責務
 * - 指標の正式値判定（null / 0 / 計算値の意味を分離）
 * - fallbackRule に基づくフォールバック適用
 * - warningRule に基づく警告検出
 * - authoritativeOwner の照会
 *
 * ## 利用箇所
 * - storeAssembler: 計算結果の最終採用判定
 * - ExplanationService: 警告の表示判定
 * - UI: 指標の信頼性表示
 */
import type { MetricId, MetricMeta, FallbackRule } from '../models/Explanation'
import { METRIC_DEFS } from './metricDefs'

// ── 指標値の解決結果 ──

export interface ResolvedMetricValue {
  /** 採用値（fallback 適用後） */
  readonly value: number | null
  /** 警告があるか */
  readonly hasWarning: boolean
  /** fallback が適用されたか */
  readonly isFallback: boolean
  /** authoritativeOwner */
  readonly owner: MetricMeta['authoritativeOwner']
}

// ── 公開関数 ──

/**
 * fallbackRule に基づいて値を解決する
 *
 * - 'zero': null/undefined → 0
 * - 'null': null/undefined → null（そのまま）
 * - 'none': フォールバックなし（null/undefined → null）
 * - 'estimated': 推定値として扱う（null/undefined → null）
 */
export function applyFallbackRule(
  value: number | null | undefined,
  rule: FallbackRule | undefined,
): { value: number | null; isFallback: boolean } {
  if (value != null) {
    return { value, isFallback: false }
  }
  switch (rule) {
    case 'zero':
      return { value: 0, isFallback: true }
    case 'null':
    case 'none':
    case 'estimated':
    case undefined:
      return { value: null, isFallback: true }
  }
}

/**
 * 指標の警告を検出する
 *
 * metricWarnings（CalculationResult 由来）と warningRule を照合し、
 * 該当する警告があるかを判定する。
 */
export function hasMetricWarning(
  metricId: MetricId,
  metricWarnings: ReadonlyMap<string, readonly string[]>,
): boolean {
  const meta = METRIC_DEFS[metricId]
  if (!meta.warningRule) return false
  const warnings = metricWarnings.get(metricId)
  if (!warnings || warnings.length === 0) return false
  return warnings.includes(meta.warningRule)
}

/**
 * 指標値を Registry に基づいて解決する
 *
 * fallbackRule を適用し、warningRule を検出し、authoritativeOwner を返す。
 */
export function resolveMetricValue(
  metricId: MetricId,
  rawValue: number | null | undefined,
  metricWarnings: ReadonlyMap<string, readonly string[]>,
): ResolvedMetricValue {
  const meta = METRIC_DEFS[metricId]
  const { value, isFallback } = applyFallbackRule(rawValue, meta.fallbackRule)
  const hasWarning = hasMetricWarning(metricId, metricWarnings)

  return {
    value,
    hasWarning,
    isFallback,
    owner: meta.authoritativeOwner,
  }
}

/**
 * 指標の authoritativeOwner を取得する
 */
export function getMetricOwner(metricId: MetricId): MetricMeta['authoritativeOwner'] {
  return METRIC_DEFS[metricId].authoritativeOwner
}

/**
 * 指標の fallbackRule を取得する
 */
export function getMetricFallbackRule(metricId: MetricId): FallbackRule | undefined {
  return METRIC_DEFS[metricId].fallbackRule
}

/**
 * Registry に authoritativeOwner が設定されている指標の一覧を返す
 */
export function getRegisteredMetricIds(): readonly MetricId[] {
  return (Object.keys(METRIC_DEFS) as MetricId[]).filter(
    (id) => METRIC_DEFS[id].authoritativeOwner != null,
  )
}
