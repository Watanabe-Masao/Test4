import { useState, useCallback } from 'react'
import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { formatCurrency, formatPercent, formatPointDiff } from '@/domain/formatting'
import {
  safeDivide,
  calculateTransactionValue,
} from '@/domain/calculations/utils'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useUiStore } from '@/application/stores/uiStore'
import { calculationCache } from '@/application/services/calculationCache'
import {
  ExecSummaryWrapper,
  ExecSummaryTabBar,
  ExecSummaryTab,
  ExecSummaryTabContent,
  ExecSummaryBar,
  ExecSummaryItem,
  ExecSummaryHint,
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

/* ── Warning banner styled component ── */
const WarningBanner = styled.div<{ $clickable?: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.palette.warning};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(234,179,8,0.12)' : 'rgba(234,179,8,0.08)'};
  border: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(234,179,8,0.3)' : 'rgba(234,179,8,0.25)')};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  margin-top: ${({ theme }) => theme.spacing[2]};
  line-height: 1.4;
  ${({ $clickable }) =>
    $clickable &&
    `
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    &:hover {
      background: rgba(234,179,8,0.18);
      border-color: rgba(234,179,8,0.5);
    }
  `}
`

export function ExecSummaryBarWidget(ctx: WidgetContext) {
  const { result: r, prevYear, onExplain } = ctx
  const [tab, setTab] = useState<SummaryTab>('sales')

  const pyRatio =
    prevYear.hasPrevYear && prevYear.totalSales > 0 ? r.totalSales / prevYear.totalSales : null
  const elapsedBudget = r.dailyCumulative.get(r.elapsedDays)?.budget ?? 0
  const elapsedDiff = r.totalSales - elapsedBudget

  // 仕入データ不足の検出
  const purchaseShort = r.purchaseMaxDay > 0 && r.purchaseMaxDay < r.elapsedDays
  // 売変データ欠損の検出
  const missingDiscount = !r.hasDiscountData && r.totalSales > 0

  const handleFilterToPurchaseRange = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (r.purchaseMaxDay > 0) {
        useSettingsStore.getState().updateSettings({ dataEndDay: r.purchaseMaxDay })
        calculationCache.clear()
        useUiStore.getState().invalidateCalculation()
      }
    },
    [r.purchaseMaxDay],
  )

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
            <ExecSummaryItem
              $accent={palette.purpleDark}
              $clickable
              onClick={() => onExplain('salesTotal')}
            >
              <ExecSummaryHint>根拠</ExecSummaryHint>
              <ExecSummaryLabel>売上実績（営業日）</ExecSummaryLabel>
              <ExecSummarySub>売上予算 / 売上実績</ExecSummarySub>
              <ExecSummaryValue>
                {formatCurrency(elapsedBudget)} / {formatCurrency(r.totalSales)}
              </ExecSummaryValue>
              <ExecSummarySub $color={sc.cond(elapsedDiff >= 0)}>
                予算差異: {formatCurrency(elapsedDiff)}
              </ExecSummarySub>
              <ExecSummarySub $color={sc.cond(r.budgetProgressRate >= 1)}>
                売上予算達成率: {formatPercent(r.budgetProgressRate)}
              </ExecSummarySub>
              {pyRatio != null && (
                <ExecSummarySub $color={sc.cond(pyRatio >= 1)}>
                  前年同曜日比: {formatPercent(pyRatio)}
                </ExecSummarySub>
              )}
            </ExecSummaryItem>
            <ExecSummaryItem
              $accent={palette.primary}
              $clickable
              onClick={() => onExplain('budget')}
            >
              <ExecSummaryHint>根拠</ExecSummaryHint>
              <ExecSummaryLabel>売上消化率（月間）</ExecSummaryLabel>
              <ExecSummarySub>売上予算 / 売上実績</ExecSummarySub>
              <ExecSummaryValue>
                {formatCurrency(r.budget)} / {formatCurrency(r.totalSales)}
              </ExecSummaryValue>
              <ExecSummarySub>予算経過率: {formatPercent(r.budgetElapsedRate)}</ExecSummarySub>
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
            <ExecSummaryItem
              $accent={palette.warningDark}
              $clickable
              onClick={() => onExplain('purchaseCost')}
            >
              <ExecSummaryHint>根拠</ExecSummaryHint>
              <ExecSummaryLabel>在庫金額/総仕入高</ExecSummaryLabel>
              <ExecSummarySub>
                期首在庫:{' '}
                {r.openingInventory != null ? formatCurrency(r.openingInventory) : '未入力'}
              </ExecSummarySub>
              <ExecSummarySub>期中仕入高: {formatCurrency(r.totalCost)}</ExecSummarySub>
              <ExecSummaryValue>
                期末在庫:{' '}
                {r.closingInventory != null ? formatCurrency(r.closingInventory) : '未入力'}
              </ExecSummaryValue>
              {r.estMethodClosingInventory != null && (
                <ExecSummarySub>
                  推定期末在庫: {formatCurrency(r.estMethodClosingInventory)}
                </ExecSummarySub>
              )}
              {purchaseShort && (
                <WarningBanner $clickable onClick={handleFilterToPurchaseRange}>
                  仕入データ: {r.purchaseMaxDay}日まで（売上: {r.elapsedDays}日まで） —
                  クリックで仕入有効期間に絞り込み
                </WarningBanner>
              )}
            </ExecSummaryItem>
            <ExecSummaryItem
              $accent={palette.blueDark}
              $clickable
              onClick={() => onExplain('averageMarkupRate')}
            >
              <ExecSummaryHint>根拠</ExecSummaryHint>
              <ExecSummaryLabel>値入率 / 値入額</ExecSummaryLabel>
              {(() => {
                const markupAmount = r.grossSales - r.totalCost
                const estGpRate = r.averageMarkupRate - r.discountRate * (1 - r.discountRate)
                return (
                  <>
                    <ExecSummaryValue>
                      {formatPercent(r.averageMarkupRate)} / {formatCurrency(markupAmount)}
                    </ExecSummaryValue>
                    <ExecSummarySub>
                      売変率 / 売変額: {formatPercent(r.discountRate)} /{' '}
                      {formatCurrency(r.totalDiscount)}
                    </ExecSummarySub>
                    <ExecSummarySub>
                      推定マージン額（売変還元法）:{' '}
                      {formatCurrency(Math.round(r.grossSales * estGpRate))}
                    </ExecSummarySub>
                    {missingDiscount && (
                      <WarningBanner>
                        売変データなし — 推定法（在庫差異検知）の精度が低下しています
                      </WarningBanner>
                    )}
                  </>
                )
              })()}
            </ExecSummaryItem>
            <ExecSummaryItem
              $accent={sc.positive}
              $clickable
              onClick={() => onExplain('invMethodGrossProfitRate')}
            >
              <ExecSummaryHint>根拠</ExecSummaryHint>
              <ExecSummaryLabel>原算前粗利率/原算後粗利率</ExecSummaryLabel>
              {r.invMethodGrossProfitRate != null
                ? (() => {
                    const invAfterRate = safeDivide(
                      r.invMethodGrossProfit! - r.totalCostInclusion,
                      r.totalSales,
                      0,
                    )
                    const invDiff = r.invMethodGrossProfitRate - invAfterRate
                    const estBeforeRate = safeDivide(
                      r.estMethodMargin + r.totalCostInclusion,
                      r.totalCoreSales,
                      0,
                    )
                    const estDiff = estBeforeRate - r.estMethodMarginRate
                    return (
                      <>
                        <ExecSummaryValue>
                          {formatPercent(r.invMethodGrossProfitRate)} /{' '}
                          {formatPercent(invAfterRate)}
                        </ExecSummaryValue>
                        <ExecSummarySub>
                          在庫法 減算比 {formatPointDiff(invDiff)} 原価算入費:{' '}
                          {formatCurrency(r.totalCostInclusion)}円
                        </ExecSummarySub>
                        <ExecSummarySub $color={palette.slateDark}>
                          参考（推定法・在庫差分率）: {formatPercent(estBeforeRate)} /{' '}
                          {formatPercent(r.estMethodMarginRate)}（減算比 {formatPointDiff(estDiff)}
                          ）
                        </ExecSummarySub>
                      </>
                    )
                  })()
                : (() => {
                    const estBeforeRate = safeDivide(
                      r.estMethodMargin + r.totalCostInclusion,
                      r.totalCoreSales,
                      0,
                    )
                    const estDiff = estBeforeRate - r.estMethodMarginRate
                    return (
                      <>
                        <ExecSummaryValue>
                          {formatPercent(estBeforeRate)} / {formatPercent(r.estMethodMarginRate)}
                        </ExecSummaryValue>
                        <ExecSummarySub>
                          推定法（在庫差分） 減算比 {formatPointDiff(estDiff)} 原価算入費:{' '}
                          {formatCurrency(r.totalCostInclusion)}円
                        </ExecSummarySub>
                      </>
                    )
                  })()}
              {purchaseShort && (
                <WarningBanner $clickable onClick={handleFilterToPurchaseRange}>
                  {r.purchaseMaxDay + 1}日以降の粗利は仕入原価ゼロで算出 —
                  クリックで有効期間に絞り込み
                </WarningBanner>
              )}
              {missingDiscount && (
                <WarningBanner>
                  売変データなし — 推定在庫・推定粗利率の精度が低下しています
                </WarningBanner>
              )}
            </ExecSummaryItem>
          </ExecSummaryBar>
        )}

        {tab === 'customers' &&
          r.totalCustomers > 0 &&
          (() => {
            const txValue = calculateTransactionValue(r.totalSales, r.totalCustomers)
            const pyCustomers = prevYear.totalCustomers
            const custRatio =
              prevYear.hasPrevYear && pyCustomers > 0 ? r.totalCustomers / pyCustomers : null
            const pyTxValue =
              prevYear.hasPrevYear && pyCustomers > 0
                ? calculateTransactionValue(prevYear.totalSales, pyCustomers)
                : null
            return (
              <ExecSummaryBar>
                <ExecSummaryItem
                  $accent={palette.cyanDark}
                  $clickable
                  onClick={() => onExplain('totalCustomers')}
                >
                  <ExecSummaryHint>根拠</ExecSummaryHint>
                  <ExecSummaryLabel>客数・客単価</ExecSummaryLabel>
                  <ExecSummarySub>
                    客数: {r.totalCustomers.toLocaleString('ja-JP')}人 / 日平均:{' '}
                    {Math.round(r.averageCustomersPerDay).toLocaleString('ja-JP')}人
                  </ExecSummarySub>
                  <ExecSummaryValue>{formatCurrency(txValue)}円</ExecSummaryValue>
                  {custRatio != null && (
                    <ExecSummarySub $color={sc.cond(custRatio >= 1)}>
                      客数前年比: {formatPercent(custRatio)}
                    </ExecSummarySub>
                  )}
                  {pyTxValue != null && (
                    <ExecSummarySub>前年客単価: {formatCurrency(pyTxValue)}円</ExecSummarySub>
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
