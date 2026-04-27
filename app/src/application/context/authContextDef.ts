/**
 * AuthContext 定義（型 + createContext）
 *
 * react-refresh/only-export-components 対応のため、
 * createContext と型定義を .ts ファイルに分離。
 * Provider (.tsx) とフック (useAuth.ts) の両方がここからインポートする。
 *
 * @responsibility R:unclassified
 */
import { createContext } from 'react'

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

export interface AuthContextValue extends AuthState, AuthActions {}

// ─── Context ──────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | null>(null)
