/**
 * Phase 5.2: 計算用 Web Worker
 *
 * メインスレッドをブロックせずに全店舗の計算を実行する。
 * Vite が Worker をモジュールとしてバンドルするため、
 * 通常のインポートパス (@/) が利用可能。
 */
import type { AppSettings, StoreResult, ImportedData } from '@/domain/models'
import { calculateAllStores } from '@/application/services/CalculationOrchestrator'

// ─── Message Protocol ─────────────────────────────────

export interface CalculateRequest {
  type: 'calculate'
  data: ImportedData
  settings: AppSettings
  daysInMonth: number
}

export interface CalculateResponse {
  type: 'result'
  results: ReadonlyMap<string, StoreResult>
}

export interface CalculateError {
  type: 'error'
  message: string
}

export type WorkerRequest = CalculateRequest
export type WorkerResponse = CalculateResponse | CalculateError

// ─── Worker Handler ───────────────────────────────────

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { type } = event.data

  if (type === 'calculate') {
    try {
      const { data, settings, daysInMonth } = event.data
      const results = calculateAllStores(data, settings, daysInMonth)

      const response: CalculateResponse = { type: 'result', results }
      self.postMessage(response)
    } catch (err) {
      const response: CalculateError = {
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      }
      self.postMessage(response)
    }
  }
}
