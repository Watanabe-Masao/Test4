/**
 * 予算進捗カード (L1: 判断)
 *
 * 予算に対する実績の進捗率・着地見込みを一目で判断できるカード。
 * BudgetVsActualChart から進捗表示のみを抽出。
 *
 * 表示項目:
 * - 進捗バー（達成率）
 * - 実績累計 / 予算 / 着地見込み
 * - 一言判断文（自動生成）
 */
import { memo } from 'react'
import { useChartTheme, useCurrencyFormatter, toPct } from './chartTheme'
import { ChartCard } from './ChartCard'
import {
  MetricsRow,
  Metric,
  MetricLabel,
  MetricValue,
  ProgressBarWrap,
  ProgressTrack,
  ProgressFill,
  ProgressLabel,
} from './BudgetProgressCard.styles'

interface DataPoint {
  day: number
  actualCum: number
  budgetCum: number
}

interface Props {
  readonly data: readonly DataPoint[]
  readonly budget: number
  readonly salesDays?: number
  readonly daysInMonth?: number
}

export const BudgetProgressCard = memo(function BudgetProgressCard({
  data,
  budget,
  salesDays,
  daysInMonth,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()

  const latestWithSales = [...data].reverse().find((d) => d.actualCum > 0)
  if (!latestWithSales || budget <= 0) return null

  const currentActual = latestWithSales.actualCum
  const currentBudgetCum = latestWithSales.budgetCum
  const currentDay = latestWithSales.day

  const progressRate = currentBudgetCum > 0 ? currentActual / currentBudgetCum : 0

  const totalDays = daysInMonth ?? data.length
  const effectiveSalesDays = salesDays ?? currentDay
  const avgDaily = effectiveSalesDays > 0 ? currentActual / effectiveSalesDays : 0
  const remainingDays = totalDays - currentDay
  const projected = currentActual + avgDaily * remainingDays
  const projectedAchievement = budget > 0 ? projected / budget : 0

  const getStatusColor = (rate: number) => {
    if (rate >= 1.0) return ct.semantic.positive
    if (rate >= 0.9) return ct.semantic.markupRate
    return ct.semantic.negative
  }

  const paceColor = getStatusColor(progressRate)
  const projColor = getStatusColor(projectedAchievement)

  const subtitle =
    projectedAchievement >= 1.0
      ? `進捗率${toPct(progressRate)}、月末着地は予算の${toPct(projectedAchievement)}見込み`
      : projectedAchievement >= 0.9
        ? `進捗率${toPct(progressRate)}、着地見込みは予算をやや下回る可能性`
        : `進捗率${toPct(progressRate)}、着地見込みが予算を大きく下回っています`

  return (
    <ChartCard title="予算進捗" subtitle={subtitle} ariaLabel="予算進捗">
      <MetricsRow>
        <Metric>
          <MetricLabel>実績累計</MetricLabel>
          <MetricValue>{fmt(currentActual)}</MetricValue>
        </Metric>
        <ProgressBarWrap>
          <ProgressLabel>
            <span>予算進捗 {toPct(progressRate)}</span>
            <span>
              {fmt(currentBudgetCum)} / {fmt(budget)}
            </span>
          </ProgressLabel>
          <ProgressTrack>
            <ProgressFill $pct={progressRate * 100} $color={paceColor} />
          </ProgressTrack>
        </ProgressBarWrap>
        <Metric>
          <MetricLabel>着地見込</MetricLabel>
          <MetricValue $color={projColor}>
            {fmt(projected)} ({toPct(projectedAchievement)})
          </MetricValue>
        </Metric>
      </MetricsRow>
    </ChartCard>
  )
})
