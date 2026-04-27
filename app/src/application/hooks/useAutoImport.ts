/**
 * 自動インポートフック
 *
 * ユーザー指定フォルダを監視し、新規・更新ファイルを自動取込する。
 *
 * 安全設計（構造的保証）:
 *  - fingerprint の processed 化は per-file ok=true に紐付ける（silent drop で未取込の
 *    ファイルが「処理済み」化してしまうデータロスを防ぐ）。
 *  - scan に再入ロック（scanningRef）を張り、起動時/定期/手動スキャンの競合を防ぐ。
 *  - rescanAll は processed をクリアして全件再取込する可逆操作。フォルダ設定は保持。
 *
 * File System Access API (Chromium 86+) 前提。非対応ブラウザでは無効。
 *
 * @responsibility R:unclassified
 */
import { useCallback, useEffect, useRef, useReducer } from 'react'
import { useFileSystemAdapter } from '@/application/context/useAdapters'
import { autoImportReducer, createInitialAutoImportState } from './autoImportReducer'
import { loadRaw, saveRaw } from '@/application/adapters/uiPersistenceAdapter'
import type { ImportSummary } from '@/domain/models/ImportResult'
import {
  fileFingerprint,
  loadProcessedFingerprints,
  saveProcessedFingerprints,
  collectSuccessFilenames,
} from './autoImportProcessedLedger'

const IMPORTABLE_EXTENSIONS = ['.xlsx', '.xls', '.csv'] as const
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000
const AUTO_SYNC_ENABLED_KEY = 'shiire-arari-auto-sync-enabled'

/**
 * 自動取込のファイル投入コールバック。
 * 戻り値の ImportSummary を使って per-file の成否を fingerprint commit に反映する。
 * void の場合は旧互換動作（全件成功扱い）。
 */
export type AutoImportFileHandler = (files: File[]) => Promise<ImportSummary | void>

export interface AutoImportState {
  readonly supported: boolean
  readonly folderConfigured: boolean
  readonly folderName: string | null
  readonly lastScanAt: string | null
  readonly isScanning: boolean
  readonly lastImportCount: number
  readonly lastSkippedCount: number
  readonly error: string | null
  readonly autoSyncEnabled: boolean
  readonly processedCount: number
}

export interface AutoImportActions {
  selectFolder: () => Promise<boolean>
  clearFolder: () => Promise<void>
  scanNow: () => Promise<File[]>
  /** processed 指紋をクリアして全件再取込する（フォルダ設定は維持） */
  rescanAll: () => Promise<File[]>
  setAutoSync: (enabled: boolean) => void
}

function loadInitialAutoSync(): boolean {
  return loadRaw(AUTO_SYNC_ENABLED_KEY) === 'true'
}

export function useAutoImport(
  onFilesFound: AutoImportFileHandler,
): AutoImportState & AutoImportActions {
  const fileSystemAdapter = useFileSystemAdapter()
  const supported = fileSystemAdapter.isFileSystemAccessSupported()
  const [state, dispatch] = useReducer(
    autoImportReducer,
    loadInitialAutoSync(),
    createInitialAutoImportState,
  )

  const processedRef = useRef(loadProcessedFingerprints())
  const scanningRef = useRef(false)

  const initRef = useRef(false)
  useEffect(() => {
    if (!supported || initRef.current) return
    initRef.current = true
    fileSystemAdapter.getStoredHandle('import').then((h) => {
      if (h) dispatch({ type: 'RESTORE_HANDLE', handle: h })
    })
  }, [supported, fileSystemAdapter])

  const selectFolder = useCallback(async () => {
    const handle = await fileSystemAdapter.pickDirectory('import')
    if (!handle) return false
    dispatch({ type: 'SELECT_FOLDER', handle })
    processedRef.current = new Set()
    saveProcessedFingerprints(processedRef.current)
    return true
  }, [fileSystemAdapter])

  const clearFolder = useCallback(async () => {
    await fileSystemAdapter.removeHandle('import')
    dispatch({ type: 'CLEAR_FOLDER' })
    processedRef.current = new Set()
    saveProcessedFingerprints(processedRef.current)
  }, [fileSystemAdapter])

  const runScan = useCallback(
    async (forceAll: boolean): Promise<File[]> => {
      if (!state.dirHandle) return []
      if (scanningRef.current) return []
      scanningRef.current = true

      dispatch({ type: 'SCAN_START' })
      try {
        const entries = await fileSystemAdapter.listFiles(state.dirHandle, [
          ...IMPORTABLE_EXTENSIONS,
        ])
        const filenameToFingerprints = new Map<string, string[]>()
        const newFiles: File[] = []

        for (const entry of entries) {
          const file = await entry.handle.getFile()
          const fp = fileFingerprint(entry.name, file.size, file.lastModified)
          if (!forceAll && processedRef.current.has(fp)) continue
          const bucket = filenameToFingerprints.get(file.name) ?? []
          bucket.push(fp)
          filenameToFingerprints.set(file.name, bucket)
          newFiles.push(file)
        }

        const skippedCount = entries.length - newFiles.length
        let imported = 0

        if (newFiles.length > 0) {
          const summary = await onFilesFound(newFiles)
          const successFilenames = collectSuccessFilenames(summary, newFiles)
          imported = successFilenames.size
          for (const filename of successFilenames) {
            const fps = filenameToFingerprints.get(filename)
            if (!fps) continue
            for (const fp of fps) processedRef.current.add(fp)
          }
          saveProcessedFingerprints(processedRef.current)
        }

        dispatch({
          type: 'SCAN_SUCCESS',
          importCount: imported,
          skippedCount,
          processedCount: processedRef.current.size,
          scanAt: new Date().toISOString(),
        })
        return newFiles
      } catch (err) {
        dispatch({ type: 'SCAN_ERROR', error: err instanceof Error ? err.message : String(err) })
        return []
      } finally {
        dispatch({ type: 'SCAN_END' })
        scanningRef.current = false
      }
    },
    [state.dirHandle, onFilesFound, fileSystemAdapter],
  )

  const scanNow = useCallback((): Promise<File[]> => runScan(false), [runScan])

  const rescanAll = useCallback(async (): Promise<File[]> => {
    processedRef.current = new Set()
    saveProcessedFingerprints(processedRef.current)
    return runScan(true)
  }, [runScan])

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
    const id = setInterval(() => scanNowRef.current(), AUTO_SYNC_INTERVAL_MS)
    return () => clearInterval(id)
  }, [state.dirHandle, state.autoSyncEnabled])

  return {
    supported,
    folderConfigured: state.dirHandle !== null,
    folderName: state.folderName,
    lastScanAt: state.lastScanAt,
    isScanning: state.isScanning,
    lastImportCount: state.lastImportCount,
    lastSkippedCount: state.lastSkippedCount,
    error: state.error,
    autoSyncEnabled: state.autoSyncEnabled,
    processedCount: state.processedCount,
    selectFolder,
    clearFolder,
    scanNow,
    rescanAll,
    setAutoSync,
  }
}
