/**
 * @responsibility R:unclassified
 */

export {
  createDefaultSettings,
  COST_RATE_MIN,
  COST_RATE_MAX,
  ALL_STORES_ID,
  getDaysInMonth,
} from './defaults'
export {
  DAYS_PER_WEEK,
  DAYS_PER_YEAR,
  MILLISECONDS_PER_DAY,
  MONTHS_PER_YEAR,
  DOW_ALIGNMENT_WINDOW,
  DEFAULT_WMA_WINDOW,
  SHORT_TERM_MA_MONTHS,
  MEDIUM_TERM_MA_MONTHS,
  DIVERGENCE_DETECTION_THRESHOLD,
  CONFIDENCE_95_ZSCORE,
  ANOMALY_ZSCORE_THRESHOLD,
  TREND_CHANGE_THRESHOLD,
  MANYEN_DIVISOR,
  AMOUNT_RECONCILIATION_TOLERANCE,
  PI_MULTIPLIER,
} from './calculationConstants'
export { CATEGORY_LABELS, CATEGORY_ORDER } from './categories'
export { METRIC_DEFS } from './metricDefs'
export { FORMULA_REGISTRY } from './formulaRegistry'
export {
  getWarningEntry,
  getWarningLabel,
  getWarningMessage,
  getWarningSeverity,
  getWarningCategory,
  resolveWarnings,
  getMaxSeverity,
  getAllWarningCodes,
} from './warningCatalog'
export type { WarningCategory, WarningSeverity, WarningEntry } from './warningCatalog'
export { resolveMetric, deriveDisplayMode } from './metricResolver'
export type { DisplayMode, MetricResolution } from './metricResolver'
export type {
  PresetCategoryId,
  UserCategoryId,
  CustomCategoryId,
  CustomCategoryDef,
} from './customCategories'
export {
  isPresetCategory,
  isUserCategory,
  isCustomCategoryId,
  PRESET_CATEGORY_DEFS,
  PRESET_CATEGORY_LABELS,
  LEGACY_LABEL_TO_ID,
  createUserCategoryId,
} from './customCategories'
