/**
 * 仕入分析ページ用 facade hook
 *
 * useDuckDB + usePurchaseComparisonQuery をまとめ、
 * presentation 層が useDuckDB を直接 import しなくて済むようにする。
 *
 * @layer Application — facade hook
 */
import { useMemo } from 'react'
import type { DataRepository } from '@/domain/repositories'
import type { DateRange } from '@/domain/models/CalendarDate'
import type { CustomCategoryId } from '@/domain/constants/customCategories'
import type { PurchaseComparisonResult } from '@/domain/models/PurchaseComparison'
import type { AsyncQueryResult } from './duckdb/useAsyncQuery'
import { useDuckDB } from '@/application/runtime-adapters/useDuckDB'
import { usePurchaseComparisonQuery } from './duckdb/usePurchaseComparisonQuery'

export interface UsePurchaseAnalysisParams {
  readonly targetYear: number
  readonly targetMonth: number
  readonly repo: DataRepository
  readonly period1: DateRange
  readonly period2: DateRange
  readonly storeIds: ReadonlySet<string>
  readonly supplierCategoryMap: Readonly<Partial<Record<string, CustomCategoryId>>>
  readonly userCategories: ReadonlyMap<string, string>
  readonly storeNames: ReadonlyMap<string, string>
  readonly dowOffset?: number
}

export function usePurchaseAnalysis(
  params: UsePurchaseAnalysisParams,
): AsyncQueryResult<PurchaseComparisonResult> & { readonly isReady: boolean } {
  const duck = useDuckDB(params.targetYear, params.targetMonth, params.repo)

  const result = usePurchaseComparisonQuery(
    duck.conn,
    duck.dataVersion,
    params.period1,
    params.period2,
    params.storeIds,
    params.supplierCategoryMap,
    params.userCategories,
    params.storeNames,
    params.dowOffset,
  )

  return useMemo(() => ({ ...result, isReady: duck.isReady }), [result, duck.isReady])
}
