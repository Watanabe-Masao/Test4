// ─── Calculation use case ────────────────────────────────
export {
  calculateStoreResult,
  calculateAllStores,
  aggregateStoreResults,
} from './calculation'

// ─── Import use case ─────────────────────────────────────
export {
  validateImportedData,
  hasValidationErrors,
  processDroppedFiles,
} from './import'
export type { ImportSummary, FileImportResult, ProgressCallback } from './import'

// ─── Explanation use case ────────────────────────────────
export { generateExplanations } from './explanation'
