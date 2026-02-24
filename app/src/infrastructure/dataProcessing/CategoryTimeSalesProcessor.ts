import { parseDate } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import { detectDaysInTargetMonth, resolveDay } from './overflowDay'
import type { CategoryTimeSalesData, CategoryTimeSalesRecord, TimeSlotEntry } from '@/domain/models'
import { mergeCategoryTimeSalesData } from '@/domain/models'

// Re-export from domain for backward compatibility
export { mergeCategoryTimeSalesData }

/**
 * コード:名称 のペアをパースする
 * "000061:果物" → { code: "000061", name: "果物" }
 */
function parseCodeName(value: unknown): { code: string; name: string } {
  const str = String(value ?? '')
  const match = str.match(/^(\d+):(.*)$/)
  if (match) {
    return { code: match[1], name: match[2].trim() }
  }
  return { code: str, name: str }
}

/**
 * 店舗コード:名称 から店舗IDを抽出する
 * "0001:毎日屋あさくらセンタ" → "1"
 */
function parseStoreId(value: unknown): string {
  const str = String(value ?? '')
  const match = str.match(/(\d{4}):/)
  if (match) return String(parseInt(match[1]))
  return str
}

/**
 * Parse CSV rows of category time-of-sales data into a structured CategoryTimeSalesData object.
 *
 * Processes a CSV layout where header rows define time slots and subsequent rows contain
 * date, store, hierarchical category fields, totals, and repeated (quantity, amount) pairs
 * for each time slot. Returns parsed records with optional year/month and per-slot entries.
 *
 * @param rows - CSV rows (each row is an array of cell values) following the described layout.
 * @param targetMonth - Optional month number to attach to output records.
 * @param overflowDays - Number of days to include from the following month when resolving day numbers (useful for week-based offsets near month boundaries). Maximum needed is 6.
 * @param targetYear - Optional year number to attach to output records.
 * @returns A CategoryTimeSalesData object containing parsed records; returns { records: [] } if input has fewer than four rows or no valid data rows.
export function processCategoryTimeSales(
  rows: readonly unknown[][],
  targetMonth?: number,
  overflowDays: number = 0,
  targetYear?: number,
): CategoryTimeSalesData {
  if (rows.length < 4) return { records: [] }

  // 時間帯ヘッダーを解析（行0から時刻を抽出）
  const headerRow = rows[0] as unknown[]
  const hours: number[] = []
  const seenHours = new Set<number>()

  for (let col = 5; col < headerRow.length; col++) {
    const cellStr = String(headerRow[col] ?? '').trim()
    const hourMatch = cellStr.match(/^(\d{1,2}):/)
    if (hourMatch) {
      const hour = parseInt(hourMatch[1])
      if (!seenHours.has(hour)) {
        seenHours.add(hour)
        hours.push(hour)
      }
    }
  }

  // データ列の開始位置（合計列の後、時間帯列の開始）
  // 行1のパターン: ..., 数量, 金額, 数量, 金額 ...
  // 合計列(col5,6) + 時間帯列(col7+)
  // ただしCSVによっては合計列がcol5-6で時間帯がcol7からの場合もある
  // 安全に: col5から (数量, 金額) ペアとして処理
  const dataStartCol = 5

  // overflowDays > 0 の場合、対象月の日数を特定する（翌月データの拡張day算出用）
  const daysInTargetMonth =
    targetMonth != null && overflowDays > 0
      ? detectDaysInTargetMonth(rows, 0, 3, targetMonth)
      : 0

  const records: CategoryTimeSalesRecord[] = []

  for (let row = 3; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    if (!r[0] && !r[1]) continue // 空行スキップ

    // 日付パース
    const date = parseDate(r[0])
    if (date == null) continue

    const day = resolveDay(date, targetMonth, daysInTargetMonth, overflowDays)
    if (day == null) continue

    // 店舗
    const storeId = parseStoreId(r[1])

    // 階層
    const department = parseCodeName(r[2])
    const line = parseCodeName(r[3])
    const klass = parseCodeName(r[4])

    // 合計（最初の数量/金額ペア）
    const totalQuantity = safeNumber(r[dataStartCol])
    const totalAmount = safeNumber(r[dataStartCol + 1])

    // 時間帯別データ（合計列の後から）
    const timeSlots: TimeSlotEntry[] = []
    let pairIdx = 0
    for (let col = dataStartCol + 2; col + 1 < r.length; col += 2) {
      const quantity = safeNumber(r[col])
      const amount = safeNumber(r[col + 1])
      if (quantity !== 0 || amount !== 0) {
        const hour = hours[pairIdx] ?? (9 + pairIdx) // フォールバック
        timeSlots.push({ hour, quantity, amount })
      }
      pairIdx++
    }

    records.push({
      ...(targetYear != null ? { year: targetYear } : {}),
      ...(targetMonth != null ? { month: targetMonth } : {}),
      day,
      storeId,
      department,
      line,
      klass,
      timeSlots,
      totalQuantity,
      totalAmount,
    })
  }

  return { records }
}

