/**
 * useWidgetDataOrchestrator — ウィジェットデータ取得の上位集約
 *
 * 正本化済みの readModels を束ね、ウィジェットに ViewModel を配布する。
 * orchestrator は「値の意味を決めない」。
 * 正本化済みの取得結果・計算結果を束ねて配るだけ。
 *
 * ## 段階的移行
 *
 * Phase 0（現在）: orchestrator を新設し、readModels を統合
 * Phase 1: purchase cost 関連 widget を orchestrator 経由に切替
 * Phase 2: sales / discount 関連 widget を切替
 * Phase 3: 全 widget を切替、自前取得を廃止
 *
 * @see references/03-guides/widget-coordination-architecture.md
 * @see references/01-principles/purchase-cost-definition.md
 * @see references/01-principles/gross-profit-definition.md
 */
import { useMemo } from 'react'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import { purchaseCostHandler, type PurchaseCostInput } from '@/application/readModels/purchaseCost'
import type { PurchaseCostReadModel } from '@/application/readModels/purchaseCost'
import { salesFactHandler } from '@/application/queries/salesFactHandler'
import type { SalesFactInput } from '@/application/readModels/salesFact'
import type { SalesFactReadModel } from '@/application/readModels/salesFact'
import { discountFactHandler } from '@/application/queries/discountFactHandler'
import type { DiscountFactInput } from '@/application/readModels/discountFact'
import type { DiscountFactReadModel } from '@/application/readModels/discountFact'
import { customerFactHandler } from '@/application/readModels/customerFact'
import type { CustomerFactInput } from '@/application/readModels/customerFact'
import type { CustomerFactReadModel } from '@/application/readModels/customerFact'

// ── 入力パラメータ ──

export interface WidgetDataOrchestratorParams {
  readonly executor: QueryExecutor | null
  readonly dateFrom: string
  readonly dateTo: string
  readonly storeIds?: readonly string[]
  readonly dataVersion: number
  readonly isPrevYear?: boolean
}

// ── 出力（全正本の統合ビュー） ──

/** readModel 名をキーとした個別エラーマップ */
export type ReadModelErrors = Partial<
  Record<'purchaseCost' | 'salesFact' | 'discountFact' | 'customerFact', Error>
>

export interface WidgetDataOrchestratorResult {
  /** 仕入原価の複合正本 */
  readonly purchaseCost: PurchaseCostReadModel | null
  /** 売上・販売点数の分析正本 */
  readonly salesFact: SalesFactReadModel | null
  /** 値引きの分析正本 */
  readonly discountFact: DiscountFactReadModel | null
  /** 客数の分析正本 */
  readonly customerFact: CustomerFactReadModel | null
  /** ローディング状態（いずれかがロード中） */
  readonly isLoading: boolean
  /** 個別 readModel のエラー（障害分析用） */
  readonly errors: ReadModelErrors
  /** 最初のエラー（後方互換） */
  readonly error: Error | null
}

/**
 * useWidgetDataOrchestrator — 正本化済みの readModels を統合して配布
 *
 * 3つの正本を並列取得し、WidgetDataOrchestratorResult として返す。
 * 各 widget はこの結果から必要なデータを取得する。
 */
export function useWidgetDataOrchestrator(
  params: WidgetDataOrchestratorParams,
): WidgetDataOrchestratorResult {
  const { executor, dateFrom, dateTo, storeIds, dataVersion, isPrevYear } = params

  // ── 入力を正本ごとに構築（共通ベースから派生） ──
  const base = useMemo(
    () =>
      dataVersion > 0
        ? {
            dateFrom,
            dateTo,
            storeIds: storeIds ? [...storeIds].sort() : undefined,
            dataVersion,
          }
        : null,
    [dateFrom, dateTo, storeIds, dataVersion],
  )

  const purchaseCostInput = useMemo<PurchaseCostInput | null>(
    () => (base ? { ...base } : null),
    [base],
  )

  const salesFactInput = useMemo<SalesFactInput | null>(
    () => (base ? { ...base, isPrevYear: isPrevYear ?? false } : null),
    [base, isPrevYear],
  )

  const discountFactInput = useMemo<DiscountFactInput | null>(
    () => (base ? { ...base, isPrevYear: isPrevYear ?? false } : null),
    [base, isPrevYear],
  )

  const customerFactInput = useMemo<CustomerFactInput | null>(
    () => (base ? { ...base, isPrevYear: isPrevYear ?? false } : null),
    [base, isPrevYear],
  )

  // ── 4正本を並列取得 ──
  const {
    data: purchaseCostData,
    isLoading: pcLoading,
    error: pcError,
  } = useQueryWithHandler(executor, purchaseCostHandler, purchaseCostInput)

  const {
    data: salesFactData,
    isLoading: sfLoading,
    error: sfError,
  } = useQueryWithHandler(executor, salesFactHandler, salesFactInput)

  const {
    data: discountFactData,
    isLoading: dfLoading,
    error: dfError,
  } = useQueryWithHandler(executor, discountFactHandler, discountFactInput)

  const {
    data: customerFactData,
    isLoading: cfLoading,
    error: cfError,
  } = useQueryWithHandler(executor, customerFactHandler, customerFactInput)

  return useMemo(() => {
    const errors: ReadModelErrors = {}
    if (pcError) errors.purchaseCost = pcError
    if (sfError) errors.salesFact = sfError
    if (dfError) errors.discountFact = dfError
    if (cfError) errors.customerFact = cfError

    return {
      purchaseCost: purchaseCostData?.model ?? null,
      salesFact: salesFactData?.model ?? null,
      discountFact: discountFactData?.model ?? null,
      customerFact: customerFactData?.model ?? null,
      isLoading: pcLoading || sfLoading || dfLoading || cfLoading,
      errors,
      error: pcError ?? sfError ?? dfError ?? cfError ?? null,
    }
  }, [
    purchaseCostData,
    salesFactData,
    discountFactData,
    customerFactData,
    pcLoading,
    sfLoading,
    dfLoading,
    cfLoading,
    pcError,
    sfError,
    dfError,
    cfError,
  ])
}
