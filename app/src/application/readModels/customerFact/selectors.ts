/**
 * Customer Fact Selectors — registry 行向けの pure selector 群
 *
 * Dashboard widget registry 行で `(() => { ... })()` IIFE として書かれていた
 * customerFact ready 判定 + 派生値計算を pure function として抽出。
 *
 * SP-B ADR-B-003 PR2 で新設、PR3 で 3 IIFE を本 selector call に置換。
 *
 * ## 使用例
 *
 * ```tsx
 * // Before (IIFE in registry)
 * totalCustomers={(() => {
 *   const cf = ctx.readModels?.customerFact
 *   return cf?.status === 'ready' ? cf.data.grandTotalCustomers : ctx.result.totalCustomers
 * })()}
 *
 * // After (selector call)
 * totalCustomers={selectTotalCustomers(ctx.readModels?.customerFact, ctx.result.totalCustomers)}
 * ```
 *
 * ## 設計意図
 *
 * - **pure function**: 副作用なし、入力のみで出力決定。test しやすい
 * - **fallback policy の明示**: ReadModelSlice が ready でない時の fallback を
 *   関数 signature で示す（fallback あり / なし の 2 種類）
 * - **registry 行の簡素化**: IIFE 削除で registry 行の責務が「widget 配置」のみに戻る
 *
 * ## 参照
 *
 * - projects/widget-registry-simplification/plan.md §ADR-B-003
 * - projects/widget-registry-simplification/legacy-retirement.md §LEG-009
 * - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-B-003
 *
 * @responsibility R:unclassified
 */

import type { ReadModelSlice } from '@/application/hooks/useWidgetDataOrchestrator'
import { toStoreCustomerRows } from './readCustomerFact'
import type { CustomerFactReadModel } from './CustomerFactTypes'

type CustomerFactSlice = ReadModelSlice<CustomerFactReadModel> | undefined

/**
 * customerFact ReadModelSlice から grandTotalCustomers を取得する。
 * ready でない場合は fallback 値を返す。
 *
 * 用途: WID-018 等で customerFact ready 待ちの間、`ctx.result.totalCustomers`
 * の旧 read 経路を fallback として表示する。
 */
export function selectTotalCustomers(slice: CustomerFactSlice, fallback: number): number {
  return slice?.status === 'ready' ? slice.data.grandTotalCustomers : fallback
}

/**
 * customerFact ReadModelSlice から grandTotalCustomers を取得する。
 * ready でない場合は undefined（fallback なし）。
 *
 * 用途: WID-021 等で undefined 許容の prop 注入。
 */
export function selectCustomerCountOrUndefined(slice: CustomerFactSlice): number | undefined {
  return slice?.status === 'ready' ? slice.data.grandTotalCustomers : undefined
}

/**
 * customerFact ReadModelSlice から store customer row 一覧を取得する。
 * ready でない場合は undefined。
 *
 * 用途: WID-018 等で storeCustomerMap prop 注入。
 */
export function selectStoreCustomerMap(
  slice: CustomerFactSlice,
): ReturnType<typeof toStoreCustomerRows> | undefined {
  return slice?.status === 'ready' ? toStoreCustomerRows(slice.data) : undefined
}
