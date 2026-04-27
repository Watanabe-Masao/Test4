/**
 * Phase 5.2: 計算用 Web Worker
 *
 * メインスレッドをブロックせずに全店舗の計算を実行する。
 * dataVersion ベースの軽量キャッシュキーで判定し、
 * メインスレッドの負荷を最小化する。
 *
 * Vite が Worker をモジュールとしてバンドルするため、
 * 通常のインポートパス (@/) が利用可能。
 *
 * @responsibility R:unclassified
 */
import type { AppSettings, StoreResult } from '@/domain/models/storeTypes'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { CalculationFrame } from '@/domain/models/CalculationFrame'
import { calculateAllStores } from '@/application/usecases/calculation'
import { computeCacheKey } from '@/application/services/calculationCache'

// ─── Message Protocol ─────────────────────────────────

export interface CalculateRequest {
  type: 'calculate'
  data: MonthlyData
  dataVersion: number
  settings: AppSettings
  frame: CalculationFrame
  requestId?: number
  /** メインスレッド側の最新キャッシュキー（キャッシュ判定用） */
  lastCacheKey?: string
}

export interface CalculateResponse {
  type: 'result'
  results: ReadonlyMap<string, StoreResult>
  /** Worker 内で生成したキャッシュキー */
  cacheKey: string
  requestId?: number
}

/** キャッシュキーが一致した場合のキャッシュヒット応答 */
export interface CacheHitResponse {
  type: 'cache-hit'
  cacheKey: string
  requestId?: number
}

export interface CalculateError {
  type: 'error'
  message: string
  requestId?: number
}

export type WorkerRequest = CalculateRequest
export type WorkerResponse = CalculateResponse | CacheHitResponse | CalculateError

// ─── Worker 内部キャッシュ ────────────────────────────

let cachedCacheKey: string | null = null
let cachedResults: ReadonlyMap<string, StoreResult> | null = null

// ─── Worker Handler ───────────────────────────────────

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { type } = event.data

  if (type === 'calculate') {
    try {
      const { data, dataVersion, settings, frame, requestId, lastCacheKey } = event.data

      // Worker 内で軽量キャッシュキーを生成（O(1) — filter/serialize なし）
      const cacheKey = computeCacheKey(dataVersion, settings, frame)

      // メインスレッドから渡されたキャッシュキーと一致すればキャッシュヒット
      if (lastCacheKey && cacheKey === lastCacheKey) {
        const response: CacheHitResponse = { type: 'cache-hit', cacheKey, requestId }
        self.postMessage(response)
        return
      }

      // Worker 内部キャッシュとも比較
      if (cacheKey === cachedCacheKey && cachedResults) {
        const response: CalculateResponse = {
          type: 'result',
          results: cachedResults,
          cacheKey,
          requestId,
        }
        self.postMessage(response)
        return
      }

      // キャッシュミス: 計算実行
      const results = calculateAllStores(data, settings, frame)

      // Worker 内部キャッシュを更新
      cachedCacheKey = cacheKey
      cachedResults = results

      const response: CalculateResponse = { type: 'result', results, cacheKey, requestId }
      self.postMessage(response)
    } catch (err) {
      const response: CalculateError = {
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
        requestId: event.data.requestId,
      }
      self.postMessage(response)
    }
  }
}
