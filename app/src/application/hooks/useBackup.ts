/**
 * バックアップフック
 *
 * infrastructure/storage/backupAdapter.ts を Application 層にブリッジし、
 * バックアップの export / import / preview を UI に提供する。
 * v2: AppSettings を含むバックアップ + gzip 圧縮対応。
 */
import { useState, useCallback } from 'react'
import { useBackupAdapter } from '@/application/context/useAdapters'
import type { BackupMeta, BackupImportResult } from '@/application/ports/BackupPort'
import { useSettingsStore } from '@/application/stores/settingsStore'
import type { DataRepository } from '@/domain/repositories'

export type { BackupMeta, BackupImportResult }

export function useBackup(repo: DataRepository | null): {
  isExporting: boolean
  isImporting: boolean
  lastImportResult: BackupImportResult | null
  exportBackup: () => Promise<void>
  importBackup: (file: File, overwrite?: boolean) => Promise<BackupImportResult>
  previewBackup: (file: File) => Promise<BackupMeta | null>
} {
  const backupAdapter = useBackupAdapter()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [lastImportResult, setLastImportResult] = useState<BackupImportResult | null>(null)

  const exportBackup = useCallback(async () => {
    if (!repo) return
    setIsExporting(true)
    try {
      const appSettings = useSettingsStore.getState().settings
      const blob = await backupAdapter.exportBackup(repo, appSettings)
      // ダウンロード（圧縮時は .json.gz 拡張子）
      const isGz = blob.type !== 'application/json'
      const ext = isGz ? '.json.gz' : '.json'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shiire-arari-backup-${new Date().toISOString().slice(0, 10)}${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }, [repo, backupAdapter])

  const importBackup = useCallback(
    async (file: File, overwrite = false): Promise<BackupImportResult> => {
      if (!repo) {
        return {
          monthsImported: 0,
          monthsSkipped: 0,
          errors: ['Repository not available'],
          importHistoryRestored: 0,
          rawManifestRestored: 0,
        }
      }
      setIsImporting(true)
      try {
        const result = await backupAdapter.importBackup(file, repo, {
          overwriteExisting: overwrite,
        })
        // v2: AppSettings が含まれていれば復元する
        if (result.restoredAppSettings) {
          useSettingsStore.getState().updateSettings(result.restoredAppSettings)
        }
        setLastImportResult(result)
        return result
      } finally {
        setIsImporting(false)
      }
    },
    [repo, backupAdapter],
  )

  const previewBackup = useCallback(
    async (file: File): Promise<BackupMeta | null> => {
      return backupAdapter.readMeta(file)
    },
    [backupAdapter],
  )

  return {
    isExporting,
    isImporting,
    lastImportResult,
    exportBackup,
    importBackup,
    previewBackup,
  }
}
