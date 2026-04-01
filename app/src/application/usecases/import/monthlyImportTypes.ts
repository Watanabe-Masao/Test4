/**
 * Import パイプライン用の MonthlyData ベース型定義
 *
 * ImportedData に依存しない import 内部の型を定義する。
 * processDroppedFiles() の結果を月別 MonthlyData に変換した後、
 * これらの型で import ロジックを駆動する。
 */
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { DiffResult } from '@/domain/models/analysis'
import type { ImportSummary, MonthPartitions } from './FileImportService'
import type { ImportSideEffects } from './ImportOrchestrator'
import type { ValidationMessage } from '@/domain/models/record'

/** 月別 MonthlyData のバッチ（processDroppedFiles → 月分割後） */
export interface MonthlyImportBatch {
  readonly months: ReadonlyMap<string, MonthlyData>
  readonly detectedYearMonth: { year: number; month: number } | null
  readonly monthPartitions: MonthPartitions
  readonly summary: ImportSummary
}

/** 差分確認の保留情報（MonthlyData ベース） */
export interface MonthlyPendingDiffCheck {
  readonly diffResult: DiffResult
  readonly incomingByMonth: ReadonlyMap<string, MonthlyData>
  readonly existingByMonth: ReadonlyMap<string, MonthlyData>
  readonly primaryMonthKey: string
  readonly importedTypes: ReadonlySet<string>
  readonly summary: ImportSummary
  readonly monthPartitions: MonthPartitions
}

/** orchestrateImport の結果（MonthlyData ベース） */
export interface MonthlyImportResult {
  readonly summary: ImportSummary
  readonly finalData: MonthlyData | null
  readonly pendingDiff: MonthlyPendingDiffCheck | null
  readonly detectedMaxDay: number
  readonly validationMessages: readonly ValidationMessage[] | null
  readonly detectedYearMonth: { year: number; month: number } | null
}

/** resolveImportDiff の結果（MonthlyData ベース） */
export interface MonthlyResolveDiffResult {
  readonly finalData: MonthlyData
  readonly detectedMaxDay: number
  readonly validationMessages: readonly ValidationMessage[]
}

// Re-export for convenience
export type { ImportSideEffects }
