/**
 * useCategoryTrendDrillState — カテゴリトレンドチャートの drill + UI 状態管理
 *
 * useCategoryTrendChartData から分離。
 * level / topN / drill / metric / showYoY / selectedDows の state + handlers。
 *
 * @responsibility R:state-machine
 */
import { useState, useCallback } from 'react'
import type { TrendMetric } from '@/features/category'

type HierarchyLevel = 'department' | 'line' | 'klass'

interface DrillState {
  readonly deptCode?: string
  readonly deptName?: string
  readonly lineCode?: string
  readonly lineName?: string
}

export type { HierarchyLevel, DrillState }

export function useCategoryTrendDrillState() {
  const [level, setLevel] = useState<HierarchyLevel>('department')
  const [topN, setTopN] = useState<number>(8)
  const [selectedDows, setSelectedDows] = useState<number[]>([])
  const [drill, setDrill] = useState<DrillState>({})
  const [metric, setMetric] = useState<TrendMetric>('amount')
  const [showYoY, setShowYoY] = useState(false)

  const handleDowChange = useCallback((dows: number[]) => setSelectedDows(dows), [])
  const handleLevelChange = useCallback((newLevel: HierarchyLevel) => {
    setLevel(newLevel)
    setDrill({})
  }, [])

  const handleBreadcrumbClick = useCallback((targetLevel: 'root' | 'department') => {
    if (targetLevel === 'root') {
      setDrill({})
      setLevel('department')
    } else {
      setDrill((prev) => ({ deptCode: prev.deptCode, deptName: prev.deptName }))
      setLevel('line')
    }
  }, [])

  return {
    level,
    topN,
    setTopN,
    selectedDows,
    drill,
    setDrill,
    setLevel,
    metric,
    setMetric,
    showYoY,
    setShowYoY,
    handleDowChange,
    handleLevelChange,
    handleBreadcrumbClick,
  }
}
