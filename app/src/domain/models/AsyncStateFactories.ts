/**
 * AsyncState ファクトリ関数 + レガシーアダプタ
 *
 * AsyncState.ts から分離。状態生成関数とレガシー変換を担う。
 *
 * @responsibility R:unclassified
 */
import type { AsyncState } from './AsyncState'
import { isUsable } from './AsyncState'

// ── ファクトリ ──

export function asyncIdle<T>(): AsyncState<T> {
  return { status: 'idle', data: null, error: null }
}

/**
 * loading 状態を生成する。
 * prev が usable（data あり）の場合は stale に遷移（旧データ表示継続）。
 * prev が usable でない場合は loading（スピナー表示）。
 */
export function asyncLoading<T>(prev?: AsyncState<T>): AsyncState<T> {
  if (prev && isUsable(prev)) {
    return {
      status: 'stale',
      data: prev.data,
      error: null,
      diagnostics: { message: 'Refetching', retryable: false, staleSince: new Date() },
    }
  }
  return { status: 'loading', data: null, error: null }
}

export function asyncSuccess<T>(data: T): AsyncState<T> {
  return {
    status: 'success',
    data,
    error: null,
    diagnostics: { message: '', retryable: false, updatedAt: new Date() },
  }
}

export function asyncStale<T>(data: T, staleSince: Date): AsyncState<T> {
  return {
    status: 'stale',
    data,
    error: null,
    diagnostics: { message: 'Stale data', retryable: false, staleSince },
  }
}

export function asyncRetryableError<T>(error: Error): AsyncState<T> {
  return {
    status: 'retryable-error',
    data: null,
    error,
    diagnostics: { message: error.message, retryable: true },
  }
}

export function asyncFatalError<T>(error: Error): AsyncState<T> {
  return {
    status: 'fatal-error',
    data: null,
    error,
    diagnostics: { message: error.message, retryable: false },
  }
}

// ── Adapter（AsyncQueryResult<T> との互換） ──

/** AsyncQueryResult 互換形状 */
interface LegacyAsyncResult<T> {
  readonly data: T | null
  readonly isLoading: boolean
  readonly error: Error | null
}

/** AsyncQueryResult → AsyncState 変換 */
export function toAsyncState<T>(result: LegacyAsyncResult<T>): AsyncState<T> {
  if (result.error) {
    return asyncFatalError<T>(result.error)
  }
  if (result.isLoading) {
    return result.data != null ? asyncStale(result.data, new Date()) : asyncLoading<T>()
  }
  if (result.data != null) {
    return asyncSuccess(result.data)
  }
  return asyncIdle<T>()
}

// fromAsyncState — 利用箇所なし。必要時に復活可能
