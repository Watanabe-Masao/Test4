import { ThemeProvider } from 'styled-components'
import { useState, useCallback } from 'react'
import { darkTheme, lightTheme, GlobalStyle } from '@/presentation/theme'
import type { ThemeMode } from '@/presentation/theme'

function getInitialTheme(): ThemeMode {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'light') return saved
  }
  return 'dark'
}

function App() {
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
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>仕入荒利管理システム</h1>
        <p style={{ color: theme.colors.text2, marginTop: '8px' }}>
          Phase 1: プロジェクト基盤構築完了
        </p>
        <button
          onClick={toggleTheme}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            borderRadius: theme.radii.md,
            border: `1px solid ${theme.colors.border}`,
            background: theme.colors.bg3,
            color: theme.colors.text,
            cursor: 'pointer',
            fontFamily: theme.typography.fontFamily.primary,
          }}
        >
          {themeMode === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
    </ThemeProvider>
  )
}

export default App
