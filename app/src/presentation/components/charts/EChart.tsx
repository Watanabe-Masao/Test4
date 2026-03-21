/**
 * EChart — ECharts 共通ラッパーコンポーネント
 *
 * 全チャートの描画基盤。ECharts インスタンスのライフサイクル管理、
 * リサイズ対応、テーマ連携を一箇所に集約する。
 *
 * 使い方:
 *   import { EChart } from './EChart'
 *   <EChart option={option} height={300} />
 *
 * Logic.ts → option 生成 → EChart で描画、の統一パイプライン。
 */
import { useRef, useEffect, memo } from 'react'
import * as echarts from 'echarts/core'
import {
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  ScatterChart,
  HeatmapChart,
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkPointComponent,
  ToolboxComponent,
  VisualMapComponent,
  RadarComponent,
  BrushComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'

// ─── ECharts モジュール登録（tree-shaking 対応）───────────
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  ScatterChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkPointComponent,
  ToolboxComponent,
  VisualMapComponent,
  RadarComponent,
  BrushComponent,
  CanvasRenderer,
])

// ─── テーマ生成 ──────────────────────────────────────────

/** AppTheme → ECharts テーマオブジェクト */
function buildEChartsTheme(theme: AppTheme): Record<string, unknown> {
  return {
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: theme.typography.fontFamily.primary,
      color: theme.colors.text3,
      fontSize: 11,
    },
    title: {
      textStyle: { color: theme.colors.text2 },
    },
    legend: {
      textStyle: {
        color: theme.colors.text3,
        fontSize: 10,
      },
    },
    tooltip: {
      backgroundColor: theme.colors.bg2,
      borderColor: theme.colors.border,
      textStyle: {
        color: theme.colors.text,
        fontSize: 11,
        fontFamily: theme.typography.fontFamily.primary,
      },
    },
    categoryAxis: {
      axisLine: { lineStyle: { color: theme.colors.border } },
      axisTick: { lineStyle: { color: theme.colors.border } },
      axisLabel: {
        color: theme.colors.text3,
        fontSize: 10,
        fontFamily: theme.typography.fontFamily.mono,
      },
      splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.3 } },
    },
    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: theme.colors.text3,
        fontSize: 10,
        fontFamily: theme.typography.fontFamily.mono,
      },
      splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' } },
    },
    grid: {
      left: 10,
      right: 20,
      top: 10,
      bottom: 10,
      containLabel: true,
    },
  }
}

// ─── テーマ名管理 ────────────────────────────────────────

const THEME_DARK = 'shiire-dark'
const THEME_LIGHT = 'shiire-light'
let registeredDark = false
let registeredLight = false

function ensureThemeRegistered(theme: AppTheme): string {
  const name = theme.mode === 'dark' ? THEME_DARK : THEME_LIGHT
  const registered = theme.mode === 'dark' ? registeredDark : registeredLight
  if (!registered) {
    echarts.registerTheme(name, buildEChartsTheme(theme))
    if (theme.mode === 'dark') registeredDark = true
    else registeredLight = true
  }
  return name
}

// ─── コンポーネント ──────────────────────────────────────

interface EChartProps {
  /** ECharts option オブジェクト（Logic.ts で生成） */
  readonly option: EChartsOption
  /** チャート高さ (px) */
  readonly height?: number
  /** クリックイベント */
  readonly onClick?: (params: Record<string, unknown>) => void
  /** ブラシ選択完了イベント */
  readonly onBrushEnd?: (params: Record<string, unknown>) => void
  /** aria-label */
  readonly ariaLabel?: string
}

export const EChart = memo(function EChart({
  option,
  height = 300,
  onClick,
  onBrushEnd,
  ariaLabel,
}: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const theme = useTheme() as AppTheme
  const themeName = ensureThemeRegistered(theme)

  // 初期化 + option 更新
  useEffect(() => {
    if (!containerRef.current) return

    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current, themeName, {
        renderer: 'canvas',
      })
    }

    chartRef.current.setOption(option, { notMerge: true })

    return () => {
      // コンポーネントアンマウント時に破棄
    }
  }, [option, themeName])

  // リサイズ対応
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    const observer = new ResizeObserver(() => {
      chart.resize()
    })

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  // テーマ変更時に再初期化
  useEffect(() => {
    if (!containerRef.current || !chartRef.current) return
    chartRef.current.dispose()
    chartRef.current = echarts.init(containerRef.current, themeName, {
      renderer: 'canvas',
    })
    chartRef.current.setOption(option, { notMerge: true })
    // option は別の useEffect で適用。テーマ変更時のみ再初期化するため意図的に除外
  }, [themeName]) // eslint-disable-line react-hooks/exhaustive-deps

  // クリックイベント
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !onClick) return

    chart.on('click', onClick)
    return () => {
      chart.off('click', onClick)
    }
  }, [onClick])

  // ブラシ選択完了イベント
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !onBrushEnd) return

    chart.on('brushEnd', onBrushEnd)
    return () => {
      chart.off('brushEnd', onBrushEnd)
    }
  }, [onBrushEnd])

  // アンマウント時に破棄
  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height }} aria-label={ariaLabel} />
})

export type { EChartsOption }
