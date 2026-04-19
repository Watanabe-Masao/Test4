/**
 * useDayDetailPlanObservation — DayDetailModal 前年データ空表示バグの runtime 観測ログ
 *
 * DEV のみ発火。project: day-detail-modal-prev-year-investigation (Phase 1)
 *
 * dayLeafBundle / timeSlotBundle が更新されるたびに候補判定用の observable
 * 値を 1 行で console.log に出力する。候補シグネチャカタログは
 * `projects/day-detail-modal-prev-year-investigation/HANDOFF.md` §1.2 参照。
 *
 * 判定規則 (diagnostic test と同 schema):
 *   current.entriesLen === 0              → 候補 A (CTS 0 件)
 *   current.firstTimeSlotsLen === 0       → 候補 B (time_slots JOIN 空)
 *   current.firstTotalQty === 0           → 候補 C (ingest 集計異常)
 *
 * 本 hook は原因確定後に削除する (runtime log 維持禁止)。
 *
 * @responsibility R:utility
 */
import { useEffect } from 'react'
import type { CategoryLeafDailyBundle } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import type { TimeSlotBundle } from '@/application/hooks/timeSlot/TimeSlotBundle.types'

export function useDayDetailPlanObservation(
  dayLeafBundle: CategoryLeafDailyBundle,
  timeSlotBundle: TimeSlotBundle,
): void {
  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (dayLeafBundle.isLoading) return
    const cur = dayLeafBundle.currentSeries
    const cmp = dayLeafBundle.comparisonSeries
    const curEntry = cur?.entries?.[0]
    const cmpEntry = cmp?.entries?.[0]
    console.log('[DayDetailModal:prev-year-observation]', {
      current: {
        entriesLen: cur?.entries?.length ?? null,
        firstTotalQty: curEntry?.totalQuantity ?? null,
        firstTimeSlotsLen: curEntry?.timeSlots?.length ?? null,
      },
      comparison: {
        entriesLen: cmp?.entries?.length ?? null,
        firstTotalQty: cmpEntry?.totalQuantity ?? null,
        firstTimeSlotsLen: cmpEntry?.timeSlots?.length ?? null,
      },
      provenance: dayLeafBundle.meta.provenance,
      timeSlot: {
        currentSeriesNull: timeSlotBundle.currentSeries == null,
        comparisonSeriesNull: timeSlotBundle.comparisonSeries == null,
      },
    })
  }, [dayLeafBundle, timeSlotBundle])
}
