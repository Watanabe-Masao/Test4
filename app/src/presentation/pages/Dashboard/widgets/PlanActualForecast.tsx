import type { ReactNode } from 'react'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { formatPercent, formatPointDiff } from '@/domain/formatting'
import {
  safeDivide,
  calculateTransactionValue,
  calculateAchievementRate,
  calculateGrossProfitRate,
} from '@/domain/calculations/utils'
import {
  getEffectiveGrossProfitRate,
  getEffectiveGrossProfit,
} from '@/application/readModels/grossProfit'
import type { WidgetContext } from './types'
import { extractPrevYearCustomerCount } from '@/features/comparison'
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
import { WarningBanner } from './ExecSummaryBarWidget.styles'

/** 観測品質が不十分な場合の FORECAST 列ヘッダー警告メッセージ */
function forecastWarningMessage(status: WidgetContext['observationStatus']): string | null {
  switch (status) {
    case 'ok':
      return null
    case 'partial':
      return '観測日数が少ないため、着地予測の精度が低下しています'
    case 'invalid':
      return '観測期間が極端に短く、着地予測は参考値です'
    case 'undefined':
      return '売上データがないため、着地予測は算出できません'
  }
}

export function renderPlanActualForecast(ctx: WidgetContext): ReactNode {
  const r = ctx.result
  const { daysInMonth, fmtCurrency } = ctx
  const curCustomers = ctx.readModels?.customerFact?.grandTotalCustomers ?? 0
  const prevCustomers = extractPrevYearCustomerCount(ctx.prevYear)

  let elapsedBudget = 0
  for (let d = 1; d <= r.elapsedDays; d++) {
    elapsedBudget += r.budgetDaily.get(d) ?? 0
  }

  const actualGP = getEffectiveGrossProfit(r)
  const actualGPRate = getEffectiveGrossProfitRate(r)

  const elapsedGPBudget = r.grossProfitBudget * r.budgetElapsedRate
  const remainingDays = daysInMonth - r.elapsedDays
  const dailyAvgGP = r.salesDays > 0 ? actualGP / r.salesDays : 0

  const salesAchievement = calculateAchievementRate(r.totalSales, elapsedBudget)
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
          <ExecMetric label="月間売上予算" value={fmtCurrency(r.budget)} formula="予算データより" />
          <ExecMetric
            label="月間粗利額予算"
            value={r.grossProfitBudget > 0 ? fmtCurrency(r.grossProfitBudget) : '未設定'}
            formula={
              r.grossProfitBudget > 0
                ? `売上予算 × 粗利率予算 = ${fmtCurrency(r.budget)} × ${formatPercent(r.grossProfitRateBudget)}`
                : '在庫設定で粗利額予算を入力してください'
            }
          />
          <ExecMetric
            label="月間粗利率予算"
            value={r.grossProfitBudget > 0 ? formatPercent(r.grossProfitRateBudget) : '未設定'}
            formula={
              r.grossProfitBudget > 0 ? '粗利額予算 ÷ 売上予算' : '粗利額予算の設定が必要です'
            }
          />
          <ExecDividerLine />
          <ExecMetric
            label="期首在庫"
            value={fmtCurrency(r.openingInventory)}
            formula="在庫設定より（手入力 or 前月期末在庫）"
          />
          <ExecMetric
            label="期末在庫目標"
            value={fmtCurrency(r.closingInventory)}
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
            value={fmtCurrency(elapsedBudget)}
            formula={`1〜${r.elapsedDays}日の日別予算合計`}
          />
          <ExecMetric
            label="期中売上実績"
            value={fmtCurrency(r.totalSales)}
            sub={`差異: ${fmtCurrency(r.totalSales - elapsedBudget)}`}
            subColor={sc.cond(r.totalSales >= elapsedBudget)}
            formula="売上分類データの合計"
          />
          <ExecMetric
            label="売上達成率"
            value={formatPercent(salesAchievement)}
            sub={`進捗比: ${formatPercent(progressRatio)}`}
            formula={`実績 ÷ 経過予算 = ${fmtCurrency(r.totalSales)} ÷ ${fmtCurrency(elapsedBudget)}`}
          />
          {ctx.prevYear.hasPrevYear &&
            ctx.prevYear.totalSales > 0 &&
            (() => {
              const pyRatio = r.totalSales / ctx.prevYear.totalSales
              return (
                <>
                  <ExecDividerLine />
                  <ExecMetric label="前年同曜日売上" value={fmtCurrency(ctx.prevYear.totalSales)} />
                  <ExecMetric
                    label="前年同曜日比"
                    value={formatPercent(pyRatio)}
                    subColor={sc.cond(pyRatio >= 1)}
                  />
                </>
              )
            })()}
          {curCustomers > 0 &&
            (() => {
              const txValue = calculateTransactionValue(r.totalSales, curCustomers)
              const pyTxValue =
                prevCustomers > 0
                  ? calculateTransactionValue(ctx.prevYear.totalSales, prevCustomers)
                  : null
              const custRatio = prevCustomers > 0 ? curCustomers / prevCustomers : null
              return (
                <>
                  <ExecDividerLine />
                  <ExecMetric
                    label="期中客数"
                    value={`${fmtCurrency(curCustomers)}人`}
                    sub={`日平均: ${fmtCurrency(r.averageCustomersPerDay)}人`}
                  />
                  <ExecMetric
                    label="客単価"
                    value={fmtCurrency(txValue) + '円'}
                    sub={pyTxValue ? `前年: ${fmtCurrency(pyTxValue)}円` : undefined}
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
            value={fmtCurrency(actualGP)}
            sub={`差異: ${fmtCurrency(actualGP - elapsedGPBudget)}`}
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
            formula={`粗利額 ÷ 売上 = ${fmtCurrency(actualGP)} ÷ ${fmtCurrency(r.totalSales)}`}
          />
          {r.totalCostInclusion > 0 &&
            (() => {
              const isInvMethod = r.invMethodGrossProfitRate != null
              const beforeRate = isInvMethod
                ? r.invMethodGrossProfitRate!
                : calculateGrossProfitRate(
                    r.estMethodMargin + r.totalCostInclusion,
                    r.totalCoreSales,
                  )
              const afterRate = isInvMethod
                ? calculateGrossProfitRate(
                    r.invMethodGrossProfit! - r.totalCostInclusion,
                    r.totalSales,
                  )
                : r.estMethodMarginRate
              return (
                <>
                  <ExecMetric
                    label="原価算入比（原価算入費）"
                    value={fmtCurrency(r.totalCostInclusion)}
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
          {(() => {
            const warning = forecastWarningMessage(ctx.observationStatus)
            return warning && <WarningBanner>{warning}</WarningBanner>
          })()}
          <ExecMetric
            label="月末売上着地"
            value={fmtCurrency(r.projectedSales)}
            sub={`予算差: ${fmtCurrency(r.projectedSales - r.budget)}`}
            subColor={sc.cond(r.projectedSales >= r.budget)}
            formula={`日販 × ${daysInMonth}営業日 = ${fmtCurrency(Math.round(r.totalSales / r.salesDays))} × ${daysInMonth}`}
          />
          <ExecMetric
            label="着地売上達成率"
            value={formatPercent(r.projectedAchievement)}
            formula={`着地売上 ÷ 月間予算 = ${fmtCurrency(r.projectedSales)} ÷ ${fmtCurrency(r.budget)}`}
          />
          <ExecDividerLine />
          <ExecMetric
            label="月末粗利着地"
            value={fmtCurrency(r.projectedGrossProfit)}
            sub={`予算差: ${fmtCurrency(r.projectedGrossProfit - r.grossProfitBudget)}`}
            subColor={sc.cond(r.projectedGrossProfit >= r.grossProfitBudget)}
            formula={`実績${fmtCurrency(actualGP)} + 日平均${fmtCurrency(Math.round(dailyAvgGP))} × 残${remainingDays}日`}
          />
          <ExecMetric
            label="着地粗利達成率"
            value={formatPercent(r.projectedGPAchievement)}
            formula={`着地粗利 ÷ 月間粗利予算 = ${fmtCurrency(r.projectedGrossProfit)} ÷ ${fmtCurrency(r.grossProfitBudget)}`}
          />
          {curCustomers > 0 &&
            r.salesDays > 0 &&
            (() => {
              const avgDailyCustomers = curCustomers / r.salesDays
              const projectedCustomers = Math.round(
                curCustomers + avgDailyCustomers * remainingDays,
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
                    value={`${fmtCurrency(projectedCustomers)}人`}
                    formula={`実績${fmtCurrency(curCustomers)}人 + 日平均${fmtCurrency(avgDailyCustomers)}人 × 残${remainingDays}日`}
                  />
                  <ExecMetric
                    label="着地客単価"
                    value={fmtCurrency(projectedTxValue) + '円'}
                    formula={`着地売上 ÷ 着地客数 = ${fmtCurrency(r.projectedSales)} ÷ ${projectedCustomers.toLocaleString('ja-JP')}`}
                  />
                </>
              )
            })()}
        </ExecBody>
      </ExecColumn>
    </ExecGrid>
  )
}
