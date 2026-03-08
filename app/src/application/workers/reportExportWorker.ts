/**
 * レポートエクスポート Worker
 *
 * CSV レポート生成をメインスレッドから分離し、重い集計処理中の UI ブロックを防ぐ。
 * 2次元配列 → CSV 文字列の変換を Worker 内で行い、結果を Blob URL として返す。
 *
 * メッセージプロトコル:
 * - リクエスト: ReportExportRequest (type, rows, options)
 * - レスポンス: ReportExportResponse (type, csvContent | error)
 */

// ── Message Protocol ──

export interface ReportExportRequest {
  readonly type: 'export'
  readonly rows: readonly (readonly (string | number | null | undefined)[])[]
  readonly delimiter?: string
  readonly requestId: number
}

export interface ReportExportSuccess {
  readonly type: 'result'
  readonly csvContent: string
  readonly rowCount: number
  readonly requestId: number
}

export interface ReportExportError {
  readonly type: 'error'
  readonly message: string
  readonly requestId: number
}

export type ReportWorkerRequest = ReportExportRequest
export type ReportWorkerResponse = ReportExportSuccess | ReportExportError

// CSV 生成は domain/utilities/csv.ts に一元化
import { toCsvString } from '@/domain/utilities/csv'

// ── Worker Handler ──

self.onmessage = (event: MessageEvent<ReportWorkerRequest>) => {
  const { type } = event.data

  if (type === 'export') {
    try {
      const { rows, delimiter, requestId } = event.data
      const csvContent = toCsvString(rows, delimiter ?? ',')

      const response: ReportExportSuccess = {
        type: 'result',
        csvContent,
        rowCount: rows.length,
        requestId,
      }
      self.postMessage(response)
    } catch (err) {
      const response: ReportExportError = {
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
        requestId: event.data.requestId,
      }
      self.postMessage(response)
    }
  }
}
