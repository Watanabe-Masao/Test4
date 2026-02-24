/**
 * 分類別時間帯売上の動的フィルタリング純粋関数
 *
 * CategoryTimeSalesIndex からユーザー選択に応じてレコードを抽出する。
 * これらの関数は hooks から呼ばれ、UI コンポーネントには直接公開しない。
 *
 * ## 設計ルール
 *
 * - インデックスの (storeId, day) 構造を活用し、配列全走査を避ける
 * - 階層フィルタ（部門/ライン/クラス）はインデックス後に適用する
 *   （組み合わせが多すぎてインデックスに含められない）
 * - 除数は computeDivisor() を経由する（RULE-1, PeriodFilter.tsx 参照）
 */
import type { CategoryTimeSalesRecord } from '@/domain/models'
import type { CategoryTimeSalesIndex } from '@/domain/models'

/** 階層フィルタ条件 */
export interface HierarchyFilterParams {
  readonly departmentCode?: string
  readonly lineCode?: string
  readonly klassCode?: string
}

/**
 * インデックスから、指定された店舗 + 日付範囲 + 階層条件に該当するレコードを抽出する。
 *
 * フィルタの適用順序:
 * 1. storeId（インデックスの第1キー → O(1)）
 * 2. day range（インデックスの第2キー → O(days)）
 * 3. 階層（レコード走査 → O(records in day)）
 *
 * @param index インデックス
 * @param selectedStoreIds 選択中の店舗ID（空 = 全店舗）
 * @param dayRange [開始日, 終了日]（inclusive）
 * @param hierarchy 階層フィルタ条件（省略可）
 * @returns フィルタ済みレコード配列
 */
export function queryIndex(
  index: CategoryTimeSalesIndex,
  selectedStoreIds: ReadonlySet<string>,
  dayRange: readonly [number, number],
  hierarchy?: HierarchyFilterParams,
): readonly CategoryTimeSalesRecord[] {
  const result: CategoryTimeSalesRecord[] = []
  const [dayStart, dayEnd] = dayRange

  // 対象店舗の決定
  const targetStores = selectedStoreIds.size > 0
    ? selectedStoreIds
    : index.storeIds

  for (const storeId of targetStores) {
    const dayMap = index.byStoreDay.get(storeId)
    if (!dayMap) continue

    for (let day = dayStart; day <= dayEnd; day++) {
      const records = dayMap.get(day)
      if (!records) continue

      if (hierarchy && (hierarchy.departmentCode || hierarchy.lineCode || hierarchy.klassCode)) {
        for (const rec of records) {
          if (hierarchy.departmentCode && rec.department.code !== hierarchy.departmentCode) continue
          if (hierarchy.lineCode && rec.line.code !== hierarchy.lineCode) continue
          if (hierarchy.klassCode && rec.klass.code !== hierarchy.klassCode) continue
          result.push(rec)
        }
      } else {
        for (const rec of records) {
          result.push(rec)
        }
      }
    }
  }

  return result
}

/**
 * 曜日フィルタを適用する。dowAvg モードで特定曜日のみ対象にする場合に使用。
 *
 * @param records フィルタ済みレコード
 * @param selectedDows 対象曜日 (0=日〜6=土)。空 = 全曜日
 * @param year 年（曜日計算用）
 * @param month 月（曜日計算用）
 */
export function filterByDow(
  records: readonly CategoryTimeSalesRecord[],
  selectedDows: ReadonlySet<number>,
  year: number,
  month: number,
): readonly CategoryTimeSalesRecord[] {
  if (selectedDows.size === 0) return records
  return records.filter((r) => {
    const dow = new Date(year, month - 1, r.day).getDay()
    return selectedDows.has(dow)
  })
}
