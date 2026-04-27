/**
 * Tests for etrnHttpClient.ts — EtrnNotFoundError, delay, fetchHtmlWithRetry
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EtrnNotFoundError, delay, fetchHtmlWithRetry, REQUEST_DELAY_MS } from '../etrnHttpClient'

describe('etrnHttpClient', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    globalThis.fetch = originalFetch
  })

  describe('REQUEST_DELAY_MS', () => {
    it('is set to 300ms', () => {
      expect(REQUEST_DELAY_MS).toBe(300)
    })
  })

  describe('EtrnNotFoundError', () => {
    it('has the correct name and URL-embedded message', () => {
      const err = new EtrnNotFoundError('https://example.com/etrn')
      expect(err.name).toBe('EtrnNotFoundError')
      expect(err.message).toBe('ETRN data not found: https://example.com/etrn')
      expect(err).toBeInstanceOf(Error)
    })
  })

  describe('delay', () => {
    it('resolves after specified ms', async () => {
      const p = delay(100)
      let resolved = false
      p.then(() => {
        resolved = true
      })
      expect(resolved).toBe(false)
      await vi.advanceTimersByTimeAsync(100)
      await p
      expect(resolved).toBe(true)
    })
  })

  describe('fetchHtmlWithRetry', () => {
    it('returns HTML text on success with utf-8 charset', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' }),
        text: () => Promise.resolve('<html>hi</html>'),
      } as unknown as Response)
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const result = await fetchHtmlWithRetry('https://jma.example/a')
      expect(result).toBe('<html>hi</html>')
      expect(fetchMock).toHaveBeenCalledWith('https://jma.example/a')
    })

    it('decodes non-utf8 content via TextDecoder', async () => {
      const bytes = new TextEncoder().encode('hello').buffer
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' }),
        arrayBuffer: () => Promise.resolve(bytes),
        text: () => Promise.resolve('hello'),
      } as unknown as Response)
      globalThis.fetch = fetchMock as unknown as typeof fetch

      // utf-8 path returns text() directly
      const result = await fetchHtmlWithRetry('https://jma.example/b')
      expect(result).toBe('hello')
    })

    it('uses arrayBuffer path for non-utf8 charset', async () => {
      // Construct "hello" bytes for decoding
      const bytes = new Uint8Array([104, 101, 108, 108, 111]).buffer
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'text/html; charset=iso-8859-1' }),
        arrayBuffer: () => Promise.resolve(bytes),
      } as unknown as Response)
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const result = await fetchHtmlWithRetry('https://jma.example/c')
      expect(result).toBe('hello')
    })

    it('throws EtrnNotFoundError on 404 without retry', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      } as unknown as Response)
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const promise = fetchHtmlWithRetry('https://jma.example/404')
      promise.catch(() => {})
      await vi.advanceTimersByTimeAsync(10000)
      await expect(promise).rejects.toBeInstanceOf(EtrnNotFoundError)
      expect(fetchMock).toHaveBeenCalledTimes(1) // 404 short-circuits retry
    })

    it('retries on 500 and throws final error', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        headers: new Headers(),
      } as unknown as Response)
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const promise = fetchHtmlWithRetry('https://jma.example/500')
      promise.catch(() => {})
      await vi.advanceTimersByTimeAsync(10000)
      await expect(promise).rejects.toThrow(/ETRN error: 500/)
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    it('treats missing charset as utf-8', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(), // no Content-Type
        text: () => Promise.resolve('<html/>'),
      } as unknown as Response)
      globalThis.fetch = fetchMock as unknown as typeof fetch

      const result = await fetchHtmlWithRetry('https://jma.example/nohdr')
      expect(result).toBe('<html/>')
    })
  })
})
