/**
 * Phase 7.3: i18n コンテキスト
 *
 * アプリケーション全体でロケールとメッセージカタログを提供する。
 * 将来的に react-intl や i18next に置き換え可能な薄いラッパー。
 *
 * @responsibility R:unclassified
 */
import { useState, useCallback, useMemo, type ReactNode } from 'react'
import type { Locale } from './messages'
import { MESSAGE_CATALOGS } from './messages'
import { I18nContext } from './i18nContextDef'
import type { I18nContextValue } from './i18nContextDef'

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

  const t = useCallback((template: string, params?: Record<string, string | number>) => {
    if (!params) return template
    return Object.entries(params).reduce(
      (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
      template,
    )
  }, [])

  const value = useMemo<I18nContextValue>(
    () => ({ locale, messages, setLocale, t }),
    [locale, messages, setLocale, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
