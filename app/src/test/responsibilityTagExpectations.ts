/**
 * 責務タグ別の期待閾値 — タグと実態の不一致を検出する
 *
 * 各 R: タグに「このタグならこの数値が自然」という期待範囲を定義。
 * 逸脱したファイルは「タグの見直し」または「分離」の候補。
 *
 * @responsibility R:utility
 */

import type { ResponsibilityTag } from './responsibilityTagRegistry'

interface TagExpectation {
  /** useMemo の自然な上限。超えたら AND の疑い */
  readonly memoMax: number
  /** useCallback の自然な上限 */
  readonly callbackMax: number
  /** useState の自然な上限 */
  readonly stateMax: number
  /** 行数の自然な上限 */
  readonly lineMax: number
}

/**
 * タグ別の期待閾値。
 * この閾値を超えたファイルは「本当にこのタグだけで正しいか？」の候補。
 */
export const TAG_EXPECTATIONS: Partial<Record<ResponsibilityTag, TagExpectation>> = {
  'R:chart-view': { memoMax: 4, callbackMax: 4, stateMax: 2, lineMax: 400 },
  'R:chart-option': { memoMax: 2, callbackMax: 0, stateMax: 0, lineMax: 600 },
  'R:calculation': { memoMax: 0, callbackMax: 0, stateMax: 0, lineMax: 400 },
  'R:transform': { memoMax: 2, callbackMax: 0, stateMax: 0, lineMax: 300 },
  'R:state-machine': { memoMax: 3, callbackMax: 12, stateMax: 8, lineMax: 200 },
  'R:query-plan': { memoMax: 5, callbackMax: 0, stateMax: 0, lineMax: 200 },
  'R:query-exec': { memoMax: 3, callbackMax: 1, stateMax: 1, lineMax: 300 },
  'R:widget': { memoMax: 4, callbackMax: 4, stateMax: 3, lineMax: 400 },
  'R:page': { memoMax: 8, callbackMax: 10, stateMax: 8, lineMax: 500 },
  'R:form': { memoMax: 3, callbackMax: 6, stateMax: 6, lineMax: 300 },
  'R:layout': { memoMax: 2, callbackMax: 3, stateMax: 3, lineMax: 300 },
  'R:orchestration': { memoMax: 8, callbackMax: 2, stateMax: 0, lineMax: 300 },
  'R:utility': { memoMax: 0, callbackMax: 0, stateMax: 0, lineMax: 300 },
  'R:context': { memoMax: 3, callbackMax: 3, stateMax: 3, lineMax: 200 },
  'R:persistence': { memoMax: 3, callbackMax: 6, stateMax: 6, lineMax: 300 },
  'R:adapter': { memoMax: 1, callbackMax: 2, stateMax: 1, lineMax: 200 },
  'R:reducer': { memoMax: 0, callbackMax: 0, stateMax: 0, lineMax: 200 },
  'R:barrel': { memoMax: 0, callbackMax: 0, stateMax: 0, lineMax: 50 },
}
