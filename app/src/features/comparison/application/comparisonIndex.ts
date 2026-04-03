/**
 * Previous Index — previous rows を storeId|grainKey|dateKey で高速ルックアップ
 *
 * ## 設計判断
 *
 * - 配列を返す（重複検知のため、silent sum しない）
 * - 同一キーに複数行がある場合は ambiguous_previous として表面化する
 * - データ契約違反を隠さない
 */
import type { MatchableRow } from './comparisonTypes'

/** previous rows のインデックス */
export interface ComparisonIndex {
  get(storeId: string, dateKey: string, grainKey?: string): readonly MatchableRow[]
}

function makeIndexKey(storeId: string, dateKey: string, grainKey?: string): string {
  return `${storeId}|${grainKey ?? ''}|${dateKey}`
}

/**
 * previous rows を storeId|grainKey|dateKey でインデックス化する。
 *
 * 同一キーの複数行は合算せず配列で保持する。
 * resolver が重複を検知して ambiguous_previous を返すため。
 */
export function buildComparisonIndex(rows: readonly MatchableRow[]): ComparisonIndex {
  const map = new Map<string, MatchableRow[]>()

  for (const row of rows) {
    const key = makeIndexKey(row.storeId, row.dateKey, row.grainKey)
    const bucket = map.get(key)
    if (bucket) {
      bucket.push(row)
    } else {
      map.set(key, [row])
    }
  }

  return {
    get(storeId: string, dateKey: string, grainKey?: string) {
      return map.get(makeIndexKey(storeId, dateKey, grainKey)) ?? []
    },
  }
}
