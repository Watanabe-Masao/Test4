/**
 * コンディション閾値の解決
 *
 * 3層マージ: registry default → global config → store override
 */
import type {
  ConditionMetricId,
  ConditionSummaryConfig,
  ResolvedConditionMetric,
  ThresholdSet,
} from '../models/ConditionConfig'
import { CONDITION_METRIC_DEFS, CONDITION_METRIC_MAP } from '../constants/conditionMetrics'

/**
 * 指定店舗の全メトリクスを解決する。
 *
 * @param config ユーザー設定（global + storeOverrides）
 * @param storeId 対象店舗ID（undefined = グローバルのみ）
 * @returns 解決済みメトリクス配列（表示順序順、enabled=true のみ）
 */
export function resolveConditionMetrics(
  config: ConditionSummaryConfig,
  storeId?: string,
): readonly ResolvedConditionMetric[] {
  return CONDITION_METRIC_DEFS.map((def) => {
    const globalCfg = config.global[def.id]
    const storeCfg = storeId ? config.storeOverrides[storeId]?.[def.id] : undefined

    // enabled: store > global > true（デフォルト有効）
    const enabled = storeCfg?.enabled ?? globalCfg?.enabled ?? true

    // thresholds: store > global > registry default（フィールドごとにマージ）
    const thresholds: ThresholdSet = {
      blue: storeCfg?.thresholds?.blue ?? globalCfg?.thresholds?.blue ?? def.defaults.blue,
      yellow: storeCfg?.thresholds?.yellow ?? globalCfg?.thresholds?.yellow ?? def.defaults.yellow,
      red: storeCfg?.thresholds?.red ?? globalCfg?.thresholds?.red ?? def.defaults.red,
    }

    return {
      id: def.id,
      label: def.label,
      direction: def.direction,
      unit: def.unit,
      thresholds,
      enabled,
    }
  }).filter((m) => m.enabled)
}

/**
 * 単一メトリクスの閾値を解決する（ConditionSummary 内部のシグナル判定用）。
 */
export function resolveThresholds(
  config: ConditionSummaryConfig,
  metricId: ConditionMetricId,
  storeId?: string,
): ThresholdSet {
  const def = CONDITION_METRIC_MAP.get(metricId)
  if (!def) return { blue: 0, yellow: 0, red: 0 }

  const globalCfg = config.global[metricId]
  const storeCfg = storeId ? config.storeOverrides[storeId]?.[metricId] : undefined

  return {
    blue: storeCfg?.thresholds?.blue ?? globalCfg?.thresholds?.blue ?? def.defaults.blue,
    yellow: storeCfg?.thresholds?.yellow ?? globalCfg?.thresholds?.yellow ?? def.defaults.yellow,
    red: storeCfg?.thresholds?.red ?? globalCfg?.thresholds?.red ?? def.defaults.red,
  }
}

/**
 * メトリクスが有効かどうかを判定する。
 */
export function isMetricEnabled(
  config: ConditionSummaryConfig,
  metricId: ConditionMetricId,
  storeId?: string,
): boolean {
  const globalCfg = config.global[metricId]
  const storeCfg = storeId ? config.storeOverrides[storeId]?.[metricId] : undefined
  return storeCfg?.enabled ?? globalCfg?.enabled ?? true
}

/**
 * 値と閾値からシグナルレベルを判定する。
 *
 * direction === 'higher_better': value >= blue → blue, >= yellow → yellow, ...
 * direction === 'lower_better': value <= blue → blue, <= yellow → yellow, ...
 */
export function evaluateSignal(
  value: number,
  thresholds: ThresholdSet,
  direction: 'higher_better' | 'lower_better',
): 'blue' | 'yellow' | 'red' | 'warning' {
  if (direction === 'higher_better') {
    if (value >= thresholds.blue) return 'blue'
    if (value >= thresholds.yellow) return 'yellow'
    if (value >= thresholds.red) return 'red'
    return 'warning'
  }
  // lower_better
  if (value <= thresholds.blue) return 'blue'
  if (value <= thresholds.yellow) return 'yellow'
  if (value <= thresholds.red) return 'red'
  return 'warning'
}
