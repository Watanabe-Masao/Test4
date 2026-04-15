/**
 * WeatherAnalysisPanel — 天気選択時の天気-売上相関分析パネル
 *
 * 既存 WeatherCorrelationChart をサブパネルとして配置。
 * 売上・客数データは DuckDB store_day_summary から取得。
 * @responsibility R:chart-view
 */
/**
 * @migration P5: plan hook 経由に移行済み（旧: useDuckDBStoreDaySummary 直接 import）
 * @migration unify-period-analysis Phase 6 Step D: presentation 側での
 *            日別再集計 / toDateKeyFromParts ad hoc 組み立てを
 *            features/weather/application/projections/buildDailySalesProjection.ts
 *            に移管。本 component は helper を呼ぶだけ
 */
import { useMemo, memo } from 'react'
import styled from 'styled-components'
import type { DailyWeatherSummary } from '@/domain/models/record'
import { buildBaseQueryInput } from '@/application/hooks/plans/buildBaseQueryInput'
import { useWeatherAnalysisPlan, buildDailySalesProjection } from '@/features/weather'
import type { DuckQueryContext } from './SubAnalysisPanel'
import { WeatherCorrelationChart } from './WeatherCorrelationChart'

interface Props {
  readonly ctx: DuckQueryContext
  readonly weatherDaily?: readonly DailyWeatherSummary[]
}

export const WeatherAnalysisPanel = memo(function WeatherAnalysisPanel({
  ctx,
  weatherDaily,
}: Props) {
  const { queryExecutor, currentDateRange, selectedStoreIds } = ctx

  // Phase 5 横展開: query input 組み立ては共通 builder に集約
  const input = useMemo(
    () => buildBaseQueryInput(currentDateRange, selectedStoreIds),
    [currentDateRange, selectedStoreIds],
  )

  const { data: output } = useWeatherAnalysisPlan(queryExecutor, input)

  // Phase 6 Step D: 日別 sales / customers projection は helper に集約。
  // presentation では日別再集計 / dateKey 生成を行わない
  // (weatherCorrelationProjectionGuard で強制)。
  const salesDaily = useMemo(
    () => buildDailySalesProjection(output?.records ?? []),
    [output?.records],
  )

  if (!weatherDaily || weatherDaily.length === 0) {
    return (
      <NoData>
        <NoDataTitle>天気データがありません</NoDataTitle>
        <NoDataDesc>
          設定画面で店舗の所在地（緯度・経度）を登録すると、
          気象庁の過去天気データ（ETRN）を自動取得し、売上との相関を分析できます。
        </NoDataDesc>
      </NoData>
    )
  }

  return <WeatherCorrelationChart weatherDaily={weatherDaily} salesDaily={salesDaily} embedded />
})

// ── Styles ──

const NoData = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.text4};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]};
`

const NoDataTitle = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const NoDataDesc = styled.div`
  font-size: 0.65rem;
  line-height: 1.6;
  max-width: 400px;
  margin: 0 auto;
`
