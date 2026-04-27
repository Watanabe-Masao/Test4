/**
 * BackupPort — バックアップ操作の契約
 *
 * 消費者（useBackup, useAutoBackup）が使いたいバックアップ操作を定義する。
 * domain 型のみに依存し、infrastructure への依存は持たない。
 *
 * @responsibility R:unclassified
 */
import type { DataRepository } from '@/domain/repositories'
import type { AppSettings } from '@/domain/models/storeTypes'

/** バックアップファイルのメタ情報 */
export interface BackupMeta {
  readonly formatVersion: number
  readonly createdAt: string
  readonly appVersion: string
  readonly months: readonly { year: number; month: number }[]
  readonly checksum?: string
}

/** バックアップインポート結果 */
export interface BackupImportResult {
  readonly monthsImported: number
  readonly monthsSkipped: number
  readonly errors: readonly string[]
  readonly restoredAppSettings?: AppSettings
  readonly importHistoryRestored: number
  readonly rawManifestRestored: number
}

export interface BackupPort {
  exportBackup(repo: DataRepository, appSettings?: AppSettings): Promise<Blob>
  importBackup(
    file: File,
    repo: DataRepository,
    options?: { overwriteExisting?: boolean },
  ): Promise<BackupImportResult>
  readMeta(file: File): Promise<BackupMeta | null>
  exportToFolder(
    repo: DataRepository,
    dirHandle: FileSystemDirectoryHandle,
    maxGenerations?: number,
    appSettings?: AppSettings,
  ): Promise<string>
}
