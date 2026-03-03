/**
 * 自動バックアップフック
 *
 * データ保存のたびにユーザー指定フォルダへバックアップ JSON を自動書き出しする。
 * File System Access API (Chromium 86+) 前提。非対応ブラウザでは無効。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  isFileSystemAccessSupported,
  pickDirectory,
  getStoredHandle,
  removeHandle,
} from '@/infrastructure/storage/folderAccess'
import { backupExporter } from '@/infrastructure/storage/backupExporter'
import type { DataRepository } from '@/domain/repositories'

export interface AutoBackupState {
  /** File System Access API 対応ブラウザか */
  readonly supported: boolean
  /** バックアップフォルダが設定済みか */
  readonly folderConfigured: boolean
  /** フォルダ名（表示用） */
  readonly folderName: string | null
  /** 最後のバックアップ日時 */
  readonly lastBackupAt: string | null
  /** バックアップ中か */
  readonly isBacking: boolean
  /** エラーメッセージ */
  readonly error: string | null
}

export interface AutoBackupActions {
  /** バックアップフォルダを選択する */
  selectFolder: () => Promise<boolean>
  /** バックアップフォルダ設定を解除する */
  clearFolder: () => Promise<void>
  /** 手動でバックアップを実行する */
  backupNow: () => Promise<string | null>
}

/** デバウンスで自動バックアップをトリガーする間隔（ミリ秒） */
const AUTO_BACKUP_DEBOUNCE_MS = 5000

export function useAutoBackup(
  repo: DataRepository | null,
  triggerKey: string,
): AutoBackupState & AutoBackupActions {
  const supported = isFileSystemAccessSupported()
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [folderName, setFolderName] = useState<string | null>(null)
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null)
  const [isBacking, setIsBacking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 起動時に保存済みハンドルを復元
  const initRef = useRef(false)
  useEffect(() => {
    if (!supported || initRef.current) return
    initRef.current = true
    getStoredHandle('backup').then((h) => {
      if (h) {
        setDirHandle(h)
        setFolderName(h.name)
      }
    })
  }, [supported])

  const selectFolder = useCallback(async () => {
    const handle = await pickDirectory('backup')
    if (handle) {
      setDirHandle(handle)
      setFolderName(handle.name)
      setError(null)
      return true
    }
    return false
  }, [])

  const clearFolder = useCallback(async () => {
    await removeHandle('backup')
    setDirHandle(null)
    setFolderName(null)
    setLastBackupAt(null)
    setError(null)
  }, [])

  const backupNow = useCallback(async (): Promise<string | null> => {
    if (!repo || !dirHandle) return null
    setIsBacking(true)
    setError(null)
    try {
      const fileName = await backupExporter.exportToFolder(repo, dirHandle)
      const now = new Date().toISOString()
      setLastBackupAt(now)
      return fileName
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      return null
    } finally {
      setIsBacking(false)
    }
  }, [repo, dirHandle])

  // triggerKey が変わるたびにデバウンスで自動バックアップ
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (!dirHandle || !repo || !triggerKey) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      backupNow()
    }, AUTO_BACKUP_DEBOUNCE_MS)
    return () => clearTimeout(timerRef.current)
  }, [triggerKey, dirHandle, repo, backupNow])

  return {
    supported,
    folderConfigured: dirHandle !== null,
    folderName,
    lastBackupAt,
    isBacking,
    error,
    selectFolder,
    clearFolder,
    backupNow,
  }
}
