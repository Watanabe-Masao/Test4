/**
 * SeasonalBenchmarkChart — pure data builder
 *
 * useMemo body の pure 計算抽出 (ADR-D-003 PR4)。
 *
 * chartRenderingStructureGuard (G5-CRT) — chart component 内 inline builder を
 * 禁ずるため別 file に切り出している。
 *
 * @responsibility R:utility
 */
import { analyzeTrend } from '@/application/hooks/useStatistics'
import type { MonthlyDataPoint, TrendAnalysisResult } from '@/application/hooks/useStatistics'

const MONTH_LABELS_INTERNAL = [
  '1月',
  '2月',
  '3月',
  '4月',
  '5月',
  '6月',
  '7月',
  '8月',
  '9月',
  '10月',
  '11月',
  '12月',
] as const

export interface SeasonalChartPoint {
  readonly month: string
  readonly seasonality: number
  readonly isCurrent: boolean
}

export interface SeasonalBenchmarkResult {
  readonly chartData: readonly SeasonalChartPoint[]
  readonly trend: TrendAnalysisResult | null
  readonly currentSeasonality: number
  readonly peakMonth: number
  readonly troughMonth: number
}

export function buildSeasonalBenchmark(
  monthlyData: readonly MonthlyDataPoint[],
  currentMonth: number,
  monthLabels: readonly string[] = MONTH_LABELS_INTERNAL,
): SeasonalBenchmarkResult {
  if (monthlyData.length === 0)
    return { chartData: [], trend: null, currentSeasonality: 1, peakMonth: 1, troughMonth: 1 }
  const trend = analyzeTrend(monthlyData)
  const si = trend.seasonalIndex

  const chartData = monthLabels.map((label, i) => ({
    month: label,
    seasonality: si[i],
    isCurrent: i + 1 === currentMonth,
  }))

  let peakIdx = 0
  let troughIdx = 0
  for (let i = 0; i < 12; i++) {
    if (si[i] > si[peakIdx]) peakIdx = i
    if (si[i] < si[troughIdx]) troughIdx = i
  }

  return {
    chartData,
    trend,
    currentSeasonality: si[currentMonth - 1],
    peakMonth: peakIdx + 1,
    troughMonth: troughIdx + 1,
  }
}
