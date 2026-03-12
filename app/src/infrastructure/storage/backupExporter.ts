/**
 * バックアップエクスポーター/インポーター
 *
 * アプリケーションデータをJSON形式のバックアップファイルとしてエクスポート・インポートする。
 * 元ファイル（rawFiles）+ メタデータ + 設定をバンドルして保存する。
 *
 * フォーマット v2:
 * - AppSettings（アプリ全体設定）を含む
 * - SHA-256 チェックサムで整合性を検証
 * - gzip 圧縮（CompressionStream 対応ブラウザ）
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
import type {
  ImportedData,
  AppSettings,
  ImportHistoryEntry,
  RawDataManifest,
} from '@/domain/models'
import { writeFile, pruneOldFiles } from './folderAccess'
import { rawFileStore } from './rawFileStore'
import {
  hydrateImportedData,
  computeSHA256,
  isCompressionSupported,
  compress,
  decompress,
  isGzipped,
} from './backupFormat'

/** バックアップファイルのフォーマットバージョン */
const BACKUP_FORMAT_VERSION = 3

// ─── v3 フォーマット設計 ──────────────────────────────────
//
// v3 は 5層データモデルに対応したバックアップ形式。v2 との後方互換を維持する。
//
// 追加フィールド:
//   rawManifest?: RawDataManifest[]
//     - raw_data 層のファイルメタデータ（Blob は含まない）
//     - インポート元ファイルのハッシュ・サイズ・データ種別を記録
//     - リストア時の監査証跡として使用
//
// 読み込み互換性:
//   v2 → v3 読み込み: rawManifest が undefined のまま正常動作
//   v3 → v2 読み込み: rawManifest フィールドは無視される（unknown プロパティ）
//
// formatVersion 判定:
//   v1: checksum なし、appSettings なし
//   v2: checksum あり、appSettings あり
//   v3: v2 + rawManifest あり
// ───────────────────────────────────────────────────────────

/** バックアップのメタデータ */
export interface BackupMeta {
  readonly formatVersion: number
  readonly createdAt: string
  readonly appVersion: string
  readonly months: readonly { year: number; month: number }[]
  /** SHA-256 of months JSON (v2+) */
  readonly checksum?: string
}

/** バックアップ内の月別データ */
interface BackupMonthData {
  readonly year: number
  readonly month: number
  readonly data: ImportedData
  /** v2+: インポート履歴 */
  readonly importHistory?: readonly ImportHistoryEntry[]
}

/** バックアップファイル全体の構造 (v3) */
interface BackupFile {
  readonly meta: BackupMeta
  readonly months: readonly BackupMonthData[]
  /** アプリケーション全体設定 (v2+) */
  readonly appSettings?: AppSettings
  /** raw_data 層のファイルメタデータ (v3+) */
  readonly rawManifest?: readonly RawDataManifest[]
}

/** インポート結果 */
export interface BackupImportResult {
  readonly monthsImported: number
  readonly monthsSkipped: number
  readonly errors: readonly string[]
  /** v2: 復元された AppSettings (呼び出し側で適用する) */
  readonly restoredAppSettings?: AppSettings
  /** v2: 復元されたインポート履歴の月数 */
  readonly importHistoryRestored: number
  /** v3: 復元された Raw データマニフェスト数 */
  readonly rawManifestRestored: number
}

class BackupExporter {
  /**
   * 全月データをバックアップとしてエクスポートする。
   * v2: AppSettings を含み、SHA-256 チェックサムで整合性を保証する。
   * CompressionStream 対応ブラウザでは gzip 圧縮する。
   */
  async exportBackup(repo: DataRepository, appSettings?: AppSettings): Promise<Blob> {
    const storedMonths = await repo.listStoredMonths()
    const months: BackupMonthData[] = []

    for (const { year, month } of storedMonths) {
      const data = await repo.loadMonthlyData(year, month)
      if (data) {
        const importHistory = await repo.loadImportHistory(year, month)
        months.push({
          year,
          month,
          data,
          importHistory: importHistory.length > 0 ? importHistory : undefined,
        })
      }
    }

    // v3: rawManifest を収集（rawFileStore が利用不可の場合はスキップ）
    let rawManifest: RawDataManifest[] = []
    try {
      for (const { year, month } of storedMonths) {
        const files = await rawFileStore.listFiles(year, month)
        if (files.length > 0) {
          rawManifest.push({
            year,
            month,
            files: files.map((f) => ({
              filename: f.filename,
              ...(f.relativePath ? { relativePath: f.relativePath } : {}),
              dataType: f.dataType as import('@/domain/models').DataType,
              hash: f.hash,
              size: f.size,
              savedAt: f.savedAt,
            })),
            importedAt: files[0].savedAt,
          })
        }
      }
    } catch {
      // rawFileStore が利用不可（IndexedDB 未初期化等）の場合、rawManifest は空
      rawManifest = []
    }

    const mapReplacer = (_key: string, value: unknown) => {
      if (value instanceof Map) return Object.fromEntries(value)
      return value
    }

    // months JSON のチェックサムを計算
    const monthsJson = JSON.stringify(months, mapReplacer)
    const checksum = await computeSHA256(monthsJson)

    const backup: BackupFile = {
      meta: {
        formatVersion: BACKUP_FORMAT_VERSION,
        createdAt: new Date().toISOString(),
        appVersion: '1.0.0',
        months: storedMonths,
        checksum,
      },
      months,
      appSettings,
      rawManifest: rawManifest.length > 0 ? rawManifest : undefined,
    }

    const json = JSON.stringify(backup, mapReplacer)

    // gzip 圧縮（対応ブラウザのみ）
    if (isCompressionSupported()) {
      return compress(json)
    }
    return new Blob([json], { type: 'application/json' })
  }

  /**
   * バックアップファイルからデータをインポートする。
   * v1/v2 両対応。v2 ではチェックサム検証 + AppSettings 復元。
   * gzip 圧縮ファイルも自動検出・展開する。
   */
  async importBackup(
    file: File | Blob,
    repo: DataRepository,
    options?: { overwriteExisting?: boolean },
  ): Promise<BackupImportResult> {
    // gzip 自動判定・展開
    let text: string
    if (await isGzipped(file)) {
      text = await decompress(file)
    } else {
      text = await file.text()
    }

    const backup = JSON.parse(text) as BackupFile

    // バージョンチェック（v1/v2/v3 全対応）
    if (!backup.meta || backup.meta.formatVersion > BACKUP_FORMAT_VERSION) {
      return {
        monthsImported: 0,
        monthsSkipped: 0,
        errors: [`Unsupported backup format version: ${backup.meta?.formatVersion}`],
        importHistoryRestored: 0,
        rawManifestRestored: 0,
      }
    }

    // v2: SHA-256 チェックサム検証
    if (backup.meta.checksum) {
      const mapReplacer = (_key: string, value: unknown) => {
        if (value instanceof Map) return Object.fromEntries(value)
        return value
      }
      const monthsJson = JSON.stringify(backup.months, mapReplacer)
      const computed = await computeSHA256(monthsJson)
      if (computed !== backup.meta.checksum) {
        return {
          monthsImported: 0,
          monthsSkipped: 0,
          errors: [
            `Checksum mismatch: backup may be corrupted (expected ${backup.meta.checksum.slice(0, 8)}..., got ${computed.slice(0, 8)}...)`,
          ],
          importHistoryRestored: 0,
          rawManifestRestored: 0,
        }
      }
    }

    let monthsImported = 0
    let monthsSkipped = 0
    let importHistoryRestored = 0
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

        // JSON.parse で失われた Map を復元してから保存
        const hydrated = hydrateImportedData(monthData.data)
        await repo.saveMonthlyData(hydrated, monthData.year, monthData.month)
        monthsImported++

        // v2: インポート履歴を復元
        if (monthData.importHistory && monthData.importHistory.length > 0) {
          for (const entry of monthData.importHistory) {
            await repo.saveImportHistory(monthData.year, monthData.month, entry)
          }
          importHistoryRestored++
        }
      } catch (err) {
        errors.push(
          `${monthData.year}-${monthData.month}: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    return {
      monthsImported,
      monthsSkipped,
      errors,
      restoredAppSettings: backup.appSettings ?? undefined,
      importHistoryRestored,
      rawManifestRestored: backup.rawManifest?.length ?? 0,
    }
  }

  /**
   * 指定フォルダにバックアップを書き出し、古い世代を削除する。
   * ファイル名: backup-YYYY-MM-DD-HHmm.json（圧縮時は .json.gz）
   */
  async exportToFolder(
    repo: DataRepository,
    dirHandle: FileSystemDirectoryHandle,
    maxGenerations = 5,
    appSettings?: AppSettings,
  ): Promise<string> {
    const blob = await this.exportBackup(repo, appSettings)
    const now = new Date()
    const pad2 = (n: number) => String(n).padStart(2, '0')
    const isGz = isCompressionSupported()
    const ext = isGz ? '.json.gz' : '.json'
    const fileName = `backup-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}${ext}`
    await writeFile(dirHandle, fileName, blob)
    // .json と .json.gz 両方を世代管理対象にする
    await pruneOldFiles(dirHandle, 'backup-', maxGenerations, ['.json', '.json.gz', '.gz'])
    return fileName
  }

  /**
   * バックアップファイルのメタデータだけを読み取る（プレビュー用）
   * gzip 圧縮ファイルも自動展開する。
   */
  async readMeta(file: File | Blob): Promise<BackupMeta | null> {
    try {
      let text: string
      if (await isGzipped(file)) {
        text = await decompress(file)
      } else {
        text = await file.text()
      }
      const backup = JSON.parse(text) as BackupFile
      return backup.meta ?? null
    } catch {
      return null
    }
  }
}

/** グローバルシングルトン */
export const backupExporter = new BackupExporter()
