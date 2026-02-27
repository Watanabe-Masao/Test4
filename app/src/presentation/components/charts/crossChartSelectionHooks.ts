/**
 * CrossChartSelection フック（Context から分離）
 *
 * react-refresh/only-export-components 対応のため、
 * コンポーネント（Provider）とフックを別ファイルに分離。
 */
import { useContext, useCallback } from 'react'
import { CrossChartSelectionContext } from './crossChartSelectionContextDef'

export type {
  CategoryHighlight,
  TimeSlotHighlight,
  DrillThroughTarget,
} from './crossChartSelectionContextDef'

export function useCrossChartSelection() {
  return useContext(CrossChartSelectionContext)
}

/**
 * ドリルスルーリンクを受信するフック。
 * 指定されたwidgetIdが自分のIDと一致した場合にフィルタを返す。
 */
export function useDrillThroughReceiver(widgetId: string) {
  const { drillThroughTarget, requestDrillThrough } = useCrossChartSelection()

  const isTargeted = drillThroughTarget?.widgetId === widgetId
  const filter = isTargeted ? (drillThroughTarget?.filter ?? null) : null

  const dismiss = useCallback(() => {
    if (isTargeted) {
      requestDrillThrough(null)
    }
  }, [isTargeted, requestDrillThrough])

  return { isTargeted, filter, dismiss }
}
