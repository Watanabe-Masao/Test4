/**
 * ルート同期フック — URL が唯一のソース
 *
 * currentView は URL pathname から導出する。store には保持しない。
 * ビュー切替は navigate() のみ。React Router が再レンダーをトリガーする。
 *
 * 優先順位（明示的）:
 * 1. standard match — getPathToView() で完全一致
 * 2. dynamic match — getPageByPath() で dynamic ページにマッチ
 * 3. legacy redirect — REDIRECT_REGISTRY に存在
 * 4. true unknown — dashboard fallback
 *
 * @responsibility R:unclassified
 */
import { useCallback, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  getPageByPath,
  getRedirectTarget,
  getPathToView,
  getViewToPath,
} from '@/application/navigation/pageRegistry'
import { preloadAdjacentPages } from '@/application/navigation/viewMapping'
import type { ViewType } from '@/domain/models/storeTypes'

/** standard path → ViewType マッピング（キャッシュ） */
const PATH_TO_VIEW = getPathToView()
const VIEW_TO_PATH = getViewToPath()

/**
 * URL pathname から現在の ViewType を導出する。
 *
 * 解決優先順位:
 * 1. standard match（完全一致）
 * 2. dynamic match（パターンマッチ — custom/:pageId 等）→ fallback to 'dashboard'
 * 3. true unknown → 'dashboard'
 *
 * redirect はルーティング層（routes.tsx）で処理されるため、ここでは扱わない。
 */
export function resolveViewType(pathname: string): ViewType {
  // 1. standard match
  const standardView = PATH_TO_VIEW[pathname]
  if (standardView) return standardView

  // 2. dynamic match — dynamic ページは ViewType を持たないため dashboard を返す
  const dynamicPage = getPageByPath(pathname)
  if (dynamicPage && dynamicPage.kind === 'dynamic') return 'dashboard'

  // 3. true unknown → dashboard fallback（明示的）
  return 'dashboard'
}

/** URL pathname から現在の ViewType を導出する */
export function useCurrentView(): ViewType {
  const location = useLocation()
  return resolveViewType(location.pathname)
}

/**
 * ルート同期フック
 *
 * - currentView: URL から導出（唯一のソース）
 * - handleViewChange: navigate() でルートを変更
 */
export function useRouteSync() {
  const currentView = useCurrentView()
  const navigate = useNavigate()

  // 隣接ページの先読み（idle 時）
  useEffect(() => {
    preloadAdjacentPages(currentView)
  }, [currentView])

  const handleViewChange = useCallback(
    (view: ViewType) => {
      if (view === currentView) return
      navigate(VIEW_TO_PATH[view])
    },
    [navigate, currentView],
  )

  return { currentView, handleViewChange }
}

// テスト用に export（resolveViewType はテストで直接使用可能）
export { getRedirectTarget }
