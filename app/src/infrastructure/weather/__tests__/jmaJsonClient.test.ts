/**
 * Tests for jmaJsonClient.ts — fetchJsonWithRetry
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchJsonWithRetry } from '../jmaJsonClient'

describe('fetchJsonWithRetry', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    globalThis.fetch = originalFetch
  })

  it('returns parsed JSON on first success', async () => {
    const fakeJson = { message: 'ok', value: 42 }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(fakeJson),
    } as unknown as Response)
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const result = await fetchJsonWithRetry('https://example.com/x.json', 'Test')
    expect(result).toEqual(fakeJson)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/x.json')
  })

  it('retries on non-ok response and ultimately throws', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: () => Promise.resolve({}),
    } as unknown as Response)
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const promise = fetchJsonWithRetry('https://example.com/y.json', 'Retry')
    // prevent unhandled rejection noise during timer advance
    promise.catch(() => {})
    // advance retry delays: 1000ms after first fail, 2000ms after second
    await vi.advanceTimersByTimeAsync(10000)

    await expect(promise).rejects.toThrow(/JMA Retry API error: 500/)
    expect(fetchMock).toHaveBeenCalledTimes(3) // 1 initial + 2 retries
  })

  it('recovers on second attempt after first failure', async () => {
    const fakeJson = { ok: true }
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(fakeJson),
      } as unknown as Response)
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const promise = fetchJsonWithRetry('https://example.com/z.json', 'Recover')
    await vi.advanceTimersByTimeAsync(2000)
    const result = await promise
    expect(result).toEqual(fakeJson)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws last error when all retries fail with rejected fetch', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const promise = fetchJsonWithRetry('https://example.com/err.json', 'Err')
    // prevent unhandled rejection warning
    promise.catch(() => {})
    await vi.advanceTimersByTimeAsync(10000)
    await expect(promise).rejects.toThrow('offline')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('wraps non-Error thrown values as Error objects', async () => {
    const fetchMock = vi.fn().mockImplementation(() => {
      throw 'string error'
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const promise = fetchJsonWithRetry('https://example.com/q.json', 'Wrap')
    promise.catch(() => {})
    await vi.advanceTimersByTimeAsync(10000)
    await expect(promise).rejects.toThrow('string error')
  })
})
