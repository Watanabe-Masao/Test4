/**
 * BackupPort — バックアップ操作の契約
 *
 * infrastructure/storage/backupExporter を隠蔽する。
 * 型は infrastructure の実装型を re-export する（ポート型の二重定義を回避）。
 */
import type { DataRepository } from '@/domain/repositories'
import type { AppSettings } from '@/domain/models/storeTypes'
import type { BackupMeta, BackupImportResult } from '@/infrastructure/storage/backupExporter'

export type { BackupMeta, BackupImportResult }

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
