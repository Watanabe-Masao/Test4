import { useState } from 'react'
import { sc } from '@/presentation/theme/semanticColors'
import { formatCurrency, formatPercent, formatPointDiff, safeDivide } from '@/domain/calculations/utils'
import {
  ExecSummaryWrapper,
  ExecSummaryTabBar,
  ExecSummaryTab,
  ExecSummaryTabContent,
  ExecSummaryBar,
  ExecSummaryItem,
  ExecSummaryLabel,
  ExecSummaryValue,
  ExecSummarySub,
} from '../DashboardPage.styles'
import type { WidgetContext } from './types'

type SummaryTab = 'sales' | 'costProfit' | 'customers'

const TABS: { key: SummaryTab; label: string }[] = [
  { key: 'sales', label: '売上・予算' },
  { key: 'costProfit', label: '仕入・粗利' },
  { key: 'customers', label: '客数・客単価' },
]

export function ExecSummaryBarWidget({ result: r, prevYear }: WidgetContext) {
  const [tab, setTab] = useState<SummaryTab>('sales')

  const pyRatio = prevYear.hasPrevYear && prevYear.totalSales > 0
    ? (r.totalSales / prevYear.totalSales) * 100
    : null
  const elapsedBudget = r.dailyCumulative.get(r.elapsedDays)?.budget ?? 0
  const elapsedDiff = r.totalSales - elapsedBudget

  return (
    <ExecSummaryWrapper>
      <ExecSummaryTabBar>
        {TABS.map((t) => (
          <ExecSummaryTab key={t.key} $active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </ExecSummaryTab>
        ))}
      </ExecSummaryTabBar>
      <ExecSummaryTabContent>
        {tab === 'sales' && (
          <ExecSummaryBar>
            <ExecSummaryItem $accent="#8b5cf6">
              <ExecSummaryLabel>売上実績（営業日）</ExecSummaryLabel>
              <ExecSummarySub>売上予算 / 売上実績</ExecSummarySub>
              <ExecSummaryValue>{formatCurrency(elapsedBudget)} / {formatCurrency(r.totalSales)}</ExecSummaryValue>
              <ExecSummarySub $color={sc.cond(elapsedDiff >= 0)}>
                予算差異: {formatCurrency(elapsedDiff)}
              </ExecSummarySub>
              <ExecSummarySub $color={sc.cond(r.budgetProgressRate >= 1)}>
                売上予算達成率: {formatPercent(r.budgetProgressRate)}
              </ExecSummarySub>
              {pyRatio != null && (
                <ExecSummarySub $color={sc.cond(pyRatio >= 100)}>
                  前年同曜日比: {pyRatio.toFixed(1)}%
                </ExecSummarySub>
              )}
            </ExecSummaryItem>
            <ExecSummaryItem $accent="#6366f1">
              <ExecSummaryLabel>売上消化率（月間）</ExecSummaryLabel>
              <ExecSummarySub>売上予算 / 売上実績</ExecSummarySub>
              <ExecSummaryValue>{formatCurrency(r.budget)} / {formatCurrency(r.totalSales)}</ExecSummaryValue>
              <ExecSummarySub>
                予算経過率: {formatPercent(r.budgetElapsedRate)}
              </ExecSummarySub>
              <ExecSummarySub $color={sc.cond(r.budgetAchievementRate >= 1)}>
                予算消化率: {formatPercent(r.budgetAchievementRate)}
              </ExecSummarySub>
              <ExecSummarySub $color={r.remainingBudget <= 0 ? sc.positive : undefined}>
                残予算: {formatCurrency(r.remainingBudget)}
              </ExecSummarySub>
            </ExecSummaryItem>
          </ExecSummaryBar>
        )}

        {tab === 'costProfit' && (
          <ExecSummaryBar>
            <ExecSummaryItem $accent="#f59e0b">
              <ExecSummaryLabel>在庫金額/総仕入高</ExecSummaryLabel>
              <ExecSummarySub>期首在庫: {r.openingInventory != null ? formatCurrency(r.openingInventory) : '未入力'}</ExecSummarySub>
              <ExecSummarySub>期中仕入高: {formatCurrency(r.totalCost)}</ExecSummarySub>
              <ExecSummaryValue>期末在庫: {r.closingInventory != null ? formatCurrency(r.closingInventory) : '未入力'}</ExecSummaryValue>
              {r.estMethodClosingInventory != null && (
                <ExecSummarySub>推定期末在庫: {formatCurrency(r.estMethodClosingInventory)}</ExecSummarySub>
              )}
            </ExecSummaryItem>
            <ExecSummaryItem $accent="#3b82f6">
              <ExecSummaryLabel>値入率 / 値入額</ExecSummaryLabel>
              {(() => {
                const markupAmount = r.grossSales - r.totalCost
                const estGpRate = r.averageMarkupRate - r.discountRate * (1 - r.discountRate)
                return (
                  <>
                    <ExecSummaryValue>{formatPercent(r.averageMarkupRate)} / {formatCurrency(markupAmount)}</ExecSummaryValue>
                    <ExecSummarySub>売変率 / 売変額: {formatPercent(r.discountRate)} / {formatCurrency(r.totalDiscount)}</ExecSummarySub>
                    <ExecSummarySub>
                      推定粗利額（売変還元法）: {formatCurrency(Math.round(r.grossSales * estGpRate))}
                    </ExecSummarySub>
                  </>
                )
              })()}
            </ExecSummaryItem>
            <ExecSummaryItem $accent={sc.positive}>
              <ExecSummaryLabel>原算前粗利率/原算後粗利率</ExecSummaryLabel>
              {r.invMethodGrossProfitRate != null ? (() => {
                const invAfterRate = safeDivide(r.invMethodGrossProfit! - r.totalConsumable, r.totalSales, 0)
                const invDiff = r.invMethodGrossProfitRate - invAfterRate
                const estBeforeRate = safeDivide(r.estMethodMargin + r.totalConsumable, r.totalCoreSales, 0)
                const estDiff = estBeforeRate - r.estMethodMarginRate
                return (
                  <>
                    <ExecSummaryValue>{formatPercent(r.invMethodGrossProfitRate)} / {formatPercent(invAfterRate)}</ExecSummaryValue>
                    <ExecSummarySub>在庫法 減算比 {formatPointDiff(invDiff)} 消耗品費: {formatCurrency(r.totalConsumable)}円</ExecSummarySub>
                    <ExecSummarySub $color="#64748b">
                      参考（推定法）: {formatPercent(estBeforeRate)} / {formatPercent(r.estMethodMarginRate)}（減算比 {formatPointDiff(estDiff)}）
                    </ExecSummarySub>
                  </>
                )
              })() : (() => {
                const estBeforeRate = safeDivide(r.estMethodMargin + r.totalConsumable, r.totalCoreSales, 0)
                const estDiff = estBeforeRate - r.estMethodMarginRate
                return (
                  <>
                    <ExecSummaryValue>{formatPercent(estBeforeRate)} / {formatPercent(r.estMethodMarginRate)}</ExecSummaryValue>
                    <ExecSummarySub>推定法 減算比 {formatPointDiff(estDiff)} 消耗品費: {formatCurrency(r.totalConsumable)}円</ExecSummarySub>
                  </>
                )
              })()}
            </ExecSummaryItem>
          </ExecSummaryBar>
        )}

        {tab === 'customers' && r.totalCustomers > 0 && (() => {
          const txValue = Math.round(r.totalSales / r.totalCustomers)
          const pyCustomers = prevYear.totalCustomers
          const custRatio = prevYear.hasPrevYear && pyCustomers > 0
            ? r.totalCustomers / pyCustomers
            : null
          const pyTxValue = prevYear.hasPrevYear && pyCustomers > 0
            ? Math.round(prevYear.totalSales / pyCustomers)
            : null
          return (
            <ExecSummaryBar>
              <ExecSummaryItem $accent="#06b6d4">
                <ExecSummaryLabel>客数・客単価</ExecSummaryLabel>
                <ExecSummarySub>客数: {r.totalCustomers.toLocaleString('ja-JP')}人 / 日平均: {Math.round(r.averageCustomersPerDay).toLocaleString('ja-JP')}人</ExecSummarySub>
                <ExecSummaryValue>{formatCurrency(txValue)}円</ExecSummaryValue>
                {custRatio != null && (
                  <ExecSummarySub $color={sc.cond(custRatio >= 1)}>
                    客数前年比: {formatPercent(custRatio, 1)}
                  </ExecSummarySub>
                )}
                {pyTxValue != null && (
                  <ExecSummarySub>
                    前年客単価: {formatCurrency(pyTxValue)}円
                  </ExecSummarySub>
                )}
              </ExecSummaryItem>
            </ExecSummaryBar>
          )
        })()}
        {tab === 'customers' && r.totalCustomers === 0 && (
          <ExecSummarySub>客数データなし</ExecSummarySub>
        )}
      </ExecSummaryTabContent>
    </ExecSummaryWrapper>
  )
}
