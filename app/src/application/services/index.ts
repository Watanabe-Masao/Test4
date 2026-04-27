/**
 * @responsibility R:unclassified
 */

// Re-export from usecases for backward compatibility
export {
  calculateStoreResult,
  calculateAllStores,
  aggregateStoreResults,
} from '@/application/usecases/calculation'
export {
  validateImportData,
  hasValidationErrors,
  processDroppedFiles,
} from '@/application/usecases/import'
export type {
  ImportSummary,
  FileImportResult,
  ProgressCallback,
} from '@/application/usecases/import'

// Cache (remains in services)
export {
  calculationCache,
  computeFingerprint,
  computeGlobalFingerprint,
  computeCacheKey,
  CalculationCache,
} from './calculationCache'
export { murmurhash3, hashData } from '@/domain/utilities/hash'
