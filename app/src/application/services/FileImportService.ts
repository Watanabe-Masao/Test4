import type { DataType, AppSettings, ValidationMessage, ImportedData } from '@/domain/models'
import { processDroppedFiles as processDroppedFilesImpl } from '@/infrastructure/ImportService'
import type { ImportSummary as InfraImportSummary } from '@/infrastructure/ImportService'

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
  if (Object.keys(data.sales).length === 0) {
    messages.push({ level: 'error', message: '売上データがありません' })
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
    const d1 = checkStoreIds(data.sales, '売上データ')
    if (d1) unknownDetails.push(d1)
    const d2 = checkStoreIds(data.discount, '売変データ')
    if (d2) unknownDetails.push(d2)
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

  // ── オプショナルデータ ──
  if (data.budget.size === 0) {
    messages.push({
      level: 'info',
      message: '予算データがありません。予算ファイルを読み込むとより詳細な分析が可能です',
    })
  }
  if (Object.keys(data.discount).length === 0) {
    messages.push({
      level: 'info',
      message: '売変データがありません。売変ファイルを読み込むと推定粗利計算が可能です',
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
 *
 * detectedYearMonth: データの日付から検出された対象年月
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
}> {
  return processDroppedFilesImpl(files, appSettings, currentData, onProgress, overrideType)
}
