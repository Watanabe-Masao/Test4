/**
 * 分類別時間帯売上の動的フィルタリング純粋関数
 *
 * CategoryTimeSalesIndex からユーザー選択に応じてレコードを抽出する。
 * これらの関数は hooks から呼ばれ、UI コンポーネントには直接公開しない。
 *
 * ## 設計ルール
 *
 * - インデックスの (storeId, dateKey) 構造を活用し、配列全走査を避ける
 * - 階層フィルタ（部門/ライン/クラス）はインデックス後に適用する
 *   （組み合わせが多すぎてインデックスに含められない）
 * - 除数は computeDivisor() を経由する（RULE-1, PeriodFilter.tsx 参照）
 *
 * ## 日付範囲クエリ
 *
 * queryByDateRange は DateRange を受け取り、dateKey ('YYYY-MM-DD') の辞書順比較で
 * 月をまたぐクエリを正確に処理する。レコードの year/month/day から算出した
 * dateKey が範囲内かどうかで判定するため、データの年月日情報が失われない。
 */
import type { CategoryTimeSalesRecord } from '@/domain/models'
import type { CategoryTimeSalesIndex, DateRange, DateKey } from '@/domain/models'
import { dateRangeToKeys, getDow } from '@/domain/models'

/** 階層フィルタ条件 */
export interface HierarchyFilterParams {
  readonly departmentCode?: string
  readonly lineCode?: string
  readonly klassCode?: string
}

/**
 * インデックスから、指定された店舗 + DateRange + 階層条件 + 曜日に該当するレコードを抽出する。
 *
 * フィルタの適用順序:
 * 1. storeId（インデックスの第1キー → O(1)）
 * 2. dateKey range（YYYYMMDD の範囲比較 → O(dateKeys in store)）
 * 3. 曜日フィルタ（省略時は全曜日）
 * 4. 階層（レコード走査 → O(records in day)）
 *
 * @param index インデックス
 * @param params クエリパラメータ
 * @returns フィルタ済みレコード配列
 */
export function queryByDateRange(
  index: CategoryTimeSalesIndex,
  params: {
    readonly dateRange: DateRange
    readonly storeIds?: ReadonlySet<string>
    readonly hierarchy?: HierarchyFilterParams
    readonly dow?: ReadonlySet<number>
  },
): readonly CategoryTimeSalesRecord[] {
  const { fromKey, toKey } = dateRangeToKeys(params.dateRange)
  const result: CategoryTimeSalesRecord[] = []

  // 対象店舗の決定
  const targetStores = params.storeIds && params.storeIds.size > 0
    ? params.storeIds
    : index.storeIds

  const hasHierarchy = params.hierarchy &&
    (params.hierarchy.departmentCode || params.hierarchy.lineCode || params.hierarchy.klassCode)
  const hasDow = params.dow && params.dow.size > 0

  for (const storeId of targetStores) {
    const dateMap = index.byStoreDate.get(storeId)
    if (!dateMap) continue

    for (const [dateKey, records] of dateMap) {
      // dateKey 範囲チェック
      if (dateKey < fromKey || dateKey > toKey) continue

      for (const rec of records) {
        // 曜日フィルタ
        if (hasDow) {
          const dow = getDow({ year: rec.year, month: rec.month, day: rec.day })
          if (!params.dow!.has(dow)) continue
        }

        // 階層フィルタ
        if (hasHierarchy) {
          if (params.hierarchy!.departmentCode && rec.department.code !== params.hierarchy!.departmentCode) continue
          if (params.hierarchy!.lineCode && rec.line.code !== params.hierarchy!.lineCode) continue
          if (params.hierarchy!.klassCode && rec.klass.code !== params.hierarchy!.klassCode) continue
        }

        result.push(rec)
      }
    }
  }

  return result
}

/**
 * インデックスに含まれるユニークな dateKey を返すユーティリティ。
 * 指定店舗のデータのみを対象にする。
 */
export function getDateKeysForStores(
  index: CategoryTimeSalesIndex,
  storeIds: ReadonlySet<string>,
): ReadonlySet<DateKey> {
  const keys = new Set<DateKey>()
  const targetStores = storeIds.size > 0 ? storeIds : index.storeIds
  for (const storeId of targetStores) {
    const dateMap = index.byStoreDate.get(storeId)
    if (!dateMap) continue
    for (const dk of dateMap.keys()) {
      keys.add(dk)
    }
  }
  return keys
}
