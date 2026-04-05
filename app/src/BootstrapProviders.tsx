/**
 * Bootstrap Providers — テーマ + 国際化
 *
 * アプリの見た目と言語を確定する最外層。
 * ビジネスロジックに依存しない。
 */
import { type ReactNode, useState, useCallback } from 'react'
import { ThemeProvider } from 'styled-components'
import { darkTheme, lightTheme, GlobalStyle } from '@/presentation/theme'
import type { ThemeMode } from '@/presentation/theme'
import { I18nProvider } from '@/infrastructure/i18n'
import { ThemeToggleContext } from '@/appContextDefs'

function getInitialTheme(): ThemeMode {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'light') return saved
  }
  return 'dark'
}

interface Props {
  readonly children: ReactNode
}

export function BootstrapProviders({ children }: Props) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme)

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      return next
    })
  }, [])

  const theme = themeMode === 'dark' ? darkTheme : lightTheme

  return (
    <ThemeToggleContext.Provider value={{ mode: themeMode, toggle: toggleTheme }}>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <I18nProvider>{children}</I18nProvider>
      </ThemeProvider>
    </ThemeToggleContext.Provider>
  )
}
