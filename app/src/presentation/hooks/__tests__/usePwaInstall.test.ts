/**
 * Phase 7.1: PWA インストールフック テスト
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePwaInstall } from '../usePwaInstall'

beforeEach(() => {
  // matchMedia モック
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('usePwaInstall', () => {
  it('初期状態では canInstall=false, isInstalled=false', () => {
    const { result } = renderHook(() => usePwaInstall())
    expect(result.current.canInstall).toBe(false)
    expect(result.current.isInstalled).toBe(false)
  })

  it('スタンドアロンモードなら isInstalled=true', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    const { result } = renderHook(() => usePwaInstall())
    expect(result.current.isInstalled).toBe(true)
  })

  it('beforeinstallprompt イベントで canInstall=true', () => {
    const { result } = renderHook(() => usePwaInstall())

    act(() => {
      const event = new Event('beforeinstallprompt')
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() })
      window.dispatchEvent(event)
    })

    expect(result.current.canInstall).toBe(true)
  })

  it('appinstalled イベントで isInstalled=true', () => {
    const { result } = renderHook(() => usePwaInstall())

    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })

    expect(result.current.isInstalled).toBe(true)
    expect(result.current.canInstall).toBe(false)
  })

  it('promptInstall がイベントなしで false を返す', async () => {
    const { result } = renderHook(() => usePwaInstall())
    let accepted: boolean | undefined

    await act(async () => {
      accepted = await result.current.promptInstall()
    })

    expect(accepted).toBe(false)
  })
})
