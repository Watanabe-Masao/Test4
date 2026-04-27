/**
 * Service Worker 登録テスト
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { registerServiceWorker } from '../registerSW'

function createMockSWContainer(controller: unknown = null) {
  return {
    register: vi.fn().mockResolvedValue({ update: vi.fn() }),
    controller,
    addEventListener: vi.fn(),
  }
}

describe('registerServiceWorker', () => {
  const origDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    if (origDescriptor) {
      Object.defineProperty(navigator, 'serviceWorker', origDescriptor)
    }
  })

  it('serviceWorker 非対応環境では何もしない', () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    // navigator.serviceWorker が falsy なので何もせず return
    expect(() => registerServiceWorker()).not.toThrow()
  })

  it('serviceWorker 対応環境で load イベントリスナーを登録する', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')

    Object.defineProperty(navigator, 'serviceWorker', {
      value: createMockSWContainer(),
      writable: true,
      configurable: true,
    })

    registerServiceWorker()

    expect(addSpy).toHaveBeenCalledWith('load', expect.any(Function))
  })

  it('controllerchange リスナーを登録する', () => {
    const mockSW = createMockSWContainer()

    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockSW,
      writable: true,
      configurable: true,
    })

    registerServiceWorker()

    expect(mockSW.addEventListener).toHaveBeenCalledWith('controllerchange', expect.any(Function))
  })

  it('updateViaCache: none で SW を登録する', () => {
    const mockSW = createMockSWContainer()
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'load') (handler as EventListener)(new Event('load'))
    })

    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockSW,
      writable: true,
      configurable: true,
    })

    registerServiceWorker()

    // import.meta.env.BASE_URL は vitest では '/' がデフォルト
    expect(mockSW.register).toHaveBeenCalledWith(expect.stringContaining('sw.js'), {
      updateViaCache: 'none',
    })
  })
})
