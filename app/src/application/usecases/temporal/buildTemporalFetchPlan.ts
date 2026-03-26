/**
 * buildTemporalFetchPlan — RollingAnalysisFrame → TemporalFetchPlan
 *
 * rolling 系日次分析に必要な requiredRange / requiredMonths を導出する。
 *
 * Phase 1 対応範囲:
 *   - granularity === 'day' のみ
 *   - analysisMode === 'movingAverage' | 'rollingSum' のみ
 *
 * 日付演算は JS Date constructor でオーバーフローを自動処理する。
 * 既存 PeriodSelection.ts と同じパターン。
 *
 * requiredMonths は requiredRange.from → requiredRange.to を日単位走査し、
 * 'YYYY-MM' を昇順・重複なしで返す。
 */
import type { CalendarDate } from '@/domain/models/CalendarDate'
import type { RollingAnalysisFrame, TemporalFetchPlan, YearMonthKey } from './TemporalFrameTypes'

/** CalendarDate を JS Date に変換する */
function toDate(cd: CalendarDate): Date {
  return new Date(cd.year, cd.month - 1, cd.day)
}

/** JS Date を CalendarDate に変換する */
function fromDate(d: Date): CalendarDate {
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  }
}

/** 月を 'YYYY-MM' 形式に変換する */
function toYearMonthKey(year: number, month: number): YearMonthKey {
  return `${year}-${String(month).padStart(2, '0')}` as YearMonthKey
}

/**
 * requiredRange から含まれる年月を昇順・重複なしで抽出する。
 */
function extractRequiredMonths(from: CalendarDate, to: CalendarDate): readonly YearMonthKey[] {
  const months = new Set<YearMonthKey>()
  const cursor = toDate(from)
  const end = toDate(to)

  while (cursor <= end) {
    months.add(toYearMonthKey(cursor.getFullYear(), cursor.getMonth() + 1))
    // 翌月の1日へ移動（月内の日を全てスキップ）
    cursor.setMonth(cursor.getMonth() + 1, 1)
  }

  return [...months]
}

/**
 * RollingAnalysisFrame から TemporalFetchPlan を導出する。
 *
 * Phase 1: granularity === 'day' の rolling 系のみ対応。
 *
 * @param frame rolling 系の AnalysisFrame
 * @returns requiredRange と requiredMonths を含む fetch plan
 */
export function buildTemporalFetchPlan(frame: RollingAnalysisFrame): TemporalFetchPlan {
  if (frame.granularity !== 'day') {
    throw new Error(`Phase 1 supports only granularity='day', got '${frame.granularity}'.`)
  }

  const { anchorRange, windowSize, direction } = frame
  const fromDate_d = toDate(anchorRange.from)
  const toDate_d = toDate(anchorRange.to)

  let requiredFrom: Date
  let requiredTo: Date

  switch (direction) {
    case 'trailing':
      // from を windowSize - 1 日前に拡張
      requiredFrom = new Date(
        fromDate_d.getFullYear(),
        fromDate_d.getMonth(),
        fromDate_d.getDate() - (windowSize - 1),
      )
      requiredTo = toDate_d
      break
    case 'centered': {
      // from を floor((windowSize-1)/2) 日前、to を ceil((windowSize-1)/2) 日後に拡張
      const halfBefore = Math.floor((windowSize - 1) / 2)
      const halfAfter = Math.ceil((windowSize - 1) / 2)
      requiredFrom = new Date(
        fromDate_d.getFullYear(),
        fromDate_d.getMonth(),
        fromDate_d.getDate() - halfBefore,
      )
      requiredTo = new Date(
        toDate_d.getFullYear(),
        toDate_d.getMonth(),
        toDate_d.getDate() + halfAfter,
      )
      break
    }
    case 'leading':
      // to を windowSize - 1 日後に拡張
      requiredFrom = fromDate_d
      requiredTo = new Date(
        toDate_d.getFullYear(),
        toDate_d.getMonth(),
        toDate_d.getDate() + (windowSize - 1),
      )
      break
  }

  const requiredFromCd = fromDate(requiredFrom)
  const requiredToCd = fromDate(requiredTo)

  return {
    anchorRange,
    requiredRange: { from: requiredFromCd, to: requiredToCd },
    requiredMonths: extractRequiredMonths(requiredFromCd, requiredToCd),
  }
}
