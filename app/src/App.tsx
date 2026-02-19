import { ThemeProvider } from 'styled-components'
import { useState, useCallback, useMemo, createContext, useContext } from 'react'
import { darkTheme, lightTheme, GlobalStyle } from '@/presentation/theme'
import type { ThemeMode } from '@/presentation/theme'
import { AppStateProvider, useAppUi, useAppDispatch } from '@/application/context'
import { AppShell, NavBar } from '@/presentation/components/Layout'
import { ToastProvider, useToast } from '@/presentation/components/common'
import { DataManagementSidebar } from '@/presentation/components/DataManagementSidebar'
import { useKeyboardShortcuts, useUndoRedo, useCalculation } from '@/application/hooks'
import { DashboardPage } from '@/presentation/pages/Dashboard/DashboardPage'
import { DailyPage } from '@/presentation/pages/Daily/DailyPage'
import { AnalysisPage } from '@/presentation/pages/Analysis/AnalysisPage'
import { CategoryPage } from '@/presentation/pages/Category/CategoryPage'
import { SummaryPage } from '@/presentation/pages/Summary/SummaryPage'
import { ForecastPage } from '@/presentation/pages/Forecast/ForecastPage'
import { ReportsPage } from '@/presentation/pages/Reports/ReportsPage'
import { TransferPage } from '@/presentation/pages/Transfer/TransferPage'
import { ConsumablePage } from '@/presentation/pages/Consumable/ConsumablePage'
import { AdminPage } from '@/presentation/pages/Admin/AdminPage'
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
    case 'transfer':
      return <TransferPage />
    case 'consumable':
      return <ConsumablePage />
    case 'reports':
      return <ReportsPage />
    case 'admin':
      return <AdminPage />
    default:
      return <DashboardPage />
  }
}

// ─── 設定モーダル表示のコンテキスト ─────────────────────────
const SettingsModalContext = createContext<{ open: () => void }>({ open: () => {} })
export const useOpenSettings = () => useContext(SettingsModalContext)

function AppContent() {
  const ui = useAppUi()
  const dispatch = useAppDispatch()
  const { mode, toggle } = useThemeToggle()
  const showToast = useToast()
  const { calculate } = useCalculation()
  const { undo, redo } = useUndoRedo()
  const [showSettingsFromShortcut, setShowSettingsFromShortcut] = useState(false)

  const handleViewChange = useCallback(
    (view: ViewType) => {
      dispatch({ type: 'SET_CURRENT_VIEW', payload: view })
    },
    [dispatch],
  )

  const handleCalculate = useCallback(() => {
    calculate()
    showToast('計算を実行しました', 'success')
  }, [calculate, showToast])

  const handleOpenSettings = useCallback(() => {
    setShowSettingsFromShortcut(true)
  }, [])

  const handleUndo = useCallback(() => {
    undo()
    showToast('操作を取り消しました', 'info')
  }, [undo, showToast])

  const handleRedo = useCallback(() => {
    redo()
    showToast('操作をやり直しました', 'info')
  }, [redo, showToast])

  const shortcutHandlers = useMemo(
    () => ({
      onViewChange: handleViewChange,
      onCalculate: handleCalculate,
      onOpenSettings: handleOpenSettings,
      onUndo: handleUndo,
      onRedo: handleRedo,
    }),
    [handleViewChange, handleCalculate, handleOpenSettings, handleUndo, handleRedo],
  )

  useKeyboardShortcuts(shortcutHandlers)

  return (
    <SettingsModalContext.Provider value={{ open: handleOpenSettings }}>
      <AppShell
        nav={
          <NavBar
            currentView={ui.currentView}
            onViewChange={handleViewChange}
            themeMode={mode}
            onThemeToggle={toggle}
          />
        }
        sidebar={
          <DataManagementSidebar
            showSettingsExternal={showSettingsFromShortcut}
            onSettingsExternalClose={() => setShowSettingsFromShortcut(false)}
          />
        }
      >
        <ViewRouter view={ui.currentView} />
      </AppShell>
    </SettingsModalContext.Provider>
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
