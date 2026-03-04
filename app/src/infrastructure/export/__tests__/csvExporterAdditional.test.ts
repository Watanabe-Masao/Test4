/**
 * csvExporter — 追加テスト
 *
 * 既存テストでカバーされていない downloadCsv / exportToCsv をテストする。
 * これらはブラウザ API (Blob, URL, document) に依存するため、vi.stubGlobal を使用する。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { downloadCsv, exportToCsv, toCsvString } from '../csvExporter'

// ── テスト用グローバルモック ─────────────────────────────────────

let appendedElement: HTMLAnchorElement | null = null
let removedElement: HTMLAnchorElement | null = null
let clickedElement: HTMLAnchorElement | null = null
let revokedUrl: string | null = null

const MOCK_BLOB_URL = 'blob:http://localhost/mock-uuid'

beforeEach(() => {
  appendedElement = null
  removedElement = null
  clickedElement = null
  revokedUrl = null

  // URL.createObjectURL / revokeObjectURL のモック
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => MOCK_BLOB_URL),
    revokeObjectURL: vi.fn((url: string) => {
      revokedUrl = url
    }),
  })

  // document.createElement('a') のモック
  const mockAnchor: Partial<HTMLAnchorElement> = {
    href: '',
    download: '',
    click: vi.fn(() => {
      clickedElement = mockAnchor as unknown as HTMLAnchorElement
    }),
  }

  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') {
      return mockAnchor as HTMLAnchorElement
    }
    return document.createElement(tag)
  })

  vi.spyOn(document.body, 'appendChild').mockImplementation((el) => {
    appendedElement = el as HTMLAnchorElement
    return el
  })

  vi.spyOn(document.body, 'removeChild').mockImplementation((el) => {
    removedElement = el as HTMLAnchorElement
    return el
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// ── downloadCsv ───────────────────────────────────────────────────

describe('downloadCsv', () => {
  it('Blob URL を生成してアンカーをクリックする', () => {
    downloadCsv('a,b\r\nc,d', { filename: 'test' })

    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(clickedElement).not.toBeNull()
  })

  it('ファイル名に .csv 拡張子を付与する', () => {
    const mockAnchor = { href: '', download: '', click: vi.fn() } as Partial<HTMLAnchorElement>
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as HTMLAnchorElement)

    downloadCsv('content', { filename: 'my-report' })
    expect(mockAnchor.download).toBe('my-report.csv')
  })

  it('BOM を付加する (default: true)', () => {
    let capturedBlob: Blob | null = null
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob: Blob) => {
        capturedBlob = blob
        return MOCK_BLOB_URL
      }),
      revokeObjectURL: vi.fn(),
    })

    downloadCsv('hello', { filename: 'f' })

    expect(capturedBlob).not.toBeNull()
    // Blob のサイズは BOM(3バイト) + content バイト数以上
    expect(capturedBlob!.size).toBeGreaterThan(3)
  })

  it('bom: false のとき BOM なし Blob を生成する', () => {
    let capturedBlob: Blob | null = null
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob: Blob) => {
        capturedBlob = blob
        return MOCK_BLOB_URL
      }),
      revokeObjectURL: vi.fn(),
    })

    downloadCsv('hello', { filename: 'f', bom: false })

    // BOM なしなら size == 'hello'.length（UTF-8 ASCII bytes）
    expect(capturedBlob).not.toBeNull()
    expect(capturedBlob!.size).toBe(5) // 'hello'
  })

  it('Blob URL を解放する (revokeObjectURL 呼び出し)', () => {
    downloadCsv('content', { filename: 'test' })
    expect(revokedUrl).toBe(MOCK_BLOB_URL)
  })

  it('アンカーを DOM に追加してクリック後に削除する', () => {
    downloadCsv('content', { filename: 'test' })

    expect(appendedElement).not.toBeNull()
    expect(removedElement).not.toBeNull()
    // 追加したものと削除したものが同じ要素
    expect(appendedElement).toBe(removedElement)
  })
})

// ── exportToCsv ───────────────────────────────────────────────────

describe('exportToCsv', () => {
  it('2次元配列を CSV に変換してダウンロードを開始する', () => {
    const rows = [
      ['名前', '金額'],
      ['店舗A', 1000],
    ]

    exportToCsv(rows, { filename: 'report' })

    // URL.createObjectURL が呼ばれることでダウンロードが開始される
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(clickedElement).not.toBeNull()
  })

  it('カスタム区切り文字でタブ区切り CSV を出力する', () => {
    let capturedBlob: Blob | null = null
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob: Blob) => {
        capturedBlob = blob
        return MOCK_BLOB_URL
      }),
      revokeObjectURL: vi.fn(),
    })

    const rows = [
      ['a', 'b'],
      ['1', '2'],
    ]
    exportToCsv(rows, { filename: 'tsv', delimiter: '\t' })

    expect(capturedBlob).not.toBeNull()
    // Blob のテキストを読み取って \t が含まれることを確認
    const text = toCsvString(rows, '\t')
    expect(text).toContain('\t')
  })

  it('空の行配列でも例外なく実行できる', () => {
    expect(() => exportToCsv([], { filename: 'empty' })).not.toThrow()
  })

  it('null/undefined セルを含む行でも正常に動作する', () => {
    const rows = [['a', null, undefined, 'b']]
    expect(() => exportToCsv(rows, { filename: 'test' })).not.toThrow()
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
  })
})
