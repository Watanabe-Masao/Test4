/**
 * ルート ↔ UI状態 同期フック
 *
 * URL pathname を唯一のソースとし、ブラウザの戻る/進むボタンにも追従する。
 * ビュー切替は navigate() で URL を更新し、状態はそこから導出する。
 */
import { useCallback, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUiStore } from '@/application/stores/uiStore'
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

/** ビュー切替ハンドラを返すフック（URL を更新し、store にも同期する） */
export function useRouteSync() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentView = useUiStore((s) => s.currentView)

  // URL変更 → 状態更新（ブラウザの戻る/進むボタン対応）+ 隣接ページ先読み
  useEffect(() => {
    const view = PATH_TO_VIEW[location.pathname]
    if (view && view !== currentView) {
      useUiStore.getState().setCurrentView(view)
    }
    // 現在ページから遷移しやすいページのチャンクを idle 時に先読み
    if (view) preloadAdjacentPages(view)
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

  return { currentView, handleViewChange }
}
