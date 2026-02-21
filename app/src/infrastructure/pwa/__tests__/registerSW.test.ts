/**
 * Phase 7.1: Service Worker 登録テスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerServiceWorker } from '../registerSW'

describe('registerServiceWorker', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('serviceWorker 非対応環境では何もしない', () => {
    // navigator.serviceWorker が undefined
    const orig = navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    expect(() => registerServiceWorker()).not.toThrow()

    Object.defineProperty(navigator, 'serviceWorker', {
      value: orig,
      writable: true,
      configurable: true,
    })
  })

  it('serviceWorker 対応環境で load イベントリスナーを登録する', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')

    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: vi.fn().mockResolvedValue({}) },
      writable: true,
      configurable: true,
    })

    registerServiceWorker()

    expect(addSpy).toHaveBeenCalledWith('load', expect.any(Function))
  })
})
