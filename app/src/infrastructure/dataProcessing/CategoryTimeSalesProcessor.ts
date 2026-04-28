/**
 * @responsibility R:adapter
 */

import { parseDate } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import { detectDaysInTargetMonth, resolveDay } from './overflowDay'
import type {
  CategoryTimeSalesData,
  CategoryTimeSalesRecord,
  TimeSlotEntry,
} from '@/domain/models/record'
import { mergeCategoryTimeSalesData } from '@/domain/models/record'

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
 * コード無しの場合は nameToId 逆引きマップで解決を試みる
 */
function parseStoreId(value: unknown, nameToId?: ReadonlyMap<string, string>): string {
  const str = String(value ?? '').trim()
  const match = str.match(/(\d{4}):/)
  if (match) return String(parseInt(match[1]))
  // コード無しの場合、店舗名→ID逆引きマップで解決を試みる
  if (nameToId) {
    const resolvedId = nameToId.get(str)
    if (resolvedId) return resolvedId
  }
  return str
}

// ─── 小計行フィルタ ─────────────────────────────────

/**
 * 小計・合計行の検出パターン。
 * CSVファイルに含まれる集約行を除外し、二重計上を防ぐ。
 * ClassifiedSalesProcessor と同じパターンを使用。
 */
const SUBTOTAL_PATTERNS = ['合計', '小計', '計', 'total', 'subtotal']

/** 部門/ライン/クラスの値が小計・合計行であるかを判定する */
export function isCTSSubtotalRow(deptRaw: string, lineRaw: string, klassRaw: string): boolean {
  const fields = [deptRaw, lineRaw, klassRaw]
  return fields.some((f) => {
    const lower = f.toLowerCase().trim()
    if (!lower) return false
    return SUBTOTAL_PATTERNS.some((p) => lower === p || lower.endsWith(p))
  })
}

/**
 * 分類別時間帯売上CSVを処理する
 *
 * CSVレイアウト:
 *   行0: 空×5, 【取引時間】【取引時間】, 9:00, 9:00, 10:00, 10:00, ...
 *   行1: 空×5, 数量, 金額, 数量, 金額, ...
 *   行2: 【期間】, 【店舗】, 【部門】, 【ライン】, 【クラス】, 数量, 金額, ...
 *   行3+: データ行
 *
 * 各データ行:
 *   Col0: 期間 "2026年02月01日(日)"
 *   Col1: 店舗 "0001:毎日屋あさくらセンタ"
 *   Col2: 部門 "000061:果物"
 *   Col3: ライン "000601:柑橘"
 *   Col4: クラス "601010:温州みかん"
 *   Col5+: 時間帯別 (数量, 金額) ペア
 *
 * @param overflowDays 翌月から追加で取り込む日数（前年データ用）。
 *   同曜日オフセットにより月末付近の対応日が翌月にはみ出す場合に備え、
 *   翌月先頭の数日を拡張day番号（例: 2月28日の翌日→day 29）として保持する。
 *   最大オフセット=6 なので 6 を渡せば十分。
 */
export function processCategoryTimeSales(
  rows: readonly unknown[][],
  targetMonth?: number,
  overflowDays: number = 0,
  targetYear?: number,
  storeNameToId?: ReadonlyMap<string, string>,
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
    targetMonth != null && overflowDays > 0 ? detectDaysInTargetMonth(rows, 0, 3, targetMonth) : 0

  const records: CategoryTimeSalesRecord[] = []

  for (let row = 3; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    if (!r[0] && !r[1]) continue // 空行スキップ

    // 日付パース
    const date = parseDate(r[0])
    if (date == null) continue

    const day = resolveDay(date, targetMonth, daysInTargetMonth, overflowDays)
    if (day == null) continue

    // 小計・合計行を除外（二重計上防止）
    const deptRaw = String(r[2] ?? '')
    const lineRaw = String(r[3] ?? '')
    const klassRaw = String(r[4] ?? '')
    if (isCTSSubtotalRow(deptRaw, lineRaw, klassRaw)) continue

    // 店舗
    const storeId = parseStoreId(r[1], storeNameToId)

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
        const hour = hours[pairIdx] ?? 9 + pairIdx // フォールバック
        timeSlots.push({ hour, quantity, amount })
      }
      pairIdx++
    }

    // year/month は常にセットする。
    // 通常レコード（dateMonth === targetMonth）: 日付の年をそのまま使う（ファイルの実データを尊重）。
    // overflow レコード（翌月はみ出し）: targetYear を使用して対象月の年に揃える。
    // targetMonth 未指定時はパースした日付からそのまま取得。
    const isOverflow = targetMonth != null && date.getMonth() + 1 !== targetMonth
    const recordYear = isOverflow ? (targetYear ?? date.getFullYear()) : date.getFullYear()
    const recordMonth = targetMonth ?? date.getMonth() + 1

    records.push({
      year: recordYear,
      month: recordMonth,
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
