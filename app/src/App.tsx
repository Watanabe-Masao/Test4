import { Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import { AppShell, NavBar, BottomNav } from '@/presentation/components/Layout'
import {
  PageErrorBoundary,
  PageSkeleton,
  useToast,
} from '@/presentation/components/common/feedback'
import { DataManagementSidebar } from '@/presentation/components/DataManagementSidebar'
import { usePersistence } from '@/application/hooks/data'
import { useRouteSync } from '@/application/hooks/useRouteSync'
import { useAppShortcuts } from '@/application/hooks/useAppShortcuts'
import { useThemeToggle, SettingsModalContext } from '@/appContextDefs'
import { AppProviders } from '@/AppProviders'
import { AppRoutes, MobileDashboardPage } from '@/presentation/routes'

// ─── メインコンテンツ ──────────────────────────────────────

function AppContent() {
  const location = useLocation()
  const isMobile = location.pathname === '/mobile'
  const { mode, toggle } = useThemeToggle()
  const showToast = useToast()
  const { currentView, handleViewChange } = useRouteSync()
  const { showSettings, handleOpenSettings, handleCloseSettings } = useAppShortcuts({
    onViewChange: handleViewChange,
    showToast,
  })

  // 起動時の自動復元
  usePersistence()

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
              showSettingsExternal={showSettings}
              onSettingsExternalClose={handleCloseSettings}
            />
          </PageErrorBoundary>
        }
        bottomNav={<BottomNav currentView={currentView} onViewChange={handleViewChange} />}
      >
        <PageErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <AppRoutes />
          </Suspense>
        </PageErrorBoundary>
      </AppShell>
    </SettingsModalContext.Provider>
  )
}

// ─── ルートコンポーネント ──────────────────────────────────

function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  )
}

export default App
