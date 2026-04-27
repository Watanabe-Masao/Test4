/**
 * 気象庁 JSON API ユーティリティ
 *
 * JSON レスポンスの取得・リトライを担当する。
 *
 * @responsibility R:unclassified
 */

/** リトライ設定 */
const MAX_RETRIES = 2
const INITIAL_RETRY_DELAY_MS = 1000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchJsonWithRetry(url: string, tag: string): Promise<unknown> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.debug('[Weather:%s] リトライ %d/%d: %s', tag, attempt, MAX_RETRIES, url)
      }
      const response = await fetch(url)
      console.debug('[Weather:%s] HTTP %d %s ← %s', tag, response.status, response.statusText, url)
      if (!response.ok) {
        throw new Error(`JMA ${tag} API error: ${response.status} ${response.statusText}`)
      }
      return await response.json()
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      console.warn(
        '[Weather:%s] リクエスト失敗 (attempt=%d): %s — %s',
        tag,
        attempt,
        url,
        lastError.message,
      )
      if (attempt < MAX_RETRIES) {
        await delay(INITIAL_RETRY_DELAY_MS * 2 ** attempt)
      }
    }
  }
  throw lastError ?? new Error(`JMA ${tag} API request failed`)
}
