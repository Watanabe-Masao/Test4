/**
 * useAuth フック（AuthContext から分離）
 *
 * react-refresh/only-export-components 対応のため、
 * コンポーネント（Provider）とフックを別ファイルに分離。
 *
 * @responsibility R:unclassified
 */
import { useContext } from 'react'
import { AuthContext } from './authContextDef'
import type { AuthContextValue } from './authContextDef'

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
