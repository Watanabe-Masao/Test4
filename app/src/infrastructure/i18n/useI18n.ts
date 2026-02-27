/**
 * useI18n フック（I18nContext から分離）
 *
 * react-refresh/only-export-components 対応のため、
 * コンポーネント（Provider）とフックを別ファイルに分離。
 */
import { useContext } from 'react'
import { I18nContext } from './i18nContextDef'
import type { I18nContextValue } from './i18nContextDef'

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
