import { useMemo } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useStoreSelection } from './useStoreSelection'
import { getDaysInMonth } from '@/domain/constants/defaults'
import type { CategoryTimeSalesRecord } from '@/domain/models'
import { resolveComparisonFrame } from '@/application/comparison/resolveComparisonFrame'

export interface PrevYearCategoryTimeSalesData {
  /** 前年データが存在するか */
  readonly hasPrevYear: boolean
  /**
   * 前年同曜日オフセット適用済みのレコード一覧。
   * 各レコードの day は当年の日番号に対応付け済み。
   */
  readonly records: readonly CategoryTimeSalesRecord[]
  /** オフセット値（デバッグ / テスト用） */
  readonly offset: number
}

const EMPTY: PrevYearCategoryTimeSalesData = {
  hasPrevYear: false,
  records: [],
  offset: 0,
}

/** null / undefined を除外して有効な数値のみ返す。無効なら undefined。 */
function validNum(v: number | null | undefined): number | undefined {
  if (v == null || isNaN(v)) return undefined
  return v
}

/**
 * 前年分類別時間帯売上データを同曜日対応付けして返すフック
 *
 * 998_前年売上売変客数 と同じ同曜日オフセットロジックを適用する。
 * 例: 当年2026/2/1(日) vs 前年2025/2/1(土) → offset=1
 *     前年 day 2 → 当年 day 1 (共に日曜)
 *
 * prevYearDowOffset 設定が指定されている場合、自動計算の代わりに使用する。
 */
export function usePrevYearCategoryTimeSales(): PrevYearCategoryTimeSalesData {
  const data = useDataStore((s) => s.data)
  const settings = useSettingsStore((s) => s.settings)
  const { selectedStoreIds, isAllStores } = useStoreSelection()

  const prevYearCTS = data.prevYearCategoryTimeSales
  const { targetYear, targetMonth } = settings
  const prevYearSourceYear = validNum(settings.prevYearSourceYear)
  const prevYearSourceMonth = validNum(settings.prevYearSourceMonth)
  const prevYearDowOffset = validNum(settings.prevYearDowOffset)
  const alignmentPolicy = settings.alignmentPolicy ?? 'sameDayOfWeek'

  return useMemo(() => {
    if (prevYearCTS.records.length === 0) return EMPTY

    const daysInTargetMonth = getDaysInMonth(targetYear, targetMonth)
    const frame = resolveComparisonFrame(
      {
        from: { year: targetYear, month: targetMonth, day: 1 },
        to: { year: targetYear, month: targetMonth, day: Math.max(1, daysInTargetMonth) },
      },
      alignmentPolicy,
      {
        sourceYear: prevYearSourceYear,
        sourceMonth: prevYearSourceMonth,
        dowOffset: prevYearDowOffset,
      },
    )
    const offset = frame.dowOffset

    if (isNaN(daysInTargetMonth) || daysInTargetMonth <= 0) return EMPTY

    // 対象店舗で絞り込み
    const allStoreIds = new Set(prevYearCTS.records.map((r) => r.storeId))
    const targetIds = isAllStores
      ? allStoreIds
      : new Set([...allStoreIds].filter((id) => selectedStoreIds.has(id)))

    if (targetIds.size === 0) return EMPTY

    // 同曜日オフセットを適用して day を当年にマッピング
    const mappedRecords: CategoryTimeSalesRecord[] = []
    for (const rec of prevYearCTS.records) {
      if (!targetIds.has(rec.storeId)) continue

      const mappedDay = rec.day - offset
      if (mappedDay < 1 || mappedDay > daysInTargetMonth) continue

      mappedRecords.push({
        ...rec,
        day: mappedDay,
      })
    }

    return {
      hasPrevYear: mappedRecords.length > 0,
      records: mappedRecords,
      offset,
    }
  }, [
    prevYearCTS,
    selectedStoreIds,
    isAllStores,
    targetYear,
    targetMonth,
    prevYearSourceYear,
    prevYearSourceMonth,
    prevYearDowOffset,
    alignmentPolicy,
  ])
}
