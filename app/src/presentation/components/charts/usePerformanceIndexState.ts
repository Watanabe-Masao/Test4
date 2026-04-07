/**
 * usePerformanceIndexState — PI 値チャートの UI 状態管理
 *
 * PerformanceIndexChart.tsx から分離。
 * view / selectedRange / categoryLevel / storePILevel / drillState の state + handlers。
 *
 * @responsibility R:state-machine
 */
import { useState, useCallback, useMemo } from 'react'
import type { ViewType } from './PerformanceIndexChart.builders'
import type { CategoryLevelType, CategoryDrillDownInfo } from '@/features/category'
import type { StorePILevel } from './StorePIComparisonChart'

interface DrillState {
  deptCode?: string
  deptName?: string
  lineCode?: string
  lineName?: string
}

export type { DrillState }

export function usePerformanceIndexState() {
  const [view, setView] = useState<ViewType>('piAmount')
  const [selectedRange, setSelectedRange] = useState<{ from: number; to: number } | null>(null)
  const [categoryLevel, setCategoryLevel] = useState<CategoryLevelType>('department')
  const [storePILevel, setStorePILevel] = useState<StorePILevel>('department')
  const [drillState, setDrillState] = useState<DrillState>({})

  const handleCategoryDrillDown = useCallback((info: CategoryDrillDownInfo) => {
    if (info.level === 'department') {
      setDrillState({ deptCode: info.code, deptName: info.name })
      setCategoryLevel('line')
    } else if (info.level === 'line') {
      setDrillState((prev) => ({
        ...prev,
        lineCode: info.code,
        lineName: info.name,
      }))
      setCategoryLevel('klass')
    }
  }, [])

  const handleCategoryLevelChange = useCallback((newLevel: CategoryLevelType) => {
    setDrillState({})
    setCategoryLevel(newLevel)
  }, [])

  const categoryBreadcrumbs = useMemo(() => {
    const crumbs: { label: string; onClick: () => void }[] = []
    if (drillState.deptCode) {
      crumbs.push({
        label: '全部門',
        onClick: () => {
          setDrillState({})
          setCategoryLevel('department')
        },
      })
      crumbs.push({
        label: drillState.deptName ?? drillState.deptCode,
        onClick: () => {
          setDrillState((prev) => ({
            deptCode: prev.deptCode,
            deptName: prev.deptName,
          }))
          setCategoryLevel('line')
        },
      })
    }
    if (drillState.lineCode) {
      crumbs.push({
        label: drillState.lineName ?? drillState.lineCode,
        onClick: () => {},
      })
    }
    return crumbs
  }, [drillState])

  return {
    view,
    setView,
    selectedRange,
    setSelectedRange,
    categoryLevel,
    setCategoryLevel,
    storePILevel,
    setStorePILevel,
    drillState,
    setDrillState,
    handleCategoryDrillDown,
    handleCategoryLevelChange,
    categoryBreadcrumbs,
  }
}
