/**
 * ViewType ↔ URLパス マッピング（後方互換レイヤー）
 *
 * 正本は pageRegistry.ts の PAGE_REGISTRY。
 * 既存の export 名を維持し、内部実装を pageRegistry に委譲する。
 *
 * @responsibility R:unclassified
 */
import type { ViewType } from '@/domain/models/storeTypes'
import {
  PAGE_REGISTRY,
  getViewToPath as _getViewToPath,
  getPathToView as _getPathToView,
} from './pageRegistry'

export const VIEW_TO_PATH: Record<ViewType, string> = _getViewToPath()

export const PATH_TO_VIEW: Record<string, ViewType> = _getPathToView()

// ─── ページ先読み（idle 時に次ページ候補のチャンクを取得） ──────

/** ページ import 関数のレジストリ（routes.tsx の lazy import と対応） */
const PAGE_IMPORT_MAP: Record<string, () => Promise<unknown>> = {
  dashboard: () => import('@/presentation/pages/Dashboard/DashboardPage'),
  'store-analysis': () => import('@/presentation/pages/StoreAnalysis/StoreAnalysisPage'),
  daily: () => import('@/presentation/pages/Daily/DailyPage'),
  insight: () => import('@/presentation/pages/Insight/InsightPage'),
  category: () => import('@/presentation/pages/Category/CategoryPage'),
  'cost-detail': () => import('@/presentation/pages/CostDetail/CostDetailPage'),
  'purchase-analysis': () => import('@/presentation/pages/PurchaseAnalysis/PurchaseAnalysisPage'),
  reports: () => import('@/presentation/pages/Reports/ReportsPage'),
  admin: () => import('@/presentation/pages/Admin/AdminPage'),
}

/**
 * 現在のページに基づいて次ページ候補を先読みする。
 * requestIdleCallback で CPU idle 時に実行し、初回ロードを阻害しない。
 * preloadTargets は PAGE_REGISTRY から導出。
 */
export function preloadAdjacentPages(currentView: ViewType): void {
  const page = PAGE_REGISTRY.find((p) => p.id === currentView)
  const targets = page?.preloadTargets
  if (!targets || targets.length === 0) return

  const schedule = typeof requestIdleCallback === 'function' ? requestIdleCallback : setTimeout
  schedule(() => {
    for (const targetId of targets) {
      const load = PAGE_IMPORT_MAP[targetId]
      if (load) {
        load().catch(() => {
          /* preload failure is non-critical */
        })
      }
    }
  })
}
