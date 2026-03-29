/**
 * アプリケーション全体の Provider ツリー
 *
 * テーマ、i18n、認証、リポジトリ、ライフサイクル、ルーター、トーストを重ねる。
 * App.tsx からの分離で、Provider 構成の変更が一箇所に集約される。
 */
import { type ReactNode, useState, useCallback } from 'react'
import { ThemeProvider } from 'styled-components'
import { HashRouter } from 'react-router-dom'
import { darkTheme, lightTheme, GlobalStyle } from '@/presentation/theme'
import type { ThemeMode } from '@/presentation/theme'
import { RepositoryProvider, PersistenceProvider } from '@/application/context'
import { AdapterProvider } from '@/application/context/AdapterProvider'
import { AppLifecycleProvider } from '@/application/lifecycle'
import { ToastProvider } from '@/presentation/components/common/feedback'
import { I18nProvider } from '@/infrastructure/i18n'
import { AuthProvider } from '@/application/context/AuthContext'
import { indexedDBRepository } from '@/infrastructure/storage/IndexedDBRepository'
import { weatherAdapter } from '@/application/adapters/weatherAdapter'
import { backupAdapter } from '@/application/adapters/backupAdapter'
import { fileSystemAdapter } from '@/application/adapters/fileSystemAdapter'
import { storagePersistenceAdapter } from '@/application/adapters/storagePersistenceAdapter'
import type { AdapterSet } from '@/application/context/adapterContextDef'

const adapters: AdapterSet = {
  weather: weatherAdapter,
  backup: backupAdapter,
  fileSystem: fileSystemAdapter,
  storagePersistence: storagePersistenceAdapter,
}
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

export function AppProviders({ children }: Props) {
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
        <I18nProvider>
          <AuthProvider>
            <RepositoryProvider repository={indexedDBRepository}>
              <AdapterProvider adapters={adapters}>
                <PersistenceProvider>
                  <AppLifecycleProvider>
                    <HashRouter>
                      <ToastProvider>{children}</ToastProvider>
                    </HashRouter>
                  </AppLifecycleProvider>
                </PersistenceProvider>
              </AdapterProvider>
            </RepositoryProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </ThemeToggleContext.Provider>
  )
}
