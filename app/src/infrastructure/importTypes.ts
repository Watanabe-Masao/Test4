/**
 * インポート関連の型定義とパーティションユーティリティ
 *
 * ImportService.ts から分割。型定義・パーティション操作・年月検出を担当。
 *
 * @responsibility R:unclassified
 */
import type {
  PurchaseData,
  SpecialSalesData,
  TransferData,
  CostInclusionData,
  BudgetData,
} from '@/domain/models/record'
import type { DataType } from '@/domain/models/storeTypes'
import type { MonthlyData } from '@/domain/models/MonthlyData'

// ─── 型定義 ──────────────────────────────────────────

/** 単一ファイルのインポート結果 */
export interface FileImportResult {
  readonly ok: boolean
  readonly filename: string
  /** フォルダ選択時の相対パス（webkitRelativePath）。監査・重複判定に使用 */
  readonly relativePath?: string
  readonly type: DataType | null
  readonly typeName: string | null
  readonly error?: string
  readonly rowCount?: number
  readonly skippedRows?: readonly string[]
  /** プロセッサの警告（ヘッダ形式不正、0件結果など） */
  readonly warnings?: readonly string[]
}

/** バッチインポートの全体結果 */
export interface ImportSummary {
  readonly results: readonly FileImportResult[]
  readonly successCount: number
  readonly failureCount: number
  readonly skippedFiles?: readonly string[]
}

/** 進捗コールバック */
export type ProgressCallback = (current: number, total: number, filename: string) => void

/**
 * StoreDayIndex 系データの年月パーティション。
 * キーは monthKey ("YYYY-M") 形式。
 */
export interface MonthPartitions {
  readonly purchase: Record<string, PurchaseData>
  readonly flowers: Record<string, SpecialSalesData>
  readonly directProduce: Record<string, SpecialSalesData>
  readonly interStoreIn: Record<string, TransferData>
  readonly interStoreOut: Record<string, TransferData>
  readonly consumables: Record<string, CostInclusionData>
  readonly budget: Record<string, ReadonlyMap<string, BudgetData>>
}

/** 空の MonthPartitions */
export function createEmptyMonthPartitions(): MonthPartitions {
  return {
    purchase: {},
    flowers: {},
    directProduce: {},
    interStoreIn: {},
    interStoreOut: {},
    consumables: {},
    budget: {},
  }
}

// ─── パーティション操作ヘルパー ──────────────────────

/**
 * パーティションキーやレコードの year/month から年月を検出する。
 * classifiedSales/categoryTimeSales が含まれないインポートで
 * detectedYearMonth が未設定のときに使用するフォールバック。
 */
export function detectYearMonthFromPartitionsOrRecords(
  data: MonthlyData,
  mp: MonthPartitions,
): { year: number; month: number } | undefined {
  const allKeys = new Set<string>()
  for (const mk of Object.keys(mp.purchase)) allKeys.add(mk)
  for (const mk of Object.keys(mp.flowers)) allKeys.add(mk)
  for (const mk of Object.keys(mp.directProduce)) allKeys.add(mk)
  for (const mk of Object.keys(mp.interStoreIn)) allKeys.add(mk)
  for (const mk of Object.keys(mp.interStoreOut)) allKeys.add(mk)
  for (const mk of Object.keys(mp.consumables)) allKeys.add(mk)
  for (const mk of Object.keys(mp.budget)) allKeys.add(mk)

  for (const rec of data.classifiedSales.records) {
    allKeys.add(`${rec.year}-${rec.month}`)
  }
  for (const rec of data.categoryTimeSales.records) {
    allKeys.add(`${rec.year}-${rec.month}`)
  }

  if (allKeys.size === 0) return undefined

  const sorted = [...allKeys].sort((a, b) => {
    const [ay, am] = a.split('-').map(Number)
    const [by, bm] = b.split('-').map(Number)
    return ay !== by ? ay - by : am - bm
  })

  const [year, month] = sorted[0].split('-').map(Number)
  if (isNaN(year) || isNaN(month)) return undefined
  return { year, month }
}

/** flat record パーティションをマージ（同月の場合は concat） */
export function mergeRecordPartitions<T>(
  existing: Record<string, { readonly records: readonly T[] }>,
  incoming: Record<string, { readonly records: readonly T[] }>,
): Record<string, { readonly records: readonly T[] }> {
  const result = { ...existing }
  for (const [mk, d] of Object.entries(incoming)) {
    if (result[mk]) {
      result[mk] = { records: [...result[mk].records, ...d.records] }
    } else {
      result[mk] = d
    }
  }
  return result
}

/** Map パーティションをマージ */
export function mergeMapPartitions<K, V>(
  existing: Record<string, ReadonlyMap<K, V>>,
  incoming: Record<string, ReadonlyMap<K, V>>,
): Record<string, ReadonlyMap<K, V>> {
  const result = { ...existing }
  for (const [mk, d] of Object.entries(incoming)) {
    if (result[mk]) {
      const merged = new Map(result[mk])
      for (const [k, v] of d) merged.set(k, v)
      result[mk] = merged
    } else {
      result[mk] = d
    }
  }
  return result
}
