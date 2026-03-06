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

/** localStorage キー（処理済みファイル指紋を永続化） */
const PROCESSED_FILES_KEY = 'shiire-arari-import-processed'

/** 処理済みファイルの識別子（名前 + サイズ + 最終更新日時） */
function fileFingerprint(name: string, size: number, lastModified: number): string {
  return `${name}|${size}|${lastModified}`
}

/** 処理済みファイル指紋を localStorage から復元する */
function loadProcessedFingerprints(): Set<string> {
  try {
    const raw = localStorage.getItem(PROCESSED_FILES_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

/** 処理済みファイル指紋を localStorage に保存する */
function saveProcessedFingerprints(fingerprints: Set<string>): void {
  try {
    localStorage.setItem(PROCESSED_FILES_KEY, JSON.stringify([...fingerprints]))
  } catch {
    // ストレージ容量超過は無視（RAMのみで動作を継続）
  }
}

/** 定期スキャン間隔（5分） */
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000

/** localStorage キー（自動同期の有効/無効を永続化） */
const AUTO_SYNC_ENABLED_KEY = 'shiire-arari-auto-sync-enabled'

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
  /** 定期自動同期が有効か */
  readonly autoSyncEnabled: boolean
}

export interface AutoImportActions {
  /** インポートフォルダを選択する */
  selectFolder: () => Promise<boolean>
  /** インポートフォルダ設定を解除する */
  clearFolder: () => Promise<void>
  /** 手動でフォルダをスキャンし、新規ファイルを取り込む */
  scanNow: () => Promise<File[]>
  /** 定期自動同期の有効/無効を切り替える */
  setAutoSync: (enabled: boolean) => void
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
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    try {
      return localStorage.getItem(AUTO_SYNC_ENABLED_KEY) === 'true'
    } catch {
      return false
    }
  })

  /** 処理済みファイルの指紋セット（localStorage から復元） */
  const processedRef = useRef(loadProcessedFingerprints())

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
      processedRef.current = new Set()
      saveProcessedFingerprints(processedRef.current)
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
    processedRef.current = new Set()
    saveProcessedFingerprints(processedRef.current)
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
        // entry.name は相対パス（サブディレクトリ含む）なので同名ファイルも区別できる
        const fp = fileFingerprint(entry.name, file.size, file.lastModified)
        if (processedRef.current.has(fp)) continue
        processedRef.current.add(fp)
        newFiles.push(file)
      }

      // 新しい指紋を永続化
      if (newFiles.length > 0) {
        saveProcessedFingerprints(processedRef.current)
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

  const setAutoSync = useCallback((enabled: boolean) => {
    setAutoSyncEnabled(enabled)
    try {
      localStorage.setItem(AUTO_SYNC_ENABLED_KEY, String(enabled))
    } catch {
      // ignore
    }
  }, [])

  // 定期自動同期: フォルダ設定済み & 自動同期ON の場合、5分ごとにスキャン
  const scanNowRef = useRef(scanNow)
  scanNowRef.current = scanNow
  useEffect(() => {
    if (!dirHandle || !autoSyncEnabled) return
    const id = setInterval(() => {
      scanNowRef.current()
    }, AUTO_SYNC_INTERVAL_MS)
    return () => clearInterval(id)
  }, [dirHandle, autoSyncEnabled])

  return {
    supported,
    folderConfigured: dirHandle !== null,
    folderName,
    lastScanAt,
    isScanning,
    lastImportCount,
    error,
    autoSyncEnabled,
    selectFolder,
    clearFolder,
    scanNow,
    setAutoSync,
  }
}
