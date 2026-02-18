import type { DataType, AppSettings, ValidationMessage, ImportedData } from '@/domain/models'
import { processDroppedFiles as processDroppedFilesImpl } from '@/infrastructure/ImportService'

// ─── Types ───────────────────────────────────────────────

/** 単一ファイルのインポート結果 */
export interface FileImportResult {
  readonly ok: boolean
  readonly filename: string
  readonly type: DataType | null
  readonly typeName: string | null
  readonly error?: string
}

/** バッチインポートの全体結果 */
export interface ImportSummary {
  readonly results: readonly FileImportResult[]
  readonly successCount: number
  readonly failureCount: number
}

/** 進捗コールバック */
export type ProgressCallback = (current: number, total: number, filename: string) => void

// ─── Validation (pure business logic) ────────────────────

/**
 * インポートデータのバリデーション
 */
export function validateImportedData(data: ImportedData): readonly ValidationMessage[] {
  const messages: ValidationMessage[] = []
  const storeCount = data.stores.size

  // 必須データチェック
  if (Object.keys(data.purchase).length === 0) {
    messages.push({ level: 'error', message: '仕入データがありません' })
  }
  if (Object.keys(data.sales).length === 0) {
    messages.push({ level: 'error', message: '売上データがありません' })
  }

  // 店舗チェック
  if (storeCount === 0) {
    messages.push({ level: 'warning', message: '店舗が検出されませんでした' })
  }

  // 在庫設定チェック
  const invCount = data.settings.size
  if (invCount === 0) {
    messages.push({
      level: 'warning',
      message: '在庫設定がありません。初期設定ファイルを読み込むか手動設定してください',
    })
  } else if (invCount < storeCount) {
    messages.push({
      level: 'warning',
      message: `一部店舗の在庫設定がありません (${invCount}/${storeCount})`,
    })
  }

  // オプショナルデータ
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
 */
export async function processDroppedFiles(
  files: FileList | File[],
  appSettings: AppSettings,
  currentData: ImportedData,
  onProgress?: ProgressCallback,
  overrideType?: DataType,
): Promise<{ summary: ImportSummary; data: ImportedData }> {
  return processDroppedFilesImpl(files, appSettings, currentData, onProgress, overrideType)
}
