/**
 * BackupAdapter — BackupPort の infrastructure 実装
 */
import { backupExporter } from '@/infrastructure/storage/backupExporter'
import type { BackupPort } from '@/application/ports/BackupPort'

export const backupAdapter: BackupPort = {
  exportBackup: (repo, appSettings) => backupExporter.exportBackup(repo, appSettings),
  importBackup: (file, repo, options) => backupExporter.importBackup(file, repo, options),
  readMeta: (file) => backupExporter.readMeta(file),
  exportToFolder: (repo, dirHandle, maxGenerations, appSettings) =>
    backupExporter.exportToFolder(repo, dirHandle, maxGenerations, appSettings),
}
