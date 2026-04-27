/**
 * 分析・説明・永続化・メトリクス型エクスポート
 *
 * @responsibility R:unclassified
 */
export type {
  MetricId,
  MetricTokens,
  MetricMeta,
  MetricAcceptancePolicy,
  MetricUnit,
  EvidenceRef,
  ExplanationInput,
  BreakdownDetail,
  BreakdownEntry,
  FormulaDetail,
  Explanation,
  StoreExplanations,
} from './Explanation'
export type { FormulaId, FormulaCategory, FormulaInput, FormulaMeta } from './Formula'
export type { DrillType, DrillAction } from './AnalysisContext'
export type {
  PersistedMeta,
  FieldChange,
  DataTypeDiff,
  DiffResult,
  ImportHistoryEntry,
  ImportHistoryFile,
} from './Persistence'
export type {
  RecordStorageDataType,
  ImportScope,
  RecordAdd,
  RecordUpdate,
  RecordDelete,
  RecordChange,
  ImportOperation,
  MonthDataUpdate,
  SourceFileInfo,
  ImportPlan,
  ImportPlanSummary,
  StoredRecord,
} from './ScopeResolution'
export { summarizeImportPlan } from './ScopeResolution'
export type { RawFileRecord, RawDataManifest } from './RawData'
export type {
  ImportExecution,
  ImportedArtifact,
  MonthAttribution,
  SaveRawArtifactRequest,
} from './ImportProvenance'
export type {
  ThresholdSet,
  ThresholdDirection,
  ThresholdUnit,
  ConditionMetricId,
  ConditionMetricDef,
  ConditionMetricUserConfig,
  ConditionSummaryConfig,
  ResolvedConditionMetric,
} from './ConditionConfig'
export type { ObservationPeriod, ObservationStatus } from './ObservationPeriod'
export type { AggregateMode, HierarchyFilter, UnifiedFilterState } from './UnifiedFilter'
export { EMPTY_HIERARCHY } from './UnifiedFilter'
export type { FetchStatus, ValidatedFetchResult, DataValidation } from './DataFetchResult'
export { validateRecords } from './DataFetchResult'
