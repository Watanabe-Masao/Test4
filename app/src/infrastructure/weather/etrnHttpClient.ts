/**
 * ETRN HTTP クライアントユーティリティ
 *
 * HTML 取得・リトライ・文字コード変換を担当する。
 *
 * @responsibility R:unclassified
 */

/** JMA サーバーへの配慮 — リクエスト間隔 (ms) */
export const REQUEST_DELAY_MS = 300

const WEATHER_DEBUG = import.meta.env.DEV

function weatherDebug(...args: unknown[]) {
  if (!WEATHER_DEBUG) return
  console.debug(...args)
}

/** リトライ設定 */
const MAX_RETRIES = 2
const INITIAL_RETRY_DELAY_MS = 1000

export class EtrnNotFoundError extends Error {
  constructor(url: string) {
    super(`ETRN data not found: ${url}`)
    this.name = 'EtrnNotFoundError'
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchHtmlWithRetry(url: string): Promise<string> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        weatherDebug('[Weather:ETRN] リトライ %d/%d: %s', attempt, MAX_RETRIES, url)
      }
      const response = await fetch(url)
      weatherDebug('[Weather:ETRN] HTTP %d %s ← %s', response.status, response.statusText, url)
      if (!response.ok) {
        if (response.status === 404) {
          throw new EtrnNotFoundError(url)
        }
        throw new Error(`ETRN error: ${response.status} ${response.statusText}`)
      }

      const contentType = response.headers.get('Content-Type') ?? ''
      const charsetMatch = contentType.match(/charset=([^\s;]+)/i)
      const charset = (charsetMatch?.[1] ?? 'utf-8').toLowerCase()

      if (charset === 'utf-8') {
        return await response.text()
      }

      const buffer = await response.arrayBuffer()
      return new TextDecoder(charset).decode(buffer)
    } catch (e) {
      if (e instanceof EtrnNotFoundError) throw e
      lastError = e instanceof Error ? e : new Error(String(e))
      console.warn(
        '[Weather:ETRN] リクエスト失敗 (attempt=%d): %s — %s',
        attempt,
        url,
        lastError.message,
      )
      if (attempt < MAX_RETRIES) {
        await delay(INITIAL_RETRY_DELAY_MS * 2 ** attempt)
      }
    }
  }

  throw lastError ?? new Error('ETRN request failed')
}
