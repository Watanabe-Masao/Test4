import { parseDate } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { CategoryTimeSalesData, CategoryTimeSalesRecord, TimeSlotEntry } from '@/domain/models'

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
 */
export function processCategoryTimeSales(
  rows: readonly unknown[][],
  targetMonth?: number,
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

  const records: CategoryTimeSalesRecord[] = []

  for (let row = 3; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    if (!r[0] && !r[1]) continue // 空行スキップ

    // 日付パース
    const date = parseDate(r[0])
    if (date == null) continue
    if (targetMonth != null && date.getMonth() + 1 !== targetMonth) continue
    const day = date.getDate()

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

/** レコードの重複判定用キーを生成する */
export function categoryTimeSalesRecordKey(rec: CategoryTimeSalesRecord): string {
  return `${rec.day}\t${rec.storeId}\t${rec.department.code}\t${rec.line.code}\t${rec.klass.code}`
}

/**
 * 分類別時間帯売上データをマージする（複数日ファイル対応）
 * 同一キー（日・店舗・部門・ライン・クラス）のレコードは後から来たデータで上書き
 */
export function mergeCategoryTimeSalesData(
  existing: CategoryTimeSalesData,
  incoming: CategoryTimeSalesData,
): CategoryTimeSalesData {
  const map = new Map<string, CategoryTimeSalesRecord>()
  for (const rec of existing.records) {
    map.set(categoryTimeSalesRecordKey(rec), rec)
  }
  for (const rec of incoming.records) {
    map.set(categoryTimeSalesRecordKey(rec), rec)
  }
  return { records: [...map.values()] }
}
