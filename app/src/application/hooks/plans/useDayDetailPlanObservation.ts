/**
 * useDayDetailPlanObservation — DayDetailModal 前年データ空表示バグの runtime 観測ログ
 *
 * production-safe: localStorage フラグで on/off。デフォルト off。
 * project: day-detail-modal-prev-year-investigation (Phase 1)
 *
 * ## 有効化手順 (本番環境でも動作)
 *
 * 1. ブラウザ DevTools → Console で以下を実行:
 *    `localStorage.setItem('__debug_dayDetailPrevYear', '1')`
 * 2. ページをリロード (observation hook は dep 変化で発火するため、初回描画から
 *    有効になるようリロードが確実)
 * 3. DayDetailModal を開く → Console に `[DayDetailModal:prev-year-observation]`
 *    が scalar 変化のたびに 1 行ずつ出る
 * 4. 調査終了後:
 *    `localStorage.removeItem('__debug_dayDetailPrevYear')`
 *
 * ログされる scalar のみを dep 配列に並べることで、bundle object の identity
 * 変化（pair/fallback の useQueryWithHandler は毎 render で新しい `{data,
 * isLoading, error}` を返す）で effect が空振りするのを防ぐ。観測値が変わ
 * らない限りログは出ない。
 *
 * 判定規則 (diagnostic test と同 schema):
 *   comparison.entriesLen === 0          → 候補 A (CTS 0 件)
 *   comparison.firstTimeSlotsLen === 0   → 候補 B (time_slots JOIN 空)
 *   comparison.firstTotalQty === 0       → 候補 C (ingest 集計異常)
 *
 * 本 hook は原因確定後に削除する (runtime log 維持禁止)。
 *
 * @responsibility R:utility
 */
import { useEffect } from 'react'
import type { CategoryLeafDailyBundle } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import type { TimeSlotBundle } from '@/application/hooks/timeSlot/TimeSlotBundle.types'

const DEBUG_FLAG_KEY = '__debug_dayDetailPrevYear'

function isObservationEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage?.getItem(DEBUG_FLAG_KEY) === '1'
}

export function useDayDetailPlanObservation(
  dayLeafBundle: CategoryLeafDailyBundle,
  timeSlotBundle: TimeSlotBundle,
): void {
  const { isLoading, currentSeries, comparisonSeries, meta } = dayLeafBundle
  const curEntriesLen = currentSeries?.entries?.length ?? null
  const curFirstTotalQty = currentSeries?.entries?.[0]?.totalQuantity ?? null
  const curFirstTimeSlotsLen = currentSeries?.entries?.[0]?.timeSlots?.length ?? null
  const cmpEntriesLen = comparisonSeries?.entries?.length ?? null
  const cmpFirstTotalQty = comparisonSeries?.entries?.[0]?.totalQuantity ?? null
  const cmpFirstTimeSlotsLen = comparisonSeries?.entries?.[0]?.timeSlots?.length ?? null
  const usedComparisonFallback = meta.provenance.usedComparisonFallback
  const mappingKind = meta.provenance.mappingKind
  const tsCurrentNull = timeSlotBundle.currentSeries == null
  const tsComparisonNull = timeSlotBundle.comparisonSeries == null

  useEffect(() => {
    if (!isObservationEnabled()) return
    if (isLoading) return
    console.log('[DayDetailModal:prev-year-observation]', {
      current: {
        entriesLen: curEntriesLen,
        firstTotalQty: curFirstTotalQty,
        firstTimeSlotsLen: curFirstTimeSlotsLen,
      },
      comparison: {
        entriesLen: cmpEntriesLen,
        firstTotalQty: cmpFirstTotalQty,
        firstTimeSlotsLen: cmpFirstTimeSlotsLen,
      },
      provenance: { usedComparisonFallback, mappingKind },
      timeSlot: { currentSeriesNull: tsCurrentNull, comparisonSeriesNull: tsComparisonNull },
    })
  }, [
    isLoading,
    curEntriesLen,
    curFirstTotalQty,
    curFirstTimeSlotsLen,
    cmpEntriesLen,
    cmpFirstTotalQty,
    cmpFirstTimeSlotsLen,
    usedComparisonFallback,
    mappingKind,
    tsCurrentNull,
    tsComparisonNull,
  ])
}
