/**
 * 自動インポートフック
 *
 * ユーザー指定フォルダを監視し、新規・更新ファイルを自動取込する。
 * ファイルの最終更新日時とサイズのハッシュで二重取込を防止する。
 *
 * File System Access API (Chromium 86+) 前提。非対応ブラウザでは無効。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  isFileSystemAccessSupported,
  pickDirectory,
  getStoredHandle,
  removeHandle,
  listFiles,
} from '@/infrastructure/storage/folderAccess'

/** インポート対象の拡張子 */
const IMPORTABLE_EXTENSIONS = ['.xlsx', '.xls', '.csv'] as const

/** 処理済みファイルの識別子（名前 + サイズ + 最終更新日時） */
function fileFingerprint(name: string, size: number, lastModified: number): string {
  return `${name}|${size}|${lastModified}`
}

export interface AutoImportState {
  /** File System Access API 対応ブラウザか */
  readonly supported: boolean
  /** インポートフォルダが設定済みか */
  readonly folderConfigured: boolean
  /** フォルダ名（表示用） */
  readonly folderName: string | null
  /** 最後のスキャン日時 */
  readonly lastScanAt: string | null
  /** スキャン中か */
  readonly isScanning: boolean
  /** 最後のスキャンで取り込んだファイル数 */
  readonly lastImportCount: number
  /** エラーメッセージ */
  readonly error: string | null
}

export interface AutoImportActions {
  /** インポートフォルダを選択する */
  selectFolder: () => Promise<boolean>
  /** インポートフォルダ設定を解除する */
  clearFolder: () => Promise<void>
  /** 手動でフォルダをスキャンし、新規ファイルを取り込む */
  scanNow: () => Promise<File[]>
}

export function useAutoImport(
  onFilesFound: (files: File[]) => Promise<void>,
): AutoImportState & AutoImportActions {
  const supported = isFileSystemAccessSupported()
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [folderName, setFolderName] = useState<string | null>(null)
  const [lastScanAt, setLastScanAt] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [lastImportCount, setLastImportCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  /** 処理済みファイルの指紋セット */
  const processedRef = useRef(new Set<string>())

  // 起動時に保存済みハンドルを復元
  const initRef = useRef(false)
  useEffect(() => {
    if (!supported || initRef.current) return
    initRef.current = true
    getStoredHandle('import').then((h) => {
      if (h) {
        setDirHandle(h)
        setFolderName(h.name)
      }
    })
  }, [supported])

  const selectFolder = useCallback(async () => {
    const handle = await pickDirectory('import')
    if (handle) {
      setDirHandle(handle)
      setFolderName(handle.name)
      setError(null)
      processedRef.current.clear()
      return true
    }
    return false
  }, [])

  const clearFolder = useCallback(async () => {
    await removeHandle('import')
    setDirHandle(null)
    setFolderName(null)
    setLastScanAt(null)
    setLastImportCount(0)
    setError(null)
    processedRef.current.clear()
  }, [])

  const scanNow = useCallback(async (): Promise<File[]> => {
    if (!dirHandle) return []
    setIsScanning(true)
    setError(null)
    try {
      const entries = await listFiles(dirHandle, [...IMPORTABLE_EXTENSIONS])
      const newFiles: File[] = []

      for (const entry of entries) {
        const file = await entry.handle.getFile()
        const fp = fileFingerprint(file.name, file.size, file.lastModified)
        if (processedRef.current.has(fp)) continue
        processedRef.current.add(fp)
        newFiles.push(file)
      }

      setLastScanAt(new Date().toISOString())
      setLastImportCount(newFiles.length)

      if (newFiles.length > 0) {
        await onFilesFound(newFiles)
      }

      return newFiles
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      return []
    } finally {
      setIsScanning(false)
    }
  }, [dirHandle, onFilesFound])

  // 起動時にフォルダが設定されていれば自動スキャン（1回）
  const autoScanRef = useRef(false)
  useEffect(() => {
    if (!dirHandle || autoScanRef.current) return
    autoScanRef.current = true
    scanNow()
  }, [dirHandle, scanNow])

  return {
    supported,
    folderConfigured: dirHandle !== null,
    folderName,
    lastScanAt,
    isScanning,
    lastImportCount,
    error,
    selectFolder,
    clearFolder,
    scanNow,
  }
}
