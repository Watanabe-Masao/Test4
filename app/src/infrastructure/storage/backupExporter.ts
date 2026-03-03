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
import type { ImportedData, BudgetData, AppSettings, ImportHistoryEntry } from '@/domain/models'
import { budgetFromSerializable } from './internal/serialization'
import { writeFile, pruneOldFiles } from './folderAccess'

/** バックアップファイルのフォーマットバージョン */
const BACKUP_FORMAT_VERSION = 2

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

/** バックアップファイル全体の構造 (v2) */
interface BackupFile {
  readonly meta: BackupMeta
  readonly months: readonly BackupMonthData[]
  /** アプリケーション全体設定 (v2+) */
  readonly appSettings?: AppSettings
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
}

// ─── JSON → Map 復元ヘルパー ─────────────────────────────

/**
 * plain object → Map 変換。
 * JSON.parse の結果は plain object であり Map ではないため、
 * ImportedData の Map フィールドを復元する必要がある。
 */
function objectToMap<V>(obj: unknown): Map<string, V> {
  if (obj instanceof Map) return obj as Map<string, V>
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    return new Map(Object.entries(obj as Record<string, V>))
  }
  return new Map()
}

/**
 * budget フィールドを復元する。
 * BudgetData.daily は Map<number, number> であり、
 * JSON.parse では plain object になるため budgetFromSerializable で復元する。
 */
function hydrateBudgetMap(obj: unknown): Map<string, BudgetData> {
  const map = new Map<string, BudgetData>()
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return map
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v && typeof v === 'object') {
      const parsed = budgetFromSerializable(v as Record<string, unknown>)
      if (parsed) map.set(k, parsed)
    }
  }
  return map
}

/**
 * JSON.parse の結果を正しい ImportedData に復元する。
 * Map フィールド（stores, suppliers, settings, budget）を
 * plain object から Map に変換する。
 */
function hydrateImportedData(raw: unknown): ImportedData {
  const base = raw as Record<string, unknown>
  return {
    ...base,
    stores: objectToMap(base.stores),
    suppliers: objectToMap(base.suppliers),
    settings: objectToMap(base.settings),
    budget: hydrateBudgetMap(base.budget),
    // prevYear系は空で初期化（useAutoLoadPrevYear が実際の年月から自動ロードする）
    prevYearClassifiedSales: base.prevYearClassifiedSales ?? { records: [] },
    prevYearCategoryTimeSales: base.prevYearCategoryTimeSales ?? { records: [] },
  } as unknown as ImportedData
}

// ─── SHA-256 チェックサム ──────────────────────────────

async function computeSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── gzip 圧縮/展開 ──────────────────────────────────

/** CompressionStream API が使用可能か（Blob.stream も必要） */
function isCompressionSupported(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof Blob.prototype.stream === 'function'
}

/** gzip 圧縮 */
async function compress(data: string): Promise<Blob> {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Response(stream).blob()
}

/** gzip 展開 */
async function decompress(blob: Blob): Promise<string> {
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

/** Blob が gzip か判定する（マジックバイト 1f 8b） */
async function isGzipped(blob: Blob): Promise<boolean> {
  const header = new Uint8Array(await blob.slice(0, 2).arrayBuffer())
  return header[0] === 0x1f && header[1] === 0x8b
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

    // バージョンチェック
    if (!backup.meta || backup.meta.formatVersion > BACKUP_FORMAT_VERSION) {
      return {
        monthsImported: 0,
        monthsSkipped: 0,
        errors: [`Unsupported backup format version: ${backup.meta?.formatVersion}`],
        importHistoryRestored: 0,
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
