/**
 * Phase 5.2: Web Worker 計算フック
 *
 * 計算処理を Web Worker にオフロードし、メインスレッドの
 * ブロッキングを防止する。Worker 非対応環境では同期フォールバック。
 *
 * dataVersion ベースの軽量キャッシュキーでキャッシュヒット判定を行う。
 *
 * @responsibility R:unclassified
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppSettings, StoreResult } from '@/domain/models/storeTypes'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { CalculationFrame } from '@/domain/models/CalculationFrame'
import type { WorkerResponse } from './calculationWorker'
import { calculateAllStores } from '@/application/usecases/calculation'
import { computeCacheKey } from '@/application/services/calculationCache'

/** Worker 計算のタイムアウト（ミリ秒） */
const WORKER_TIMEOUT_MS = 30_000

/** Worker 計算結果（新規計算 or キャッシュヒット） */
export type WorkerCalculateResult =
  | { results: ReadonlyMap<string, StoreResult>; cacheKey: string }
  | { cacheHit: true; cacheKey: string }

interface WorkerCalculationResult {
  /** Worker を使った非同期計算（cacheKey 付き結果を返す） */
  calculateAsync: (
    data: MonthlyData,
    dataVersion: number,
    settings: AppSettings,
    frame: CalculationFrame,
    lastCacheKey?: string,
  ) => Promise<WorkerCalculateResult>
  /** 計算中フラグ */
  isComputing: boolean
  /** Worker が利用可能か */
  isWorkerAvailable: boolean
  /** Worker を終了する */
  terminate: () => void
}

export function useWorkerCalculation(): WorkerCalculationResult {
  const [isComputing, setIsComputing] = useState(false)
  const requestIdRef = useRef(0)

  // Worker インスタンスを useState で管理し、useEffect 内の同期的 setState と
  // useRef のレンダー中アクセスを回避する
  const [worker, setWorker] = useState<Worker | null>(() => {
    try {
      return new Worker(new URL('./calculationWorker.ts', import.meta.url), { type: 'module' })
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
      data: MonthlyData,
      dataVersion: number,
      settings: AppSettings,
      frame: CalculationFrame,
      lastCacheKey?: string,
    ): Promise<WorkerCalculateResult> => {
      if (!worker) {
        // フォールバック: 同期計算 + cacheKey 生成
        const cacheKey = computeCacheKey(dataVersion, settings, frame)
        if (lastCacheKey && cacheKey === lastCacheKey) {
          return Promise.resolve({ cacheHit: true as const, cacheKey })
        }
        const results = calculateAllStores(data, settings, frame)
        return Promise.resolve({ results, cacheKey })
      }

      // リクエストIDで応答を識別し、並行計算時のクロスコンタミを防止
      const thisRequestId = ++requestIdRef.current
      setIsComputing(true)

      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          worker.removeEventListener('message', handleMessage)
          worker.removeEventListener('error', handleError)
          setIsComputing(false)
          reject(new Error('[Worker] 計算がタイムアウトしました（30秒）'))
        }, WORKER_TIMEOUT_MS)

        const handleMessage = (event: MessageEvent<WorkerResponse>) => {
          // 自分のリクエストの応答でなければ無視
          if (event.data.requestId !== thisRequestId) return

          clearTimeout(timeoutId)
          worker.removeEventListener('message', handleMessage)
          worker.removeEventListener('error', handleError)
          setIsComputing(false)

          if (event.data.type === 'result') {
            resolve({ results: event.data.results, cacheKey: event.data.cacheKey })
          } else if (event.data.type === 'cache-hit') {
            resolve({ cacheHit: true as const, cacheKey: event.data.cacheKey })
          } else {
            reject(new Error(event.data.message))
          }
        }

        const handleError = (event: ErrorEvent) => {
          clearTimeout(timeoutId)
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
          dataVersion,
          settings,
          frame,
          requestId: thisRequestId,
          lastCacheKey,
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
