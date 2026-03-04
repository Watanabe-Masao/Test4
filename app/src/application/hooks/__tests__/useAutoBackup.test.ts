/**
 * useAutoBackup フックのテスト
 *
 * File System Access API 非対応環境での初期状態と
 * selectFolder / clearFolder / backupNow の基本動作を検証する。
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ── Mocks ────────────────────────────────────────────

vi.mock('@/infrastructure/storage/folderAccess', () => ({
  isFileSystemAccessSupported: vi.fn(() => false),
  pickDirectory: vi.fn(() => Promise.resolve(null)),
  getStoredHandle: vi.fn(() => Promise.resolve(null)),
  removeHandle: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/infrastructure/storage/backupExporter', () => ({
  backupExporter: {
    exportToFolder: vi.fn(() => Promise.resolve('backup_2025.json')),
  },
}))

vi.mock('@/application/stores/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({ settings: { targetYear: 2025, targetMonth: 1 } }),
  },
}))

import {
  isFileSystemAccessSupported,
  pickDirectory,
  getStoredHandle,
  removeHandle,
} from '@/infrastructure/storage/folderAccess'
import { backupExporter } from '@/infrastructure/storage/backupExporter'
import { useAutoBackup } from '../useAutoBackup'
import type { DataRepository } from '@/domain/repositories'

// ── Helpers ───────────────────────────────────────────

function makeRepo(): DataRepository {
  return {} as DataRepository
}

function makeDirHandle(name = 'MyBackupFolder'): FileSystemDirectoryHandle {
  return {
    name,
    queryPermission: vi.fn(() => Promise.resolve('granted')),
    requestPermission: vi.fn(() => Promise.resolve('granted')),
  } as unknown as FileSystemDirectoryHandle
}

// ── Tests ─────────────────────────────────────────────

describe('useAutoBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('when File System Access API is NOT supported', () => {
    beforeEach(() => {
      vi.mocked(isFileSystemAccessSupported).mockReturnValue(false)
      vi.mocked(getStoredHandle).mockResolvedValue(null)
    })

    it('returns supported=false', () => {
      const { result } = renderHook(() => useAutoBackup(null, ''))
      expect(result.current.supported).toBe(false)
    })

    it('folderConfigured is false initially', () => {
      const { result } = renderHook(() => useAutoBackup(null, ''))
      expect(result.current.folderConfigured).toBe(false)
    })

    it('folderName is null initially', () => {
      const { result } = renderHook(() => useAutoBackup(null, ''))
      expect(result.current.folderName).toBeNull()
    })

    it('lastBackupAt is null initially', () => {
      const { result } = renderHook(() => useAutoBackup(null, ''))
      expect(result.current.lastBackupAt).toBeNull()
    })

    it('isBacking is false initially', () => {
      const { result } = renderHook(() => useAutoBackup(null, ''))
      expect(result.current.isBacking).toBe(false)
    })

    it('error is null initially', () => {
      const { result } = renderHook(() => useAutoBackup(null, ''))
      expect(result.current.error).toBeNull()
    })

    it('getStoredHandle is NOT called when unsupported', () => {
      renderHook(() => useAutoBackup(null, ''))
      // When not supported, the initRef effect should not call getStoredHandle
      expect(getStoredHandle).not.toHaveBeenCalled()
    })
  })

  describe('when File System Access API IS supported', () => {
    beforeEach(() => {
      vi.mocked(isFileSystemAccessSupported).mockReturnValue(true)
      vi.mocked(getStoredHandle).mockResolvedValue(null)
    })

    it('returns supported=true', () => {
      const { result } = renderHook(() => useAutoBackup(null, ''))
      expect(result.current.supported).toBe(true)
    })

    it('restores stored handle on mount', async () => {
      const handle = makeDirHandle('SavedFolder')
      vi.mocked(getStoredHandle).mockResolvedValue(handle)

      const { result } = renderHook(() => useAutoBackup(null, ''))
      await waitFor(() => {
        expect(result.current.folderName).toBe('SavedFolder')
      })
      expect(result.current.folderConfigured).toBe(true)
    })

    it('remains not configured when no stored handle', async () => {
      vi.mocked(getStoredHandle).mockResolvedValue(null)

      const { result } = renderHook(() => useAutoBackup(null, ''))
      await waitFor(() => {
        expect(getStoredHandle).toHaveBeenCalledWith('backup')
      })
      expect(result.current.folderConfigured).toBe(false)
    })
  })

  describe('selectFolder', () => {
    beforeEach(() => {
      vi.mocked(isFileSystemAccessSupported).mockReturnValue(true)
      vi.mocked(getStoredHandle).mockResolvedValue(null)
    })

    it('returns false when pickDirectory returns null (user cancelled)', async () => {
      vi.mocked(pickDirectory).mockResolvedValue(null)
      const { result } = renderHook(() => useAutoBackup(null, ''))

      let returned: boolean | undefined
      await act(async () => {
        returned = await result.current.selectFolder()
      })
      expect(returned).toBe(false)
    })

    it('returns true and sets folderName when folder is picked', async () => {
      const handle = makeDirHandle('PickedFolder')
      vi.mocked(pickDirectory).mockResolvedValue(handle)

      const { result } = renderHook(() => useAutoBackup(null, ''))

      await act(async () => {
        await result.current.selectFolder()
      })
      expect(result.current.folderConfigured).toBe(true)
      expect(result.current.folderName).toBe('PickedFolder')
    })

    it('clears error when folder is successfully picked', async () => {
      const handle = makeDirHandle('Folder')
      vi.mocked(pickDirectory).mockResolvedValue(handle)

      const { result } = renderHook(() => useAutoBackup(null, ''))

      await act(async () => {
        await result.current.selectFolder()
      })
      expect(result.current.error).toBeNull()
    })
  })

  describe('clearFolder', () => {
    beforeEach(() => {
      vi.mocked(isFileSystemAccessSupported).mockReturnValue(true)
      vi.mocked(getStoredHandle).mockResolvedValue(null)
    })

    it('calls removeHandle and clears state', async () => {
      const handle = makeDirHandle('FolderToRemove')
      vi.mocked(pickDirectory).mockResolvedValue(handle)

      const { result } = renderHook(() => useAutoBackup(null, ''))

      // First select a folder
      await act(async () => {
        await result.current.selectFolder()
      })
      expect(result.current.folderConfigured).toBe(true)

      // Then clear it
      await act(async () => {
        await result.current.clearFolder()
      })
      expect(removeHandle).toHaveBeenCalledWith('backup')
      expect(result.current.folderConfigured).toBe(false)
      expect(result.current.folderName).toBeNull()
      expect(result.current.lastBackupAt).toBeNull()
      expect(result.current.error).toBeNull()
    })
  })

  describe('backupNow', () => {
    beforeEach(() => {
      vi.mocked(isFileSystemAccessSupported).mockReturnValue(true)
      vi.mocked(getStoredHandle).mockResolvedValue(null)
    })

    it('returns null when repo is null', async () => {
      const { result } = renderHook(() => useAutoBackup(null, ''))
      let returned: string | null | undefined
      await act(async () => {
        returned = await result.current.backupNow()
      })
      expect(returned).toBeNull()
    })

    it('returns null when no folder configured', async () => {
      const repo = makeRepo()
      const { result } = renderHook(() => useAutoBackup(repo, ''))
      let returned: string | null | undefined
      await act(async () => {
        returned = await result.current.backupNow()
      })
      expect(returned).toBeNull()
    })

    it('performs backup when folder is configured and permission granted', async () => {
      const repo = makeRepo()
      const handle = makeDirHandle('BackupFolder')
      vi.mocked(pickDirectory).mockResolvedValue(handle)
      vi.mocked(backupExporter.exportToFolder).mockResolvedValue('backup_file.json')

      const { result } = renderHook(() => useAutoBackup(repo, ''))

      // Select folder
      await act(async () => {
        await result.current.selectFolder()
      })

      let returned: string | null | undefined
      await act(async () => {
        returned = await result.current.backupNow()
      })

      expect(returned).toBe('backup_file.json')
      expect(result.current.lastBackupAt).not.toBeNull()
      expect(result.current.isBacking).toBe(false)
    })

    it('sets error when backup fails', async () => {
      const repo = makeRepo()
      const handle = makeDirHandle('BackupFolder')
      vi.mocked(pickDirectory).mockResolvedValue(handle)
      vi.mocked(backupExporter.exportToFolder).mockRejectedValue(new Error('disk full'))

      const { result } = renderHook(() => useAutoBackup(repo, ''))

      await act(async () => {
        await result.current.selectFolder()
      })

      await act(async () => {
        await result.current.backupNow()
      })

      expect(result.current.error).toBe('disk full')
    })

    it('sets error when permission is denied', async () => {
      const repo = makeRepo()
      const handle = {
        name: 'Folder',
        queryPermission: vi.fn(() => Promise.resolve('denied')),
        requestPermission: vi.fn(() => Promise.resolve('denied')),
      } as unknown as FileSystemDirectoryHandle
      vi.mocked(pickDirectory).mockResolvedValue(handle)

      const { result } = renderHook(() => useAutoBackup(repo, ''))

      await act(async () => {
        await result.current.selectFolder()
      })

      await act(async () => {
        await result.current.backupNow()
      })

      expect(result.current.error).toBe('フォルダへの書き込み権限がありません')
    })
  })
})
