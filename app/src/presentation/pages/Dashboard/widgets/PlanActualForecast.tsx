import type { ReactNode } from 'react'
import { sc } from '@/presentation/theme/semanticColors'
import { formatCurrency, formatPercent, formatPointDiff, safeDivide } from '@/domain/calculations/utils'
import type { WidgetContext } from './types'
import {
  ExecGrid, ExecColumn, ExecColHeader, ExecColTag, ExecColTitle, ExecColSub,
  ExecBody, ExecRow, ExecLabel, ExecVal, ExecSub, ExecDividerLine,
} from '../DashboardPage.styles'

function ExecMetric({ label, value, sub, subColor }: {
  label: string
  value: string
  sub?: string
  subColor?: string
}) {
  return (
    <div>
      <ExecRow>
        <ExecLabel>{label}</ExecLabel>
        <ExecVal>{value}</ExecVal>
      </ExecRow>
      {sub && <ExecSub $color={subColor}>{sub}</ExecSub>}
    </div>
  )
}

export function renderPlanActualForecast(ctx: WidgetContext): ReactNode {
  const r = ctx.result
  const { daysInMonth } = ctx

  let elapsedBudget = 0
  for (let d = 1; d <= r.elapsedDays; d++) {
    elapsedBudget += r.budgetDaily.get(d) ?? 0
  }

  const actualGP = r.invMethodGrossProfit ?? r.estMethodMargin
  const actualGPRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate

  const elapsedGPBudget = r.grossProfitBudget > 0
    ? r.grossProfitBudget * safeDivide(r.elapsedDays, daysInMonth)
    : 0

  const remainingDays = daysInMonth - r.elapsedDays
  const dailyAvgGP = r.salesDays > 0 ? actualGP / r.salesDays : 0
  const projectedGP = actualGP + dailyAvgGP * remainingDays

  const salesAchievement = safeDivide(r.totalSales, elapsedBudget)
  const progressRatio = safeDivide(
    safeDivide(r.totalSales, r.budget),
    safeDivide(r.elapsedDays, daysInMonth),
  )
  const projectedGPAchievement = safeDivide(projectedGP, r.grossProfitBudget)

  return (
    <ExecGrid>
      <ExecColumn>
        <ExecColHeader $color="#6366f1">
          <ExecColTag>PLAN</ExecColTag>
          <ExecColTitle>前提</ExecColTitle>
          <ExecColSub>予算・在庫</ExecColSub>
        </ExecColHeader>
        <ExecBody>
          <ExecMetric label="月間売上予算" value={formatCurrency(r.budget)} />
          <ExecMetric label="月間粗利額予算" value={formatCurrency(r.grossProfitBudget)} />
          <ExecMetric label="月間粗利率予算" value={formatPercent(r.grossProfitRateBudget)} />
          <ExecDividerLine />
          <ExecMetric label="期首在庫" value={formatCurrency(r.openingInventory)} />
          <ExecMetric label="期末在庫目標" value={formatCurrency(r.closingInventory)} />
        </ExecBody>
      </ExecColumn>

      <ExecColumn>
        <ExecColHeader $color="#22c55e">
          <ExecColTag>ACTUAL</ExecColTag>
          <ExecColTitle>現在地</ExecColTitle>
          <ExecColSub>期中実績（{r.elapsedDays}日経過 / {r.salesDays}営業日）</ExecColSub>
        </ExecColHeader>
        <ExecBody>
          <ExecMetric label="期中売上予算" value={formatCurrency(elapsedBudget)} />
          <ExecMetric
            label="期中売上実績"
            value={formatCurrency(r.totalSales)}
            sub={`差異: ${formatCurrency(r.totalSales - elapsedBudget)}`}
            subColor={sc.cond(r.totalSales >= elapsedBudget)}
          />
          <ExecMetric
            label="売上達成率"
            value={formatPercent(salesAchievement)}
            sub={`進捗比: ${formatPercent(progressRatio)}`}
          />
          {ctx.prevYear.hasPrevYear && ctx.prevYear.totalSales > 0 && (() => {
            const pyRatio = r.totalSales / ctx.prevYear.totalSales
            return (
              <>
                <ExecDividerLine />
                <ExecMetric
                  label="前年同曜日売上"
                  value={formatCurrency(ctx.prevYear.totalSales)}
                />
                <ExecMetric
                  label="前年同曜日比"
                  value={formatPercent(pyRatio)}
                  subColor={sc.cond(pyRatio >= 1)}
                />
              </>
            )
          })()}
          <ExecDividerLine />
          <ExecMetric
            label="期中粗利額実績"
            value={formatCurrency(actualGP)}
            sub={`差異: ${formatCurrency(actualGP - elapsedGPBudget)}`}
            subColor={sc.cond(actualGP >= elapsedGPBudget)}
          />
          <ExecMetric
            label="期中粗利率実績"
            value={formatPercent(actualGPRate)}
            sub={`予算比: ${formatPointDiff(actualGPRate - r.grossProfitRateBudget)}`}
            subColor={sc.cond(actualGPRate >= r.grossProfitRateBudget)}
          />
          {r.totalConsumable > 0 && (() => {
            const isInvMethod = r.invMethodGrossProfitRate != null
            const beforeRate = isInvMethod
              ? r.invMethodGrossProfitRate!
              : safeDivide(r.estMethodMargin + r.totalConsumable, r.totalCoreSales, 0)
            const afterRate = isInvMethod
              ? safeDivide(r.invMethodGrossProfit! - r.totalConsumable, r.totalSales, 0)
              : r.estMethodMarginRate
            return (
              <>
                <ExecMetric
                  label="原価算入比（消耗品費）"
                  value={formatCurrency(r.totalConsumable)}
                />
                <ExecMetric
                  label="粗利率（消耗品控除前）"
                  value={formatPercent(beforeRate)}
                />
                <ExecMetric
                  label="原算後粗利率"
                  value={formatPercent(afterRate)}
                  sub={`減算: ${formatPointDiff(beforeRate - afterRate)}`}
                />
              </>
            )
          })()}
        </ExecBody>
      </ExecColumn>

      <ExecColumn>
        <ExecColHeader $color="#f59e0b">
          <ExecColTag>FORECAST</ExecColTag>
          <ExecColTitle>着地</ExecColTitle>
          <ExecColSub>営業日ベース予測</ExecColSub>
        </ExecColHeader>
        <ExecBody>
          <ExecMetric
            label="月末売上着地"
            value={formatCurrency(r.projectedSales)}
            sub={`予算差: ${formatCurrency(r.projectedSales - r.budget)}`}
            subColor={sc.cond(r.projectedSales >= r.budget)}
          />
          <ExecMetric
            label="着地売上達成率"
            value={formatPercent(r.projectedAchievement)}
          />
          <ExecDividerLine />
          <ExecMetric
            label="月末粗利着地"
            value={formatCurrency(projectedGP)}
            sub={`予算差: ${formatCurrency(projectedGP - r.grossProfitBudget)}`}
            subColor={sc.cond(projectedGP >= r.grossProfitBudget)}
          />
          <ExecMetric
            label="着地粗利達成率"
            value={formatPercent(projectedGPAchievement)}
          />
        </ExecBody>
      </ExecColumn>
    </ExecGrid>
  )
}
