/**
 * 比較データ読込の純粋ロジック
 *
 * useLoadComparisonData.ts から分離した純粋関数群。
 * React に依存せず、単体テスト可能。
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 *
 * @responsibility R:unclassified
 */
import type { QueryMonth } from '@/domain/models/ComparisonScope'

// ── 型定義 ──

/** 比較データ読込状態 */
export interface ComparisonLoadStatus {
  readonly status: 'idle' | 'loading' | 'success' | 'partial' | 'error'
  readonly requestedRanges: readonly QueryMonth[]
  readonly loadedRanges: readonly QueryMonth[]
  readonly lastError: string | null
}

export const IDLE_STATUS: ComparisonLoadStatus = {
  status: 'idle',
  requestedRanges: [],
  loadedRanges: [],
  lastError: null,
}

export type LoadAction =
  | { type: 'start'; requestedRanges: readonly QueryMonth[] }
  | { type: 'success'; requestedRanges: readonly QueryMonth[]; loadedRanges: readonly QueryMonth[] }
  | {
      type: 'partial'
      requestedRanges: readonly QueryMonth[]
      loadedRanges: readonly QueryMonth[]
      error: string
    }
  | {
      type: 'error'
      requestedRanges: readonly QueryMonth[]
      loadedRanges: readonly QueryMonth[]
      error: string
    }

// ── Reducer ──

/** 読込状態遷移 */
export function loadReducer(
  _state: ComparisonLoadStatus,
  action: LoadAction,
): ComparisonLoadStatus {
  switch (action.type) {
    case 'start':
      return {
        status: 'loading',
        requestedRanges: action.requestedRanges,
        loadedRanges: [],
        lastError: null,
      }
    case 'success':
      return {
        status: 'success',
        requestedRanges: action.requestedRanges,
        loadedRanges: action.loadedRanges,
        lastError: null,
      }
    case 'partial':
      return {
        status: 'partial',
        requestedRanges: action.requestedRanges,
        loadedRanges: action.loadedRanges,
        lastError: action.error,
      }
    case 'error':
      return {
        status: 'error',
        requestedRanges: action.requestedRanges,
        loadedRanges: action.loadedRanges,
        lastError: action.error,
      }
  }
}

// ── ユーティリティ ──

/** QueryMonth 配列からソース月（中心月）を決定する */
export function findSourceMonth(queryRanges: readonly QueryMonth[]): QueryMonth | null {
  if (queryRanges.length === 0) return null
  const mid = Math.floor(queryRanges.length / 2)
  return queryRanges[mid]
}

/** QueryMonth のキー文字列 */
export function monthKey(m: QueryMonth): string {
  return `${m.year}-${m.month}`
}
