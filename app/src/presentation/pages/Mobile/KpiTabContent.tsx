import {
  formatCurrency,
  formatPercent,
  safeDivide,
  calculateTransactionValue,
} from '@/domain/calculations/utils'
import { sc } from '@/presentation/theme/semanticColors'
import type { StoreResult } from '@/domain/models/StoreResult'
import type { PrevYearData } from '@/application/hooks'
import type { AppSettings } from '@/domain/models'
import {
  KpiCardWrapper,
  KpiRow,
  KpiLabel,
  KpiValue,
  KpiSub,
  KpiDivider,
  KpiGrid,
  KpiMiniCard,
  KpiMiniLabel,
  KpiMiniValue,
} from './MobileDashboardPage.styles'

export type KpiTabContentProps = {
  readonly r: StoreResult
  readonly elapsedBudget: number
  readonly prevYear: PrevYearData
  readonly settings: AppSettings
}

export function KpiTabContent({ r, elapsedBudget, prevYear, settings }: KpiTabContentProps) {
  const elapsedDiff = r.totalSales - elapsedBudget
  const pyRatio =
    prevYear.hasPrevYear && prevYear.totalSales > 0 ? r.totalSales / prevYear.totalSales : null
  const pyCustomerRatio =
    prevYear.hasPrevYear && prevYear.totalCustomers > 0
      ? r.totalCustomers / prevYear.totalCustomers
      : null
  const txValue = calculateTransactionValue(r.totalSales, r.totalCustomers)
  const prevTxValue = prevYear.hasPrevYear
    ? calculateTransactionValue(prevYear.totalSales, prevYear.totalCustomers)
    : null

  return (
    <>
      {/* 売上実績 */}
      <KpiCardWrapper>
        <KpiRow>
          <KpiLabel>売上実績</KpiLabel>
          <KpiValue>{formatCurrency(r.totalSales)}</KpiValue>
        </KpiRow>
        <KpiSub>予算: {formatCurrency(elapsedBudget)}</KpiSub>
        <KpiSub $color={sc.cond(elapsedDiff >= 0)}>
          差異: {elapsedDiff >= 0 ? '+' : ''}
          {formatCurrency(elapsedDiff)}
        </KpiSub>
        <KpiDivider />
        <KpiGrid>
          <KpiMiniCard>
            <KpiMiniLabel>予算達成率</KpiMiniLabel>
            <KpiMiniValue $color={sc.cond(r.budgetProgressRate >= 1)}>
              {formatPercent(r.budgetProgressRate)}
            </KpiMiniValue>
          </KpiMiniCard>
          <KpiMiniCard>
            <KpiMiniLabel>予算消化率</KpiMiniLabel>
            <KpiMiniValue $color={sc.cond(r.budgetAchievementRate >= 1)}>
              {formatPercent(r.budgetAchievementRate)}
            </KpiMiniValue>
          </KpiMiniCard>
          <KpiMiniCard>
            <KpiMiniLabel>月間予算</KpiMiniLabel>
            <KpiMiniValue>{formatCurrency(r.budget)}</KpiMiniValue>
          </KpiMiniCard>
          <KpiMiniCard>
            <KpiMiniLabel>残予算</KpiMiniLabel>
            <KpiMiniValue $color={r.remainingBudget <= 0 ? sc.positive : undefined}>
              {formatCurrency(r.remainingBudget)}
            </KpiMiniValue>
          </KpiMiniCard>
        </KpiGrid>
      </KpiCardWrapper>

      {/* 粗利・仕入 */}
      <KpiCardWrapper>
        <KpiRow>
          <KpiLabel>値入率 / 売変率</KpiLabel>
          <KpiValue>{formatPercent(r.averageMarkupRate)}</KpiValue>
        </KpiRow>
        <KpiSub>
          売変率: {formatPercent(r.discountRate)} ({formatCurrency(r.totalDiscount)})
        </KpiSub>
        <KpiDivider />
        <KpiGrid>
          <KpiMiniCard>
            <KpiMiniLabel>仕入原価</KpiMiniLabel>
            <KpiMiniValue>{formatCurrency(r.totalCost)}</KpiMiniValue>
          </KpiMiniCard>
          <KpiMiniCard>
            <KpiMiniLabel>原価算入費</KpiMiniLabel>
            <KpiMiniValue>{formatCurrency(r.totalCostInclusion)}</KpiMiniValue>
          </KpiMiniCard>
          {r.invMethodGrossProfitRate != null && (
            <KpiMiniCard>
              <KpiMiniLabel>粗利率</KpiMiniLabel>
              <KpiMiniValue
                $color={sc.gpRate(
                  r.invMethodGrossProfitRate,
                  settings.targetGrossProfitRate,
                  settings.warningThreshold,
                )}
              >
                {formatPercent(r.invMethodGrossProfitRate)}
              </KpiMiniValue>
            </KpiMiniCard>
          )}
          {r.invMethodGrossProfit != null && (
            <KpiMiniCard>
              <KpiMiniLabel>粗利額</KpiMiniLabel>
              <KpiMiniValue>{formatCurrency(r.invMethodGrossProfit)}</KpiMiniValue>
            </KpiMiniCard>
          )}
        </KpiGrid>
      </KpiCardWrapper>

      {/* 客数・前年比 */}
      <KpiCardWrapper>
        <KpiRow>
          <KpiLabel>客数</KpiLabel>
          <KpiValue>{formatCurrency(r.totalCustomers)}</KpiValue>
        </KpiRow>
        <KpiSub>客単価: {formatCurrency(txValue)}</KpiSub>
        <KpiSub>日平均客数: {formatCurrency(safeDivide(r.totalCustomers, r.elapsedDays))}</KpiSub>
        {prevYear.hasPrevYear && (
          <>
            <KpiDivider />
            <KpiGrid>
              <KpiMiniCard>
                <KpiMiniLabel>前年売上比</KpiMiniLabel>
                <KpiMiniValue $color={pyRatio != null ? sc.cond(pyRatio >= 1) : undefined}>
                  {pyRatio != null ? formatPercent(pyRatio) : '-'}
                </KpiMiniValue>
              </KpiMiniCard>
              <KpiMiniCard>
                <KpiMiniLabel>前年客数比</KpiMiniLabel>
                <KpiMiniValue
                  $color={pyCustomerRatio != null ? sc.cond(pyCustomerRatio >= 1) : undefined}
                >
                  {pyCustomerRatio != null ? formatPercent(pyCustomerRatio) : '-'}
                </KpiMiniValue>
              </KpiMiniCard>
              <KpiMiniCard>
                <KpiMiniLabel>前年客単価</KpiMiniLabel>
                <KpiMiniValue>
                  {prevTxValue != null ? formatCurrency(prevTxValue) : '-'}
                </KpiMiniValue>
              </KpiMiniCard>
              <KpiMiniCard>
                <KpiMiniLabel>当年客単価</KpiMiniLabel>
                <KpiMiniValue>{formatCurrency(txValue)}</KpiMiniValue>
              </KpiMiniCard>
            </KpiGrid>
          </>
        )}
      </KpiCardWrapper>
    </>
  )
}
