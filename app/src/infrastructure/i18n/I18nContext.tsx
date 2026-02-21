/**
 * Phase 7.3: i18n コンテキスト
 *
 * アプリケーション全体でロケールとメッセージカタログを提供する。
 * 将来的に react-intl や i18next に置き換え可能な薄いラッパー。
 */
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import type { Locale, MessageCatalog } from './messages'
import { MESSAGE_CATALOGS } from './messages'

interface I18nContextValue {
  /** 現在のロケール */
  locale: Locale
  /** メッセージカタログ */
  messages: MessageCatalog
  /** ロケールを変更する */
  setLocale: (locale: Locale) => void
  /** テンプレート文字列のプレースホルダーを置換する */
  t: (template: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const LOCALE_STORAGE_KEY = 'shiire-arari-locale'

function getInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (saved === 'ja' || saved === 'en') return saved
  } catch {
    // ignore
  }
  return 'ja'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
    } catch {
      // ignore
    }
  }, [])

  const messages = MESSAGE_CATALOGS[locale]

  const t = useCallback(
    (template: string, params?: Record<string, string | number>) => {
      if (!params) return template
      return Object.entries(params).reduce(
        (result, [key, value]) => result.replace(`{${key}}`, String(value)),
        template,
      )
    },
    [],
  )

  const value = useMemo<I18nContextValue>(
    () => ({ locale, messages, setLocale, t }),
    [locale, messages, setLocale, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
