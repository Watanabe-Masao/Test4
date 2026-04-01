/**
 * DuckDB Worker メッセージプロトコル型定義
 *
 * メインスレッド ↔ Worker 間の通信プロトコル。
 * 既存の calculationWorker.ts の requestId パターンを踏襲する。
 */
import type { MonthlyData } from '@/domain/models/MonthlyData'

// ── リクエスト ──

export interface InitializeRequest {
  readonly type: 'initialize'
  readonly requestId: number
}

export interface ResetTablesRequest {
  readonly type: 'resetTables'
  readonly requestId: number
}

export interface LoadMonthRequest {
  readonly type: 'loadMonth'
  readonly data: MonthlyData
  readonly year: number
  readonly month: number
  readonly requestId: number
}

export interface DeleteMonthRequest {
  readonly type: 'deleteMonth'
  readonly year: number
  readonly month: number
  readonly requestId: number
}

export interface QueryRequest {
  readonly type: 'query'
  readonly sql: string
  readonly requestId: number
}

export interface DisposeRequest {
  readonly type: 'dispose'
  readonly requestId: number
}

export interface CheckIntegrityRequest {
  readonly type: 'checkIntegrity'
  readonly requestId: number
}

/** OPFS 上のテーブルを Parquet にエクスポートする */
export interface ExportParquetRequest {
  readonly type: 'exportParquet'
  readonly requestId: number
}

/** OPFS 上の Parquet からテーブルにインポートする */
export interface ImportParquetRequest {
  readonly type: 'importParquet'
  readonly requestId: number
}

/** CSV レポートを Worker 内で生成する */
export interface GenerateReportRequest {
  readonly type: 'generateReport'
  readonly reportType: 'dailySales' | 'storeKpi' | 'monthlyPL'
  readonly sql: string
  readonly requestId: number
}

export type DuckDBWorkerRequest =
  | InitializeRequest
  | ResetTablesRequest
  | LoadMonthRequest
  | DeleteMonthRequest
  | QueryRequest
  | DisposeRequest
  | CheckIntegrityRequest
  | ExportParquetRequest
  | ImportParquetRequest
  | GenerateReportRequest

// ── レスポンス ──

export interface SuccessResponse {
  readonly type: 'result'
  readonly data: unknown
  readonly requestId: number
}

export interface ErrorResponse {
  readonly type: 'error'
  readonly message: string
  readonly requestId: number
}

export interface StateChangeNotification {
  readonly type: 'state-change'
  readonly state: WorkerDBState
}

export type DuckDBWorkerResponse = SuccessResponse | ErrorResponse | StateChangeNotification

// ── Worker DB 状態 ──

export type WorkerDBState = 'idle' | 'initializing' | 'ready' | 'error' | 'disposed'

// ── OPFS 永続化関連 ──

export interface IntegrityCheckResult {
  readonly schemaValid: boolean
  readonly monthCount: number
  readonly isOpfsPersisted: boolean
  /** OPFS に Parquet ファイルが存在するか */
  readonly hasParquetCache: boolean
}

export interface ParquetExportResult {
  readonly tablesExported: number
  readonly totalRows: number
  readonly durationMs: number
}

export interface ParquetImportResult {
  readonly tablesImported: number
  readonly totalRows: number
  readonly durationMs: number
}

export interface ReportGenerateResult {
  readonly csvContent: string
  readonly rowCount: number
}
