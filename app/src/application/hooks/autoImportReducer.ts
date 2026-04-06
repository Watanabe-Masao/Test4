/**
 * useAutoImport の状態管理リデューサー（純粋関数）
 *
 * 7個の useState を1つの useReducer に集約する。
 *
 * @responsibility R:reducer
 */

export interface AutoImportReducerState {
  readonly dirHandle: FileSystemDirectoryHandle | null
  readonly folderName: string | null
  readonly lastScanAt: string | null
  readonly isScanning: boolean
  readonly lastImportCount: number
  readonly error: string | null
  readonly autoSyncEnabled: boolean
}

export type AutoImportAction =
  | { type: 'RESTORE_HANDLE'; handle: FileSystemDirectoryHandle }
  | { type: 'SELECT_FOLDER'; handle: FileSystemDirectoryHandle }
  | { type: 'CLEAR_FOLDER' }
  | { type: 'SCAN_START' }
  | { type: 'SCAN_SUCCESS'; importCount: number; scanAt: string }
  | { type: 'SCAN_ERROR'; error: string }
  | { type: 'SCAN_END' }
  | { type: 'SET_AUTO_SYNC'; enabled: boolean }

export function createInitialAutoImportState(autoSyncEnabled: boolean): AutoImportReducerState {
  return {
    dirHandle: null,
    folderName: null,
    lastScanAt: null,
    isScanning: false,
    lastImportCount: 0,
    error: null,
    autoSyncEnabled,
  }
}

export function autoImportReducer(
  state: AutoImportReducerState,
  action: AutoImportAction,
): AutoImportReducerState {
  switch (action.type) {
    case 'RESTORE_HANDLE':
      return { ...state, dirHandle: action.handle, folderName: action.handle.name }
    case 'SELECT_FOLDER':
      return {
        ...state,
        dirHandle: action.handle,
        folderName: action.handle.name,
        error: null,
      }
    case 'CLEAR_FOLDER':
      return {
        ...state,
        dirHandle: null,
        folderName: null,
        lastScanAt: null,
        lastImportCount: 0,
        error: null,
      }
    case 'SCAN_START':
      return { ...state, isScanning: true, error: null }
    case 'SCAN_SUCCESS':
      return {
        ...state,
        lastScanAt: action.scanAt,
        lastImportCount: action.importCount,
      }
    case 'SCAN_ERROR':
      return { ...state, error: action.error }
    case 'SCAN_END':
      return { ...state, isScanning: false }
    case 'SET_AUTO_SYNC':
      return { ...state, autoSyncEnabled: action.enabled }
  }
}
