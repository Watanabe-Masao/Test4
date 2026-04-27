/**
 * YoYChart — Option Builder 層
 *
 * unify-period-analysis Phase 5 三段構造: YoYChart の ViewModel
 * (`YoYChartDataPoint[]` / `WaterfallItem[]`) を受け取り、ECharts の option
 * オブジェクトを組み立てる pure function 群。
 *
 * 責務:
 *   - ViewModel → ECharts option 変換
 *   - theme / color palette の適用
 *   - xAxis / yAxis / tooltip / legend 等の構成
 *
 * 非責務:
 *   - データ集計・差分計算 (YoYChartLogic.ts の責務)
 *   - React hooks / side effect
 *   - query 実行
 *
 * ## 三段構造における位置づけ
 *
 * ```
 * ReadModel (YoyDailyRow[])
 *   ↓ YoYChartLogic.ts (buildYoYChartData / buildYoYWaterfallData / computeYoYSummary)
 * ViewModel (YoYChartDataPoint[] / WaterfallItem[] / YoYSummary)
 *   ↓ YoYChartOptionBuilder.ts (buildLineOption / buildWaterfallOption)  ← 本ファイル
 * ECharts Option
 *   ↓ YoYChart.tsx (Controller)
 * View / DOM
 * ```
 *
 * data builder (YoYChartLogic.ts) と option builder (本ファイル) を分離する
 * ことで、chart component は「状態 + orchestration」のみに薄化される。
 *
 * @responsibility R:unclassified
 */
import type { EChartsOption } from './EChart'
import type { AppTheme } from '@/presentation/theme/theme'
import type { YoYChartDataPoint, WaterfallItem } from './YoYChartLogic'
import {
  yenYAxis,
  standardGrid,
  standardTooltip,
  standardLegend,
  toCommaYen,
} from './echartsOptionBuilders'
import { categoryXAxis, lineDefaults } from './builders'
import { sc } from '@/presentation/theme/semanticColors'

/**
 * 日次比較 (line) モード用の ECharts option を構築する。
 *
 * @param chartData 日別当年/前年/差分データ (ViewModel)
 * @param theme 現在の AppTheme (色・フォント等)
 * @returns ECharts option オブジェクト
 */
export function buildLineOption(
  chartData: readonly YoYChartDataPoint[],
  theme: AppTheme,
): EChartsOption {
  const dates = chartData.map((d) => d.date)
  return {
    grid: standardGrid(),
    tooltip: standardTooltip(theme),
    legend: standardLegend(theme),
    xAxis: categoryXAxis(dates, theme),
    yAxis: yenYAxis(theme),
    series: [
      {
        name: '前年差',
        type: 'bar',
        data: chartData.map((d) => d.diff),
        itemStyle: { color: theme.colors.palette.success, opacity: 0.4 },
        barWidth: 6,
      },
      {
        name: '前年売上',
        type: 'line',
        data: chartData.map((d) => d.prevSales),
        ...lineDefaults({ color: theme.colors.palette.slate, width: 1.5, dashed: true }),
        connectNulls: true,
      },
      {
        name: '当年売上',
        type: 'line',
        data: chartData.map((d) => d.curSales),
        ...lineDefaults({ color: theme.colors.palette.primary, width: 2 }),
        symbolSize: 4,
      },
    ],
  }
}

/**
 * ウォーターフォール (waterfall) モード用の ECharts option を構築する。
 *
 * スタックバー方式で、透明ベース + 表示バーの 2 series を組み合わせて
 * 浮遊バー効果を表現する。
 *
 * @param waterfallData ウォーターフォール用 ViewModel (base + bar + value)
 * @param theme 現在の AppTheme
 * @returns ECharts option オブジェクト
 */
export function buildWaterfallOption(
  waterfallData: readonly WaterfallItem[],
  theme: AppTheme,
): EChartsOption {
  const names = waterfallData.map((d) => d.name)
  return {
    grid: { ...standardGrid(), bottom: 50 },
    tooltip: {
      ...standardTooltip(theme),
      formatter: (params: unknown) => {
        const arr = Array.isArray(params) ? params : [params]
        // スタックバー方式: seriesIndex=1 が表示バー
        const p =
          (arr as { dataIndex: number; seriesIndex?: number; name: string }[]).find(
            (s) => s.seriesIndex === 1,
          ) ?? (arr[0] as { dataIndex: number; name: string } | undefined)
        if (!p) return ''
        const item = waterfallData[p.dataIndex]
        if (!item) return ''
        return `${p.name}<br/>${toCommaYen(item.value)}`
      },
    },
    xAxis: Object.assign({}, categoryXAxis(names, theme), {
      axisLabel: {
        ...(categoryXAxis(names, theme).axisLabel as object),
        rotate: 45,
      },
    }),
    yAxis: yenYAxis(theme),
    series: [
      // 透明ベース (ウォーターフォールの浮遊バー効果)
      {
        type: 'bar',
        stack: 'wf',
        data: waterfallData.map((d) => d.base),
        itemStyle: { color: 'transparent', borderColor: 'transparent' },
        emphasis: { disabled: true },
        barWidth: '60%',
      },
      // 表示バー
      {
        type: 'bar',
        stack: 'wf',
        data: waterfallData.map((d) => {
          const color = d.isTotal
            ? theme.colors.palette.primary
            : d.value >= 0
              ? sc.positive
              : sc.negative
          return {
            value: d.bar,
            itemStyle: { color, opacity: d.isTotal ? 0.7 : 0.85 },
          }
        }),
        barWidth: '60%',
      },
    ],
  }
}
