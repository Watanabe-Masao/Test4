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
import { useUiStore } from '@/application/stores/uiStore'
import { calculationCache } from '@/application/services/calculationCache'
import { useRepository } from '../context/useRepository'
import { getDaysInMonth } from '@/domain/constants/defaults'
import type {
  ClassifiedSalesData,
  ClassifiedSalesRecord,
  CategoryTimeSalesData,
  CategoryTimeSalesRecord,
  SpecialSalesData,
} from '@/domain/models'
import type { ComparisonScope, QueryMonth } from '@/domain/models/ComparisonScope'
import { mergeAdjacentMonthRecords, adjacentMonth } from './useAutoLoadPrevYear'

// ── 型定義 ──

/** 比較データ読込状態 */
export interface ComparisonLoadStatus {
  readonly status: 'idle' | 'loading' | 'success' | 'partial' | 'error'
  readonly requestedRanges: readonly QueryMonth[]
  readonly loadedRanges: readonly QueryMonth[]
  readonly lastError: string | null
}

const IDLE_STATUS: ComparisonLoadStatus = {
  status: 'idle',
  requestedRanges: [],
  loadedRanges: [],
  lastError: null,
}

// ── Reducer ──

type LoadAction =
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

/** @internal テスト用にエクスポート */
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

/** QueryMonth 配列からソース月（中心月）を決定する @internal テスト用にエクスポート */
export function findSourceMonth(queryRanges: readonly QueryMonth[]): QueryMonth | null {
  if (queryRanges.length === 0) return null
  // 中央の月をソースとする（±1 拡張の中心）
  const mid = Math.floor(queryRanges.length / 2)
  return queryRanges[mid]
}

/** QueryMonth のキー文字列 @internal テスト用にエクスポート */
export function monthKey(m: QueryMonth): string {
  return `${m.year}-${m.month}`
}

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

    const source = findSourceMonth(scope.queryRanges)
    if (!source) return

    let cancelled = false
    const sourceYear = source.year
    const sourceMonth = source.month
    const ranges = scope.queryRanges

    dispatch({ type: 'start', requestedRanges: ranges })

    const prev = adjacentMonth(sourceYear, sourceMonth, -1)
    const next = adjacentMonth(sourceYear, sourceMonth, 1)

    ;(async () => {
      const loadedRanges: QueryMonth[] = []

      try {
        // ソース月のデータをロード
        const prevCS = await repo.loadDataSlice<ClassifiedSalesData>(
          sourceYear,
          sourceMonth,
          'classifiedSales',
        )
        if (cancelled || !prevCS || prevCS.records.length === 0) {
          if (!cancelled) {
            dispatch({
              type: 'partial',
              requestedRanges: ranges,
              loadedRanges: [],
              error: 'No classified sales data found for comparison period',
            })
          }
          return
        }
        loadedRanges.push({ year: sourceYear, month: sourceMonth })

        // カテゴリ時間帯売上
        const prevCTS = await repo.loadDataSlice<CategoryTimeSalesData>(
          sourceYear,
          sourceMonth,
          'categoryTimeSales',
        )
        if (cancelled) return

        // 前月（underflow 用）
        const prevPrevCS = await repo.loadDataSlice<ClassifiedSalesData>(
          prev.year,
          prev.month,
          'classifiedSales',
        )
        if (cancelled) return
        if (prevPrevCS) loadedRanges.push({ year: prev.year, month: prev.month })

        const prevPrevCTS = await repo.loadDataSlice<CategoryTimeSalesData>(
          prev.year,
          prev.month,
          'categoryTimeSales',
        )
        if (cancelled) return

        // 翌月（overflow 用）
        const prevNextCS = await repo.loadDataSlice<ClassifiedSalesData>(
          next.year,
          next.month,
          'classifiedSales',
        )
        if (cancelled) return
        if (prevNextCS) loadedRanges.push({ year: next.year, month: next.month })

        const prevNextCTS = await repo.loadDataSlice<CategoryTimeSalesData>(
          next.year,
          next.month,
          'categoryTimeSales',
        )
        if (cancelled) return

        const daysInSourceMonth = getDaysInMonth(sourceYear, sourceMonth)
        if (isNaN(daysInSourceMonth) || daysInSourceMonth <= 0) {
          dispatch({
            type: 'error',
            requestedRanges: ranges,
            loadedRanges,
            error: `Invalid days in month: ${sourceYear}-${sourceMonth}`,
          })
          return
        }

        const daysInPrevMonth = getDaysInMonth(prev.year, prev.month)

        const mergedCSRecords = mergeAdjacentMonthRecords<ClassifiedSalesRecord>(
          prevCS.records,
          prevPrevCS?.records,
          prevNextCS?.records,
          sourceYear,
          sourceMonth,
          daysInSourceMonth,
          daysInPrevMonth,
        )

        const mergedCTSRecords = mergeAdjacentMonthRecords<CategoryTimeSalesRecord>(
          prevCTS?.records ?? [],
          prevPrevCTS?.records,
          prevNextCTS?.records,
          sourceYear,
          sourceMonth,
          daysInSourceMonth,
          daysInPrevMonth,
        )

        if (cancelled) return

        // 花データ（客数）
        const prevFlowers = await repo.loadDataSlice<SpecialSalesData>(
          sourceYear,
          sourceMonth,
          'flowers',
        )
        if (cancelled) return

        useDataStore.getState().setPrevYearAutoData({
          prevYearClassifiedSales: { records: mergedCSRecords },
          prevYearCategoryTimeSales: { records: mergedCTSRecords },
          prevYearFlowers: prevFlowers ?? { records: [] },
        })
        calculationCache.clear()
        useUiStore.getState().invalidateCalculation()

        if (!cancelled) {
          dispatch({
            type: 'success',
            requestedRanges: ranges,
            loadedRanges,
          })
        }
      } catch (err) {
        if (!cancelled) {
          dispatch({
            type: 'error',
            requestedRanges: ranges,
            loadedRanges,
            error: err instanceof Error ? err.message : 'Unknown error loading comparison data',
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [shouldLoad, scope, hasComparisonData, hasCurrentData, repo])

  if (!shouldLoad) return IDLE_STATUS
  return loadStatus
}
