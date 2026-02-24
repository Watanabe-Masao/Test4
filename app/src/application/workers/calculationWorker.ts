/**
 * Phase 5.2: 計算用 Web Worker
 *
 * メインスレッドをブロックせずに全店舗の計算を実行する。
 * フィンガープリント生成も Worker 内で行い、メインスレッドの
 * 負荷を最小化する。
 *
 * Vite が Worker をモジュールとしてバンドルするため、
 * 通常のインポートパス (@/) が利用可能。
 */
import type { AppSettings, StoreResult, ImportedData } from '@/domain/models'
import { calculateAllStores } from '@/application/usecases/calculation'
import { computeGlobalFingerprint } from '@/application/services/calculationCache'

// ─── Message Protocol ─────────────────────────────────

export interface CalculateRequest {
  type: 'calculate'
  data: ImportedData
  settings: AppSettings
  daysInMonth: number
  requestId?: number
  /** メインスレッド側の最新フィンガープリント（キャッシュ判定用） */
  lastFingerprint?: string
}

export interface CalculateResponse {
  type: 'result'
  results: ReadonlyMap<string, StoreResult>
  /** Worker 内で生成したフィンガープリント */
  fingerprint: string
  requestId?: number
}

/** フィンガープリントが一致した場合のキャッシュヒット応答 */
export interface CacheHitResponse {
  type: 'cache-hit'
  fingerprint: string
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

let cachedFingerprint: string | null = null
let cachedResults: ReadonlyMap<string, StoreResult> | null = null

// ─── Worker Handler ───────────────────────────────────

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { type } = event.data

  if (type === 'calculate') {
    try {
      const { data, settings, daysInMonth, requestId, lastFingerprint } = event.data

      // Worker 内でフィンガープリントを生成
      const fingerprint = computeGlobalFingerprint(data, settings, daysInMonth)

      // メインスレッドから渡されたフィンガープリントと一致すればキャッシュヒット
      if (lastFingerprint && fingerprint === lastFingerprint) {
        const response: CacheHitResponse = { type: 'cache-hit', fingerprint, requestId }
        self.postMessage(response)
        return
      }

      // Worker 内部キャッシュとも比較
      if (fingerprint === cachedFingerprint && cachedResults) {
        const response: CalculateResponse = {
          type: 'result',
          results: cachedResults,
          fingerprint,
          requestId,
        }
        self.postMessage(response)
        return
      }

      // キャッシュミス: 計算実行
      const results = calculateAllStores(data, settings, daysInMonth)

      // Worker 内部キャッシュを更新
      cachedFingerprint = fingerprint
      cachedResults = results

      const response: CalculateResponse = { type: 'result', results, fingerprint, requestId }
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
