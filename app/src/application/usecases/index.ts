// ─── Calculation use case ────────────────────────────────
export { calculateStoreResult, calculateAllStores, aggregateStoreResults } from './calculation'

// ─── Import use case ─────────────────────────────────────
export { validateImportData, hasValidationErrors, processDroppedFiles } from './import'
export type { ImportSummary, FileImportResult, ProgressCallback } from './import'

// ─── Explanation use case ────────────────────────────────
export { generateExplanations } from './explanation'

// ─── Clip Export use case ────────────────────────────────
export { buildClipBundle, renderClipHtml, downloadClipHtml } from './clipExport'
export type { ClipBundle, BuildClipBundleParams } from './clipExport'

// ─── Data Management use case ───────────────────────────
export { clearAllData } from './dataManagement'
export type { ClearAllDataEffects } from './dataManagement'
