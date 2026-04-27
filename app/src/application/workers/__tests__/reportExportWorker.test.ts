/**
 * reportExportWorker テスト
 *
 * CSV 生成ロジックのユニットテスト。
 * Worker 環境をシミュレートし、toCsvStringInWorker の変換精度を検証する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReportExportRequest, ReportWorkerResponse } from '../reportExportWorker'

// Worker の self.onmessage をテスト用にキャプチャする
let onMessageHandler: ((event: MessageEvent<ReportExportRequest>) => void) | null = null
const postedMessages: ReportWorkerResponse[] = []

// self.postMessage をモック
vi.stubGlobal('self', {
  postMessage: (msg: ReportWorkerResponse) => {
    postedMessages.push(msg)
  },
  set onmessage(handler: ((event: MessageEvent<ReportExportRequest>) => void) | null) {
    onMessageHandler = handler
  },
  get onmessage() {
    return onMessageHandler
  },
})

// Worker コードをインポート（self.onmessage が設定される）
await import('../reportExportWorker')

function sendMessage(data: ReportExportRequest): ReportWorkerResponse {
  postedMessages.length = 0
  onMessageHandler!({ data } as MessageEvent<ReportExportRequest>)
  return postedMessages[0]
}

describe('reportExportWorker', () => {
  beforeEach(() => {
    postedMessages.length = 0
  })

  it('onmessage ハンドラが設定されていること', () => {
    expect(onMessageHandler).toBeDefined()
    expect(typeof onMessageHandler).toBe('function')
  })

  it('基本的な CSV 変換ができること', () => {
    const response = sendMessage({
      type: 'export',
      rows: [
        ['名前', '売上', '粗利'],
        ['店舗A', 1000, 300],
        ['店舗B', 2000, 600],
      ],
      requestId: 1,
    })

    expect(response.type).toBe('result')
    if (response.type === 'result') {
      expect(response.rowCount).toBe(3)
      expect(response.csvContent).toBe('名前,売上,粗利\r\n店舗A,1000,300\r\n店舗B,2000,600')
      expect(response.requestId).toBe(1)
    }
  })

  it('null/undefined セルは空文字に変換されること', () => {
    const response = sendMessage({
      type: 'export',
      rows: [['a', null, undefined, 'b']],
      requestId: 2,
    })

    if (response.type === 'result') {
      expect(response.csvContent).toBe('a,,,b')
    }
  })

  it('カンマを含むセルはダブルクォートで囲まれること', () => {
    const response = sendMessage({
      type: 'export',
      rows: [['東京,大阪', '通常']],
      requestId: 3,
    })

    if (response.type === 'result') {
      expect(response.csvContent).toBe('"東京,大阪",通常')
    }
  })

  it('ダブルクォートを含むセルはエスケープされること', () => {
    const response = sendMessage({
      type: 'export',
      rows: [['値は"100"です']],
      requestId: 4,
    })

    if (response.type === 'result') {
      expect(response.csvContent).toBe('"値は""100""です"')
    }
  })

  it('改行を含むセルはダブルクォートで囲まれること', () => {
    const response = sendMessage({
      type: 'export',
      rows: [['行1\n行2']],
      requestId: 5,
    })

    if (response.type === 'result') {
      expect(response.csvContent).toBe('"行1\n行2"')
    }
  })

  it('カスタムデリミタ（タブ）で区切れること', () => {
    const response = sendMessage({
      type: 'export',
      rows: [
        ['A', 'B'],
        ['1', '2'],
      ],
      delimiter: '\t',
      requestId: 6,
    })

    if (response.type === 'result') {
      expect(response.csvContent).toBe('A\tB\r\n1\t2')
    }
  })

  it('タブデリミタでタブを含むセルがクォートされること', () => {
    const response = sendMessage({
      type: 'export',
      rows: [['col\twith\ttabs']],
      delimiter: '\t',
      requestId: 7,
    })

    if (response.type === 'result') {
      expect(response.csvContent).toBe('"col\twith\ttabs"')
    }
  })

  it('空配列は空文字列を返すこと', () => {
    const response = sendMessage({
      type: 'export',
      rows: [],
      requestId: 8,
    })

    if (response.type === 'result') {
      expect(response.csvContent).toBe('')
      expect(response.rowCount).toBe(0)
    }
  })

  it('requestId がレスポンスに正しく伝播すること', () => {
    const response = sendMessage({
      type: 'export',
      rows: [['test']],
      requestId: 42,
    })

    expect(response.requestId).toBe(42)
  })

  it('数値は文字列に変換されること', () => {
    const response = sendMessage({
      type: 'export',
      rows: [[1, 2.5, -3, 0]],
      requestId: 9,
    })

    if (response.type === 'result') {
      expect(response.csvContent).toBe('1,2.5,-3,0')
    }
  })
})
