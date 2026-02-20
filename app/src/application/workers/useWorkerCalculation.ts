/**
 * Phase 5.2: Web Worker 計算フック
 *
 * 計算処理を Web Worker にオフロードし、メインスレッドの
 * ブロッキングを防止する。Worker 非対応環境では同期フォールバック。
 */
import { useRef, useCallback, useEffect, useState } from 'react'
import type { AppSettings, StoreResult, ImportedData } from '@/domain/models'
import type { WorkerResponse } from './calculationWorker'

interface WorkerCalculationResult {
  /** Worker を使った非同期計算 */
  calculateAsync: (
    data: ImportedData,
    settings: AppSettings,
    daysInMonth: number,
  ) => Promise<ReadonlyMap<string, StoreResult>>
  /** 計算中フラグ */
  isComputing: boolean
  /** Worker が利用可能か */
  isWorkerAvailable: boolean
  /** Worker を終了する */
  terminate: () => void
}

export function useWorkerCalculation(): WorkerCalculationResult {
  const workerRef = useRef<Worker | null>(null)
  const [isComputing, setIsComputing] = useState(false)
  const [isWorkerAvailable, setIsWorkerAvailable] = useState(false)

  // Worker 初期化
  useEffect(() => {
    try {
      const worker = new Worker(
        new URL('./calculationWorker.ts', import.meta.url),
        { type: 'module' },
      )
      workerRef.current = worker
      setIsWorkerAvailable(true)

      return () => {
        worker.terminate()
        workerRef.current = null
      }
    } catch {
      // Worker 非対応環境 (テスト環境含む)
      setIsWorkerAvailable(false)
    }
  }, [])

  const calculateAsync = useCallback(
    (
      data: ImportedData,
      settings: AppSettings,
      daysInMonth: number,
    ): Promise<ReadonlyMap<string, StoreResult>> => {
      const worker = workerRef.current

      if (!worker) {
        // フォールバック: 同期計算
        return import('@/application/services/CalculationOrchestrator').then(
          ({ calculateAllStores }) => calculateAllStores(data, settings, daysInMonth),
        )
      }

      setIsComputing(true)

      return new Promise((resolve, reject) => {
        const handleMessage = (event: MessageEvent<WorkerResponse>) => {
          worker.removeEventListener('message', handleMessage)
          worker.removeEventListener('error', handleError)
          setIsComputing(false)

          if (event.data.type === 'result') {
            resolve(event.data.results)
          } else {
            reject(new Error(event.data.message))
          }
        }

        const handleError = (event: ErrorEvent) => {
          worker.removeEventListener('message', handleMessage)
          worker.removeEventListener('error', handleError)
          setIsComputing(false)
          reject(new Error(event.message))
        }

        worker.addEventListener('message', handleMessage)
        worker.addEventListener('error', handleError)

        worker.postMessage({
          type: 'calculate',
          data,
          settings,
          daysInMonth,
        })
      })
    },
    [],
  )

  const terminate = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    setIsWorkerAvailable(false)
  }, [])

  return {
    calculateAsync,
    isComputing,
    isWorkerAvailable,
    terminate,
  }
}
