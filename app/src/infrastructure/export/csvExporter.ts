/**
 * Phase 4.3: CSV エクスポート
 *
 * テーブルデータを CSV 形式でダウンロード可能にする汎用ユーティリティ。
 * BOM 付き UTF-8 で出力し、Excel での文字化けを防止する。
 *
 * @responsibility R:unclassified
 */

/** CSV エクスポートのオプション */
export interface CsvExportOptions {
  /** ファイル名 (拡張子なし) */
  filename: string
  /** BOM 付き (default: true, Excel 対応) */
  bom?: boolean
  /** 区切り文字 (default: ',') */
  delimiter?: string
}

// toCsvString は domain/utilities/csv.ts に一元化
import { toCsvString } from '@/domain/utilities/csv'

export { toCsvString }

/**
 * CSV 文字列をブラウザからダウンロードさせる。
 */
export function downloadCsv(csvContent: string, options: CsvExportOptions): void {
  const bom = options.bom !== false ? '\uFEFF' : ''
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${options.filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Worker を使った非同期 CSV 生成のしきい値（行数） */
const WORKER_THRESHOLD = 500

/**
 * 2次元配列を CSV としてダウンロードする (ワンショット API)
 *
 * 行数が多い場合（>500行）は Web Worker にオフロードして
 * メインスレッドのブロッキングを防ぐ。Worker 非対応環境ではメインスレッドで処理。
 */
export function exportToCsv(
  rows: readonly (readonly (string | number | null | undefined)[])[],
  options: CsvExportOptions,
): void {
  if (rows.length > WORKER_THRESHOLD && typeof Worker !== 'undefined') {
    exportToCsvViaWorker(rows, options).catch((err) => {
      console.warn('[csvExporter] Worker フォールバック:', err)
      const csv = toCsvString(rows, options.delimiter)
      downloadCsv(csv, options)
    })
    return
  }
  const csv = toCsvString(rows, options.delimiter)
  downloadCsv(csv, options)
}

/**
 * Worker 経由で CSV を生成してダウンロードする
 */
async function exportToCsvViaWorker(
  rows: readonly (readonly (string | number | null | undefined)[])[],
  options: CsvExportOptions,
): Promise<void> {
  const worker = new Worker(
    new URL('../../application/workers/reportExportWorker.ts', import.meta.url),
    { type: 'module' },
  )

  try {
    const csvContent = await new Promise<string>((resolve, reject) => {
      const requestId = Date.now()
      const timeout = setTimeout(() => {
        worker.terminate()
        reject(new Error('Worker timeout'))
      }, 30_000)

      worker.onmessage = (
        event: MessageEvent<{ type: string; csvContent?: string; requestId: number }>,
      ) => {
        if (event.data.requestId !== requestId) return
        clearTimeout(timeout)
        if (event.data.type === 'result' && event.data.csvContent) {
          resolve(event.data.csvContent)
        } else {
          reject(new Error('Worker export failed'))
        }
      }

      worker.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('Worker error'))
      }

      worker.postMessage({
        type: 'export',
        rows,
        delimiter: options.delimiter,
        requestId,
      })
    })

    downloadCsv(csvContent, options)
  } finally {
    worker.terminate()
  }
}
