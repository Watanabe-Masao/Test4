import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIntersectionObserver } from '../useIntersectionObserver'

// IntersectionObserver のモック
let observerCallback: (entries: Partial<IntersectionObserverEntry>[]) => void
let mockObserve: ReturnType<typeof vi.fn>
let mockDisconnect: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockObserve = vi.fn()
  mockDisconnect = vi.fn()

  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {
        observerCallback = callback
      }
      observe = mockObserve
      disconnect = mockDisconnect
      unobserve = vi.fn()
    },
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useIntersectionObserver', () => {
  it('初期状態では isIntersecting=false, hasBeenVisible=false', () => {
    const { result } = renderHook(() => useIntersectionObserver())
    expect(result.current.isIntersecting).toBe(false)
    expect(result.current.hasBeenVisible).toBe(false)
  })

  it('ref を呼ぶとオブザーバーが開始される', () => {
    const { result } = renderHook(() => useIntersectionObserver())
    const div = document.createElement('div')

    act(() => {
      result.current.ref(div)
    })

    expect(mockObserve).toHaveBeenCalledWith(div)
  })

  it('要素がビューポートに入ると isIntersecting=true になる', () => {
    const { result } = renderHook(() =>
      useIntersectionObserver({ freezeOnceVisible: false }),
    )
    const div = document.createElement('div')

    act(() => {
      result.current.ref(div)
    })

    act(() => {
      observerCallback([{ isIntersecting: true }])
    })

    expect(result.current.isIntersecting).toBe(true)
    expect(result.current.hasBeenVisible).toBe(true)
  })

  it('要素がビューポートを離れると isIntersecting=false になる (freeze=false)', () => {
    const { result } = renderHook(() =>
      useIntersectionObserver({ freezeOnceVisible: false }),
    )
    const div = document.createElement('div')

    act(() => {
      result.current.ref(div)
    })

    act(() => {
      observerCallback([{ isIntersecting: true }])
    })
    expect(result.current.isIntersecting).toBe(true)

    act(() => {
      observerCallback([{ isIntersecting: false }])
    })
    expect(result.current.isIntersecting).toBe(false)
    // hasBeenVisible は true のまま
    expect(result.current.hasBeenVisible).toBe(true)
  })

  it('freezeOnceVisible=true の場合、一度表示されたら監視を停止する', () => {
    const { result } = renderHook(() =>
      useIntersectionObserver({ freezeOnceVisible: true }),
    )
    const div = document.createElement('div')

    act(() => {
      result.current.ref(div)
    })

    act(() => {
      observerCallback([{ isIntersecting: true }])
    })

    expect(result.current.hasBeenVisible).toBe(true)
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('ref(null) で監視を解除する', () => {
    const { result } = renderHook(() => useIntersectionObserver())
    const div = document.createElement('div')

    act(() => {
      result.current.ref(div)
    })
    expect(mockObserve).toHaveBeenCalled()

    act(() => {
      result.current.ref(null)
    })
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('デフォルト rootMargin は 200px', () => {
    const { result } = renderHook(() => useIntersectionObserver())
    // ref を呼ぶことで IntersectionObserver が生成される
    const div = document.createElement('div')
    act(() => {
      result.current.ref(div)
    })
    // IntersectionObserver が呼ばれたことの確認
    expect(mockObserve).toHaveBeenCalledTimes(1)
  })
})
