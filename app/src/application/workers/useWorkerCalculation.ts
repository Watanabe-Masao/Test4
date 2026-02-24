/**
 * Phase 5.2: Web Worker 計算フック
 *
 * 計算処理を Web Worker にオフロードし、メインスレッドの
 * ブロッキングを防止する。Worker 非対応環境では同期フォールバック。
 *
 * Worker 内でフィンガープリントも生成し、キャッシュヒット判定を
 * メインスレッドから分離する。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppSettings, StoreResult, ImportedData } from '@/domain/models'
import type { WorkerResponse } from './calculationWorker'
import { calculateAllStores } from '@/application/usecases/calculation'
import { computeGlobalFingerprint } from '@/application/services/calculationCache'

/** Worker 計算結果（新規計算 or キャッシュヒット） */
export type WorkerCalculateResult =
  | { results: ReadonlyMap<string, StoreResult>; fingerprint: string }
  | { cacheHit: true; fingerprint: string }

interface WorkerCalculationResult {
  /** Worker を使った非同期計算（フィンガープリント付き結果を返す） */
  calculateAsync: (
    data: ImportedData,
    settings: AppSettings,
    daysInMonth: number,
    lastFingerprint?: string,
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
      lastFingerprint?: string,
    ): Promise<WorkerCalculateResult> => {
      if (!worker) {
        // フォールバック: 同期計算 + フィンガープリント生成
        const fingerprint = computeGlobalFingerprint(data, settings, daysInMonth)
        if (lastFingerprint && fingerprint === lastFingerprint) {
          return Promise.resolve({ cacheHit: true as const, fingerprint })
        }
        const results = calculateAllStores(data, settings, daysInMonth)
        return Promise.resolve({ results, fingerprint })
      }

      // リクエストIDで応答を識別し、並行計算時のクロスコンタミを防止
      const thisRequestId = ++requestIdRef.current
      setIsComputing(true)

      return new Promise((resolve, reject) => {
        const handleMessage = (event: MessageEvent<WorkerResponse>) => {
          // 自分のリクエストの応答でなければ無視
          if (event.data.requestId !== thisRequestId) return

          worker.removeEventListener('message', handleMessage)
          worker.removeEventListener('error', handleError)
          setIsComputing(false)

          if (event.data.type === 'result') {
            resolve({ results: event.data.results, fingerprint: event.data.fingerprint })
          } else if (event.data.type === 'cache-hit') {
            resolve({ cacheHit: true as const, fingerprint: event.data.fingerprint })
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
          requestId: thisRequestId,
          lastFingerprint,
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
