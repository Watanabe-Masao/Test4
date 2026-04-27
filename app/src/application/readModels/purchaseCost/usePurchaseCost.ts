/**
 * usePurchaseCost — 仕入原価複合正本の facade hook
 *
 * presentation 層や単独利用のページ・ウィジェットが
 * 仕入原価を取得するための標準入口。
 *
 * ## 現在の利用状況
 *
 * - 仕入分析ページは usePurchaseAnalysis → usePurchaseComparisonQuery 経由で
 *   purchaseCostHandler.execute() を直接呼び出している（Promise.all 並列実行のため）
 * - この hook は将来の単独利用（仕入分析以外のページ/ウィジェット）用に維持
 * - usePurchaseComparisonQuery が handler を直接呼ぶのは application 層内の
 *   正当な連携であり、ガードテストで明示的に許可済み
 *
 * @see readPurchaseCost — 唯一の read 関数（純関数）
 * @see purchaseCostHandler — useQueryWithHandler 用ラッパー
 * @see references/01-principles/purchase-cost-definition.md — 正本定義
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { purchaseCostHandler, type PurchaseCostInput } from './readPurchaseCost'
import type { PurchaseCostReadModel } from './PurchaseCostTypes'

export interface UsePurchaseCostParams {
  readonly executor: QueryExecutor | null
  readonly dateFrom: string
  readonly dateTo: string
  readonly storeIds?: readonly string[]
  readonly dataVersion: number
}

export interface UsePurchaseCostResult {
  readonly model: PurchaseCostReadModel | null
  readonly isLoading: boolean
  readonly error: Error | null
}

export function usePurchaseCost(params: UsePurchaseCostParams): UsePurchaseCostResult {
  const input = useMemo<PurchaseCostInput | null>(
    () =>
      params.dataVersion > 0
        ? {
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            storeIds: params.storeIds ? [...params.storeIds] : undefined,
            dataVersion: params.dataVersion,
          }
        : null,
    [params.dateFrom, params.dateTo, params.storeIds, params.dataVersion],
  )

  const { data, isLoading, error } = useQueryWithHandler(
    params.executor,
    purchaseCostHandler,
    input,
  )

  return useMemo(
    () => ({
      model: data?.model ?? null,
      isLoading,
      error,
    }),
    [data, isLoading, error],
  )
}
