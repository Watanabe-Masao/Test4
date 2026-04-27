/**
 * 分類別売上CSV プロセッサ
 *
 * CSVレイアウト（ヘッダー行 + データ行）:
 *   日付, 店舗名称, グループ名称, 部門名称, ライン名称, クラス名称,
 *   販売金額, 71売変, 72売変, 73売変, 74売変
 *
 * 列位置はヘッダー名で自動検出する。
 *
 * @responsibility R:unclassified
 */
import { parseDate } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { ClassifiedSalesData, ClassifiedSalesRecord } from '@/domain/models/ClassifiedSales'

export type { ClassifiedSalesData } from '@/domain/models/ClassifiedSales'

// ─── ヘッダー検出 ────────────────────────────────────

interface ColumnMap {
  date: number
  store: number
  group: number
  department: number
  line: number
  klass: number
  salesAmount: number
  discount71: number
  discount72: number
  discount73: number
  discount74: number
}

const HEADER_PATTERNS: Record<keyof ColumnMap, readonly string[]> = {
  date: ['日付', '期間', '取引日'],
  store: ['店舗名称', '店舗', '店名'],
  group: ['グループ名称', 'グループ'],
  department: ['部門名称', '部門'],
  line: ['ライン名称', 'ライン'],
  klass: ['クラス名称', 'クラス'],
  salesAmount: ['販売金額', '売上金額', '売上'],
  discount71: ['71売変', '政策売変', '71'],
  discount72: ['72売変', 'レジ値引', '72'],
  discount73: ['73売変', '廃棄売変', '73'],
  discount74: ['74売変', '試食売変', '74'],
}

function detectColumns(headerRow: readonly unknown[]): ColumnMap | null {
  const headers = headerRow.map((cell) => String(cell ?? '').trim())

  const find = (patterns: readonly string[]): number => {
    for (const pattern of patterns) {
      const idx = headers.findIndex((h) => h.includes(pattern))
      if (idx >= 0) return idx
    }
    return -1
  }

  const map: Record<string, number> = {}
  for (const [key, patterns] of Object.entries(HEADER_PATTERNS)) {
    map[key] = find(patterns)
  }

  // 必須列チェック
  if (map.date < 0 || map.store < 0 || map.salesAmount < 0) return null

  // 売変列が見つからない場合はデフォルト位置を推定
  // (販売金額列の次に71,72,73,74が並ぶ)
  if (map.discount71 < 0 && map.salesAmount >= 0) {
    map.discount71 = map.salesAmount + 1
    map.discount72 = map.salesAmount + 2
    map.discount73 = map.salesAmount + 3
    map.discount74 = map.salesAmount + 4
  }

  return map as unknown as ColumnMap
}

// ─── 店舗ID抽出 ─────────────────────────────────────

/**
 * 店舗名から店舗IDを抽出する
 * "0001:毎日屋あさくらセンタ" → "1"
 * "毎日屋あさくらセンタ" → 逆引きマップで名前→IDを解決、なければそのまま
 */
function parseStoreId(
  value: unknown,
  nameToId?: ReadonlyMap<string, string>,
): { storeId: string; storeName: string } {
  const str = String(value ?? '').trim()
  const match = str.match(/^(\d{4}):(.*)$/)
  if (match) {
    return {
      storeId: String(parseInt(match[1])),
      storeName: match[2].trim() || match[1],
    }
  }
  // コード無しの場合、店舗名→ID逆引きマップで解決を試みる
  if (nameToId) {
    const resolvedId = nameToId.get(str)
    if (resolvedId) {
      return { storeId: resolvedId, storeName: str }
    }
  }
  return { storeId: str, storeName: str }
}

// ─── 小計行フィルタ ─────────────────────────────────

/**
 * 小計・合計行の検出パターン。
 * CSVファイルに含まれる集約行を除外し、二重計上を防ぐ。
 */
const SUBTOTAL_PATTERNS = ['合計', '小計', '計', 'total', 'subtotal']

/** カテゴリ名が小計・合計行であるかを判定する */
function isSubtotalRow(
  groupName: string,
  departmentName: string,
  lineName: string,
  className: string,
): boolean {
  const fields = [groupName, departmentName, lineName, className]
  return fields.some((f) => {
    const lower = f.toLowerCase()
    return SUBTOTAL_PATTERNS.some((p) => lower === p || lower.endsWith(p))
  })
}

// ─── メイン処理 ──────────────────────────────────────

/** スキップ行の理由 */
export interface SkippedRow {
  readonly row: number
  readonly reason: string
}

/**
 * 分類別売上CSVを処理する
 *
 * @param targetMonth 対象月（指定時はその月のデータのみ抽出）
 * @param storeNameToId 店舗名→数値ID逆引きマップ（コード無しCSV対応）
 */
export function processClassifiedSales(
  rows: readonly unknown[][],
  targetMonth?: number,
  storeNameToId?: ReadonlyMap<string, string>,
): ClassifiedSalesData & { skippedSubtotalRows?: readonly SkippedRow[] } {
  if (rows.length < 2) return { records: [] }

  // ヘッダー検出
  const colMap = detectColumns(rows[0] as unknown[])
  if (!colMap) return { records: [] }

  const records: ClassifiedSalesRecord[] = []
  const skippedSubtotalRows: SkippedRow[] = []

  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const r = rows[rowIdx] as unknown[]

    const date = parseDate(r[colMap.date])
    if (date == null) continue

    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()

    // 月フィルタ
    if (targetMonth != null && month !== targetMonth) continue

    const { storeId, storeName } = parseStoreId(r[colMap.store], storeNameToId)

    const groupName = String(r[colMap.group] ?? '').trim()
    const departmentName = String(r[colMap.department] ?? '').trim()
    const lineName = String(r[colMap.line] ?? '').trim()
    const className = String(r[colMap.klass] ?? '').trim()

    // 小計・合計行を除外（二重計上防止）
    if (isSubtotalRow(groupName, departmentName, lineName, className)) {
      skippedSubtotalRows.push({
        row: rowIdx + 1,
        reason: `小計/合計行をスキップ: ${[groupName, departmentName, lineName, className].filter(Boolean).join(' > ')}`,
      })
      continue
    }

    const salesAmount = safeNumber(r[colMap.salesAmount])

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
      discount71: safeNumber(r[colMap.discount71]),
      discount72: safeNumber(r[colMap.discount72]),
      discount73: safeNumber(r[colMap.discount73]),
      discount74: safeNumber(r[colMap.discount74]),
    })
  }

  return {
    records,
    skippedSubtotalRows: skippedSubtotalRows.length > 0 ? skippedSubtotalRows : undefined,
  }
}

/**
 * 分類別売上データから店舗一覧を抽出する
 */
export function extractStoresFromClassifiedSales(
  rows: readonly unknown[][],
): Map<string, { id: string; code: string; name: string }> {
  const stores = new Map<string, { id: string; code: string; name: string }>()
  if (rows.length < 2) return stores

  const colMap = detectColumns(rows[0] as unknown[])
  if (!colMap) return stores

  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const r = rows[rowIdx] as unknown[]
    const raw = String(r[colMap.store] ?? '').trim()
    const match = raw.match(/^(\d{4}):(.*)$/)
    if (match) {
      const code = match[1]
      const id = String(parseInt(code))
      const name = match[2].trim() || code
      if (!stores.has(id)) {
        stores.set(id, { id, code, name })
      }
    }
  }

  return stores
}

/**
 * 分類別売上データから年月を検出する
 */
export function detectYearMonthFromClassifiedSales(
  rows: readonly unknown[][],
): { year: number; month: number } | null {
  if (rows.length < 2) return null

  const colMap = detectColumns(rows[0] as unknown[])
  if (!colMap) return null

  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const r = rows[rowIdx] as unknown[]
    const date = parseDate(r[colMap.date])
    if (date != null) {
      return { year: date.getFullYear(), month: date.getMonth() + 1 }
    }
  }

  return null
}
