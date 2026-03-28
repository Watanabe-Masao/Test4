/**
 * AsyncState<T> — 統一非同期状態型
 *
 * 全非同期データ取得操作の状態を統一的に表現する。
 * フレームワーク非依存（React import なし）。
 *
 * status の意味定義:
 * - idle: 入力未設定 or 初期状態（プレースホルダー表示）
 * - loading: 取得中、前回データなし（スピナー表示）
 * - success: 最新データ取得完了（通常表示）
 * - stale: 入力条件が変わったが再取得前の旧データを表示中
 * - partial: 一部データソース欠損だが表示継続可能
 * - retryable-error: 一時的エラー、再試行可能
 * - fatal-error: 復旧不能エラー
 *
 * 責務境界:
 * - stale の判定: hook（入力変更を検知した時点で旧データを stale に遷移）
 * - partial の判定: hook（データソース欠損を検知）。表示継続の可否は呼び出し側
 * - retryable vs fatal の判定: hook（エラー種別による分類）
 */

// ── 型定義 ──

export type AsyncStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'partial'
  | 'stale'
  | 'retryable-error'
  | 'fatal-error'

export interface AsyncDiagnostics {
  readonly message: string
  readonly retryable: boolean
  readonly staleSince?: Date
  readonly updatedAt?: Date
}

export interface AsyncState<T> {
  readonly status: AsyncStatus
  readonly data: T | null
  readonly error: Error | null
  readonly diagnostics?: AsyncDiagnostics
}

// ── ヘルパー ──

/** data が利用可能か（success / stale / partial のいずれか） */
export function isUsable<T>(state: AsyncState<T>): state is AsyncState<T> & { data: T } {
  return (
    state.data != null &&
    (state.status === 'success' || state.status === 'stale' || state.status === 'partial')
  )
}

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

export function asyncPartial<T>(data: T, diagnostics: AsyncDiagnostics): AsyncState<T> {
  return { status: 'partial', data, error: null, diagnostics }
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

/** AsyncState → AsyncQueryResult 変換 */
export function fromAsyncState<T>(state: AsyncState<T>): LegacyAsyncResult<T> {
  return {
    data: state.data,
    isLoading: state.status === 'loading' || state.status === 'stale',
    error: state.error,
  }
}
