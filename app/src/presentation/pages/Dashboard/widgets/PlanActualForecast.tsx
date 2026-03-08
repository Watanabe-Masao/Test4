import type { ReactNode } from 'react'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { formatCurrency, formatPercent, formatPointDiff } from '@/domain/formatting'
import {
  safeDivide,
  calculateTransactionValue,
  getEffectiveGrossProfitRate,
} from '@/domain/calculations/utils'
import type { WidgetContext } from './types'
import {
  ExecGrid,
  ExecColumn,
  ExecColHeader,
  ExecColTag,
  ExecColTitle,
  ExecColSub,
  ExecBody,
  ExecDividerLine,
} from '../DashboardPage.styles'
import { ExecMetric } from './ExecMetric'

export function renderPlanActualForecast(ctx: WidgetContext): ReactNode {
  const r = ctx.result
  const { daysInMonth } = ctx

  let elapsedBudget = 0
  for (let d = 1; d <= r.elapsedDays; d++) {
    elapsedBudget += r.budgetDaily.get(d) ?? 0
  }

  const actualGP = r.invMethodGrossProfit ?? r.estMethodMargin
  const actualGPRate = getEffectiveGrossProfitRate(r)

  const elapsedGPBudget = r.grossProfitBudget * r.budgetElapsedRate
  const remainingDays = daysInMonth - r.elapsedDays
  const dailyAvgGP = r.salesDays > 0 ? actualGP / r.salesDays : 0

  const salesAchievement = safeDivide(r.totalSales, elapsedBudget)
  const progressRatio = safeDivide(
    safeDivide(r.totalSales, r.budget),
    safeDivide(r.elapsedDays, daysInMonth),
  )

  return (
    <ExecGrid>
      <ExecColumn>
        <ExecColHeader $color={palette.primary}>
          <ExecColTag>PLAN</ExecColTag>
          <ExecColTitle>前提</ExecColTitle>
          <ExecColSub>予算・在庫</ExecColSub>
        </ExecColHeader>
        <ExecBody>
          <ExecMetric
            label="月間売上予算"
            value={formatCurrency(r.budget)}
            formula="予算データより"
          />
          <ExecMetric
            label="月間粗利額予算"
            value={formatCurrency(r.grossProfitBudget)}
            formula={`売上予算 × 粗利率予算 = ${formatCurrency(r.budget)} × ${formatPercent(r.grossProfitRateBudget)}`}
          />
          <ExecMetric
            label="月間粗利率予算"
            value={formatPercent(r.grossProfitRateBudget)}
            formula="粗利額予算 ÷ 売上予算"
          />
          <ExecDividerLine />
          <ExecMetric
            label="期首在庫"
            value={formatCurrency(r.openingInventory)}
            formula="在庫設定より（手入力 or 前月期末在庫）"
          />
          <ExecMetric
            label="期末在庫目標"
            value={formatCurrency(r.closingInventory)}
            formula="在庫設定より（商品在庫 + 消耗品在庫）"
          />
        </ExecBody>
      </ExecColumn>

      <ExecColumn>
        <ExecColHeader $color={palette.successDark}>
          <ExecColTag>ACTUAL</ExecColTag>
          <ExecColTitle>現在地</ExecColTitle>
          <ExecColSub>
            期中実績（{r.elapsedDays}日経過 / {r.salesDays}営業日）
          </ExecColSub>
        </ExecColHeader>
        <ExecBody>
          <ExecMetric
            label="期中売上予算"
            value={formatCurrency(elapsedBudget)}
            formula={`1〜${r.elapsedDays}日の日別予算合計`}
          />
          <ExecMetric
            label="期中売上実績"
            value={formatCurrency(r.totalSales)}
            sub={`差異: ${formatCurrency(r.totalSales - elapsedBudget)}`}
            subColor={sc.cond(r.totalSales >= elapsedBudget)}
            formula="売上分類データの合計"
          />
          <ExecMetric
            label="売上達成率"
            value={formatPercent(salesAchievement)}
            sub={`進捗比: ${formatPercent(progressRatio)}`}
            formula={`実績 ÷ 経過予算 = ${formatCurrency(r.totalSales)} ÷ ${formatCurrency(elapsedBudget)}`}
          />
          {ctx.prevYear.hasPrevYear &&
            ctx.prevYear.totalSales > 0 &&
            (() => {
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
          {r.totalCustomers > 0 &&
            (() => {
              const txValue = calculateTransactionValue(r.totalSales, r.totalCustomers)
              const pyCustomers = ctx.prevYear.totalCustomers
              const pyTxValue =
                pyCustomers > 0
                  ? calculateTransactionValue(ctx.prevYear.totalSales, pyCustomers)
                  : null
              const custRatio = pyCustomers > 0 ? r.totalCustomers / pyCustomers : null
              return (
                <>
                  <ExecDividerLine />
                  <ExecMetric
                    label="期中客数"
                    value={`${r.totalCustomers.toLocaleString('ja-JP')}人`}
                    sub={`日平均: ${Math.round(r.averageCustomersPerDay).toLocaleString('ja-JP')}人`}
                  />
                  <ExecMetric
                    label="客単価"
                    value={formatCurrency(txValue) + '円'}
                    sub={pyTxValue ? `前年: ${formatCurrency(pyTxValue)}円` : undefined}
                  />
                  {custRatio != null && (
                    <ExecMetric
                      label="客数前年比"
                      value={formatPercent(custRatio)}
                      subColor={sc.cond(custRatio >= 1)}
                    />
                  )}
                </>
              )
            })()}
          <ExecDividerLine />
          <ExecMetric
            label="期中粗利額実績"
            value={formatCurrency(actualGP)}
            sub={`差異: ${formatCurrency(actualGP - elapsedGPBudget)}`}
            subColor={sc.cond(actualGP >= elapsedGPBudget)}
            formula={
              r.invMethodGrossProfit != null
                ? '在庫法: 売上 - 仕入 - 在庫変動'
                : '推定法: 売上 - 推定原価 - 売変 - 消耗品'
            }
          />
          <ExecMetric
            label="期中粗利率実績"
            value={formatPercent(actualGPRate)}
            sub={`予算比: ${formatPointDiff(actualGPRate - r.grossProfitRateBudget)}`}
            subColor={sc.cond(actualGPRate >= r.grossProfitRateBudget)}
            formula={`粗利額 ÷ 売上 = ${formatCurrency(actualGP)} ÷ ${formatCurrency(r.totalSales)}`}
          />
          {r.totalCostInclusion > 0 &&
            (() => {
              const isInvMethod = r.invMethodGrossProfitRate != null
              const beforeRate = isInvMethod
                ? r.invMethodGrossProfitRate!
                : safeDivide(r.estMethodMargin + r.totalCostInclusion, r.totalCoreSales, 0)
              const afterRate = isInvMethod
                ? safeDivide(r.invMethodGrossProfit! - r.totalCostInclusion, r.totalSales, 0)
                : r.estMethodMarginRate
              return (
                <>
                  <ExecMetric
                    label="原価算入比（原価算入費）"
                    value={formatCurrency(r.totalCostInclusion)}
                  />
                  <ExecMetric label="粗利率（消耗品控除前）" value={formatPercent(beforeRate)} />
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
        <ExecColHeader $color={palette.warningDark}>
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
            formula={`日販 × ${daysInMonth}営業日 = ${formatCurrency(Math.round(r.totalSales / r.salesDays))} × ${daysInMonth}`}
          />
          <ExecMetric
            label="着地売上達成率"
            value={formatPercent(r.projectedAchievement)}
            formula={`着地売上 ÷ 月間予算 = ${formatCurrency(r.projectedSales)} ÷ ${formatCurrency(r.budget)}`}
          />
          <ExecDividerLine />
          <ExecMetric
            label="月末粗利着地"
            value={formatCurrency(r.projectedGrossProfit)}
            sub={`予算差: ${formatCurrency(r.projectedGrossProfit - r.grossProfitBudget)}`}
            subColor={sc.cond(r.projectedGrossProfit >= r.grossProfitBudget)}
            formula={`実績${formatCurrency(actualGP)} + 日平均${formatCurrency(Math.round(dailyAvgGP))} × 残${remainingDays}日`}
          />
          <ExecMetric
            label="着地粗利達成率"
            value={formatPercent(r.projectedGPAchievement)}
            formula={`着地粗利 ÷ 月間粗利予算 = ${formatCurrency(r.projectedGrossProfit)} ÷ ${formatCurrency(r.grossProfitBudget)}`}
          />
          {r.totalCustomers > 0 &&
            r.salesDays > 0 &&
            (() => {
              const avgDailyCustomers = r.totalCustomers / r.salesDays
              const projectedCustomers = Math.round(
                r.totalCustomers + avgDailyCustomers * remainingDays,
              )
              const projectedTxValue = calculateTransactionValue(
                r.projectedSales,
                projectedCustomers,
              )
              return (
                <>
                  <ExecDividerLine />
                  <ExecMetric
                    label="月末客数着地"
                    value={`${projectedCustomers.toLocaleString('ja-JP')}人`}
                    formula={`実績${r.totalCustomers.toLocaleString('ja-JP')}人 + 日平均${Math.round(avgDailyCustomers).toLocaleString('ja-JP')}人 × 残${remainingDays}日`}
                  />
                  <ExecMetric
                    label="着地客単価"
                    value={formatCurrency(projectedTxValue) + '円'}
                    formula={`着地売上 ÷ 着地客数 = ${formatCurrency(r.projectedSales)} ÷ ${projectedCustomers.toLocaleString('ja-JP')}`}
                  />
                </>
              )
            })()}
        </ExecBody>
      </ExecColumn>
    </ExecGrid>
  )
}
