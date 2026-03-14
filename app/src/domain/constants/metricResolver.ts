/**
 * Metric Definition Registry の実利用ユーティリティ
 *
 * METRIC_DEFS の authoritativeOwner / fallbackRule / warningRule を
 * 実際の計算結果に適用し、正式値の判定と警告の解決を行う。
 *
 * ## 責務
 * 3層に分かれる:
 * 1. raw value resolution — fallbackRule に基づく値の解決
 * 2. fallback / warning evaluation — warningRule に基づく警告検出
 * 3. authoritative acceptance — 正式採用可否の判定
 *
 * ## 利用箇所
 * - storeAssembler: 計算結果の最終採用判定
 * - ExplanationService: 警告の表示判定
 * - UI: 指標の信頼性表示
 */
import type { MetricId, MetricMeta, FallbackRule } from '../models/Explanation'
import type { CalculationStatus } from '../models/CalculationResult'
import type { WarningSeverity } from './warningCatalog'
import { getMaxSeverity } from './warningCatalog'
import { METRIC_DEFS } from './metricDefs'

// ── 指標値の解決結果（後方互換） ──

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

// ── 強化版解決結果 ──

/** 指標解決の採用ステータス */
export type ResolutionStatus = 'ok' | 'partial' | 'invalid' | 'estimated' | 'fallback'

/**
 * 強化版の指標解決結果
 *
 * resolveMetricValue() の上位版。
 * authoritative 採用可否と exploratory 表示可否を返す。
 */
export interface MetricResolution {
  /** 採用値（fallback 適用後） */
  readonly value: number | null
  /** 解決ステータス */
  readonly status: ResolutionStatus
  /** 警告コード一覧 */
  readonly warnings: readonly string[]
  /** 最大 severity */
  readonly maxSeverity: WarningSeverity | null
  /** authoritative として正式採用してよいか */
  readonly authoritativeAccepted: boolean
  /** exploratory として表示してよいか */
  readonly exploratoryAllowed: boolean
  /** authoritativeOwner */
  readonly owner: MetricMeta['authoritativeOwner']
  /** fallback が適用されたか */
  readonly isFallback: boolean
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
 * 指標値を Registry に基づいて解決する（後方互換版）
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
 * 強化版の指標値解決
 *
 * authoritative 採用可否と exploratory 表示可否まで判定する。
 *
 * ## ステータス判定ルール
 * - invalid: warningRule に critical が含まれる → authoritative 不可
 * - partial: 値はあるが warning あり → exploratory 可、authoritative 原則不可
 * - estimated: fallbackRule='estimated' かつ fallback 適用 → metric ごとの判断
 * - fallback: fallback が適用された → exploratory 可
 * - ok: 問題なし → 全可
 *
 * ## authoritative 採用可否
 * - ok → 可
 * - fallback (fallbackRule='zero') → 可（0 は妥当な業務値）
 * - estimated → 不可
 * - partial → 不可
 * - invalid → 不可
 *
 * ## exploratory 表示可否
 * - ok / fallback / estimated / partial → 可
 * - invalid → 不可
 */
export function resolveMetric(
  metricId: MetricId,
  rawValue: number | null | undefined,
  metricWarnings: ReadonlyMap<string, readonly string[]>,
  calculationStatus?: CalculationStatus,
): MetricResolution {
  const meta = METRIC_DEFS[metricId]
  const { value, isFallback } = applyFallbackRule(rawValue, meta.fallbackRule)
  const warnings = metricWarnings.get(metricId) ?? []
  const maxSeverity = getMaxSeverity(warnings)

  // ── status 判定 ──
  const status = determineStatus(
    value,
    isFallback,
    meta.fallbackRule,
    maxSeverity,
    calculationStatus,
  )

  // ── authoritative / exploratory 判定 ──
  const authoritativeAccepted = isAuthoritativeAccepted(status, meta.fallbackRule)
  const exploratoryAllowed = status !== 'invalid'

  return {
    value,
    status,
    warnings,
    maxSeverity,
    authoritativeAccepted,
    exploratoryAllowed,
    owner: meta.authoritativeOwner,
    isFallback,
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

// ── 内部関数 ──

/**
 * ResolutionStatus を判定する
 */
function determineStatus(
  value: number | null,
  isFallback: boolean,
  fallbackRule: FallbackRule | undefined,
  maxSeverity: WarningSeverity | null,
  calculationStatus?: CalculationStatus,
): ResolutionStatus {
  // CalculationStatus が直接渡された場合はそれを優先
  if (calculationStatus === 'invalid') return 'invalid'
  if (calculationStatus === 'partial') return 'partial'
  if (calculationStatus === 'estimated') return 'estimated'

  // critical warning → invalid
  if (maxSeverity === 'critical') return 'invalid'

  // warning あり → partial
  if (maxSeverity === 'warning') return 'partial'

  // fallback 適用済み
  if (isFallback) {
    if (fallbackRule === 'estimated') return 'estimated'
    // fallback で値が null（fallbackRule='null'/'none' 等）→ 計算不能
    if (value === null) return 'invalid'
    return 'fallback'
  }

  // 値が null（fallback なしで null）
  if (value === null) return 'invalid'

  return 'ok'
}

/**
 * authoritative 採用可否を判定する
 */
function isAuthoritativeAccepted(
  status: ResolutionStatus,
  fallbackRule: FallbackRule | undefined,
): boolean {
  switch (status) {
    case 'ok':
      return true
    case 'fallback':
      // fallbackRule='zero' の場合、0 は妥当な業務値なので採用可
      return fallbackRule === 'zero'
    case 'estimated':
    case 'partial':
    case 'invalid':
      return false
  }
}
