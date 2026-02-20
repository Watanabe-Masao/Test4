import { ThemeProvider } from 'styled-components'
import { lazy, Suspense, useState, useCallback, useEffect, useMemo, createContext, useContext } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { darkTheme, lightTheme, GlobalStyle } from '@/presentation/theme'
import type { ThemeMode } from '@/presentation/theme'
import { AppStateProvider, useAppUi, useAppDispatch } from '@/application/context'
import { AppShell, NavBar } from '@/presentation/components/Layout'
import { ToastProvider, useToast, PageErrorBoundary, PageSkeleton } from '@/presentation/components/common'
import { DataManagementSidebar } from '@/presentation/components/DataManagementSidebar'
import { RestoreDataModal } from '@/presentation/components/common/RestoreDataModal'
import { useKeyboardShortcuts, useUndoRedo, useCalculation } from '@/application/hooks'
import {
  getPersistedMeta,
  loadImportedData,
  clearAllData,
  isIndexedDBAvailable,
} from '@/infrastructure/storage/IndexedDBStore'
import type { PersistedMeta } from '@/infrastructure/storage/IndexedDBStore'
import type { ViewType } from '@/domain/models'

// ─── 遅延ロード: ページコンポーネント ──────────────────────
const DashboardPage = lazy(() => import('@/presentation/pages/Dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const DailyPage = lazy(() => import('@/presentation/pages/Daily/DailyPage').then(m => ({ default: m.DailyPage })))
const AnalysisPage = lazy(() => import('@/presentation/pages/Analysis/AnalysisPage').then(m => ({ default: m.AnalysisPage })))
const CategoryPage = lazy(() => import('@/presentation/pages/Category/CategoryPage').then(m => ({ default: m.CategoryPage })))
const SummaryPage = lazy(() => import('@/presentation/pages/Summary/SummaryPage').then(m => ({ default: m.SummaryPage })))
const ForecastPage = lazy(() => import('@/presentation/pages/Forecast/ForecastPage').then(m => ({ default: m.ForecastPage })))
const ReportsPage = lazy(() => import('@/presentation/pages/Reports/ReportsPage').then(m => ({ default: m.ReportsPage })))
const TransferPage = lazy(() => import('@/presentation/pages/Transfer/TransferPage').then(m => ({ default: m.TransferPage })))
const ConsumablePage = lazy(() => import('@/presentation/pages/Consumable/ConsumablePage').then(m => ({ default: m.ConsumablePage })))
const AdminPage = lazy(() => import('@/presentation/pages/Admin/AdminPage').then(m => ({ default: m.AdminPage })))

// ─── ViewType ↔ URLパス マッピング ──────────────────────────
const VIEW_TO_PATH: Record<ViewType, string> = {
  dashboard: '/dashboard',
  daily: '/daily',
  analysis: '/analysis',
  category: '/category',
  summary: '/summary',
  forecast: '/forecast',
  transfer: '/transfer',
  consumable: '/consumable',
  reports: '/reports',
  admin: '/admin',
}

const PATH_TO_VIEW: Record<string, ViewType> = Object.fromEntries(
  Object.entries(VIEW_TO_PATH).map(([view, path]) => [path, view as ViewType]),
) as Record<string, ViewType>

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

// ─── 設定モーダル表示のコンテキスト ─────────────────────────
const SettingsModalContext = createContext<{ open: () => void }>({ open: () => {} })
export const useOpenSettings = () => useContext(SettingsModalContext)

// ─── ルート↔状態 同期フック ──────────────────────────────────
function useRouteSync() {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const ui = useAppUi()

  // URL変更 → 状態更新
  useEffect(() => {
    const view = PATH_TO_VIEW[location.pathname]
    if (view && view !== ui.currentView) {
      dispatch({ type: 'SET_CURRENT_VIEW', payload: view })
    }
  }, [location.pathname, dispatch]) // eslint-disable-line react-hooks/exhaustive-deps

  // 状態変更 → URL更新
  const handleViewChange = useCallback(
    (view: ViewType) => {
      dispatch({ type: 'SET_CURRENT_VIEW', payload: view })
      navigate(VIEW_TO_PATH[view])
    },
    [dispatch, navigate],
  )

  // 初回マウント時に状態の currentView と URL を同期
  useEffect(() => {
    const currentPath = VIEW_TO_PATH[ui.currentView]
    if (location.pathname !== currentPath) {
      navigate(currentPath, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { handleViewChange }
}

function AppContent() {
  const ui = useAppUi()
  const dispatch = useAppDispatch()
  const { mode, toggle } = useThemeToggle()
  const showToast = useToast()
  const { calculate } = useCalculation()
  const { undo, redo } = useUndoRedo()
  const { handleViewChange } = useRouteSync()
  const [showSettingsFromShortcut, setShowSettingsFromShortcut] = useState(false)
  const [restoreMeta, setRestoreMeta] = useState<PersistedMeta | null>(null)

  // 初回: 保存データの有無をチェック
  useEffect(() => {
    if (!isIndexedDBAvailable()) return
    getPersistedMeta().then((meta) => {
      if (meta) setRestoreMeta(meta)
    }).catch(() => {})
  }, [])

  const handleRestore = useCallback(async () => {
    if (!restoreMeta) return
    try {
      const data = await loadImportedData(restoreMeta.year, restoreMeta.month)
      if (data) {
        dispatch({ type: 'SET_IMPORTED_DATA', payload: data })
        dispatch({
          type: 'UPDATE_SETTINGS',
          payload: { targetYear: restoreMeta.year, targetMonth: restoreMeta.month },
        })
        showToast(`${restoreMeta.year}年${restoreMeta.month}月のデータを復元しました`, 'success')
      }
    } catch {
      showToast('データの復元に失敗しました', 'error')
    }
    setRestoreMeta(null)
  }, [restoreMeta, dispatch, showToast])

  const handleDiscardRestore = useCallback(async () => {
    try {
      await clearAllData()
    } catch { /* ignore */ }
    setRestoreMeta(null)
  }, [])

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
        <PageErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/daily" element={<DailyPage />} />
              <Route path="/analysis" element={<AnalysisPage />} />
              <Route path="/category" element={<CategoryPage />} />
              <Route path="/summary" element={<SummaryPage />} />
              <Route path="/forecast" element={<ForecastPage />} />
              <Route path="/transfer" element={<TransferPage />} />
              <Route path="/consumable" element={<ConsumablePage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </PageErrorBoundary>
      </AppShell>
      {restoreMeta && (
        <RestoreDataModal
          meta={restoreMeta}
          onRestore={handleRestore}
          onDiscard={handleDiscardRestore}
        />
      )}
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
        <HashRouter>
          <AppStateProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </AppStateProvider>
        </HashRouter>
      </ThemeProvider>
    </ThemeToggleContext.Provider>
  )
}

export default App
