/**
 * ルーティング定義（metadata-driven）
 *
 * PAGE_REGISTRY から Route を生成する。コンポーネント解決は PAGE_COMPONENT_MAP で行う。
 * ページメタデータの正本は application/navigation/pageRegistry.ts。
 */
import type { ComponentType } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { lazyWithRetry } from '@/presentation/lazyWithRetry'
import { PAGE_REGISTRY, REDIRECT_REGISTRY } from '@/application/navigation/pageRegistry'

// ─── 遅延ロード: ページコンポーネント（チャンク読込リトライ付き） ──

const DashboardPage = lazyWithRetry(() =>
  import('@/presentation/pages/Dashboard/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  })),
)
const StoreAnalysisPage = lazyWithRetry(() =>
  import('@/presentation/pages/StoreAnalysis/StoreAnalysisPage').then((m) => ({
    default: m.StoreAnalysisPage,
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
const PurchaseAnalysisPage = lazyWithRetry(() =>
  import('@/presentation/pages/PurchaseAnalysis/PurchaseAnalysisPage').then((m) => ({
    default: m.PurchaseAnalysisPage,
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

// ─── ページ id → コンポーネント マッピング ───────────────────────

/**
 * PAGE_REGISTRY の id と対応するコンポーネント。
 * pageMetaGuard でキーの網羅性を機械検証する。
 */
export const PAGE_COMPONENT_MAP: Record<string, ComponentType> = {
  dashboard: DashboardPage,
  'store-analysis': StoreAnalysisPage,
  daily: DailyPage,
  insight: InsightPage,
  category: CategoryPage,
  'cost-detail': CostDetailPage,
  'purchase-analysis': PurchaseAnalysisPage,
  reports: ReportsPage,
  admin: AdminPage,
  custom: CustomPage,
}

// ─── ルート定義コンポーネント ────────────────────────────────

export function AppRoutes() {
  return (
    <Routes>
      {/* Standard + dynamic ページ（PAGE_REGISTRY から生成） */}
      {PAGE_REGISTRY.map((page) => {
        const Component = PAGE_COMPONENT_MAP[page.id]
        if (!Component) return null
        return <Route key={page.id} path={page.pathPattern} element={<Component />} />
      })}

      {/* レガシーパスからのリダイレクト（REDIRECT_REGISTRY から生成） */}
      {REDIRECT_REGISTRY.map((redirect) => (
        <Route
          key={redirect.from}
          path={redirect.from}
          element={<Navigate to={redirect.to} replace />}
        />
      ))}

      {/* 未知ルートのフォールバック（明示的 — true unknown → dashboard） */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
