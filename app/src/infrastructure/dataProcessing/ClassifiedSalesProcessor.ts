import { parseDate } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { ClassifiedSalesData, ClassifiedSalesRecord } from '@/domain/models/ClassifiedSales'
import { classifiedSalesRecordKey } from '@/domain/models/ClassifiedSales'

export type { ClassifiedSalesData } from '@/domain/models/ClassifiedSales'
export { mergeClassifiedSalesData } from '@/domain/models/ClassifiedSales'

/**
 * 店舗名称から正規化した店舗IDを抽出する
 * "0001:毎日屋あさくらセンタ" → { storeId: "1", storeName: "毎日屋あさくらセンタ" }
 * "神田店" → { storeId: "神田店", storeName: "神田店" }
 */
function parseStore(value: unknown): { storeId: string; storeName: string } {
  const str = String(value ?? '').trim()
  const match = str.match(/^(\d{4}):(.+)$/)
  if (match) {
    return { storeId: String(parseInt(match[1])), storeName: match[2].trim() }
  }
  return { storeId: str, storeName: str }
}

/**
 * 分類別売上CSVを処理する
 *
 * CSVレイアウト（実データ準拠）:
 *   Col0: 日付       "2026年2月3日"
 *   Col1: 店舗名称   "毎日屋あさくらセンタ" or "0001:毎日屋あさくらセンタ"
 *   Col2: グループ名称 "青果"
 *   Col3: 部門名称   "果物"
 *   Col4: ライン名称 "柑橘"
 *   Col5: クラス名称 "温州みかん"
 *   Col6: 販売金額
 *   Col7: 71売変金額（政策売変）
 *   Col8: 72売変金額（レジ値引）
 *   Col9: 73売変金額（廃棄売変）
 *   Col10: 74売変金額（試食売変）
 *
 * 注意: 販売数量列は除外済み（ソースデータに含まれない前提）
 *   販売数量列がある場合は detectColumnsFromHeader で自動検出する
 */

/** カラムマッピング */
interface ColumnMapping {
  readonly dateCol: number
  readonly storeCol: number
  readonly groupCol: number
  readonly deptCol: number
  readonly lineCol: number
  readonly classCol: number
  readonly salesCol: number
  readonly discount71Col: number
  readonly discount72Col: number
  readonly discount73Col: number
  readonly discount74Col: number
  readonly headerRow: number
}

/**
 * ヘッダー行からカラムマッピングを自動検出する
 * ヘッダーがない場合はデフォルト位置を返す
 */
function detectColumns(rows: readonly unknown[][]): ColumnMapping {
  // ヘッダー行を探す（最初の3行をスキャン）
  for (let rowIdx = 0; rowIdx < Math.min(3, rows.length); rowIdx++) {
    const row = rows[rowIdx] as unknown[]
    const cells = row.map((c) => String(c ?? '').trim())

    // 日付列の特定
    const dateIdx = cells.findIndex(
      (c) => c === '日付' || c === '期間' || c === '【期間】',
    )
    // 販売金額列の特定
    const salesIdx = cells.findIndex(
      (c) => c === '販売金額' || c === '売上金額',
    )

    if (dateIdx >= 0 && salesIdx >= 0) {
      // 販売数量列があるか確認（販売金額の直前にあるか）
      const qtyIdx = cells.findIndex(
        (c) => c === '販売数量' || c === '数量',
      )

      // 71売変列の検出
      const d71Idx = cells.findIndex(
        (c) => c.includes('７１') || c.includes('71') || c === '政策売変',
      )

      if (d71Idx >= 0) {
        return {
          dateCol: dateIdx,
          storeCol: dateIdx + 1,
          groupCol: dateIdx + 2,
          deptCol: dateIdx + 3,
          lineCol: dateIdx + 4,
          classCol: dateIdx + 5,
          salesCol: qtyIdx >= 0 ? qtyIdx + 1 : salesIdx,
          discount71Col: d71Idx,
          discount72Col: d71Idx + 1,
          discount73Col: d71Idx + 2,
          discount74Col: d71Idx + 3,
          headerRow: rowIdx,
        }
      }
    }
  }

  // デフォルトマッピング（ヘッダーなし or 検出失敗時）
  // 販売数量なし: 日付, 店舗, グループ, 部門, ライン, クラス, 販売金額, 71, 72, 73, 74
  // 販売数量あり: 日付, 店舗, グループ, 部門, ライン, クラス, 販売数量, 販売金額, 71, 72, 73, 74
  const firstDataRow = rows[0] as unknown[] | undefined
  if (firstDataRow && firstDataRow.length >= 12) {
    // 12列以上 → 販売数量列あり
    return {
      dateCol: 0,
      storeCol: 1,
      groupCol: 2,
      deptCol: 3,
      lineCol: 4,
      classCol: 5,
      salesCol: 7, // col6=数量, col7=金額
      discount71Col: 8,
      discount72Col: 9,
      discount73Col: 10,
      discount74Col: 11,
      headerRow: -1, // ヘッダーなし
    }
  }

  // 11列 → 販売数量列なし
  return {
    dateCol: 0,
    storeCol: 1,
    groupCol: 2,
    deptCol: 3,
    lineCol: 4,
    classCol: 5,
    salesCol: 6,
    discount71Col: 7,
    discount72Col: 8,
    discount73Col: 9,
    discount74Col: 10,
    headerRow: -1,
  }
}

/**
 * 分類別売上CSVを処理する
 *
 * @param rows CSVパース済み2次元配列
 * @returns 分類別売上データ
 */
export function processClassifiedSales(
  rows: readonly unknown[][],
): ClassifiedSalesData {
  if (rows.length < 2) return { records: [] }

  const cols = detectColumns(rows)
  const dataStartRow = cols.headerRow + 1

  const records: ClassifiedSalesRecord[] = []

  for (let rowIdx = dataStartRow; rowIdx < rows.length; rowIdx++) {
    const r = rows[rowIdx] as unknown[]
    if (!r || r.length < cols.discount74Col + 1) continue

    // 日付パース
    const date = parseDate(r[cols.dateCol])
    if (date == null) continue

    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()

    // 店舗
    const { storeId, storeName } = parseStore(r[cols.storeCol])

    // カテゴリ階層
    const groupName = String(r[cols.groupCol] ?? '').trim()
    const departmentName = String(r[cols.deptCol] ?? '').trim()
    const lineName = String(r[cols.lineCol] ?? '').trim()
    const className = String(r[cols.classCol] ?? '').trim()

    // 金額
    const salesAmount = safeNumber(r[cols.salesCol])
    const discount71 = safeNumber(r[cols.discount71Col])
    const discount72 = safeNumber(r[cols.discount72Col])
    const discount73 = safeNumber(r[cols.discount73Col])
    const discount74 = safeNumber(r[cols.discount74Col])

    // 金額がすべて0の行はスキップ
    if (salesAmount === 0 && discount71 === 0 && discount72 === 0 && discount73 === 0 && discount74 === 0) {
      continue
    }

    records.push({
      year,
      month,
      day,
      storeId,
      storeName,
      groupName,
      departmentName,
      lineName,
      className,
      salesAmount,
      discount71,
      discount72,
      discount73,
      discount74,
    })
  }

  return { records }
}

/**
 * 分類別売上データから店舗一覧を抽出する
 */
export function extractStoresFromClassifiedSales(
  data: ClassifiedSalesData,
): Map<string, { id: string; code: string; name: string }> {
  const stores = new Map<string, { id: string; code: string; name: string }>()
  for (const rec of data.records) {
    if (!stores.has(rec.storeId)) {
      stores.set(rec.storeId, {
        id: rec.storeId,
        code: rec.storeId.padStart(4, '0'),
        name: rec.storeName,
      })
    }
  }
  return stores
}

/**
 * 分類別売上データから対象年月を検出する
 */
export function detectYearMonthFromClassifiedSales(
  data: ClassifiedSalesData,
): { year: number; month: number } | null {
  if (data.records.length === 0) return null
  // 最頻出の年月を返す
  const counts = new Map<string, { year: number; month: number; count: number }>()
  for (const rec of data.records) {
    const key = `${rec.year}-${rec.month}`
    const entry = counts.get(key)
    if (entry) {
      entry.count++
    } else {
      counts.set(key, { year: rec.year, month: rec.month, count: 1 })
    }
  }
  let best: { year: number; month: number; count: number } | null = null
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) {
      best = entry
    }
  }
  return best ? { year: best.year, month: best.month } : null
}

// Re-export for convenience
export { classifiedSalesRecordKey }
