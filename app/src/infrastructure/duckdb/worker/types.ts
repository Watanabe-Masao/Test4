/**
 * DuckDB Worker メッセージプロトコル型定義
 *
 * メインスレッド ↔ Worker 間の通信プロトコル。
 * 既存の calculationWorker.ts の requestId パターンを踏襲する。
 */
import type { ImportedData } from '@/domain/models'

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
  readonly data: ImportedData
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

export type DuckDBWorkerRequest =
  | InitializeRequest
  | ResetTablesRequest
  | LoadMonthRequest
  | DeleteMonthRequest
  | QueryRequest
  | DisposeRequest
  | CheckIntegrityRequest

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

export type DuckDBWorkerResponse =
  | SuccessResponse
  | ErrorResponse
  | StateChangeNotification

// ── Worker DB 状態 ──

export type WorkerDBState = 'idle' | 'initializing' | 'ready' | 'error' | 'disposed'
