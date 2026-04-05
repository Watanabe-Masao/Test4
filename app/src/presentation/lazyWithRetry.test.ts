import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// sessionStorage mock
const storage = new Map<string, string>()
const sessionStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
}
vi.stubGlobal('sessionStorage', sessionStorageMock)

// window.location.reload mock
const reloadMock = vi.fn()
Object.defineProperty(window, 'location', {
  value: { reload: reloadMock },
  writable: true,
})

describe('lazyWithRetry', () => {
  beforeEach(() => {
    storage.clear()
    reloadMock.mockClear()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should resolve normally when import succeeds', async () => {
    const { lazyWithRetry } = await import('./lazyWithRetry')
    const TestComponent = () => null
    const importFn = vi.fn().mockResolvedValue({ default: TestComponent })

    const LazyComponent = lazyWithRetry(importFn)
    expect(LazyComponent).toBeDefined()
    expect(importFn).toHaveBeenCalledTimes(0)
  })

  it('should detect "Failed to fetch dynamically imported module" as chunk error', async () => {
    const { lazyWithRetry } = await import('./lazyWithRetry')
    const importFn = vi
      .fn()
      .mockRejectedValue(new Error('Failed to fetch dynamically imported module /chunk-abc.js'))

    const LazyComponent = lazyWithRetry(importFn)

    // Trigger the lazy load — React.lazy returns a wrapper that calls importFn when rendered
    // We need to call the internal loader function
    try {
      // Access the internal _payload to trigger the import
      const payload = (
        LazyComponent as unknown as { _payload: { _result: () => Promise<unknown> } }
      )._payload
      if (payload && typeof payload._result === 'function') {
        await payload._result()
      }
    } catch {
      // Expected — the reload will be called
    }

    expect(reloadMock).toHaveBeenCalledTimes(1)
    expect(storage.get('shiire-arari-chunk-reload')).toBe('1')
  })

  it('should detect "Loading chunk" as chunk error', async () => {
    const { lazyWithRetry } = await import('./lazyWithRetry')
    const importFn = vi.fn().mockRejectedValue(new Error('Loading chunk 42 failed'))

    const LazyComponent = lazyWithRetry(importFn)
    try {
      const payload = (
        LazyComponent as unknown as { _payload: { _result: () => Promise<unknown> } }
      )._payload
      if (payload && typeof payload._result === 'function') {
        await payload._result()
      }
    } catch {
      // Expected
    }

    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('should detect "Loading CSS chunk" as chunk error', async () => {
    const { lazyWithRetry } = await import('./lazyWithRetry')
    const importFn = vi.fn().mockRejectedValue(new Error('Loading CSS chunk abc failed'))

    const LazyComponent = lazyWithRetry(importFn)
    try {
      const payload = (
        LazyComponent as unknown as { _payload: { _result: () => Promise<unknown> } }
      )._payload
      if (payload && typeof payload._result === 'function') {
        await payload._result()
      }
    } catch {
      // Expected
    }

    expect(reloadMock).toHaveBeenCalledTimes(1)
  })

  it('should not reload for non-chunk errors', async () => {
    const { lazyWithRetry } = await import('./lazyWithRetry')
    const importFn = vi.fn().mockRejectedValue(new Error('SyntaxError: unexpected token'))

    const LazyComponent = lazyWithRetry(importFn)
    try {
      const payload = (
        LazyComponent as unknown as { _payload: { _result: () => Promise<unknown> } }
      )._payload
      if (payload && typeof payload._result === 'function') {
        await payload._result()
      }
    } catch {
      // Expected — should reject without reload
    }

    expect(reloadMock).not.toHaveBeenCalled()
  })

  it('should prevent infinite reload loop via sessionStorage flag', async () => {
    // Simulate already-reloaded state
    storage.set('shiire-arari-chunk-reload', '1')

    const { lazyWithRetry } = await import('./lazyWithRetry')
    const importFn = vi
      .fn()
      .mockRejectedValue(new Error('Failed to fetch dynamically imported module'))

    const LazyComponent = lazyWithRetry(importFn)
    try {
      const payload = (
        LazyComponent as unknown as { _payload: { _result: () => Promise<unknown> } }
      )._payload
      if (payload && typeof payload._result === 'function') {
        await payload._result()
      }
    } catch {
      // Expected — should reject without reload
    }

    expect(reloadMock).not.toHaveBeenCalled()
    // Flag should be cleaned up
    expect(storage.has('shiire-arari-chunk-reload')).toBe(false)
  })
})
