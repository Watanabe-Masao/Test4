/**
 * useMultiMovingAverage — 複数指標 × 当年/前年の移動平均を一括取得
 *
 * IntegratedSalesChart の useState/useMemo ガード上限を回避するため、
 * 4つの useMovingAverageOverlay 呼び出しを1つの custom hook に集約。
 *
 * 返却:
 *   salesCur    — 当年売上7日MA
 *   salesPrev   — 前年売上7日MA
 *   metricCur   — 当年右軸指標7日MA（quantity/customers/discount）
 *   metricPrev  — 前年右軸指標7日MA
 */
import { useMemo } from 'react'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { AnalysisMetric } from '@/domain/models/temporal'
import { useMovingAverageOverlay } from './useTemporalAnalysis'
import type { DailySeriesPoint } from '@/application/services/temporal/DailySeriesTypes'

export interface MovingAverageOverlays {
  readonly salesCur?: readonly DailySeriesPoint[]
  readonly salesPrev?: readonly DailySeriesPoint[]
  readonly metricCur?: readonly DailySeriesPoint[]
  readonly metricPrev?: readonly DailySeriesPoint[]
  readonly metricLabel?: string
}

const METRIC_LABELS: Record<string, string> = {
  quantity: '点数',
  customers: '客数',
  discount: '売変',
}

/**
 * @param secondaryMetric 右軸指標に対応する AnalysisMetric（null = MA なし）
 */
/**
 * 前年MA series の dateKey を当年にリマッピングする。
 * 前年と当年の日数ベースで1:1マッピング（同曜日寄せ対応）。
 */
function remapPrevYearSeries(
  prevSeries: readonly DailySeriesPoint[] | undefined,
  curSeries: readonly DailySeriesPoint[] | undefined,
): readonly DailySeriesPoint[] | undefined {
  if (!prevSeries?.length || !curSeries?.length) return undefined
  // 前年dateKey → 当年dateKey のマッピング（日数順で1:1対応）
  const prevKeys = prevSeries.map((p) => p.dateKey).sort()
  const curKeys = curSeries.map((p) => p.dateKey).sort()
  const keyMap = new Map<string, string>()
  for (let i = 0; i < prevKeys.length && i < curKeys.length; i++) {
    keyMap.set(prevKeys[i], curKeys[i])
  }
  // curSeries を dateKey → point で索引（date も当年側に揃える）
  const curByKey = new Map(curSeries.map((p) => [p.dateKey, p]))
  return prevSeries.map((p) => {
    const mappedKey = keyMap.get(p.dateKey)
    if (!mappedKey) return p
    const curPoint = curByKey.get(mappedKey)
    return {
      ...p,
      dateKey: mappedKey,
      date: curPoint?.date ?? p.date,
    }
  })
}

export function useMultiMovingAverage(
  executor: QueryExecutor | null,
  currentDateRange: DateRange,
  selectedStoreIds: ReadonlySet<string>,
  prevYearScope: PrevYearScope | undefined,
  secondaryMetric: AnalysisMetric | null,
  showMA: boolean,
): MovingAverageOverlays {
  const curScope = useMemo(
    () => ({ currentDateRange, selectedStoreIds }),
    [currentDateRange, selectedStoreIds],
  )

  const prevScope = useMemo(
    () => ({
      currentDateRange: prevYearScope?.dateRange as DateRange | undefined,
      selectedStoreIds,
    }),
    [prevYearScope, selectedStoreIds],
  )

  const hasPrev = prevYearScope != null
  const hasMetric = secondaryMetric != null && secondaryMetric !== 'sales'

  // extraMetrics: 売上MAクエリに追加メトリックを同梱（1クエリで複数MA）
  const extraMetrics = useMemo(
    () => (hasMetric && secondaryMetric ? [secondaryMetric] : []),
    [hasMetric, secondaryMetric],
  )

  // 1. 当年MA（売上 + extraMetrics を1クエリで取得）
  const curConfig = useMemo(
    () => ({
      metric: 'sales' as const,
      windowSize: 7,
      policy: 'strict' as const,
      extraMetrics,
    }),
    [extraMetrics],
  )
  const { data: curOut } = useMovingAverageOverlay(executor, curScope, showMA, curConfig)

  // 2. 前年MA（売上 + extraMetrics を1クエリで取得）
  //
  // policy: 'strict' — windowSize の 7 日すべてが揃わない日は MA を null にする。
  // 前年 lead-in（例: 2025-02-23..28）は DuckDB に is_prev_year=true 行として
  // ロードされていないことが多く、'partial' では前年の先頭 6 日が少数サンプルで
  // 誤った平均値になる。'strict' にすることで当年 MA と同じ意味論（先頭 6 日は
  // 表示なし、7 日目以降は正確な 7 日平均）に揃える。
  const prevConfig = useMemo(
    () => ({
      metric: 'sales' as const,
      windowSize: 7,
      policy: 'strict' as const,
      isPrevYear: true,
      extraMetrics,
    }),
    [extraMetrics],
  )
  const { data: prevOut } = useMovingAverageOverlay(
    executor,
    prevScope,
    showMA && hasPrev,
    prevConfig,
  )

  return useMemo<MovingAverageOverlays>(
    () => ({
      salesCur: curOut?.anchorSeries,
      salesPrev: remapPrevYearSeries(prevOut?.anchorSeries, curOut?.anchorSeries),
      metricCur: hasMetric && secondaryMetric ? curOut?.extraSeries?.[secondaryMetric] : undefined,
      metricPrev:
        hasMetric && secondaryMetric
          ? remapPrevYearSeries(
              prevOut?.extraSeries?.[secondaryMetric],
              curOut?.extraSeries?.[secondaryMetric],
            )
          : undefined,
      metricLabel: secondaryMetric ? METRIC_LABELS[secondaryMetric] : undefined,
    }),
    [curOut, prevOut, hasMetric, secondaryMetric],
  )
}
