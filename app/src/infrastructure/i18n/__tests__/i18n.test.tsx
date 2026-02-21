/**
 * Phase 7.3: i18n テスト
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { I18nProvider, useI18n } from '../I18nContext'
import { jaMessages, enMessages, MESSAGE_CATALOGS } from '../messages'

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
)

describe('メッセージカタログ', () => {
  it('日本語と英語の両方が定義されている', () => {
    expect(MESSAGE_CATALOGS.ja).toBeDefined()
    expect(MESSAGE_CATALOGS.en).toBeDefined()
  })

  it('日本語カタログの全セクションが存在する', () => {
    expect(jaMessages.nav).toBeDefined()
    expect(jaMessages.common).toBeDefined()
    expect(jaMessages.dashboard).toBeDefined()
    expect(jaMessages.calculation).toBeDefined()
    expect(jaMessages.import).toBeDefined()
    expect(jaMessages.format).toBeDefined()
    expect(jaMessages.categories).toBeDefined()
  })

  it('英語カタログの全セクションが存在する', () => {
    expect(enMessages.nav).toBeDefined()
    expect(enMessages.common).toBeDefined()
    expect(enMessages.dashboard).toBeDefined()
    expect(enMessages.calculation).toBeDefined()
    expect(enMessages.import).toBeDefined()
    expect(enMessages.format).toBeDefined()
    expect(enMessages.categories).toBeDefined()
  })

  it('日本語と英語でキーが一致する', () => {
    const jaKeys = Object.keys(jaMessages.nav).sort()
    const enKeys = Object.keys(enMessages.nav).sort()
    expect(jaKeys).toEqual(enKeys)

    const jaCommonKeys = Object.keys(jaMessages.common).sort()
    const enCommonKeys = Object.keys(enMessages.common).sort()
    expect(jaCommonKeys).toEqual(enCommonKeys)
  })
})

describe('I18nContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('デフォルトロケールは日本語', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })
    expect(result.current.locale).toBe('ja')
    expect(result.current.messages.nav.dashboard).toBe('ダッシュボード')
  })

  it('ロケールを英語に切り替えできる', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })

    act(() => {
      result.current.setLocale('en')
    })

    expect(result.current.locale).toBe('en')
    expect(result.current.messages.nav.dashboard).toBe('Dashboard')
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
