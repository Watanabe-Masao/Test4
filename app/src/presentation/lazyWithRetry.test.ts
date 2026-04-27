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

/**
 * React.lazy の内部構造を使って import を発火させるヘルパー。
 * _init(_payload) を呼ぶと React.lazy が import を開始する。
 * chunk error 時は never-resolving Promise を返すため await しない。
 *
 * @taxonomyKind T:render-shape
 */
function triggerLazyLoad(LazyComponent: unknown): void {
  const comp = LazyComponent as { _init: (payload: unknown) => void; _payload: unknown }
  try {
    comp._init(comp._payload)
  } catch {
    // React.lazy は pending 状態で throw するが、import は発火済み
  }
}

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
    triggerLazyLoad(LazyComponent)

    // reload は catch 内で非同期に呼ばれるので waitFor で待つ
    await vi.waitFor(() => {
      expect(reloadMock).toHaveBeenCalledTimes(1)
    })
    expect(storage.get('shiire-arari-chunk-reload')).toBe('1')
  })

  it('should detect "Loading chunk" as chunk error', async () => {
    const { lazyWithRetry } = await import('./lazyWithRetry')
    const importFn = vi.fn().mockRejectedValue(new Error('Loading chunk 42 failed'))

    const LazyComponent = lazyWithRetry(importFn)
    triggerLazyLoad(LazyComponent)

    await vi.waitFor(() => {
      expect(reloadMock).toHaveBeenCalledTimes(1)
    })
  })

  it('should detect "Loading CSS chunk" as chunk error', async () => {
    const { lazyWithRetry } = await import('./lazyWithRetry')
    const importFn = vi.fn().mockRejectedValue(new Error('Loading CSS chunk abc failed'))

    const LazyComponent = lazyWithRetry(importFn)
    triggerLazyLoad(LazyComponent)

    await vi.waitFor(() => {
      expect(reloadMock).toHaveBeenCalledTimes(1)
    })
  })

  it('should not reload for non-chunk errors', async () => {
    const { lazyWithRetry } = await import('./lazyWithRetry')
    const importFn = vi.fn().mockRejectedValue(new Error('SyntaxError: unexpected token'))

    const LazyComponent = lazyWithRetry(importFn)
    triggerLazyLoad(LazyComponent)

    // 少し待っても reload が呼ばれないことを確認
    await new Promise((r) => setTimeout(r, 50))
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
    triggerLazyLoad(LazyComponent)

    // 少し待っても reload が呼ばれないことを確認（2回目はリロードしない）
    await new Promise((r) => setTimeout(r, 50))
    expect(reloadMock).not.toHaveBeenCalled()
    // Flag should be cleaned up
    expect(storage.has('shiire-arari-chunk-reload')).toBe(false)
  })
})
