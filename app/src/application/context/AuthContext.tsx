/**
 * Phase 7.2: 認証コンテキスト (将来基盤)
 *
 * 将来的なマルチユーザー・クラウド対応の準備として、
 * 認証状態を管理するコンテキストを提供する。
 *
 * 現時点ではローカル単一ユーザーのため、常に匿名ユーザーとして動作する。
 * クラウド連携時に OAuth / JWT 等の実装を差し込む。
 */
import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { AuthContext } from './authContextDef'
import type { User, AuthState, AuthContextValue } from './authContextDef'

// 型の再エクスポート（type-only なので react-refresh 警告を回避）
export type { User, AuthStatus, AuthState, AuthActions, AuthContextValue } from './authContextDef'

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

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    // 将来: API 呼び出しで credentials.email / credentials.password を使用
    void credentials
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
