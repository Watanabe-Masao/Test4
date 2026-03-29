/**
 * PersistenceContext 型定義
 *
 * 復元状態を Context で共有する。モジュールスコープ変数を排除し、
 * テストごとに自然にリセットされるようにする。
 */
import { createContext } from 'react'

export interface RestoreState {
  readonly isRestoring: boolean
  readonly autoRestored: boolean
  readonly restoreError: string | null
}

export const INITIAL_RESTORE_STATE: RestoreState = {
  isRestoring: false,
  autoRestored: false,
  restoreError: null,
}

/**
 * PersistenceContext — 復元状態を Provider ツリー経由で共有する。
 * デフォルト値は初期状態。PersistenceProvider が必ずラップする。
 */
export const PersistenceContext = createContext<RestoreState>(INITIAL_RESTORE_STATE)
