/**
 * 自動インポートフック
 *
 * ユーザー指定フォルダを監視し、新規・更新ファイルを自動取込する。
 * ファイルの最終更新日時とサイズのハッシュで二重取込を防止する。
 *
 * File System Access API (Chromium 86+) 前提。非対応ブラウザでは無効。
 */
import { useCallback, useEffect, useRef, useReducer } from 'react'
import { useFileSystemAdapter } from '@/application/context/useAdapters'
import { autoImportReducer, createInitialAutoImportState } from './autoImportReducer'
import { loadJson, saveJson, loadRaw, saveRaw } from '@/application/adapters/uiPersistenceAdapter'

/** インポート対象の拡張子 */
const IMPORTABLE_EXTENSIONS = ['.xlsx', '.xls', '.csv'] as const

/** localStorage キー（処理済みファイル指紋を永続化） */
const PROCESSED_FILES_KEY = 'shiire-arari-import-processed'

/** 処理済みファイルの識別子（名前 + サイズ + 最終更新日時） */
function fileFingerprint(name: string, size: number, lastModified: number): string {
  return `${name}|${size}|${lastModified}`
}

/** 処理済みファイル指紋を adapter 経由で復元する */
function loadProcessedFingerprints(): Set<string> {
  return new Set(loadJson<string[]>(PROCESSED_FILES_KEY, []))
}

/** 処理済みファイル指紋を adapter 経由で保存する */
function saveProcessedFingerprints(fingerprints: Set<string>): void {
  saveJson(PROCESSED_FILES_KEY, [...fingerprints])
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

function loadInitialAutoSync(): boolean {
  return loadRaw(AUTO_SYNC_ENABLED_KEY) === 'true'
}

export function useAutoImport(
  onFilesFound: (files: File[]) => Promise<void>,
): AutoImportState & AutoImportActions {
  const fileSystemAdapter = useFileSystemAdapter()
  const supported = fileSystemAdapter.isFileSystemAccessSupported()
  const [state, dispatch] = useReducer(
    autoImportReducer,
    loadInitialAutoSync(),
    createInitialAutoImportState,
  )

  /** 処理済みファイルの指紋セット（localStorage から復元） */
  const processedRef = useRef(loadProcessedFingerprints())

  // 起動時に保存済みハンドルを復元
  const initRef = useRef(false)
  useEffect(() => {
    if (!supported || initRef.current) return
    initRef.current = true
    fileSystemAdapter.getStoredHandle('import').then((h) => {
      if (h) {
        dispatch({ type: 'RESTORE_HANDLE', handle: h })
      }
    })
  }, [supported, fileSystemAdapter])

  const selectFolder = useCallback(async () => {
    const handle = await fileSystemAdapter.pickDirectory('import')
    if (handle) {
      dispatch({ type: 'SELECT_FOLDER', handle })
      processedRef.current = new Set()
      saveProcessedFingerprints(processedRef.current)
      return true
    }
    return false
  }, [fileSystemAdapter])

  const clearFolder = useCallback(async () => {
    await fileSystemAdapter.removeHandle('import')
    dispatch({ type: 'CLEAR_FOLDER' })
    processedRef.current = new Set()
    saveProcessedFingerprints(processedRef.current)
  }, [fileSystemAdapter])

  const scanNow = useCallback(async (): Promise<File[]> => {
    if (!state.dirHandle) return []
    dispatch({ type: 'SCAN_START' })
    try {
      const entries = await fileSystemAdapter.listFiles(state.dirHandle, [...IMPORTABLE_EXTENSIONS])
      const newFiles: File[] = []
      const newFingerprints: string[] = []

      for (const entry of entries) {
        const file = await entry.handle.getFile()
        // entry.name は相対パス（サブディレクトリ含む）なので同名ファイルも区別できる
        const fp = fileFingerprint(entry.name, file.size, file.lastModified)
        if (processedRef.current.has(fp)) continue
        newFingerprints.push(fp)
        newFiles.push(file)
      }

      // onFilesFound を先に実行 — 成功後にのみ processed 化する
      if (newFiles.length > 0) {
        await onFilesFound(newFiles)
        // import 成功 → processed に追加（失敗時は再試行可能）
        for (const fp of newFingerprints) {
          processedRef.current.add(fp)
        }
        saveProcessedFingerprints(processedRef.current)
      }

      dispatch({
        type: 'SCAN_SUCCESS',
        importCount: newFiles.length,
        scanAt: new Date().toISOString(),
      })

      return newFiles
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      dispatch({ type: 'SCAN_ERROR', error: msg })
      return []
    } finally {
      dispatch({ type: 'SCAN_END' })
    }
  }, [state.dirHandle, onFilesFound, fileSystemAdapter])

  // 起動時にフォルダが設定されていれば自動スキャン（1回）
  const autoScanRef = useRef(false)
  useEffect(() => {
    if (!state.dirHandle || autoScanRef.current) return
    autoScanRef.current = true
    scanNow()
  }, [state.dirHandle, scanNow])

  const setAutoSync = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_AUTO_SYNC', enabled })
    saveRaw(AUTO_SYNC_ENABLED_KEY, String(enabled))
  }, [])

  // 定期自動同期: フォルダ設定済み & 自動同期ON の場合、5分ごとにスキャン
  const scanNowRef = useRef(scanNow)
  scanNowRef.current = scanNow
  useEffect(() => {
    if (!state.dirHandle || !state.autoSyncEnabled) return
    const id = setInterval(() => {
      scanNowRef.current()
    }, AUTO_SYNC_INTERVAL_MS)
    return () => clearInterval(id)
  }, [state.dirHandle, state.autoSyncEnabled])

  return {
    supported,
    folderConfigured: state.dirHandle !== null,
    folderName: state.folderName,
    lastScanAt: state.lastScanAt,
    isScanning: state.isScanning,
    lastImportCount: state.lastImportCount,
    error: state.error,
    autoSyncEnabled: state.autoSyncEnabled,
    selectFolder,
    clearFolder,
    scanNow,
    setAutoSync,
  }
}
