/**
 * ルーティング定義
 *
 * 遅延ロードされるページコンポーネントと、ViewType ↔ URLパスのマッピングを管理する。
 */
import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import type { ViewType } from '@/domain/models'

// ─── 遅延ロード: ページコンポーネント ──────────────────────
const DashboardPage = lazy(() =>
  import('@/presentation/pages/Dashboard/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  })),
)
const DailyPage = lazy(() =>
  import('@/presentation/pages/Daily/DailyPage').then((m) => ({ default: m.DailyPage })),
)
const InsightPage = lazy(() =>
  import('@/presentation/pages/Insight/InsightPage').then((m) => ({ default: m.InsightPage })),
)
const CategoryPage = lazy(() =>
  import('@/presentation/pages/Category/CategoryPage').then((m) => ({ default: m.CategoryPage })),
)
const CostDetailPage = lazy(() =>
  import('@/presentation/pages/CostDetail/CostDetailPage').then((m) => ({
    default: m.CostDetailPage,
  })),
)
const ReportsPage = lazy(() =>
  import('@/presentation/pages/Reports/ReportsPage').then((m) => ({ default: m.ReportsPage })),
)
const AdminPage = lazy(() =>
  import('@/presentation/pages/Admin/AdminPage').then((m) => ({ default: m.AdminPage })),
)

// ─── ViewType ↔ URLパス マッピング ──────────────────────────
export const VIEW_TO_PATH: Record<ViewType, string> = {
  dashboard: '/dashboard',
  daily: '/daily',
  insight: '/insight',
  category: '/category',
  'cost-detail': '/cost-detail',
  reports: '/reports',
  admin: '/admin',
}

export const PATH_TO_VIEW: Record<string, ViewType> = Object.fromEntries(
  Object.entries(VIEW_TO_PATH).map(([view, path]) => [path, view as ViewType]),
) as Record<string, ViewType>

// ─── ルート定義コンポーネント ────────────────────────────────
export function AppRoutes() {
  return (
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
  )
}
