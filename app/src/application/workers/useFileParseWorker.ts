/**
 * Phase 20: ファイルパース Worker フック
 *
 * XLSX/CSV の解析を Web Worker にオフロードし、メインスレッドの
 * ブロッキングを防止する。Worker 非対応環境（テスト環境含む）では
 * メインスレッドでの同期フォールバックを提供する。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FileParseWorkerResponse } from './fileParseWorker'
import { readTabularFile } from '@/infrastructure/fileImport/tabularReader'

interface FileParseWorkerResult {
  /** Worker を使った非同期パース（パース済み行を返す） */
  parseFile: (file: File) => Promise<unknown[][]>
  /** パース中フラグ */
  isParsing: boolean
  /** Worker が利用可能か */
  isWorkerAvailable: boolean
}

export function useFileParseWorker(): FileParseWorkerResult {
  const [isParsing, setIsParsing] = useState(false)
  const requestIdRef = useRef(0)

  // Worker インスタンスを useState で管理（useWorkerCalculation と同パターン）
  const [worker] = useState<Worker | null>(() => {
    try {
      return new Worker(new URL('./fileParseWorker.ts', import.meta.url), { type: 'module' })
    } catch {
      // Worker 非対応環境 (テスト環境含む)
      return null
    }
  })

  const isWorkerAvailable = worker !== null

  // Worker クリーンアップ
  useEffect(() => {
    return () => {
      worker?.terminate()
    }
  }, [worker])

  const parseFile = useCallback(
    async (file: File): Promise<unknown[][]> => {
      if (!worker) {
        // フォールバック: メインスレッドで同期パース
        return readTabularFile(file)
      }

      const thisRequestId = ++requestIdRef.current
      setIsParsing(true)

      // ArrayBuffer をメインスレッドで取得してから Worker に転送
      const buffer = await file.arrayBuffer()

      return new Promise((resolve, reject) => {
        const handleMessage = (event: MessageEvent<FileParseWorkerResponse>) => {
          // 自分のリクエストの応答でなければ無視
          if (event.data.requestId !== thisRequestId) return

          worker.removeEventListener('message', handleMessage)
          worker.removeEventListener('error', handleError)
          setIsParsing(false)

          if (event.data.type === 'result') {
            resolve(event.data.rows)
          } else {
            reject(new Error(event.data.message))
          }
        }

        const handleError = (event: ErrorEvent) => {
          worker.removeEventListener('message', handleMessage)
          worker.removeEventListener('error', handleError)
          setIsParsing(false)
          reject(new Error(event.message))
        }

        worker.addEventListener('message', handleMessage)
        worker.addEventListener('error', handleError)

        // ArrayBuffer を Transferable として転送（コピーではなく所有権移動）
        worker.postMessage(
          {
            type: 'parse',
            buffer,
            filename: file.name,
            requestId: thisRequestId,
          },
          [buffer],
        )
      })
    },
    [worker],
  )

  return {
    parseFile,
    isParsing,
    isWorkerAvailable,
  }
}
