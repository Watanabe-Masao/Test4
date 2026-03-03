import { ThemeProvider } from 'styled-components'
import { Suspense, useState, useCallback, useEffect, useMemo } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { darkTheme, lightTheme, GlobalStyle } from '@/presentation/theme'
import type { ThemeMode } from '@/presentation/theme'
import { AppStateProvider, RepositoryProvider } from '@/application/context'
import { useUiStore } from '@/application/stores/uiStore'
import { AppShell, NavBar, BottomNav } from '@/presentation/components/Layout'
import {
  ToastProvider,
  useToast,
  PageErrorBoundary,
  PageSkeleton,
} from '@/presentation/components/common'
import { DataManagementSidebar } from '@/presentation/components/DataManagementSidebar'
import {
  useKeyboardShortcuts,
  useUndoRedo,
  useCalculation,
  usePersistence,
} from '@/application/hooks'
import { I18nProvider } from '@/infrastructure/i18n'
import { indexedDBRepository } from '@/infrastructure/storage/IndexedDBRepository'
import { AuthProvider } from '@/application/context/AuthContext'
import type { ViewType } from '@/domain/models'
import { ThemeToggleContext, useThemeToggle, SettingsModalContext } from '@/appContextDefs'
import { lazyWithRetry } from '@/presentation/lazyWithRetry'

// ─── 遅延ロード: ページコンポーネント（チャンク読込リトライ付き） ──
const DashboardPage = lazyWithRetry(() =>
  import('@/presentation/pages/Dashboard/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  })),
)
const DailyPage = lazyWithRetry(() =>
  import('@/presentation/pages/Daily/DailyPage').then((m) => ({ default: m.DailyPage })),
)
const InsightPage = lazyWithRetry(() =>
  import('@/presentation/pages/Insight/InsightPage').then((m) => ({ default: m.InsightPage })),
)
const CategoryPage = lazyWithRetry(() =>
  import('@/presentation/pages/Category/CategoryPage').then((m) => ({ default: m.CategoryPage })),
)
const CostDetailPage = lazyWithRetry(() =>
  import('@/presentation/pages/CostDetail/CostDetailPage').then((m) => ({
    default: m.CostDetailPage,
  })),
)
const ReportsPage = lazyWithRetry(() =>
  import('@/presentation/pages/Reports/ReportsPage').then((m) => ({ default: m.ReportsPage })),
)
const AdminPage = lazyWithRetry(() =>
  import('@/presentation/pages/Admin/AdminPage').then((m) => ({ default: m.AdminPage })),
)
const MobileDashboardPage = lazyWithRetry(() =>
  import('@/presentation/pages/Mobile/MobileDashboardPage').then((m) => ({
    default: m.MobileDashboardPage,
  })),
)

// ─── ViewType ↔ URLパス マッピング ──────────────────────────
const VIEW_TO_PATH: Record<ViewType, string> = {
  dashboard: '/dashboard',
  daily: '/daily',
  insight: '/insight',
  category: '/category',
  'cost-detail': '/cost-detail',
  reports: '/reports',
  admin: '/admin',
}

const PATH_TO_VIEW: Record<string, ViewType> = Object.fromEntries(
  Object.entries(VIEW_TO_PATH).map(([view, path]) => [path, view as ViewType]),
) as Record<string, ViewType>

function getInitialTheme(): ThemeMode {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'light') return saved
  }
  return 'dark'
}

// ─── ルート↔状態 同期フック ──────────────────────────────────
function useRouteSync() {
  const location = useLocation()
  const navigate = useNavigate()
  // Zustand セレクターで currentView のみ購読（stale closure を回避）
  const currentView = useUiStore((s) => s.currentView)

  // URL変更 → 状態更新（ブラウザの戻る/進むボタン対応）
  useEffect(() => {
    const view = PATH_TO_VIEW[location.pathname]
    if (view && view !== currentView) {
      useUiStore.getState().setCurrentView(view)
    }
  }, [location.pathname, currentView])

  // ビュー切替ハンドラ（state と URL を同時に更新）
  const handleViewChange = useCallback(
    (view: ViewType) => {
      if (view === currentView) return
      useUiStore.getState().setCurrentView(view)
      navigate(VIEW_TO_PATH[view])
    },
    [navigate, currentView],
  )

  return { handleViewChange }
}

/** モバイル専用ルートかどうかを判定するフック */
function useMobileRoute() {
  const location = useLocation()
  return location.pathname === '/mobile'
}

function AppContent() {
  const isMobile = useMobileRoute()
  const currentView = useUiStore((s) => s.currentView)
  const { mode, toggle } = useThemeToggle()
  const showToast = useToast()
  const { calculate } = useCalculation()
  const { undo, redo } = useUndoRedo()
  const { handleViewChange } = useRouteSync()
  const [showSettingsFromShortcut, setShowSettingsFromShortcut] = useState(false)

  // usePersistence を呼び出すことで起動時の自動復元が有効になる
  usePersistence()

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

  // モバイル専用ルート: AppShell を使わず独自レイアウト
  if (isMobile) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <MobileDashboardPage />
      </Suspense>
    )
  }

  return (
    <SettingsModalContext.Provider value={{ open: handleOpenSettings }}>
      <AppShell
        nav={
          <NavBar
            currentView={currentView}
            onViewChange={handleViewChange}
            themeMode={mode}
            onThemeToggle={toggle}
          />
        }
        sidebar={
          <PageErrorBoundary>
            <DataManagementSidebar
              showSettingsExternal={showSettingsFromShortcut}
              onSettingsExternalClose={() => setShowSettingsFromShortcut(false)}
            />
          </PageErrorBoundary>
        }
        bottomNav={<BottomNav currentView={currentView} onViewChange={handleViewChange} />}
      >
        <PageErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/daily" element={<DailyPage />} />
              <Route path="/insight" element={<InsightPage />} />
              <Route path="/category" element={<CategoryPage />} />
              <Route path="/cost-detail" element={<CostDetailPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/admin" element={<AdminPage />} />
              {/* 旧ルートからのリダイレクト */}
              <Route path="/analysis" element={<Navigate to="/insight" replace />} />
              <Route path="/forecast" element={<Navigate to="/insight" replace />} />
              <Route path="/summary" element={<Navigate to="/insight" replace />} />
              <Route path="/transfer" element={<Navigate to="/cost-detail" replace />} />
              <Route path="/consumable" element={<Navigate to="/cost-detail" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </PageErrorBoundary>
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
        <I18nProvider>
          <AuthProvider>
            <RepositoryProvider repository={indexedDBRepository}>
              <HashRouter>
                <AppStateProvider>
                  <ToastProvider>
                    <AppContent />
                  </ToastProvider>
                </AppStateProvider>
              </HashRouter>
            </RepositoryProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </ThemeToggleContext.Provider>
  )
}

export default App
