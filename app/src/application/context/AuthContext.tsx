/**
 * Phase 7.2: 認証コンテキスト (将来基盤)
 *
 * 将来的なマルチユーザー・クラウド対応の準備として、
 * 認証状態を管理するコンテキストを提供する。
 *
 * 現時点ではローカル単一ユーザーのため、常に匿名ユーザーとして動作する。
 * クラウド連携時に OAuth / JWT 等の実装を差し込む。
 */
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'

// ─── Types ────────────────────────────────────────────

export interface User {
  readonly id: string
  readonly name: string
  readonly email?: string
  readonly role: 'admin' | 'editor' | 'viewer'
}

export type AuthStatus = 'anonymous' | 'authenticated' | 'loading'

export interface AuthState {
  readonly status: AuthStatus
  readonly user: User | null
}

export interface AuthActions {
  /** ログイン (将来実装) */
  login: (credentials: { email: string; password: string }) => Promise<boolean>
  /** ログアウト (将来実装) */
  logout: () => Promise<void>
  /** 現在のユーザーを取得 */
  getCurrentUser: () => User | null
}

interface AuthContextValue extends AuthState, AuthActions {}

// ─── Context ──────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

const ANONYMOUS_USER: User = {
  id: 'local',
  name: 'ローカルユーザー',
  role: 'admin',
}

// ─── Provider ─────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: 'anonymous',
    user: ANONYMOUS_USER,
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const login = useCallback(async (_credentials: { email: string; password: string }) => {
    // 将来: API 呼び出しを実装
    setState({ status: 'authenticated', user: ANONYMOUS_USER })
    return true
  }, [])

  const logout = useCallback(async () => {
    // 将来: セッション破棄を実装
    setState({ status: 'anonymous', user: ANONYMOUS_USER })
  }, [])

  const getCurrentUser = useCallback(() => state.user, [state.user])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout, getCurrentUser }),
    [state, login, logout, getCurrentUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
