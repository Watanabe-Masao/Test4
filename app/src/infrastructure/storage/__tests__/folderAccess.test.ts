/**
 * folderAccess.ts のユニットテスト
 *
 * File System Access API はブラウザ専用のためモック環境でテストする。
 */
import { describe, it, expect, vi } from 'vitest'
import {
  isFileSystemAccessSupported,
  pickDirectory,
  listFiles,
  writeFile,
  pruneOldFiles,
} from '../folderAccess'

describe('folderAccess', () => {
  describe('isFileSystemAccessSupported', () => {
    it('showDirectoryPicker がない場合は false', () => {
      // vitest は JSDOM 環境で showDirectoryPicker を持たない
      expect(isFileSystemAccessSupported()).toBe(false)
    })
  })

  describe('pickDirectory', () => {
    it('非対応環境では null を返す', async () => {
      // JSDOM は showDirectoryPicker を持たない
      const result = await pickDirectory('backup')
      expect(result).toBeNull()
    })
  })

  describe('listFiles', () => {
    it('拡張子のないファイルは空拡張子として扱う', async () => {
      const mockEntries = [
        ['Makefile', { kind: 'file', name: 'Makefile' }],
        ['data.csv', { kind: 'file', name: 'data.csv' }],
      ] as const
      const mockDirHandle = {
        entries: vi.fn().mockImplementation(async function* () {
          for (const entry of mockEntries) yield entry
        }),
      } as unknown as FileSystemDirectoryHandle

      // .csv フィルタ → Makefile は除外
      const result = await listFiles(mockDirHandle, ['.csv'])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('data.csv')
    })

    it('空フォルダは空配列を返す', async () => {
      const mockDirHandle = {
        entries: vi.fn().mockImplementation(async function* () {
          // yield nothing
        }),
      } as unknown as FileSystemDirectoryHandle

      const result = await listFiles(mockDirHandle)
      expect(result).toHaveLength(0)
    })

    it('拡張子フィルタでファイルを絞り込む', async () => {
      const mockEntries = [
        ['data.xlsx', { kind: 'file', name: 'data.xlsx' }],
        ['readme.txt', { kind: 'file', name: 'readme.txt' }],
        ['budget.csv', { kind: 'file', name: 'budget.csv' }],
        ['subdir', { kind: 'directory', name: 'subdir' }],
      ] as const

      const mockDirHandle = {
        entries: vi.fn().mockImplementation(async function* () {
          for (const entry of mockEntries) {
            yield entry
          }
        }),
      } as unknown as FileSystemDirectoryHandle

      const result = await listFiles(mockDirHandle, ['.xlsx', '.csv'])
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('budget.csv')
      expect(result[1].name).toBe('data.xlsx')
    })

    it('拡張子フィルタなしで全ファイルを返す', async () => {
      const mockEntries = [
        ['a.txt', { kind: 'file', name: 'a.txt' }],
        ['b.json', { kind: 'file', name: 'b.json' }],
      ] as const

      const mockDirHandle = {
        entries: vi.fn().mockImplementation(async function* () {
          for (const entry of mockEntries) {
            yield entry
          }
        }),
      } as unknown as FileSystemDirectoryHandle

      const result = await listFiles(mockDirHandle)
      expect(result).toHaveLength(2)
    })
  })

  describe('writeFile', () => {
    it('ファイルを書き出す', async () => {
      const mockWritable = {
        write: vi.fn(),
        close: vi.fn(),
      }
      const mockFileHandle = {
        createWritable: vi.fn().mockResolvedValue(mockWritable),
      }
      const mockDirHandle = {
        getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
      } as unknown as FileSystemDirectoryHandle

      await writeFile(mockDirHandle, 'test.json', 'hello')

      expect(mockDirHandle.getFileHandle).toHaveBeenCalledWith('test.json', { create: true })
      expect(mockWritable.write).toHaveBeenCalledWith('hello')
      expect(mockWritable.close).toHaveBeenCalled()
    })

    it('write エラー時も close が呼ばれること', async () => {
      const mockWritable = {
        write: vi.fn().mockRejectedValue(new Error('disk full')),
        close: vi.fn(),
      }
      const mockFileHandle = {
        createWritable: vi.fn().mockResolvedValue(mockWritable),
      }
      const mockDirHandle = {
        getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
      } as unknown as FileSystemDirectoryHandle

      await expect(writeFile(mockDirHandle, 'test.json', 'hello')).rejects.toThrow('disk full')
      expect(mockWritable.close).toHaveBeenCalled()
    })

    it('Blob データを書き出せること', async () => {
      const mockWritable = { write: vi.fn(), close: vi.fn() }
      const mockFileHandle = { createWritable: vi.fn().mockResolvedValue(mockWritable) }
      const mockDirHandle = {
        getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
      } as unknown as FileSystemDirectoryHandle

      const blob = new Blob(['test data'], { type: 'application/json' })
      await writeFile(mockDirHandle, 'data.json', blob)
      expect(mockWritable.write).toHaveBeenCalledWith(blob)
    })
  })

  describe('pruneOldFiles', () => {
    it('maxGenerations を超える古いファイルを削除する', async () => {
      const mockEntries = [
        ['backup-2026-01-01-0900.json', { kind: 'file', name: 'backup-2026-01-01-0900.json' }],
        ['backup-2026-01-02-0900.json', { kind: 'file', name: 'backup-2026-01-02-0900.json' }],
        ['backup-2026-01-03-0900.json', { kind: 'file', name: 'backup-2026-01-03-0900.json' }],
        ['other-file.json', { kind: 'file', name: 'other-file.json' }],
      ] as const

      const mockDirHandle = {
        entries: vi.fn().mockImplementation(async function* () {
          for (const entry of mockEntries) {
            yield entry
          }
        }),
        removeEntry: vi.fn(),
      } as unknown as FileSystemDirectoryHandle

      const removed = await pruneOldFiles(mockDirHandle, 'backup-', 2)
      expect(removed).toBe(1) // 3 backups - 2 max = 1 removed
      expect(mockDirHandle.removeEntry).toHaveBeenCalledWith('backup-2026-01-01-0900.json')
    })

    it('maxGenerations 以下なら何も削除しない', async () => {
      const mockEntries = [
        ['backup-2026-01-01-0900.json', { kind: 'file', name: 'backup-2026-01-01-0900.json' }],
      ] as const

      const mockDirHandle = {
        entries: vi.fn().mockImplementation(async function* () {
          for (const entry of mockEntries) {
            yield entry
          }
        }),
        removeEntry: vi.fn(),
      } as unknown as FileSystemDirectoryHandle

      const removed = await pruneOldFiles(mockDirHandle, 'backup-', 5)
      expect(removed).toBe(0)
      expect(mockDirHandle.removeEntry).not.toHaveBeenCalled()
    })
  })
})
