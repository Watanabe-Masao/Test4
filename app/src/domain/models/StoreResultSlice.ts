/**
 * StoreResultSlice — 状態付き StoreResult 配布契約
 *
 * `StoreResult` を直接配布する代わりに、status による discriminated union で
 * ラップする。「型上は required だが runtime では未取得」という乖離を型レベルで
 * 排除し、consumer に narrowing を強制する。
 *
 * projects/widget-context-boundary SP-A ADR-A-004 PR2（並行型導入）。
 *
 * ## 設計意図
 *
 *   既存 `WidgetContext.result: StoreResult`（required）に対し、widget が
 *   実 runtime では取得前のため null guard を入れている pattern が存在する
 *   （`coreRequiredFieldNullCheckGuard` 検出）。これは型設計と runtime 期待の
 *   乖離を示す。本 slice 型を導入することで、PR3 以降で
 *   status による narrowing に一元化し、ADR-A-004 PR4 で旧 shape を撤退する。
 *
 * ## ReadModelSlice との関係
 *
 *   `application/hooks/useWidgetDataOrchestrator.ts` の `ReadModelSlice<T>`
 *   は async fetch 状態（idle / loading / error / ready）を表現する。
 *   `StoreResultSlice` は同期計算結果の有無のみを表現する 2 状態 slice で
 *   あり、別概念。helper 命名は `readModelData` に合わせる。
 *
 * @responsibility R:utility
 */

import type { StoreResult } from './StoreResult'

export type StoreResultSlice =
  | { readonly status: 'ready'; readonly data: StoreResult }
  | { readonly status: 'empty' }

/** StoreResultSlice から安全にデータを取得する。ready 以外は null を返す。 */
export function storeResultData(slice: StoreResultSlice): StoreResult | null {
  return slice.status === 'ready' ? slice.data : null
}

/** ready 状態のファクトリ。 */
export function readyStoreResult(data: StoreResult): StoreResultSlice {
  return { status: 'ready', data }
}

/** empty 状態のシングルトン。 */
export const EMPTY_STORE_RESULT_SLICE: StoreResultSlice = { status: 'empty' }
