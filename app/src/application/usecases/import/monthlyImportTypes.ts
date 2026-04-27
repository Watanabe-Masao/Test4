/**
 * Import パイプライン用の MonthlyData ベース型定義
 *
 * ImportedData に依存しない import 内部の型を定義する。
 * processDroppedFiles() の結果を月別 MonthlyData に変換した後、
 * これらの型で import ロジックを駆動する。
 *
 * @responsibility R:unclassified
 */
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { DiffResult } from '@/domain/models/analysis'
import type { ImportExecution } from '@/domain/models/ImportProvenance'
import type { ImportSummary, MonthPartitions } from './FileImportService'
import type { DataType } from '@/domain/models/storeTypes'
import type { DataRepository } from '@/domain/repositories'
import type { ValidationMessage } from '@/domain/models/record'

/** 月別 MonthlyData のバッチ（processDroppedFiles → 月分割後） */
export interface MonthlyImportBatch {
  readonly months: ReadonlyMap<string, MonthlyData>
  readonly detectedYearMonth: { year: number; month: number } | null
  readonly monthPartitions: MonthPartitions
  readonly summary: ImportSummary
  /** インポート実行の正本記録（Phase 2 で追加） */
  readonly execution: ImportExecution
  /** 月別に分離されたサマリー（月ごとの履歴保存用） */
  readonly summaryByMonth: ReadonlyMap<string, ImportSummary>
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

/** Orchestrator が必要とする外部操作（副作用の注入点） */
export interface ImportSideEffects {
  readonly repo: DataRepository
  readonly saveRawFile: (
    year: number,
    month: number,
    dataType: DataType,
    file: File | Blob,
    filename?: string,
    relativePath?: string,
  ) => Promise<void>
}
