/**
 * I18nContext 定義（型 + createContext）
 *
 * react-refresh/only-export-components 対応のため、
 * createContext と型定義を .ts ファイルに分離。
 */
import { createContext } from 'react'
import type { Locale, MessageCatalog } from './messages'

export interface I18nContextValue {
  /** 現在のロケール */
  locale: Locale
  /** メッセージカタログ */
  messages: MessageCatalog
  /** ロケールを変更する */
  setLocale: (locale: Locale) => void
  /** テンプレート文字列のプレースホルダーを置換する */
  t: (template: string, params?: Record<string, string | number>) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null)
