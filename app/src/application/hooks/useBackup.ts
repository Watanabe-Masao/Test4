/**
 * バックアップフック
 *
 * infrastructure/storage/backupExporter.ts を Application 層にブリッジし、
 * バックアップの export / import / preview を UI に提供する。
 */
import { useState, useCallback } from 'react'
import {
  backupExporter,
  type BackupMeta,
  type BackupImportResult,
} from '@/infrastructure/storage/backupExporter'
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
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [lastImportResult, setLastImportResult] = useState<BackupImportResult | null>(null)

  const exportBackup = useCallback(async () => {
    if (!repo) return
    setIsExporting(true)
    try {
      const blob = await backupExporter.exportBackup(repo)
      // ダウンロード
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shiire-arari-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }, [repo])

  const importBackup = useCallback(
    async (file: File, overwrite = false): Promise<BackupImportResult> => {
      if (!repo) {
        return { monthsImported: 0, monthsSkipped: 0, errors: ['Repository not available'] }
      }
      setIsImporting(true)
      try {
        const result = await backupExporter.importBackup(file, repo, {
          overwriteExisting: overwrite,
        })
        setLastImportResult(result)
        return result
      } finally {
        setIsImporting(false)
      }
    },
    [repo],
  )

  const previewBackup = useCallback(async (file: File): Promise<BackupMeta | null> => {
    return backupExporter.readMeta(file)
  }, [])

  return {
    isExporting,
    isImporting,
    lastImportResult,
    exportBackup,
    importBackup,
    previewBackup,
  }
}
