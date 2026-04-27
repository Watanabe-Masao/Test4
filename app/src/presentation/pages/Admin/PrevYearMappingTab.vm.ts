/**
 * PrevYearMappingTab ViewModel
 *
 * 日付オフセットアラインメント・マッピングプレビューの計算ロジック。React 非依存。
 *
 * @guard F7 View は ViewModel のみ受け取る
 *
 * @responsibility R:unclassified
 */
import { getDaysInMonth } from '@/domain/constants/defaults'

// ── 型定義 ──

export interface MappingRow {
  readonly currentDay: number
  readonly prevDay: number
  readonly dow: number
  readonly isOverflow: boolean
  readonly prevDisplayMonth: number
  readonly prevDisplayDay: number
  readonly hasData: boolean
}

export interface MappingPreview {
  readonly rows: readonly MappingRow[]
  readonly firstDow: number
  readonly daysInTarget: number
  readonly daysInSource: number
  readonly matchedCount: number
  readonly unmatchedCount: number
}

// ── 計算ロジック ──

/**
 * 日付オフセットを適用してマッピングプレビューを構築する。
 * 曜日マッチング・月跨ぎオーバーフロー処理を含む。
 */
export function buildMappingPreview(
  targetYear: number,
  targetMonth: number,
  effectiveOffset: number,
  effectiveSourceYear: number,
  effectiveSourceMonth: number,
  prevDayHasData: ReadonlySet<number>,
): MappingPreview {
  const daysInTarget = getDaysInMonth(targetYear, targetMonth)
  const daysInSource = getDaysInMonth(effectiveSourceYear, effectiveSourceMonth)
  const firstDow = new Date(targetYear, targetMonth - 1, 1).getDay()
  const nextSourceMonth = (effectiveSourceMonth % 12) + 1

  const rows: MappingRow[] = []
  let matchedCount = 0
  let unmatchedCount = 0

  for (let d = 1; d <= daysInTarget; d++) {
    const dow = (firstDow + d - 1) % 7
    const prevDay = d + effectiveOffset
    const isOverflow = prevDay > daysInSource
    const prevDisplayMonth = isOverflow ? nextSourceMonth : effectiveSourceMonth
    const prevDisplayDay = isOverflow ? prevDay - daysInSource : prevDay
    const hasData = prevDayHasData.has(prevDay)
    if (hasData) matchedCount++
    else unmatchedCount++
    rows.push({
      currentDay: d,
      prevDay,
      dow,
      isOverflow,
      prevDisplayMonth,
      prevDisplayDay,
      hasData,
    })
  }
  return { rows, firstDow, daysInTarget, daysInSource, matchedCount, unmatchedCount }
}

/** 利用可能月のオプションリストを構築する */
export function buildSourceOptions(
  availableMonths: readonly { year: number; month: number }[],
  targetYear: number,
  targetMonth: number,
): readonly { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [
    { value: 'auto', label: `自動 (${targetYear - 1}年${targetMonth}月)` },
  ]
  for (const { year, month } of availableMonths) {
    if (year === targetYear && month === targetMonth) continue
    opts.push({ value: `${year}-${month}`, label: `${year}年${month}月` })
  }
  return opts
}
