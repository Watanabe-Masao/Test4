/**
 * ルーティング定義
 *
 * 遅延ロードされるページコンポーネントと Route 構造を管理する。
 * ViewType ↔ URLパスのマッピングは application/navigation/viewMapping.ts に定義。
 */
import { Routes, Route, Navigate } from 'react-router-dom'
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
const CustomPage = lazyWithRetry(() =>
  import('@/presentation/pages/CustomPage/CustomPage').then((m) => ({ default: m.CustomPage })),
)
export const MobileDashboardPage = lazyWithRetry(() =>
  import('@/presentation/pages/Mobile/MobileDashboardPage').then((m) => ({
    default: m.MobileDashboardPage,
  })),
)

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
      <Route path="/custom/:pageId" element={<CustomPage />} />
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
