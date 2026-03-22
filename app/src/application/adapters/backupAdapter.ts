/**
 * BackupAdapter — BackupPort の infrastructure 実装
 *
 * @guard A1 application/adapters/ 経由で infrastructure にアクセス
 * @see guards/layerBoundaryGuard.test.ts
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
