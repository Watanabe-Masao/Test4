/**
 * PrevYearDataSlice — 状態付き PrevYearData 配布契約
 *
 * `PrevYearData` を直接配布する代わりに、status による discriminated union で
 * ラップする。「型上は required だが runtime では未取得」という乖離を型レベルで
 * 排除し、consumer に narrowing を強制する。
 *
 * projects/widget-context-boundary SP-A ADR-A-004。
 *
 * ## 設計意図
 *
 *   既存 `WidgetContext.prevYear: PrevYearData`（required）に対し、widget が
 *   実 runtime では取得前のため null guard を入れる pattern が
 *   存在する余地があった（`coreRequiredFieldNullCheckGuard` 監視対象）。
 *   本 slice 型を導入することで、PR3 で `WidgetContext.prevYear` 自体を
 *   slice 型に切替え、dispatch chokepoint で `RenderUnifiedWidgetContext`
 *   に narrow するパターンに一元化した（chokepoint narrowing パターン）。
 *   `PrevYearData` 自体は slice の data フィールドおよび post-narrow 型が
 *   参照する正本であり、削除しない。
 *   PR4 で `coreRequiredFieldNullCheckGuard` baseline=0 が達成され、
 *   LEG-008 sunsetCondition も成立した。
 *
 * ## PrevYearData.source との関係
 *
 *   既存 `PrevYearData.source: 'disabled' | 'no-data' | 'loaded'` は
 *   「比較 OFF / データなし / 正常取得」の業務的データソース状態を表す
 *   フィールドであり、本 slice の `status` とは独立。slice は配布チャネル
 *   側の「データが手に入ったか」を表現し、`source` は手に入った PrevYearData
 *   の中身の種類を表現する。
 *
 *   - `{ status: 'empty' }`: そもそも prevYear データを配布できない（依存未取得 等）
 *   - `{ status: 'ready'; data: { source: 'disabled' } }`: 配布可能、ただし比較 OFF
 *   - `{ status: 'ready'; data: { source: 'loaded' } }`: 配布可能、正常データあり
 *
 * @responsibility R:unclassified
 */

import type { PrevYearData } from './comparisonTypes'

export type PrevYearDataSlice =
  | { readonly status: 'ready'; readonly data: PrevYearData }
  | { readonly status: 'empty' }

/** PrevYearDataSlice から安全にデータを取得する。ready 以外は null を返す。 */
export function prevYearDataValue(slice: PrevYearDataSlice): PrevYearData | null {
  return slice.status === 'ready' ? slice.data : null
}

/** ready 状態のファクトリ。 */
export function readyPrevYearData(data: PrevYearData): PrevYearDataSlice {
  return { status: 'ready', data }
}

/** empty 状態のシングルトン。 */
export const EMPTY_PREV_YEAR_DATA_SLICE: PrevYearDataSlice = { status: 'empty' }
