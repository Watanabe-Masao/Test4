import { ThemeProvider } from 'styled-components'
import { useState, useCallback, createContext, useContext } from 'react'
import { darkTheme, lightTheme, GlobalStyle } from '@/presentation/theme'
import type { ThemeMode } from '@/presentation/theme'
import { AppStateProvider, useAppUi, useAppDispatch } from '@/application/context'
import { AppShell, NavBar } from '@/presentation/components/Layout'
import { ToastProvider } from '@/presentation/components/common'
import { DataManagementSidebar } from '@/presentation/components/DataManagementSidebar'
import { DashboardPage } from '@/presentation/pages/Dashboard/DashboardPage'
import { DailyPage } from '@/presentation/pages/Daily/DailyPage'
import { AnalysisPage } from '@/presentation/pages/Analysis/AnalysisPage'
import { CategoryPage } from '@/presentation/pages/Category/CategoryPage'
import { SummaryPage } from '@/presentation/pages/Summary/SummaryPage'
import { ForecastPage } from '@/presentation/pages/Forecast/ForecastPage'
import { ReportsPage } from '@/presentation/pages/Reports/ReportsPage'
import type { ViewType } from '@/domain/models'

// ─── テーマトグルコンテキスト ────────────────────────────────
const ThemeToggleContext = createContext<{ mode: ThemeMode; toggle: () => void }>({
  mode: 'dark',
  toggle: () => {},
})
export const useThemeToggle = () => useContext(ThemeToggleContext)

function getInitialTheme(): ThemeMode {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'light') return saved
  }
  return 'dark'
}

function ViewRouter({ view }: { view: ViewType }) {
  switch (view) {
    case 'dashboard':
      return <DashboardPage />
    case 'daily':
      return <DailyPage />
    case 'analysis':
      return <AnalysisPage />
    case 'category':
      return <CategoryPage />
    case 'summary':
      return <SummaryPage />
    case 'forecast':
      return <ForecastPage />
    case 'reports':
      return <ReportsPage />
    default:
      return <DashboardPage />
  }
}

function AppContent() {
  const ui = useAppUi()
  const dispatch = useAppDispatch()
  const { mode, toggle } = useThemeToggle()

  const handleViewChange = useCallback(
    (view: ViewType) => {
      dispatch({ type: 'SET_CURRENT_VIEW', payload: view })
    },
    [dispatch],
  )

  return (
    <AppShell
      nav={
        <NavBar
          currentView={ui.currentView}
          onViewChange={handleViewChange}
          themeMode={mode}
          onThemeToggle={toggle}
        />
      }
      sidebar={<DataManagementSidebar />}
    >
      <ViewRouter view={ui.currentView} />
    </AppShell>
  )
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
    <ThemeToggleContext.Provider value={{ mode: themeMode, toggle: toggleTheme }}>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <AppStateProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AppStateProvider>
      </ThemeProvider>
    </ThemeToggleContext.Provider>
  )
}

export default App
