/**
 * コンディション閾値の解決
 *
 * 3層マージ: registry default → global config → store override
 *
 * @responsibility R:unclassified
 */
import type {
  ConditionMetricId,
  ConditionSummaryConfig,
  ThresholdSet,
} from '@/domain/calculations/../models/ConditionConfig'
import { CONDITION_METRIC_MAP } from '@/domain/calculations/../constants/conditionMetrics'

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
