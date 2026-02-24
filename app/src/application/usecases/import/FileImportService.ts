import type { DataType, AppSettings, ValidationMessage, ImportedData, PurchaseData, SpecialSalesData, TransferData, ConsumableData, BudgetData } from '@/domain/models'
import { processDroppedFiles as processDroppedFilesImpl } from '@/infrastructure/ImportService'
import type { MonthPartitions } from '@/infrastructure/ImportService'
import { monthKey } from '@/infrastructure/fileImport/dateParser'

// Re-export partition types
export type { MonthPartitions } from '@/infrastructure/ImportService'
export { createEmptyMonthPartitions } from '@/infrastructure/ImportService'

// ─── Types ───────────────────────────────────────────────

/** 単一ファイルのインポート結果 */
export interface FileImportResult {
  readonly ok: boolean
  readonly filename: string
  readonly type: DataType | null
  readonly typeName: string | null
  readonly error?: string
  readonly rowCount?: number
  readonly skippedRows?: readonly string[]
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

// ─── Validation (pure business logic) ────────────────────

/**
 * インポートデータのバリデーション
 */
export function validateImportedData(
  data: ImportedData,
  importSummary?: ImportSummary,
): readonly ValidationMessage[] {
  const messages: ValidationMessage[] = []
  const storeCount = data.stores.size

  // ── インポート結果サマリー ──
  if (importSummary) {
    // 失敗ファイルの詳細
    const failures = importSummary.results.filter((r) => !r.ok)
    if (failures.length > 0) {
      messages.push({
        level: 'error',
        message: `${failures.length}件のファイルの取り込みに失敗しました`,
        details: failures.map((f) => `${f.filename}: ${f.error ?? '不明なエラー'}`),
      })
    }

    // スキップされたファイル
    if (importSummary.skippedFiles && importSummary.skippedFiles.length > 0) {
      messages.push({
        level: 'warning',
        message: `${importSummary.skippedFiles.length}件のファイルがスキップされました（非対応形式）`,
        details: importSummary.skippedFiles.map((f) => f),
      })
    }

    // スキップされた行の詳細
    const filesWithSkips = importSummary.results.filter(
      (r) => r.ok && r.skippedRows && r.skippedRows.length > 0,
    )
    if (filesWithSkips.length > 0) {
      const details: string[] = []
      for (const f of filesWithSkips) {
        details.push(`${f.filename} (${f.typeName}):`)
        for (const row of f.skippedRows!) {
          details.push(`  ${row}`)
        }
      }
      messages.push({
        level: 'warning',
        message: `一部のデータ行がスキップされました`,
        details,
      })
    }

    // 成功サマリー
    if (importSummary.successCount > 0) {
      const details = importSummary.results
        .filter((r) => r.ok)
        .map((r) => `${r.typeName}: ${r.filename}${r.rowCount ? ` (${r.rowCount}行)` : ''}`)
      messages.push({
        level: 'info',
        message: `${importSummary.successCount}件のファイルを正常に取り込みました`,
        details,
      })
    }
  }

  // ── 必須データチェック ──
  if (Object.keys(data.purchase).length === 0) {
    messages.push({ level: 'error', message: '仕入データがありません' })
  }
  if (data.classifiedSales.records.length === 0) {
    messages.push({ level: 'error', message: '分類別売上データがありません' })
  }

  // ── 店舗存在チェック ──
  if (storeCount === 0) {
    messages.push({ level: 'warning', message: '店舗が検出されませんでした' })
  } else {
    const storeIds = new Set(data.stores.keys())

    // 各データ種別で参照されている店舗IDを収集し、未知の店舗を検出
    const unknownStoreIds = new Set<string>()
    const checkStoreIds = (record: Record<string, unknown>, label: string) => {
      const unknown: string[] = []
      for (const sid of Object.keys(record)) {
        if (!storeIds.has(sid)) {
          unknownStoreIds.add(sid)
          unknown.push(sid)
        }
      }
      return unknown.length > 0 ? `${label}: 店舗ID ${unknown.join(', ')}` : null
    }

    const unknownDetails: string[] = []
    const d3 = checkStoreIds(data.interStoreIn, '店間入データ')
    if (d3) unknownDetails.push(d3)
    const d4 = checkStoreIds(data.interStoreOut, '店間出データ')
    if (d4) unknownDetails.push(d4)
    const d5 = checkStoreIds(data.flowers, '花データ')
    if (d5) unknownDetails.push(d5)
    const d6 = checkStoreIds(data.directProduce, '産直データ')
    if (d6) unknownDetails.push(d6)
    const d7 = checkStoreIds(data.consumables, '消耗品データ')
    if (d7) unknownDetails.push(d7)

    if (unknownStoreIds.size > 0) {
      messages.push({
        level: 'warning',
        message: `${unknownStoreIds.size}件の未登録店舗IDがデータに含まれています`,
        details: unknownDetails,
      })
    }

    // 在庫設定に存在しない店舗チェック
    for (const [sid] of data.settings) {
      if (!storeIds.has(sid)) {
        unknownDetails.push(`在庫設定: 店舗ID ${sid}`)
      }
    }
    for (const [sid] of data.budget) {
      if (!storeIds.has(sid)) {
        unknownDetails.push(`予算データ: 店舗ID ${sid}`)
      }
    }
  }

  // ── 在庫設定チェック ──
  const invCount = data.settings.size
  if (invCount === 0) {
    messages.push({
      level: 'warning',
      message: '在庫設定がありません。初期設定ファイルを読み込むか手動設定してください',
    })
  } else if (invCount < storeCount) {
    const missingStores: string[] = []
    for (const [id, store] of data.stores) {
      if (!data.settings.has(id)) {
        missingStores.push(`${store.name} (ID: ${id})`)
      }
    }
    messages.push({
      level: 'warning',
      message: `一部店舗の在庫設定がありません (${invCount}/${storeCount})`,
      details: missingStores.length > 0 ? [`未設定: ${missingStores.join(', ')}`] : undefined,
    })
  }

  // ── 分類別売上と分類別時間帯売上の整合性チェック ──
  if (data.categoryTimeSales?.records?.length && data.classifiedSales.records.length > 0) {
    const ctsByStoreDay = new Map<string, number>()
    for (const rec of data.categoryTimeSales.records) {
      const key = `${rec.storeId}|${rec.day}`
      ctsByStoreDay.set(key, (ctsByStoreDay.get(key) ?? 0) + rec.totalAmount)
    }

    const csByStoreDay = new Map<string, number>()
    for (const rec of data.classifiedSales.records) {
      const key = `${rec.storeId}|${rec.day}`
      csByStoreDay.set(key, (csByStoreDay.get(key) ?? 0) + rec.salesAmount)
    }

    let totalCSSum = 0
    let totalCtsSum = 0
    for (const [key, csAmt] of csByStoreDay) {
      totalCSSum += csAmt
      totalCtsSum += ctsByStoreDay.get(key) ?? 0
    }

    if (totalCSSum > 0 && totalCtsSum > 0) {
      const divergence = Math.abs(totalCSSum - totalCtsSum)
      const divergenceRate = divergence / totalCSSum
      if (divergenceRate > 0.01) {
        messages.push({
          level: 'warning',
          message: `分類別売上と分類別時間帯売上の合計に乖離があります（${(divergenceRate * 100).toFixed(1)}%）`,
          details: [
            `分類別売上合計: ${Math.round(totalCSSum).toLocaleString()}円`,
            `時間帯売上合計: ${Math.round(totalCtsSum).toLocaleString()}円`,
            `差額: ${Math.round(divergence).toLocaleString()}円`,
            '要因分解チャートの精度に影響する可能性があります',
          ],
        })
      }
    }
  }

  // ── オプショナルデータ ──
  if (data.budget.size === 0) {
    messages.push({
      level: 'info',
      message: '予算データがありません。予算ファイルを読み込むとより詳細な分析が可能です',
    })
  }
  const hasDiscountData = data.classifiedSales.records.some(
    (r) => r.discount71 !== 0 || r.discount72 !== 0 || r.discount73 !== 0 || r.discount74 !== 0,
  )
  if (!hasDiscountData && data.classifiedSales.records.length > 0) {
    messages.push({
      level: 'info',
      message: '分類別売上に売変データが含まれていません。売変列付きのファイルを読み込むと推定粗利計算の精度が向上します',
    })
  }

  return messages
}

/**
 * バリデーションにエラーがないかチェック
 */
export function hasValidationErrors(messages: readonly ValidationMessage[]): boolean {
  return messages.some((m) => m.level === 'error')
}

// ─── File import (delegates to infrastructure) ───────────

/**
 * 複数ファイルをバッチインポートする
 * Infrastructure層の実装に委譲する
 */
export async function processDroppedFiles(
  files: FileList | File[],
  appSettings: AppSettings,
  currentData: ImportedData,
  onProgress?: ProgressCallback,
  overrideType?: DataType,
): Promise<{
  summary: ImportSummary
  data: ImportedData
  detectedYearMonth?: { year: number; month: number }
  monthPartitions: MonthPartitions
}> {
  return processDroppedFilesImpl(files, appSettings, currentData, onProgress, overrideType)
}

// ─── Multi-month utilities ──────────────────────────────────

/**
 * ImportedData のレコードベースデータおよび MonthPartitions に含まれる年月の一覧を抽出する。
 * classifiedSales、categoryTimeSales の各レコードと StoreDayRecord パーティションの
 * キーを収集し、年月昇順で返す。
 */
export function extractRecordMonths(
  data: ImportedData,
  partitions?: MonthPartitions,
): readonly { year: number; month: number }[] {
  const seen = new Set<string>()
  const result: { year: number; month: number }[] = []

  const addMonth = (year: number, month: number) => {
    const key = `${year}-${month}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push({ year, month })
    }
  }

  for (const rec of data.classifiedSales.records) {
    addMonth(rec.year, rec.month)
  }

  for (const rec of data.categoryTimeSales.records) {
    if (rec.year != null && rec.month != null) {
      addMonth(rec.year, rec.month)
    }
  }

  // StoreDayRecord パーティションのキーからも年月を収集
  if (partitions) {
    const allPartitionKeys = new Set<string>()
    for (const mk of Object.keys(partitions.purchase)) allPartitionKeys.add(mk)
    for (const mk of Object.keys(partitions.flowers)) allPartitionKeys.add(mk)
    for (const mk of Object.keys(partitions.directProduce)) allPartitionKeys.add(mk)
    for (const mk of Object.keys(partitions.interStoreIn)) allPartitionKeys.add(mk)
    for (const mk of Object.keys(partitions.interStoreOut)) allPartitionKeys.add(mk)
    for (const mk of Object.keys(partitions.consumables)) allPartitionKeys.add(mk)
    for (const mk of Object.keys(partitions.budget)) allPartitionKeys.add(mk)

    for (const mk of allPartitionKeys) {
      const parts = mk.split('-')
      if (parts.length === 2) {
        addMonth(Number(parts[0]), Number(parts[1]))
      }
    }
  }

  result.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month))
  return result
}

/**
 * ImportedData から指定年月のレコードのみを含む ImportedData を返す。
 * classifiedSales と categoryTimeSales を年月で厳密フィルタし、
 * MonthPartitions が提供された場合は StoreDayRecord 系データも適切に分割する。
 * partitions が無い場合はレコード系のみフィルタし、StoreDayRecord はそのまま維持する。
 */
export function filterDataForMonth(
  data: ImportedData,
  year: number,
  month: number,
  partitions?: MonthPartitions,
): ImportedData {
  const mk = monthKey(year, month)

  const base: ImportedData = {
    ...data,
    classifiedSales: {
      records: data.classifiedSales.records.filter(
        (r) => r.year === year && r.month === month,
      ),
    },
    categoryTimeSales: {
      records: data.categoryTimeSales.records.filter(
        (r) => r.year === year && r.month === month,
      ),
    },
  }

  if (!partitions) return base

  // パーティション情報を使って StoreDayRecord 系データを年月で分割
  return {
    ...base,
    purchase: (partitions.purchase[mk] ?? {}) as PurchaseData,
    flowers: (partitions.flowers[mk] ?? {}) as SpecialSalesData,
    directProduce: (partitions.directProduce[mk] ?? {}) as SpecialSalesData,
    interStoreIn: (partitions.interStoreIn[mk] ?? {}) as TransferData,
    interStoreOut: (partitions.interStoreOut[mk] ?? {}) as TransferData,
    consumables: (partitions.consumables[mk] ?? {}) as ConsumableData,
    budget: partitions.budget[mk] ?? new Map<string, BudgetData>(),
  }
}
