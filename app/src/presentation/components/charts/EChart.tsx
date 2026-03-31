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
import { useRef, useEffect, useCallback, memo } from 'react'
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
  MarkAreaComponent,
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
import { chartFontSize } from '@/presentation/theme/tokens'

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
  MarkAreaComponent,
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
      fontSize: chartFontSize.tooltip,
    },
    title: {
      textStyle: { color: theme.colors.text2 },
    },
    legend: {
      textStyle: {
        color: theme.colors.text3,
        fontSize: chartFontSize.axis,
      },
    },
    tooltip: {
      backgroundColor: theme.colors.bg2,
      borderColor: theme.colors.border,
      textStyle: {
        color: theme.colors.text,
        fontSize: chartFontSize.tooltip,
        fontFamily: theme.typography.fontFamily.primary,
      },
    },
    categoryAxis: {
      axisLine: { lineStyle: { color: theme.colors.border } },
      axisTick: { lineStyle: { color: theme.colors.border } },
      axisLabel: {
        color: theme.colors.text3,
        fontSize: chartFontSize.axis,
        fontFamily: theme.typography.fontFamily.mono,
      },
      splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.3 } },
    },
    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: theme.colors.text3,
        fontSize: chartFontSize.axis,
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
  /** ダブルクリックイベント */
  readonly onDblClick?: (params: Record<string, unknown>) => void
  /** ブラシ選択完了イベント */
  readonly onBrushEnd?: (params: Record<string, unknown>) => void
  /** ブラシモード中のクリック検出を有効にする（単一grid + category軸チャート専用） */
  readonly enableBrushClickEmulation?: boolean
  /** ブラシ選択後にハイライトを維持する（pendingRange 表示中など） */
  readonly keepBrushSelection?: boolean
  /** aria-label */
  readonly ariaLabel?: string
}

export const EChart = memo(function EChart({
  option,
  height = 300,
  onClick,
  onDblClick,
  onBrushEnd,
  enableBrushClickEmulation,
  keepBrushSelection,
  ariaLabel,
}: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const theme = useTheme() as AppTheme
  const themeName = ensureThemeRegistered(theme)

  // リサイズ対応（containerRef に紐づけるため初期化より先に設定）
  const observerRef = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => {
      chartRef.current?.resize()
    })
    observer.observe(container)
    observerRef.current = observer

    return () => {
      observer.disconnect()
      observerRef.current = null
    }
  }, [])

  // 初期化 + option 更新
  useEffect(() => {
    if (!containerRef.current) return

    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current, themeName, {
        renderer: 'canvas',
      })
    }

    chartRef.current.setOption(
      {
        ...option,
        animation: true,
        animationDuration: 500,
        animationDurationUpdate: 400,
        animationEasing: 'cubicOut',
        animationEasingUpdate: 'cubicInOut',
      },
      { notMerge: true },
    )

    // 初期化直後にリサイズを実行し、レイアウト確定後のサイズを反映
    requestAnimationFrame(() => {
      chartRef.current?.resize()
    })
  }, [option, themeName])

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

  // ダブルクリックイベント
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !onDblClick) return
    chart.on('dblclick', onDblClick)
    return () => {
      chart.off('dblclick', onDblClick)
    }
  }, [onDblClick])

  // ブラシ選択完了イベント + 自動アクティベーション
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !onBrushEnd) return

    const handler = (params: unknown) => {
      // ユーザーコールバック実行
      ;(onBrushEnd as (p: unknown) => void)(params)

      if (!keepBrushSelection) {
        // 選択ハイライトをクリア（通常のPCドラッグ選択の挙動を再現）
        chart.dispatchAction({ type: 'brush', areas: [] })

        // 次回選択に備えて lineX モードを再アクティベート
        chart.dispatchAction({
          type: 'takeGlobalCursor',
          key: 'brush',
          brushOption: { brushType: 'lineX', brushMode: 'single' },
        })
      }
    }

    chart.on('brushEnd', handler)

    // brush が option に含まれている場合、lineX モードを自動アクティベート
    // toolbox: [] で UI ボタンがないため、dispatchAction で直接起動する
    chart.dispatchAction({
      type: 'takeGlobalCursor',
      key: 'brush',
      brushOption: { brushType: 'lineX', brushMode: 'single' },
    })

    return () => {
      chart.off('brushEnd', handler)
    }
  }, [onBrushEnd, keepBrushSelection])

  // keepBrushSelection が false に戻ったらハイライトをクリアし、ブラシモードを再起動
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !onBrushEnd || keepBrushSelection) return
    chart.dispatchAction({ type: 'brush', areas: [] })
    chart.dispatchAction({
      type: 'takeGlobalCursor',
      key: 'brush',
      brushOption: { brushType: 'lineX', brushMode: 'single' },
    })
  }, [keepBrushSelection, onBrushEnd])

  // ブラシモード中のクリック検出
  // brush が takeGlobalCursor でアクティブな間、通常の click イベントが抑制される。
  // mousedown/mouseup で素早いクリック（移動なし）を検出し、onClick を手動発火する。
  const mouseStateRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const handleMouseDown = useCallback((e: MouseEvent) => {
    mouseStateRef.current = { x: e.clientX, y: e.clientY, time: Date.now() }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const chart = chartRef.current
    if (!container || !chart || !onClick || !onBrushEnd || !enableBrushClickEmulation) return

    const handleMouseUp = (e: MouseEvent) => {
      const state = mouseStateRef.current
      if (!state) return
      mouseStateRef.current = null

      const dx = Math.abs(e.clientX - state.x)
      const dy = Math.abs(e.clientY - state.y)
      const dt = Date.now() - state.time

      // 素早いクリック（移動 < 5px、時間 < 300ms）→ 単一選択として処理
      if (dx < 5 && dy < 5 && dt < 300) {
        const rect = container.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        try {
          const point = chart.convertFromPixel('grid', [x, y])
          if (point) {
            const idx = Math.round(point[0])
            const opt = chart.getOption() as { xAxis?: { data?: string[] }[] }
            const xData = Array.isArray(opt.xAxis) ? opt.xAxis[0]?.data : undefined
            if (xData && idx >= 0 && idx < xData.length) {
              onClick({ name: xData[idx], dataIndex: idx })
            }
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('[EChart] brush click emulation skipped:', error)
          }
        }
      }
    }

    container.addEventListener('mousedown', handleMouseDown)
    container.addEventListener('mouseup', handleMouseUp)
    return () => {
      container.removeEventListener('mousedown', handleMouseDown)
      container.removeEventListener('mouseup', handleMouseUp)
    }
  }, [onClick, onBrushEnd, handleMouseDown, enableBrushClickEmulation])

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
