/**
 * useAutoImport のテスト — 安全設計の検証
 *
 * 検証対象:
 *   1. per-file 成功に紐付いた fingerprint 引き上げ
 *      （silent failure 時に fingerprint が commit されないこと）
 *   2. scan の再入ロック
 *   3. rescanAll で processed をクリア + フォルダ設定を維持
 *   4. clearFolder / selectFolder で processed が同期される
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ImportSummary } from '@/domain/models/ImportResult'

const mockFileSystemAdapter = {
  isFileSystemAccessSupported: vi.fn((): boolean => true),
  pickDirectory: vi.fn((): Promise<FileSystemDirectoryHandle | null> => Promise.resolve(null)),
  getStoredHandle: vi.fn((): Promise<FileSystemDirectoryHandle | null> => Promise.resolve(null)),
  removeHandle: vi.fn((): Promise<void> => Promise.resolve()),
  listFiles: vi.fn(
    (): Promise<readonly { name: string; handle: FileSystemFileHandle }[]> => Promise.resolve([]),
  ),
}

vi.mock('@/application/context/useAdapters', () => ({
  useFileSystemAdapter: () => mockFileSystemAdapter,
}))

// localStorage をクリーンに保つ
beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  mockFileSystemAdapter.isFileSystemAccessSupported.mockReturnValue(true)
  mockFileSystemAdapter.getStoredHandle.mockResolvedValue(null)
})

import { useAutoImport } from '../useAutoImport'

function makeDirHandle(name = 'ImportFolder'): FileSystemDirectoryHandle {
  return {
    name,
    kind: 'directory',
    queryPermission: vi.fn(() => Promise.resolve('granted')),
    requestPermission: vi.fn(() => Promise.resolve('granted')),
  } as unknown as FileSystemDirectoryHandle
}

function makeFileEntry(
  name: string,
  content: string,
  lastModified: number,
): { name: string; handle: FileSystemFileHandle } {
  const file = new File([content], name, { lastModified })
  return {
    name,
    handle: {
      name,
      kind: 'file',
      getFile: () => Promise.resolve(file),
    } as unknown as FileSystemFileHandle,
  }
}

function makeSummary(results: { filename: string; ok: boolean }[]): ImportSummary {
  return {
    results: results.map((r) => ({
      ok: r.ok,
      filename: r.filename,
      type: null,
      typeName: null,
    })),
    successCount: results.filter((r) => r.ok).length,
    failureCount: results.filter((r) => !r.ok).length,
  }
}

describe('useAutoImport — 安全設計', () => {
  it('silent failure（空 summary）時は fingerprint を commit しない', async () => {
    const handle = makeDirHandle()
    mockFileSystemAdapter.pickDirectory.mockResolvedValue(handle)
    mockFileSystemAdapter.listFiles.mockResolvedValue([makeFileEntry('a.xlsx', 'x', 100)])

    // 空 summary（同時実行ロックで silent drop された状態を模擬）
    const onFiles = vi.fn<(files: File[]) => Promise<ImportSummary>>(() =>
      Promise.resolve({ results: [], successCount: 0, failureCount: 0 }),
    )

    const { result } = renderHook(() => useAutoImport(onFiles))
    await act(async () => {
      await result.current.selectFolder()
    })
    // selectFolder 後、起動時 auto-scan も走るので 1 回で十分
    await waitFor(() => {
      expect(onFiles).toHaveBeenCalled()
    })

    // processed は 0 件のまま → 次回 scan で再取込できる
    expect(result.current.processedCount).toBe(0)

    // 2 回目の scan で同じファイルが再度投入されることを確認
    onFiles.mockClear()
    mockFileSystemAdapter.listFiles.mockResolvedValue([makeFileEntry('a.xlsx', 'x', 100)])
    await act(async () => {
      await result.current.scanNow()
    })
    expect(onFiles).toHaveBeenCalled()
    const passed = onFiles.mock.calls[0][0]
    expect(passed).toHaveLength(1)
    expect(passed[0].name).toBe('a.xlsx')
  })

  it('成功ファイルだけ fingerprint を commit する（部分失敗）', async () => {
    const handle = makeDirHandle()
    mockFileSystemAdapter.pickDirectory.mockResolvedValue(handle)
    mockFileSystemAdapter.listFiles.mockResolvedValue([
      makeFileEntry('ok.xlsx', 'a', 100),
      makeFileEntry('fail.xlsx', 'b', 200),
    ])

    const onFiles = vi.fn<(files: File[]) => Promise<ImportSummary>>(() =>
      Promise.resolve(
        makeSummary([
          { filename: 'ok.xlsx', ok: true },
          { filename: 'fail.xlsx', ok: false },
        ]),
      ),
    )

    const { result } = renderHook(() => useAutoImport(onFiles))
    await act(async () => {
      await result.current.selectFolder()
    })
    await waitFor(() => {
      expect(result.current.processedCount).toBe(1)
    })

    // 2 回目の scan では失敗した fail.xlsx だけが再投入される
    onFiles.mockClear()
    mockFileSystemAdapter.listFiles.mockResolvedValue([
      makeFileEntry('ok.xlsx', 'a', 100),
      makeFileEntry('fail.xlsx', 'b', 200),
    ])
    await act(async () => {
      await result.current.scanNow()
    })
    const secondCall = onFiles.mock.calls[0][0]
    expect(secondCall.map((f) => f.name)).toEqual(['fail.xlsx'])
  })

  it('rescanAll は processed をクリアしてフォルダ設定は維持する', async () => {
    const handle = makeDirHandle('keepMe')
    mockFileSystemAdapter.pickDirectory.mockResolvedValue(handle)
    mockFileSystemAdapter.listFiles.mockResolvedValue([makeFileEntry('a.xlsx', 'x', 100)])

    const onFiles = vi.fn<(files: File[]) => Promise<ImportSummary>>(() =>
      Promise.resolve(makeSummary([{ filename: 'a.xlsx', ok: true }])),
    )

    const { result } = renderHook(() => useAutoImport(onFiles))
    await act(async () => {
      await result.current.selectFolder()
    })
    await waitFor(() => expect(result.current.processedCount).toBe(1))

    // 2 回目の普通の scan は skip される
    onFiles.mockClear()
    await act(async () => {
      await result.current.scanNow()
    })
    expect(onFiles).not.toHaveBeenCalled()

    // rescanAll は processed をクリアして再投入
    await act(async () => {
      await result.current.rescanAll()
    })
    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(result.current.folderConfigured).toBe(true)
    expect(result.current.folderName).toBe('keepMe')
  })

  it('scan の再入ロック — 並走しても onFilesFound は 1 回のみ呼ばれる', async () => {
    const handle = makeDirHandle()
    mockFileSystemAdapter.pickDirectory.mockResolvedValue(handle)
    mockFileSystemAdapter.listFiles.mockResolvedValue([makeFileEntry('a.xlsx', 'x', 100)])

    let resolveImport: ((v: ImportSummary) => void) | null = null
    const onFiles = vi.fn<(files: File[]) => Promise<ImportSummary>>(
      () =>
        new Promise<ImportSummary>((r) => {
          resolveImport = r
        }),
    )

    const { result } = renderHook(() => useAutoImport(onFiles))
    await act(async () => {
      await result.current.selectFolder()
    })
    // 起動時 auto-scan が走り onFiles が呼ばれる（resolve 待ち）
    await waitFor(() => expect(onFiles).toHaveBeenCalledTimes(1))

    // 並行して手動 scan を叩いても再入ロックで無視される
    await act(async () => {
      await result.current.scanNow()
    })
    expect(onFiles).toHaveBeenCalledTimes(1)

    // ロックを解除
    await act(async () => {
      resolveImport?.(makeSummary([{ filename: 'a.xlsx', ok: true }]))
      // microtask flush
      await Promise.resolve()
    })
  })

  it('selectFolder で processed がクリアされる（前フォルダの指紋を引き継がない）', async () => {
    // 事前に前回分を localStorage に残しておく
    localStorage.setItem('shiire-arari-import-processed', JSON.stringify(['stale|1|1']))

    const handle = makeDirHandle('newFolder')
    mockFileSystemAdapter.pickDirectory.mockResolvedValue(handle)
    mockFileSystemAdapter.listFiles.mockResolvedValue([])

    const onFiles = vi.fn<(files: File[]) => Promise<void>>(() => Promise.resolve())
    const { result } = renderHook(() => useAutoImport(onFiles))
    await act(async () => {
      await result.current.selectFolder()
    })

    // localStorage の processed がクリアされていること
    const stored = JSON.parse(
      localStorage.getItem('shiire-arari-import-processed') ?? '[]',
    ) as string[]
    expect(stored).toEqual([])
    expect(result.current.processedCount).toBe(0)
  })

  it('clearFolder で processed がクリアされる', async () => {
    const handle = makeDirHandle()
    mockFileSystemAdapter.pickDirectory.mockResolvedValue(handle)
    mockFileSystemAdapter.listFiles.mockResolvedValue([makeFileEntry('a.xlsx', 'x', 100)])
    const onFiles = vi.fn<(files: File[]) => Promise<ImportSummary>>(() =>
      Promise.resolve(makeSummary([{ filename: 'a.xlsx', ok: true }])),
    )

    const { result } = renderHook(() => useAutoImport(onFiles))
    await act(async () => {
      await result.current.selectFolder()
    })
    await waitFor(() => expect(result.current.processedCount).toBe(1))

    await act(async () => {
      await result.current.clearFolder()
    })
    expect(result.current.folderConfigured).toBe(false)
    expect(result.current.processedCount).toBe(0)
    const stored = JSON.parse(
      localStorage.getItem('shiire-arari-import-processed') ?? '[]',
    ) as string[]
    expect(stored).toEqual([])
  })

  it('void 戻り値（旧互換）でも全件成功扱いで fingerprint を commit する', async () => {
    const handle = makeDirHandle()
    mockFileSystemAdapter.pickDirectory.mockResolvedValue(handle)
    mockFileSystemAdapter.listFiles.mockResolvedValue([makeFileEntry('a.xlsx', 'x', 100)])

    const onFiles = vi.fn<(files: File[]) => Promise<void>>(() => Promise.resolve())
    const { result } = renderHook(() => useAutoImport(onFiles))
    await act(async () => {
      await result.current.selectFolder()
    })
    await waitFor(() => expect(result.current.processedCount).toBe(1))
  })
})
