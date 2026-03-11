/**
 * 隣接月ユーティリティ
 *
 * 同曜日アライメント対応で前後月のレコードを拡張day番号でマージする。
 * hooks/ からの re-export ではなく、comparison/ に配置して
 * useAutoLoadPrevYear / useLoadComparisonData 双方から参照する。
 */

/**
 * 前年自動同期日数。
 * 同曜日オフセットにより月末データが翌月にはみ出す場合に備え、
 * 翌月先頭の数日を拡張day番号として取り込む。
 * 同様に、前月末尾の数日も負の拡張day番号として取り込む。
 */
export const OVERFLOW_DAYS = 6

/** 隣接月の年月を算出する */
export function adjacentMonth(
  year: number,
  month: number,
  delta: 1 | -1,
): { year: number; month: number } {
  if (delta === 1) {
    return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  }
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

/**
 * ソース月 ± 1ヶ月のレコードを拡張day番号でマージする。
 *
 * - 前月末 OVERFLOW_DAYS 日 → day = rec.day - daysInPrevMonth（≤0）
 * - 当月 → day そのまま
 * - 翌月頭 OVERFLOW_DAYS 日 → day = daysInSourceMonth + rec.day（>daysInSourceMonth）
 *
 * 全レコードの year/month は sourceYear/sourceMonth に正規化される。
 *
 * @typeParam T ClassifiedSalesRecord | CategoryTimeSalesRecord
 */
export function mergeAdjacentMonthRecords<
  T extends { readonly day: number; readonly year: number; readonly month: number },
>(
  sourceRecords: readonly T[],
  prevMonthRecords: readonly T[] | null | undefined,
  nextMonthRecords: readonly T[] | null | undefined,
  sourceYear: number,
  sourceMonth: number,
  daysInSourceMonth: number,
  daysInPrevMonth: number,
): T[] {
  // 本月レコード: year/month をソース年月に正規化
  const merged: T[] = sourceRecords.map((rec) => ({
    ...rec,
    year: sourceYear,
    month: sourceMonth,
  }))

  // 前月末尾（underflow）: 拡張day = rec.day - daysInPrevMonth（≤0）
  if (prevMonthRecords && daysInPrevMonth > 0) {
    const underflowStart = daysInPrevMonth - OVERFLOW_DAYS
    for (const rec of prevMonthRecords) {
      if (rec.day > underflowStart) {
        merged.push({
          ...rec,
          year: sourceYear,
          month: sourceMonth,
          day: rec.day - daysInPrevMonth,
        })
      }
    }
  }

  // 翌月先頭（overflow）: 拡張day = daysInSourceMonth + rec.day
  if (nextMonthRecords) {
    for (const rec of nextMonthRecords) {
      if (rec.day <= OVERFLOW_DAYS) {
        merged.push({
          ...rec,
          year: sourceYear,
          month: sourceMonth,
          day: daysInSourceMonth + rec.day,
        })
      }
    }
  }

  return merged
}
