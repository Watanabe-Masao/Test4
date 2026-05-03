/**
 * useWidgetDataOrchestrator — ウィジェットデータ取得の上位集約
 *
 * 正本化済みの readModels を束ね、ウィジェットに ViewModel を配布する。
 * orchestrator は「値の意味を決めない」。
 * 正本化済みの取得結果・計算結果を束ねて配るだけ。
 *
 * ## ReadModelSlice — 状態付きデータ配布契約
 *
 * 全 readModel を ReadModelSlice<T> 型で配布する。
 * データにアクセスするには status を確認する必要があり、
 * loading/error/ready の区別を消費側がスキップすることがコンパイル時に防がれる。
 *
 * | status  | 意味                                       |
 * |---------|-------------------------------------------|
 * | idle    | DuckDB 未初期化。クエリ未実行。StoreResult をフォールバックに使う |
 * | loading | クエリ実行中。スケルトン表示。stale data を見せない        |
 * | error   | クエリ失敗。エラー表示 + StoreResult フォールバック       |
 * | ready   | データ確定。DuckDB 正本を使う                       |
 *
 * ## 段階的移行
 *
 * Phase 0: orchestrator を新設し、readModels を統合
 * Phase 1: purchase cost 関連 widget を orchestrator 経由に切替
 * Phase 2: sales / discount 関連 widget を切替
 * Phase 3: 全 widget を切替、自前取得を廃止
 *
 * @see references/03-implementation/widget-coordination-architecture.md
 * @see references/01-foundation/purchase-cost-definition.md
 * @see references/01-foundation/gross-profit-definition.md
 *
 * @responsibility R:unclassified
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

// ── ReadModelSlice — 状態付きデータ配布契約 ──

/**
 * readModel の状態を表す discriminated union。
 *
 * データにアクセスするには status === 'ready' を確認する必要がある。
 * `?? 0` のような silent fallback をコンパイル時に防ぐ。
 */
export type ReadModelSlice<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: Error }
  | { readonly status: 'ready'; readonly data: T }

/** ReadModelSlice から安全にデータを取得する。ready 以外は null を返す */
export function readModelData<T>(slice: ReadModelSlice<T>): T | null {
  return slice.status === 'ready' ? slice.data : null
}

/** ReadModelSlice がエラー状態かどうかを判定する */
export function readModelHasError<T>(
  slice: ReadModelSlice<T>,
): slice is { readonly status: 'error'; readonly error: Error } {
  return slice.status === 'error'
}

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

export interface WidgetDataOrchestratorResult {
  /** 仕入原価の複合正本 */
  readonly purchaseCost: ReadModelSlice<PurchaseCostReadModel>
  /** 売上・販売点数の分析正本 */
  readonly salesFact: ReadModelSlice<SalesFactReadModel>
  /** 値引きの分析正本 */
  readonly discountFact: ReadModelSlice<DiscountFactReadModel>
  /** 客数の分析正本 */
  readonly customerFact: ReadModelSlice<CustomerFactReadModel>
  /** 全 readModel が ready（一括描画ゲート用） */
  readonly allReady: boolean
  /** いずれかがロード中（スケルトン表示判定用） */
  readonly anyLoading: boolean
  /** いずれかがエラー（エラー表示判定用） */
  readonly anyError: boolean
}

// ── 内部ヘルパー ──

function toSlice<T>(
  data: { model: T } | null,
  isLoading: boolean,
  error: Error | null,
  isIdle: boolean,
): ReadModelSlice<T> {
  if (isIdle) return { status: 'idle' }
  if (isLoading) return { status: 'loading' }
  if (error) return { status: 'error', error }
  if (data?.model != null) return { status: 'ready', data: data.model }
  // クエリ完了だがデータなし → idle 扱い（DuckDB にデータ未投入）
  return { status: 'idle' }
}

/**
 * useWidgetDataOrchestrator — 正本化済みの readModels を統合して配布
 *
 * 4つの正本を並列取得し、ReadModelSlice として返す。
 * 各 widget は status を確認してからデータにアクセスする。
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

  const isIdle = base === null

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

  return useMemo(
    () =>
      buildOrchestratorResult(
        purchaseCostData,
        pcLoading,
        pcError,
        salesFactData,
        sfLoading,
        sfError,
        discountFactData,
        dfLoading,
        dfError,
        customerFactData,
        cfLoading,
        cfError,
        isIdle,
      ),
    [
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
      isIdle,
    ],
  )
}

function buildOrchestratorResult(
  purchaseCostData: { model: PurchaseCostReadModel } | null,
  pcLoading: boolean,
  pcError: Error | null,
  salesFactData: { model: SalesFactReadModel } | null,
  sfLoading: boolean,
  sfError: Error | null,
  discountFactData: { model: DiscountFactReadModel } | null,
  dfLoading: boolean,
  dfError: Error | null,
  customerFactData: { model: CustomerFactReadModel } | null,
  cfLoading: boolean,
  cfError: Error | null,
  isIdle: boolean,
) {
  const pc = toSlice(purchaseCostData, pcLoading, pcError, isIdle)
  const sf = toSlice(salesFactData, sfLoading, sfError, isIdle)
  const df = toSlice(discountFactData, dfLoading, dfError, isIdle)
  const cf = toSlice(customerFactData, cfLoading, cfError, isIdle)

  return {
    purchaseCost: pc,
    salesFact: sf,
    discountFact: df,
    customerFact: cf,
    allReady:
      pc.status === 'ready' &&
      sf.status === 'ready' &&
      df.status === 'ready' &&
      cf.status === 'ready',
    anyLoading:
      pc.status === 'loading' ||
      sf.status === 'loading' ||
      df.status === 'loading' ||
      cf.status === 'loading',
    anyError:
      pc.status === 'error' ||
      sf.status === 'error' ||
      df.status === 'error' ||
      cf.status === 'error',
  }
}
