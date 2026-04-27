/**
 * ページ id → コンポーネント マッピング（metadata-driven）
 *
 * `PAGE_REGISTRY` の id と対応するコンポーネントを束ねる。型レベルで一致を
 * 保証し、`pageMetaGuard` でも機械検証する。
 *
 * `routes.tsx` から分離している理由: routes.tsx が `AppRoutes` コンポーネント
 * のみを export する状態に保つことで、HMR（react-refresh）が壊れないようにする。
 * 非コンポーネント export（このマップ）と component export を同じファイルに
 * 混在させると fast-refresh が無効になる。
 *
 * @responsibility R:unclassified
 */
import type { ComponentType } from 'react'
import { lazyWithRetry } from '@/presentation/lazyWithRetry'
import { PAGE_REGISTRY } from '@/application/navigation/pageRegistry'

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
const WeatherPage = lazyWithRetry(() =>
  import('@/presentation/pages/Weather/WeatherPage').then((m) => ({ default: m.WeatherPage })),
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

type PageId = (typeof PAGE_REGISTRY)[number]['id']
export const PAGE_COMPONENT_MAP: Record<PageId, ComponentType> = {
  dashboard: DashboardPage,
  'store-analysis': StoreAnalysisPage,
  daily: DailyPage,
  insight: InsightPage,
  category: CategoryPage,
  'cost-detail': CostDetailPage,
  'purchase-analysis': PurchaseAnalysisPage,
  reports: ReportsPage,
  weather: WeatherPage,
  admin: AdminPage,
  custom: CustomPage,
}
