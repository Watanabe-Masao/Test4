/**
 * ECharts グリッドプリセット
 *
 * チャートの描画領域（margin）を用途別に定義。
 * カスタムが必要な場合はスプレッドで上書き: { ...gridPresets.standard, top: 50 }
 */
import type { GridComponentOption } from 'echarts'

export const gridPresets = {
  /** 標準（containLabel 有効、凡例スペース確保） */
  standard: {
    left: 10,
    right: 20,
    top: 30,
    bottom: 20,
    containLabel: true,
  },
  /** コンパクト（小型チャート、ダッシュボードウィジェット向け） */
  compact: {
    left: 5,
    right: 10,
    top: 20,
    bottom: 14,
    containLabel: true,
  },
  /** 水平バー（左にカテゴリラベルのスペース確保） */
  horizontalBar: {
    left: 10,
    right: 20,
    top: 10,
    bottom: 16,
    containLabel: true,
  },
  /** ヒートマップ（左右にラベル、containLabel 無効） */
  heatmap: {
    left: 50,
    right: 20,
    top: 10,
    bottom: 30,
    containLabel: false,
  },
} as const satisfies Record<string, GridComponentOption>

/** 後方互換: standardGrid() */
export function standardGrid(): GridComponentOption {
  return { ...gridPresets.standard }
}
