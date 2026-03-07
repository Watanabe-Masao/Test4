/**
 * Phase 7.3: i18n テスト
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { I18nProvider } from '../I18nContext'
import { useI18n } from '../useI18n'

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>

describe('I18nContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('デフォルトロケールは日本語', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })
    expect(result.current.locale).toBe('ja')
    expect(result.current.messages.nav.dashboard).toBe('概要')
  })

  it('ロケールを英語に切り替えできる', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })

    act(() => {
      result.current.setLocale('en')
    })

    expect(result.current.locale).toBe('en')
    expect(result.current.messages.nav.dashboard).toBe('Overview')
  })

  it('テンプレート文字列を置換できる', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })
    const formatted = result.current.t('{count}ファイル', { count: 3 })
    expect(formatted).toBe('3ファイル')
  })

  it('パラメータなしの場合はそのまま返す', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })
    const formatted = result.current.t('テスト文字列')
    expect(formatted).toBe('テスト文字列')
  })

  it('ロケール変更が localStorage に保存される', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })

    act(() => {
      result.current.setLocale('en')
    })

    expect(localStorage.getItem('shiire-arari-locale')).toBe('en')
  })

  it('I18nProvider なしで useI18n を使うとエラー', () => {
    expect(() => {
      renderHook(() => useI18n())
    }).toThrow('useI18n must be used within I18nProvider')
  })
})
