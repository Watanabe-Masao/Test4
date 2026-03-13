/**
 * 比較データ読込フック — ComparisonScope ベースのデータ取得
 *
 * ComparisonScope.queryRanges に基づいて IndexedDB からデータを取得し、
 * 隣接月マージ済みの比較データを dataStore に書き込む。
 *
 * ## 旧 useAutoLoadPrevYear との違い
 *
 * - 入力: settings ではなく ComparisonScope（periodSelection 由来）
 * - エラー: catch {} で握り潰さず ComparisonLoadStatus で返す
 * - 読込範囲: queryRanges で明示指定（月跨ぎ・sameDow 拡張に対応）
 */
import { useEffect, useReducer, useRef } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { invalidateAfterStateChange } from '@/application/services/stateInvalidation'
import { useRepository } from '../context/useRepository'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import { loadComparisonDataAsync } from '@/application/comparison/loadComparisonDataAsync'

// 型と純粋ロジックは comparisonLoadLogic.ts に分離済み
export type { ComparisonLoadStatus } from '@/application/comparison/comparisonLoadLogic'
import {
  type ComparisonLoadStatus,
  IDLE_STATUS,
  loadReducer,
  monthKey,
} from '@/application/comparison/comparisonLoadLogic'

// ── フック ──

/**
 * ComparisonScope に基づいて比較データを読み込む。
 *
 * scope が null の場合は idle 状態を返す。
 * scope.queryRanges の月をすべて IndexedDB から取得し、
 * 隣接月マージ済みデータを dataStore に書き込む。
 */
export function useLoadComparisonData(scope: ComparisonScope | null): ComparisonLoadStatus {
  const data = useDataStore((s) => s.data)
  const repo = useRepository()
  const [loadStatus, dispatch] = useReducer(loadReducer, IDLE_STATUS)
  const prevScopeKey = useRef<string>('')

  const hasComparisonData = data.prevYearClassifiedSales.records.length > 0
  const hasCurrentData = data.classifiedSales.records.length > 0

  const shouldLoad = scope != null && hasCurrentData

  useEffect(() => {
    if (!shouldLoad || !scope) return

    // scope が変わっていなければ再ロードしない
    const scopeKey = scope.queryRanges.map(monthKey).join(',')
    if (scopeKey === prevScopeKey.current && hasComparisonData) return
    prevScopeKey.current = scopeKey

    // 既にデータがある場合はスキップ（明示インポート優先）
    if (hasComparisonData) return

    const source = scope.sourceMonth
    if (!source || source.year === 0) return

    let cancelled = false

    loadComparisonDataAsync(
      repo,
      source.year,
      source.month,
      scope.queryRanges,
      dispatch,
      () => cancelled,
    )
      .then((result) => {
        if (cancelled || !result) return
        useDataStore.getState().setPrevYearAutoData(result)
        invalidateAfterStateChange()
      })
      .catch((err) => {
        if (!cancelled) {
          dispatch({
            type: 'error',
            requestedRanges: scope.queryRanges,
            loadedRanges: [],
            error: err instanceof Error ? err.message : 'Unknown error loading comparison data',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [shouldLoad, scope, hasComparisonData, hasCurrentData, repo])

  if (!shouldLoad) return IDLE_STATUS
  return loadStatus
}
