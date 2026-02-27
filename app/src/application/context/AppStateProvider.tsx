/**
 * AppStateProvider — Zustand バックワード互換ラッパー
 *
 * Zustand はグローバルストアのため Provider 不要だが、
 * 既存の <AppStateProvider> ラッパーとの互換性を維持する。
 */
import type { ReactNode } from 'react'

export function AppStateProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}
