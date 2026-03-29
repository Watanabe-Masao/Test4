/**
 * usePurchaseCost — 仕入原価複合正本の facade hook
 *
 * 全ページ・全ウィジェットはこの hook 経由で仕入原価を取得する。
 * 内部で purchaseCostHandler を useQueryWithHandler 経由で実行し、
 * PurchaseCostReadModel を返す。
 *
 * 用途別の参照:
 *   在庫法:   model.grandTotalCost（3つ全部）
 *   推定法:   model.inventoryPurchaseCost（売上納品を除外）
 *   仕入分析: model.grandTotalCost + 各正本の内訳
 *
 * @see readPurchaseCost.ts — QueryHandler 実装
 * @see PurchaseCostTypes.ts — Zod 契約
 * @see references/01-principles/purchase-cost-definition.md — 正本定義
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
