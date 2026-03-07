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

// ── CSV 生成（infrastructure/export/csvExporter.ts の toCsvString と同一ロジック） ──
// ⚠ csvExporter.ts を変更した場合はここも同期すること。
//   パリティテスト: application/workers/__tests__/csvParity.test.ts

function toCsvStringInWorker(
  rows: readonly (readonly (string | number | null | undefined)[])[],
  delimiter: string,
): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell == null) return ''
          const s = String(cell)
          if (s.includes(delimiter) || s.includes('\n') || s.includes('"')) {
            return `"${s.replace(/"/g, '""')}"`
          }
          return s
        })
        .join(delimiter),
    )
    .join('\r\n')
}

// ── Worker Handler ──

self.onmessage = (event: MessageEvent<ReportWorkerRequest>) => {
  const { type } = event.data

  if (type === 'export') {
    try {
      const { rows, delimiter, requestId } = event.data
      const csvContent = toCsvStringInWorker(rows, delimiter ?? ',')

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
