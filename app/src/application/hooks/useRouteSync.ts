/**
 * ルート同期フック — URL が唯一のソース
 *
 * currentView は URL pathname から導出する。store には保持しない。
 * ビュー切替は navigate() のみ。React Router が再レンダーをトリガーする。
 */
import { useCallback, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  PATH_TO_VIEW,
  VIEW_TO_PATH,
  preloadAdjacentPages,
} from '@/application/navigation/viewMapping'
import type { ViewType } from '@/domain/models'

/** URL pathname から現在の ViewType を導出する */
export function useCurrentView(): ViewType {
  const location = useLocation()
  return PATH_TO_VIEW[location.pathname] ?? 'dashboard'
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
