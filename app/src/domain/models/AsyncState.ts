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

// ファクトリ関数・レガシーアダプタは AsyncStateFactories.ts に分離
