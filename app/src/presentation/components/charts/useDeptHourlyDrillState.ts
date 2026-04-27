/**
 * useDeptHourlyDrillState — 部門別時間帯チャートのドリル + UI 状態管理
 *
 * useDeptHourlyChartData から分離。
 * topN / activeDepts / drill / viewMode / rightMode の state + handlers。
 *
 * @responsibility R:unclassified
 */
import React, { useState, useCallback } from 'react'
import type { RightOverlayMode } from './DeptHourlyChart'

type ViewMode = 'stacked' | 'separate'
type HierarchyLevel = 'department' | 'line' | 'klass'

interface DrillState {
  readonly level: HierarchyLevel
  readonly deptCode?: string
  readonly deptName?: string
  readonly lineCode?: string
  readonly lineName?: string
}

export type { ViewMode, HierarchyLevel, DrillState }

export function useDeptHourlyDrillState() {
  const [topN, setTopN] = useState(5)
  const [activeDepts, setActiveDepts] = useState<ReadonlySet<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('stacked')
  const [drill, setDrill] = useState<DrillState>({ level: 'department' })
  const [rightMode, setRightMode] = useState<RightOverlayMode>('quantity')

  const handleTopNChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTopN(Number(e.target.value))
    setActiveDepts(new Set())
  }, [])

  const handleChipClick = useCallback((code: string) => {
    setActiveDepts((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }, [])

  const handleDrillDown = useCallback(
    (code: string, name: string) => {
      setActiveDepts(new Set())
      if (drill.level === 'department') {
        setDrill({ level: 'line', deptCode: code, deptName: name })
      } else if (drill.level === 'line') {
        setDrill({
          level: 'klass',
          deptCode: drill.deptCode,
          deptName: drill.deptName,
          lineCode: code,
          lineName: name,
        })
      }
    },
    [drill],
  )

  const handleDrillUp = useCallback(() => {
    setActiveDepts(new Set())
    if (drill.level === 'klass') {
      setDrill({ level: 'line', deptCode: drill.deptCode, deptName: drill.deptName })
    } else if (drill.level === 'line') {
      setDrill({ level: 'department' })
    }
  }, [drill])

  const handleLevelChange = useCallback((level: HierarchyLevel) => {
    setActiveDepts(new Set())
    setDrill({ level })
  }, [])

  return {
    topN,
    activeDepts,
    viewMode,
    setViewMode,
    drill,
    setDrill,
    rightMode,
    setRightMode,
    handleTopNChange,
    handleChipClick,
    handleDrillDown,
    handleDrillUp,
    handleLevelChange,
  }
}
