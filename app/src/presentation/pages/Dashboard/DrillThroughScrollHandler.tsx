/**
 * DrillThroughScrollHandler — CrossChartSelection のドリルスルーリクエストに応じて
 * 対象ウィジェットへスクロールし、ハイライトアニメーションを付与するコンポーネント。
 */
import { useEffect } from 'react'
import { useCrossChartSelection } from '@/presentation/components/charts'

export function DrillThroughScrollHandler() {
  const { drillThroughTarget, requestDrillThrough } = useCrossChartSelection()

  useEffect(() => {
    if (!drillThroughTarget) return
    const el = document.querySelector(`[data-widget-id="${drillThroughTarget.widgetId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // ハイライトアニメーション
      el.classList.add('drill-highlight')
      const timer = setTimeout(() => {
        el.classList.remove('drill-highlight')
        requestDrillThrough(null)
      }, 1500)
      return () => clearTimeout(timer)
    }
    requestDrillThrough(null)
  }, [drillThroughTarget, requestDrillThrough])

  return null
}
