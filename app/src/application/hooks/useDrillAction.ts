/**
 * useDrillAction — ドリルダウン操作の標準化フック
 *
 * 設計原則3「ドリルは3種類に固定」の実装。
 * 全チャート・テーブルで統一されたドリル挙動を提供する。
 *
 * Type A (filter): 同一ページ内でフィルタを追加
 * Type B (detail): 詳細ページへパラメータ付き遷移
 * Type C (compare): 比較・要因分解セクションへ遷移
 */
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DrillAction, ViewType } from '@/domain/models'
import { useUiStore } from '@/application/stores/uiStore'
import { useAnalysisContextStore } from '@/application/stores/analysisContextStore'

const VIEW_TO_PATH: Record<string, string> = {
  dashboard: '/dashboard',
  daily: '/daily',
  insight: '/insight',
  category: '/category',
  'cost-detail': '/cost-detail',
  reports: '/reports',
  admin: '/admin',
}

export function useDrillAction() {
  const nav = useNavigate()

  const executeDrill = useCallback(
    (action: DrillAction) => {
      switch (action.type) {
        case 'filter': {
          // Type A: 同一ページでフィルタ追加
          if (action.filter) {
            const { key, value } = action.filter
            const store = useAnalysisContextStore.getState()
            if (key === 'category') {
              store.setCategoryFilter(value)
            } else if (key === 'department') {
              store.setDepartmentFilter(value)
            }
          }
          break
        }
        case 'detail': {
          // Type B: 詳細ページへ遷移
          if (action.navigate) {
            const { view, params } = action.navigate
            const path = VIEW_TO_PATH[view] ?? `/${view}`
            const search = params ? '?' + new URLSearchParams(params).toString() : ''
            useUiStore.getState().setCurrentView(view as ViewType)
            nav(path + search)
          }
          break
        }
        case 'compare': {
          // Type C: 比較セクションへ遷移
          if (action.compare) {
            const { view, tab, params } = action.compare
            const path = VIEW_TO_PATH[view] ?? `/${view}`
            const searchParams = new URLSearchParams(params ?? {})
            if (tab) searchParams.set('tab', tab)
            const search = searchParams.toString() ? '?' + searchParams.toString() : ''
            useUiStore.getState().setCurrentView(view as ViewType)
            nav(path + search)
          }
          break
        }
      }
    },
    [nav],
  )

  // ── ショートカット関数 ──

  /** Type A: カテゴリフィルタを追加 */
  const drillFilterCategory = useCallback(
    (category: string) => {
      executeDrill({ type: 'filter', filter: { key: 'category', value: category } })
    },
    [executeDrill],
  )

  /** Type A: 部門フィルタを追加 */
  const drillFilterDepartment = useCallback(
    (department: string) => {
      executeDrill({ type: 'filter', filter: { key: 'department', value: department } })
    },
    [executeDrill],
  )

  /** Type B: 日別詳細へ遷移 */
  const drillToDaily = useCallback(
    (day?: number) => {
      executeDrill({
        type: 'detail',
        navigate: {
          view: 'daily',
          params: day != null ? { day: String(day) } : undefined,
        },
      })
    },
    [executeDrill],
  )

  /** Type B: カテゴリ詳細へ遷移 */
  const drillToCategory = useCallback(
    (category?: string) => {
      executeDrill({
        type: 'detail',
        navigate: {
          view: 'category',
          params: category ? { category } : undefined,
        },
      })
    },
    [executeDrill],
  )

  /** Type C: 要因分解へ遷移 */
  const drillToDecomposition = useCallback(
    (day?: number) => {
      executeDrill({
        type: 'compare',
        compare: {
          view: 'insight',
          tab: 'decomposition',
          params: day != null ? { day: String(day) } : undefined,
        },
      })
    },
    [executeDrill],
  )

  /** Type C: 損益構造比較へ遷移 */
  const drillToGrossProfit = useCallback(() => {
    executeDrill({
      type: 'compare',
      compare: {
        view: 'insight',
        tab: 'grossProfit',
      },
    })
  }, [executeDrill])

  return {
    executeDrill,
    drillFilterCategory,
    drillFilterDepartment,
    drillToDaily,
    drillToCategory,
    drillToDecomposition,
    drillToGrossProfit,
  }
}
