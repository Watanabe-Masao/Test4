/**
 * autoImportReducer のユニットテスト
 *
 * 全アクションの純粋な状態遷移を検証する。
 */
import { describe, it, expect } from 'vitest'
import {
  createInitialAutoImportState,
  autoImportReducer,
  type AutoImportReducerState,
} from '@/application/hooks/autoImportReducer'

const mockHandle = (name: string): FileSystemDirectoryHandle =>
  ({ name, kind: 'directory' }) as unknown as FileSystemDirectoryHandle

describe('createInitialAutoImportState', () => {
  it('初期状態を autoSyncEnabled=false で生成する', () => {
    const s = createInitialAutoImportState(false)
    expect(s).toEqual<AutoImportReducerState>({
      dirHandle: null,
      folderName: null,
      lastScanAt: null,
      isScanning: false,
      lastImportCount: 0,
      error: null,
      autoSyncEnabled: false,
    })
  })

  it('初期状態を autoSyncEnabled=true で生成する', () => {
    const s = createInitialAutoImportState(true)
    expect(s.autoSyncEnabled).toBe(true)
  })
})

describe('autoImportReducer', () => {
  const init = createInitialAutoImportState(false)

  it('RESTORE_HANDLE は dirHandle と folderName を設定', () => {
    const h = mockHandle('myFolder')
    const s = autoImportReducer(init, { type: 'RESTORE_HANDLE', handle: h })
    expect(s.dirHandle).toBe(h)
    expect(s.folderName).toBe('myFolder')
    // 他フィールドは不変
    expect(s.isScanning).toBe(false)
    expect(s.autoSyncEnabled).toBe(false)
  })

  it('SELECT_FOLDER は dirHandle + folderName 設定 + error クリア', () => {
    const withError: AutoImportReducerState = { ...init, error: 'previous' }
    const h = mockHandle('new')
    const s = autoImportReducer(withError, { type: 'SELECT_FOLDER', handle: h })
    expect(s.dirHandle).toBe(h)
    expect(s.folderName).toBe('new')
    expect(s.error).toBeNull()
  })

  it('CLEAR_FOLDER は dirHandle とメタを null/0 リセット', () => {
    const withData: AutoImportReducerState = {
      ...init,
      dirHandle: mockHandle('x'),
      folderName: 'x',
      lastScanAt: '2026-03-01',
      lastImportCount: 42,
      error: 'err',
      autoSyncEnabled: true,
    }
    const s = autoImportReducer(withData, { type: 'CLEAR_FOLDER' })
    expect(s.dirHandle).toBeNull()
    expect(s.folderName).toBeNull()
    expect(s.lastScanAt).toBeNull()
    expect(s.lastImportCount).toBe(0)
    expect(s.error).toBeNull()
    // autoSyncEnabled は保持される
    expect(s.autoSyncEnabled).toBe(true)
  })

  it('SCAN_START は isScanning=true, error=null', () => {
    const withError: AutoImportReducerState = { ...init, error: 'prev' }
    const s = autoImportReducer(withError, { type: 'SCAN_START' })
    expect(s.isScanning).toBe(true)
    expect(s.error).toBeNull()
  })

  it('SCAN_SUCCESS は lastScanAt と lastImportCount を設定', () => {
    const s = autoImportReducer(init, {
      type: 'SCAN_SUCCESS',
      importCount: 5,
      scanAt: '2026-03-15T10:00',
    })
    expect(s.lastScanAt).toBe('2026-03-15T10:00')
    expect(s.lastImportCount).toBe(5)
    // isScanning は変化しない（SCAN_END が処理する）
    expect(s.isScanning).toBe(false)
  })

  it('SCAN_ERROR は error を設定', () => {
    const s = autoImportReducer(init, { type: 'SCAN_ERROR', error: 'failed' })
    expect(s.error).toBe('failed')
  })

  it('SCAN_END は isScanning=false', () => {
    const scanning: AutoImportReducerState = { ...init, isScanning: true }
    const s = autoImportReducer(scanning, { type: 'SCAN_END' })
    expect(s.isScanning).toBe(false)
  })

  it('SET_AUTO_SYNC は autoSyncEnabled を切り替え', () => {
    const s1 = autoImportReducer(init, { type: 'SET_AUTO_SYNC', enabled: true })
    expect(s1.autoSyncEnabled).toBe(true)
    const s2 = autoImportReducer(s1, { type: 'SET_AUTO_SYNC', enabled: false })
    expect(s2.autoSyncEnabled).toBe(false)
  })

  it('不変性: 入力 state を変更しない', () => {
    const frozen = createInitialAutoImportState(false)
    const snapshot = { ...frozen }
    autoImportReducer(frozen, { type: 'SCAN_START' })
    expect(frozen).toEqual(snapshot)
  })

  it('アクション連鎖: select → scan_start → scan_success → scan_end', () => {
    const h = mockHandle('dir')
    let s = autoImportReducer(init, { type: 'SELECT_FOLDER', handle: h })
    s = autoImportReducer(s, { type: 'SCAN_START' })
    expect(s.isScanning).toBe(true)
    s = autoImportReducer(s, { type: 'SCAN_SUCCESS', importCount: 3, scanAt: '2026-03-01' })
    expect(s.lastImportCount).toBe(3)
    s = autoImportReducer(s, { type: 'SCAN_END' })
    expect(s.isScanning).toBe(false)
    expect(s.folderName).toBe('dir')
  })
})
