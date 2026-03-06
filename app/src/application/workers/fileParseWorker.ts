/**
 * Phase 20: ファイルパース用 Web Worker
 *
 * XLSX/CSV の解析をメインスレッドからオフロードし、
 * 大容量ファイル（>10MB）読み込み時の UI ブロッキングを防止する。
 *
 * Vite が Worker をモジュールとしてバンドルするため、
 * 通常のインポートパス (@/) が利用可能。
 */
import { parseXlsxBuffer, parseCsvBuffer } from '@/infrastructure/fileImport/tabularReader'

// ─── Message Protocol ─────────────────────────────────

export interface ParseFileRequest {
  type: 'parse'
  buffer: ArrayBuffer
  filename: string
  requestId: number
}

export interface ParseFileResponse {
  type: 'result'
  rows: unknown[][]
  requestId: number
}

export interface ParseFileError {
  type: 'error'
  message: string
  requestId: number
}

export type FileParseWorkerRequest = ParseFileRequest

// ─── Worker Handler ───────────────────────────────────

self.onmessage = (event: MessageEvent<FileParseWorkerRequest>) => {
  const { type } = event.data

  if (type === 'parse') {
    try {
      const { buffer, filename, requestId } = event.data

      const isCsv = filename.toLowerCase().endsWith('.csv')
      const rows = isCsv ? parseCsvBuffer(buffer) : parseXlsxBuffer(buffer)

      const response: ParseFileResponse = { type: 'result', rows, requestId }
      self.postMessage(response)
    } catch (err) {
      const response: ParseFileError = {
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
        requestId: event.data.requestId,
      }
      self.postMessage(response)
    }
  }
}
