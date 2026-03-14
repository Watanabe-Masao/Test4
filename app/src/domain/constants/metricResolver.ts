/**
 * Metric Definition Registry の実利用ユーティリティ
 *
 * METRIC_DEFS の authoritativeOwner / fallbackRule / warningRule を
 * 実際の計算結果に適用し、正式値の判定と警告の解決を行う。
 *
 * ## 3段階パイプライン
 * resolver は内部的に 3 段階で判定を行う:
 *
 * 1. **Raw Value Resolution** — fallbackRule に基づく値の解決
 *    入力: rawValue, fallbackRule
 *    出力: RawValueResolution { value, isFallback, fallbackRule }
 *
 * 2. **Warning Evaluation** — warnings の集約と severity 判定
 *    入力: metricId, metricWarnings
 *    出力: WarningEvaluation { warnings, maxSeverity, matchesWarningRule }
 *
 * 3. **Acceptance Decision** — authoritative/exploratory の採用判定
 *    入力: RawValueResolution + WarningEvaluation + calculationStatus
 *    出力: AcceptanceDecision { status, authoritativeAccepted, exploratoryAllowed }
 *
 * ## 設計原則
 * - KPI 特例は resolver 本体に if 分岐として増やさない
 * - KPI ごとの振る舞いは registry (METRIC_DEFS) のフィールドで決める
 * - resolver が読む registry フィールド: authoritativeOwner, sourceEngine, fallbackRule, warningRule
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

// ── Stage 1: Raw Value Resolution ──

/** Stage 1 の出力: fallbackRule 適用後の値 */
export interface RawValueResolution {
  /** 解決後の値 */
  readonly value: number | null
  /** fallback が適用されたか */
  readonly isFallback: boolean
  /** 適用された fallbackRule */
  readonly fallbackRule: FallbackRule | undefined
}

// ── Stage 2: Warning Evaluation ──

/** Stage 2 の出力: warnings の集約結果 */
export interface WarningEvaluation {
  /** 該当する警告コード一覧 */
  readonly warnings: readonly string[]
  /** 最大 severity */
  readonly maxSeverity: WarningSeverity | null
  /** warningRule にマッチする警告があるか */
  readonly matchesWarningRule: boolean
}

// ── Stage 3: Acceptance Decision ──

/** Stage 3 の出力: 採用判定結果 */
export interface AcceptanceDecision {
  /** 解決ステータス */
  readonly status: ResolutionStatus
  /** authoritative として正式採用してよいか */
  readonly authoritativeAccepted: boolean
  /** exploratory として表示してよいか */
  readonly exploratoryAllowed: boolean
}

// ── 最終解決結果 ──

/** 指標解決の採用ステータス */
export type ResolutionStatus = 'ok' | 'partial' | 'invalid' | 'estimated' | 'fallback'

/** 指標値の解決結果（後方互換） */
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

/**
 * 強化版の指標解決結果
 *
 * 3段階パイプラインの最終出力。
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

// ── Stage 1: Raw Value Resolution ──

/**
 * Stage 1: fallbackRule に基づいて値を解決する
 *
 * - 'zero': null/undefined → 0
 * - 'null': null/undefined → null（そのまま）
 * - 'none': フォールバックなし（null/undefined → null）
 * - 'estimated': 推定値として扱う（null/undefined → null）
 */
export function resolveRawValue(
  rawValue: number | null | undefined,
  fallbackRule: FallbackRule | undefined,
): RawValueResolution {
  if (rawValue != null) {
    return { value: rawValue, isFallback: false, fallbackRule }
  }
  switch (fallbackRule) {
    case 'zero':
      return { value: 0, isFallback: true, fallbackRule }
    case 'null':
    case 'none':
    case 'estimated':
    case undefined:
      return { value: null, isFallback: true, fallbackRule }
  }
}

/**
 * 後方互換: applyFallbackRule
 */
export function applyFallbackRule(
  value: number | null | undefined,
  rule: FallbackRule | undefined,
): { value: number | null; isFallback: boolean } {
  const result = resolveRawValue(value, rule)
  return { value: result.value, isFallback: result.isFallback }
}

// ── Stage 2: Warning Evaluation ──

/**
 * Stage 2: warnings を集約し severity を判定する
 *
 * metricWarnings から該当 metricId の warnings を取得し、
 * warningRule とのマッチングを行う。
 */
export function evaluateWarnings(
  metricId: MetricId,
  metricWarnings: ReadonlyMap<string, readonly string[]>,
): WarningEvaluation {
  const meta = METRIC_DEFS[metricId]
  const warnings = metricWarnings.get(metricId) ?? []
  const maxSeverity = getMaxSeverity(warnings)
  const matchesWarningRule =
    meta.warningRule != null && warnings.length > 0 && warnings.includes(meta.warningRule)

  return { warnings, maxSeverity, matchesWarningRule }
}

/**
 * 後方互換: hasMetricWarning
 */
export function hasMetricWarning(
  metricId: MetricId,
  metricWarnings: ReadonlyMap<string, readonly string[]>,
): boolean {
  return evaluateWarnings(metricId, metricWarnings).matchesWarningRule
}

// ── Stage 3: Acceptance Decision ──

/**
 * Stage 3: authoritative/exploratory の採用判定を行う
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
export function decideAcceptance(
  rawResolution: RawValueResolution,
  warningEval: WarningEvaluation,
  calculationStatus?: CalculationStatus,
): AcceptanceDecision {
  const status = determineStatus(
    rawResolution.value,
    rawResolution.isFallback,
    rawResolution.fallbackRule,
    warningEval.maxSeverity,
    calculationStatus,
  )

  const authoritativeAccepted = isAuthoritativeAccepted(status, rawResolution.fallbackRule)
  const exploratoryAllowed = status !== 'invalid'

  return { status, authoritativeAccepted, exploratoryAllowed }
}

// ── 統合: resolveMetric (公開 API) ──

/**
 * 強化版の指標値解決（公開 API）
 *
 * 3段階パイプラインを組み立てて最終結果を返す。
 */
export function resolveMetric(
  metricId: MetricId,
  rawValue: number | null | undefined,
  metricWarnings: ReadonlyMap<string, readonly string[]>,
  calculationStatus?: CalculationStatus,
): MetricResolution {
  const meta = METRIC_DEFS[metricId]

  // Stage 1: Raw Value Resolution
  const rawResolution = resolveRawValue(rawValue, meta.fallbackRule)

  // Stage 2: Warning Evaluation
  const warningEval = evaluateWarnings(metricId, metricWarnings)

  // Stage 3: Acceptance Decision
  const acceptance = decideAcceptance(rawResolution, warningEval, calculationStatus)

  return {
    value: rawResolution.value,
    status: acceptance.status,
    warnings: warningEval.warnings,
    maxSeverity: warningEval.maxSeverity,
    authoritativeAccepted: acceptance.authoritativeAccepted,
    exploratoryAllowed: acceptance.exploratoryAllowed,
    owner: meta.authoritativeOwner,
    isFallback: rawResolution.isFallback,
  }
}

/**
 * 後方互換: resolveMetricValue
 */
export function resolveMetricValue(
  metricId: MetricId,
  rawValue: number | null | undefined,
  metricWarnings: ReadonlyMap<string, readonly string[]>,
): ResolvedMetricValue {
  const meta = METRIC_DEFS[metricId]
  const { value, isFallback } = resolveRawValue(rawValue, meta.fallbackRule)
  const hasWarning = hasMetricWarning(metricId, metricWarnings)

  return {
    value,
    hasWarning,
    isFallback,
    owner: meta.authoritativeOwner,
  }
}

// ── ユーティリティ（公開） ──

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
