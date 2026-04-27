/**
 * useReportExportWorker テスト
 *
 * Worker 非対応環境でのフォールバック CSV 生成を検証する。
 * Worker 生成の成功/失敗パターンとダウンロード処理をモックでテストする。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReportExportWorker } from '../useReportExportWorker'

// ── Worker モック ──

let workerConstructorThrows = true
let mockWorkerInstance: {
  postMessage: ReturnType<typeof vi.fn>
  terminate: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  onmessage: ((event: MessageEvent) => void) | null
}

// ── anchor/Blob/URL 追跡 ──
let clickedAnchors: { href: string; download: string }[] = []
let createdBlobs: { parts: (string | BlobPart)[]; options: BlobPropertyBag }[] = []

beforeEach(() => {
  workerConstructorThrows = true
  clickedAnchors = []
  createdBlobs = []

  mockWorkerInstance = {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onmessage: null,
  }

  vi.stubGlobal(
    'Worker',
    class {
      constructor() {
        if (workerConstructorThrows) {
          throw new Error('Worker not supported')
        }
        return mockWorkerInstance as unknown as Worker
      }
    },
  )

  // document.createElement('a') をフックして click を追跡
  // 元の createElement を保持してReact用に委譲
  const origCreateElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?) => {
    const el = origCreateElement(tagName, options)
    if (tagName === 'a') {
      const origClick = el.click.bind(el)
      el.click = () => {
        clickedAnchors.push({
          href: (el as HTMLAnchorElement).href,
          download: (el as HTMLAnchorElement).download,
        })
        origClick()
      }
    }
    return el
  })

  // Blob コンストラクタをラップして生成内容を追跡
  const OrigBlob = globalThis.Blob
  vi.stubGlobal(
    'Blob',
    class extends OrigBlob {
      constructor(parts: BlobPart[], options: BlobPropertyBag) {
        super(parts, options)
        createdBlobs.push({ parts: [...parts], options })
      }
    },
  )

  // URL.createObjectURL / revokeObjectURL モック（URL コンストラクタは保持）
  URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url') as typeof URL.createObjectURL
  URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  // URL.createObjectURL/revokeObjectURL はメソッド直接代入なので復元不要（jsdom が毎テストでリセット）
})

describe('useReportExportWorker', () => {
  it('exportCsv 関数を返すこと', () => {
    const { result } = renderHook(() => useReportExportWorker())
    expect(result.current.exportCsv).toBeDefined()
    expect(typeof result.current.exportCsv).toBe('function')
  })

  describe('Worker 非対応時のフォールバック', () => {
    it('メインスレッドで CSV を生成しダウンロードすること', () => {
      const { result } = renderHook(() => useReportExportWorker())

      act(() => {
        result.current.exportCsv(
          [
            ['名前', '金額'],
            ['店舗A', 1000],
          ],
          'test-report',
        )
      })

      // ダウンロードリンクが作成されクリックされたか
      expect(clickedAnchors.length).toBe(1)
      expect(clickedAnchors[0].download).toBe('test-report.csv')
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })

    it('フォールバック CSV でカンマ含むセルがクォートされること', () => {
      const { result } = renderHook(() => useReportExportWorker())

      act(() => {
        result.current.exportCsv([['値に,カンマ', '通常']], 'comma-test')
      })

      expect(createdBlobs.length).toBe(1)
      const csvWithBom = createdBlobs[0].parts[0] as string
      expect(csvWithBom).toContain('\uFEFF')
      expect(csvWithBom).toContain('"値に,カンマ"')
    })

    it('null/undefined セルが空文字に変換されること', () => {
      const { result } = renderHook(() => useReportExportWorker())

      act(() => {
        result.current.exportCsv([['a', null, undefined, 'b']], 'null-test')
      })

      const csvWithBom = createdBlobs[0].parts[0] as string
      expect(csvWithBom).toContain('a,,,b')
    })
  })

  describe('Worker 対応時', () => {
    beforeEach(() => {
      workerConstructorThrows = false
    })

    it('Worker に postMessage でリクエストを送信すること', () => {
      const { result } = renderHook(() => useReportExportWorker())

      act(() => {
        result.current.exportCsv(
          [
            ['col1', 'col2'],
            ['a', 'b'],
          ],
          'worker-test',
        )
      })

      expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'export',
          rows: [
            ['col1', 'col2'],
            ['a', 'b'],
          ],
        }),
      )
    })

    it('Worker からのレスポンスでダウンロードが実行されること', () => {
      const { result } = renderHook(() => useReportExportWorker())

      act(() => {
        result.current.exportCsv([['test']], 'dl-test')
      })

      // addEventListener で message ハンドラが登録されているか
      expect(mockWorkerInstance.addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      )

      // Worker レスポンスをシミュレート
      const sentMsg = mockWorkerInstance.postMessage.mock.calls[0][0]
      const handler = mockWorkerInstance.addEventListener.mock.calls[0][1] as (
        event: MessageEvent,
      ) => void

      act(() => {
        handler({
          data: {
            type: 'result',
            csvContent: 'test',
            rowCount: 1,
            requestId: sentMsg.requestId,
          },
        } as MessageEvent)
      })

      expect(clickedAnchors.length).toBe(1)
      expect(clickedAnchors[0].download).toBe('dl-test.csv')
    })

    it('Worker エラーレスポンス時に console.error を出力すること', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useReportExportWorker())

      act(() => {
        result.current.exportCsv([['test']], 'error-test')
      })

      const sentMsg = mockWorkerInstance.postMessage.mock.calls[0][0]
      const handler = mockWorkerInstance.addEventListener.mock.calls[0][1] as (
        event: MessageEvent,
      ) => void

      act(() => {
        handler({
          data: {
            type: 'error',
            message: 'something failed',
            requestId: sentMsg.requestId,
          },
        } as MessageEvent)
      })

      expect(errorSpy).toHaveBeenCalledWith('Report export worker error:', 'something failed')
      errorSpy.mockRestore()
    })

    it('requestId が一致しないレスポンスは無視されること', () => {
      const { result } = renderHook(() => useReportExportWorker())

      act(() => {
        result.current.exportCsv([['test']], 'mismatch-test')
      })

      const handler = mockWorkerInstance.addEventListener.mock.calls[0][1] as (
        event: MessageEvent,
      ) => void

      act(() => {
        handler({
          data: {
            type: 'result',
            csvContent: 'wrong',
            rowCount: 1,
            requestId: 99999, // 不一致
          },
        } as MessageEvent)
      })

      // ダウンロードは実行されない
      expect(clickedAnchors.length).toBe(0)
    })
  })
})
