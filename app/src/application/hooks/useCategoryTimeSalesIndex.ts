/**
 * 分類別時間帯売上インデックス hook
 *
 * 生の CategoryTimeSalesData からインデックスを構築し、メモ化して返す。
 * インデックスは (storeId, day) の複合キーで O(1) アクセスを提供する。
 *
 * ## 使い方
 *
 * DashboardPage で1度だけ呼び出し、WidgetContext 経由でチャートに渡す。
 * チャート側では queryIndex() でフィルタ済みレコードを取得する。
 *
 * ```tsx
 * // DashboardPage
 * const ctsIndex = useCategoryTimeSalesIndex(appState.data.categoryTimeSales)
 * const prevCtsIndex = useCategoryTimeSalesIndex(prevYearCTS.records)
 *
 * // WidgetContext
 * { ctsIndex, prevCtsIndex, ... }
 *
 * // Chart component
 * const records = queryIndex(ctx.ctsIndex, selectedStoreIds, dayRange, hierarchy)
 * const aggregated = aggregateHourly(records)
 * ```
 */
import { useMemo } from 'react'
import type { CategoryTimeSalesData, CategoryTimeSalesRecord, CategoryTimeSalesIndex } from '@/domain/models'
import { EMPTY_CTS_INDEX } from '@/domain/models'
import { buildCategoryTimeSalesIndex } from '@/application/usecases/categoryTimeSales'

/**
 * CategoryTimeSalesData からインデックスを構築・メモ化する。
 *
 * data が変わらない限りインデックスは再構築されない。
 *
 * @param data パース済みの分類別時間帯売上データ
 * @returns メモ化されたインデックス
 */
export function useCategoryTimeSalesIndex(
  data: CategoryTimeSalesData | undefined,
): CategoryTimeSalesIndex {
  return useMemo(() => {
    if (!data?.records?.length) return EMPTY_CTS_INDEX
    return buildCategoryTimeSalesIndex(data)
  }, [data])
}

/**
 * レコード配列から直接インデックスを構築・メモ化する。
 *
 * 前年データなど、records 配列が直接手元にある場合に使う。
 *
 * @param records レコード配列
 * @returns メモ化されたインデックス
 */
export function useCategoryTimeSalesIndexFromRecords(
  records: readonly CategoryTimeSalesRecord[],
): CategoryTimeSalesIndex {
  return useMemo(() => {
    if (!records.length) return EMPTY_CTS_INDEX
    return buildCategoryTimeSalesIndex({ records })
  }, [records])
}
