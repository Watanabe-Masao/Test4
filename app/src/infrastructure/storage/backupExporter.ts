/**
 * バックアップエクスポーター/インポーター
 *
 * アプリケーションデータをJSON形式のバックアップファイルとしてエクスポート・インポートする。
 * 元ファイル（rawFiles）+ メタデータ + 設定をバンドルして保存する。
 *
 * 注意: ZIP 圧縮は外部依存を避けてJSON形式を使用する。
 * 将来的に JSZip 等を導入して圧縮バックアップに移行可能。
 *
 * 使い方:
 * ```
 * import { backupExporter } from '@/infrastructure/storage/backupExporter'
 *
 * // エクスポート
 * const blob = await backupExporter.exportBackup(repo)
 * downloadBlob(blob, 'backup.json')
 *
 * // インポート
 * const result = await backupExporter.importBackup(file, repo)
 * ```
 */
import type { DataRepository } from '@/domain/repositories'
import type { ImportedData } from '@/domain/models'

/** バックアップファイルのフォーマットバージョン */
const BACKUP_FORMAT_VERSION = 1

/** バックアップのメタデータ */
export interface BackupMeta {
  readonly formatVersion: number
  readonly createdAt: string
  readonly appVersion: string
  readonly months: readonly { year: number; month: number }[]
}

/** バックアップ内の月別データ */
interface BackupMonthData {
  readonly year: number
  readonly month: number
  readonly data: ImportedData
}

/** バックアップファイル全体の構造 */
interface BackupFile {
  readonly meta: BackupMeta
  readonly months: readonly BackupMonthData[]
}

/** インポート結果 */
export interface BackupImportResult {
  readonly monthsImported: number
  readonly monthsSkipped: number
  readonly errors: readonly string[]
}

class BackupExporter {
  /**
   * 全月データをバックアップとしてエクスポートする
   */
  async exportBackup(repo: DataRepository): Promise<Blob> {
    const storedMonths = await repo.listStoredMonths()
    const months: BackupMonthData[] = []

    for (const { year, month } of storedMonths) {
      const data = await repo.loadMonthlyData(year, month)
      if (data) {
        months.push({ year, month, data })
      }
    }

    const backup: BackupFile = {
      meta: {
        formatVersion: BACKUP_FORMAT_VERSION,
        createdAt: new Date().toISOString(),
        appVersion: '1.0.0',
        months: storedMonths,
      },
      months,
    }

    const json = JSON.stringify(backup)
    return new Blob([json], { type: 'application/json' })
  }

  /**
   * バックアップファイルからデータをインポートする
   */
  async importBackup(
    file: File | Blob,
    repo: DataRepository,
    options?: { overwriteExisting?: boolean },
  ): Promise<BackupImportResult> {
    const text = await file.text()
    const backup = JSON.parse(text) as BackupFile

    // バージョンチェック
    if (!backup.meta || backup.meta.formatVersion > BACKUP_FORMAT_VERSION) {
      return {
        monthsImported: 0,
        monthsSkipped: 0,
        errors: [`Unsupported backup format version: ${backup.meta?.formatVersion}`],
      }
    }

    let monthsImported = 0
    let monthsSkipped = 0
    const errors: string[] = []
    const overwrite = options?.overwriteExisting ?? false

    for (const monthData of backup.months) {
      try {
        // 既存データチェック
        if (!overwrite) {
          const existing = await repo.loadMonthlyData(monthData.year, monthData.month)
          if (existing) {
            monthsSkipped++
            continue
          }
        }

        await repo.saveMonthlyData(monthData.data, monthData.year, monthData.month)
        monthsImported++
      } catch (err) {
        errors.push(
          `${monthData.year}-${monthData.month}: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    return { monthsImported, monthsSkipped, errors }
  }

  /**
   * バックアップファイルのメタデータだけを読み取る（プレビュー用）
   */
  async readMeta(file: File | Blob): Promise<BackupMeta | null> {
    try {
      const text = await file.text()
      const backup = JSON.parse(text) as BackupFile
      return backup.meta ?? null
    } catch {
      return null
    }
  }
}

/** グローバルシングルトン */
export const backupExporter = new BackupExporter()
