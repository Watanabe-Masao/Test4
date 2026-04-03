/**
 * runtime-adapters — DuckDB エンジン・データロード・復旧・i18n のランタイム境界
 *
 * application/ → infrastructure/ の正当な依存を runtime-adapters/ に集約する。
 * これにより application/hooks/ の一般フックは infrastructure/ に依存しなくなる。
 */
export { useDuckDB } from './useDuckDB'
export type { DuckDBHookResult } from './useDuckDB'
export { useEngineLifecycle } from './useEngineLifecycle'
export { useDataRecovery } from './useDataRecovery'
export type { RawFileGroup } from './useDataRecovery'
export {
  useRawDailySummary,
  useRawDailyRecords,
  useRawCategoryTimeRecords,
} from './useRawDataFetch'
export { useI18n } from './useI18n'
export type { I18nContextValue } from './useI18n'
export { useAppLifecycle } from './useAppLifecycle'
export type { UseAppLifecycleInput } from './useAppLifecycle'

// Runtime state machine types
export type { RuntimePhase, RuntimeState } from './runtimeTypes'
export { isBlockingPhase, INITIAL_RUNTIME_STATE } from './runtimeTypes'
