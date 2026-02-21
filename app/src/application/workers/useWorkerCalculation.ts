/**
 * Phase 5.2: Web Worker 計算フック
 *
 * 計算処理を Web Worker にオフロードし、メインスレッドの
 * ブロッキングを防止する。Worker 非対応環境では同期フォールバック。
 */
import { useCallback, useEffect, useState } from 'react'
import type { AppSettings, StoreResult, ImportedData } from '@/domain/models'
import type { WorkerResponse } from './calculationWorker'
import { calculateAllStores } from '@/application/services/CalculationOrchestrator'

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
  const [isComputing, setIsComputing] = useState(false)

  // Worker インスタンスを useState で管理し、useEffect 内の同期的 setState と
  // useRef のレンダー中アクセスを回避する
  const [worker, setWorker] = useState<Worker | null>(() => {
    try {
      return new Worker(
        new URL('./calculationWorker.ts', import.meta.url),
        { type: 'module' },
      )
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

  const calculateAsync = useCallback(
    (
      data: ImportedData,
      settings: AppSettings,
      daysInMonth: number,
    ): Promise<ReadonlyMap<string, StoreResult>> => {
      if (!worker) {
        // フォールバック: 同期計算（静的 import で統一し、チャンク分割の重複を回避）
        return Promise.resolve(calculateAllStores(data, settings, daysInMonth))
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
    [worker],
  )

  const terminate = useCallback(() => {
    worker?.terminate()
    setWorker(null)
  }, [worker])

  return {
    calculateAsync,
    isComputing,
    isWorkerAvailable,
    terminate,
  }
}
