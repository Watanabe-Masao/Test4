/**
 * Phase 7.2: AuthContext テスト
 */
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import type { ReactNode } from 'react'

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('AuthContext', () => {
  it('初期状態は anonymous でローカルユーザー', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.status).toBe('anonymous')
    expect(result.current.user).not.toBeNull()
    expect(result.current.user?.id).toBe('local')
    expect(result.current.user?.name).toBe('ローカルユーザー')
    expect(result.current.user?.role).toBe('admin')
  })

  it('getCurrentUser が現在のユーザーを返す', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    const user = result.current.getCurrentUser()
    expect(user?.id).toBe('local')
  })

  it('login で authenticated 状態になる', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      const success = await result.current.login({ email: 'test@test.com', password: 'pass' })
      expect(success).toBe(true)
    })

    expect(result.current.status).toBe('authenticated')
  })

  it('logout で anonymous に戻る', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.login({ email: 'test@test.com', password: 'pass' })
    })
    expect(result.current.status).toBe('authenticated')

    await act(async () => {
      await result.current.logout()
    })
    expect(result.current.status).toBe('anonymous')
  })

  it('AuthProvider なしで useAuth を使うとエラー', () => {
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within AuthProvider')
  })
})
