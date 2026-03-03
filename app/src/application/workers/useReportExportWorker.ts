/**
 * レポートエクスポート Worker フック
 *
 * CSV レポートの生成を Worker で非同期実行し、完了後にダウンロードをトリガーする。
 * Worker 非対応環境ではメインスレッドにフォールバックする。
 */
import { useCallback, useRef } from 'react'
import type { ReportWorkerRequest, ReportWorkerResponse } from './reportExportWorker'

interface UseReportExportWorkerResult {
  /** Worker で CSV を生成しダウンロードする */
  readonly exportCsv: (
    rows: readonly (readonly (string | number | null | undefined)[])[],
    filename: string,
  ) => void
}

/**
 * レポートエクスポート Worker を使って CSV を生成する。
 * Worker が利用不可の場合はメインスレッドで同期処理する。
 */
export function useReportExportWorker(): UseReportExportWorkerResult {
  const workerRef = useRef<Worker | null>(null)
  const requestIdRef = useRef(0)

  const getWorker = useCallback((): Worker | null => {
    if (workerRef.current) return workerRef.current

    try {
      workerRef.current = new Worker(new URL('./reportExportWorker.ts', import.meta.url), {
        type: 'module',
      })
      return workerRef.current
    } catch {
      return null
    }
  }, [])

  const downloadCsv = useCallback((csvContent: string, filename: string): void => {
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const exportCsv = useCallback(
    (
      rows: readonly (readonly (string | number | null | undefined)[])[],
      filename: string,
    ): void => {
      const worker = getWorker()

      if (!worker) {
        // フォールバック: メインスレッドで CSV 生成
        const csvContent = rows
          .map((row) =>
            row
              .map((cell) => {
                if (cell == null) return ''
                const s = String(cell)
                if (s.includes(',') || s.includes('\n') || s.includes('"')) {
                  return `"${s.replace(/"/g, '""')}"`
                }
                return s
              })
              .join(','),
          )
          .join('\r\n')
        downloadCsv(csvContent, filename)
        return
      }

      const requestId = ++requestIdRef.current

      const handler = (event: MessageEvent<ReportWorkerResponse>) => {
        const msg = event.data
        if (msg.requestId !== requestId) return

        worker.removeEventListener('message', handler)

        if (msg.type === 'result') {
          downloadCsv(msg.csvContent, filename)
        } else {
          console.error('Report export worker error:', msg.message)
        }
      }

      worker.addEventListener('message', handler)

      const request: ReportWorkerRequest = {
        type: 'export',
        rows,
        requestId,
      }
      worker.postMessage(request)
    },
    [getWorker, downloadCsv],
  )

  return { exportCsv }
}
