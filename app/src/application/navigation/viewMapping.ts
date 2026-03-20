/**
 * ViewType ↔ URLパス マッピング
 *
 * アプリケーション層で管理し、presentation/routes.tsx と application/hooks から参照する。
 */
import type { ViewType } from '@/domain/models/storeTypes'

export const VIEW_TO_PATH: Record<ViewType, string> = {
  dashboard: '/dashboard',
  'store-analysis': '/store-analysis',
  daily: '/daily',
  insight: '/insight',
  category: '/category',
  'cost-detail': '/cost-detail',
  'purchase-analysis': '/purchase-analysis',
  reports: '/reports',
  admin: '/admin',
}

export const PATH_TO_VIEW: Record<string, ViewType> = Object.fromEntries(
  Object.entries(VIEW_TO_PATH).map(([view, path]) => [path, view as ViewType]),
) as Record<string, ViewType>

// ─── ページ先読み（idle 時に次ページ候補のチャンクを取得） ──────

/** 各ページから遷移しやすいページの import 関数マップ */
const PRELOAD_MAP: Partial<Record<ViewType, Array<() => Promise<unknown>>>> = {
  dashboard: [
    () => import('@/presentation/pages/StoreAnalysis/StoreAnalysisPage'),
    () => import('@/presentation/pages/Daily/DailyPage'),
    () => import('@/presentation/pages/Insight/InsightPage'),
  ],
  'store-analysis': [
    () => import('@/presentation/pages/Daily/DailyPage'),
    () => import('@/presentation/pages/Dashboard/DashboardPage'),
  ],
  daily: [() => import('@/presentation/pages/Dashboard/DashboardPage')],
  insight: [() => import('@/presentation/pages/Category/CategoryPage')],
}

/**
 * 現在のページに基づいて次ページ候補を先読みする。
 * requestIdleCallback で CPU idle 時に実行し、初回ロードを阻害しない。
 */
export function preloadAdjacentPages(currentView: ViewType): void {
  const targets = PRELOAD_MAP[currentView]
  if (!targets) return

  const schedule = typeof requestIdleCallback === 'function' ? requestIdleCallback : setTimeout
  schedule(() => {
    for (const load of targets) {
      load().catch(() => {
        /* preload failure is non-critical */
      })
    }
  })
}
