import { useState, useCallback } from 'react'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { formatPercent, formatPointDiff } from '@/domain/formatting'
import { calculateTransactionValue, calculateGrossProfitRate } from '@/domain/calculations/utils'
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
import { WarningBanner } from './ExecSummaryBarWidget.styles'
import type { WidgetContext } from './types'
import { extractPrevYearCustomerCount } from './conditionSummaryUtils'

type SummaryTab = 'sales' | 'costProfit' | 'customers'

const TABS: { key: SummaryTab; label: string }[] = [
  { key: 'sales', label: '売上・予算' },
  { key: 'costProfit', label: '仕入・粗利' },
  { key: 'customers', label: '客数・客単価' },
]

export function ExecSummaryBarWidget(ctx: WidgetContext) {
  const { result: r, prevYear, onExplain, fmtCurrency } = ctx
  const curCustomers = ctx.readModels?.customerFact?.grandTotalCustomers ?? 0
  const prevCustomers = extractPrevYearCustomerCount(prevYear)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const invalidateCalculation = useUiStore((s) => s.invalidateCalculation)
  const [tab, setTab] = useState<SummaryTab>('sales')

  const pyRatio =
    prevYear.hasPrevYear && prevYear.totalSales > 0 ? r.totalSales / prevYear.totalSales : null
  const elapsedBudget = r.dailyCumulative.get(r.elapsedDays)?.budget ?? 0
  const elapsedDiff = r.totalSales - elapsedBudget

  // 観測品質の検出
  const observationWarning =
    ctx.observationStatus === 'partial'
      ? '観測日数が少ないため、日販・達成率の精度が低下しています'
      : ctx.observationStatus === 'invalid' || ctx.observationStatus === 'undefined'
        ? '観測期間が不十分なため、集計値は参考値です'
        : null
  // 仕入データ不足の検出
  const purchaseShort = r.purchaseMaxDay > 0 && r.purchaseMaxDay < r.elapsedDays
  // 売変データ欠損の検出
  const missingDiscount = !r.hasDiscountData && r.totalSales > 0

  const handleFilterToPurchaseRange = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (r.purchaseMaxDay > 0) {
        updateSettings({ dataEndDay: r.purchaseMaxDay })
        calculationCache.clear()
        invalidateCalculation()
      }
    },
    [r.purchaseMaxDay, updateSettings, invalidateCalculation],
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
                {fmtCurrency(elapsedBudget)} / {fmtCurrency(r.totalSales)}
              </ExecSummaryValue>
              <ExecSummarySub $color={sc.cond(elapsedDiff >= 0)}>
                予算差異: {fmtCurrency(elapsedDiff)}
              </ExecSummarySub>
              <ExecSummarySub $color={sc.cond(r.budgetProgressRate >= 1)}>
                売上予算達成率: {formatPercent(r.budgetProgressRate)}
              </ExecSummarySub>
              {pyRatio != null && (
                <ExecSummarySub $color={sc.cond(pyRatio >= 1)}>
                  前年同曜日比: {formatPercent(pyRatio)}
                </ExecSummarySub>
              )}
              {observationWarning && <WarningBanner>{observationWarning}</WarningBanner>}
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
                {fmtCurrency(r.budget)} / {fmtCurrency(r.totalSales)}
              </ExecSummaryValue>
              <ExecSummarySub>予算経過率: {formatPercent(r.budgetElapsedRate)}</ExecSummarySub>
              <ExecSummarySub $color={sc.cond(r.budgetAchievementRate >= 1)}>
                予算消化率: {formatPercent(r.budgetAchievementRate)}
              </ExecSummarySub>
              <ExecSummarySub $color={r.remainingBudget <= 0 ? sc.positive : undefined}>
                残予算: {fmtCurrency(r.remainingBudget)}
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
                期首在庫: {r.openingInventory != null ? fmtCurrency(r.openingInventory) : '未入力'}
              </ExecSummarySub>
              <ExecSummarySub>期中仕入高: {fmtCurrency(r.totalCost)}</ExecSummarySub>
              <ExecSummaryValue>
                期末在庫: {r.closingInventory != null ? fmtCurrency(r.closingInventory) : '未入力'}
              </ExecSummaryValue>
              {r.estMethodClosingInventory != null && (
                <ExecSummarySub>
                  推定期末在庫: {fmtCurrency(r.estMethodClosingInventory)}
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
                      {formatPercent(r.averageMarkupRate)} / {fmtCurrency(markupAmount)}
                    </ExecSummaryValue>
                    <ExecSummarySub>
                      売変率 / 売変額: {formatPercent(r.discountRate)} /{' '}
                      {fmtCurrency(r.totalDiscount)}
                    </ExecSummarySub>
                    <ExecSummarySub>
                      推定マージン額（売変還元法）:{' '}
                      {fmtCurrency(Math.round(r.grossSales * estGpRate))}
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
                    const invAfterRate = calculateGrossProfitRate(
                      r.invMethodGrossProfit! - r.totalCostInclusion,
                      r.totalSales,
                    )
                    const invDiff = r.invMethodGrossProfitRate - invAfterRate
                    const estBeforeRate = calculateGrossProfitRate(
                      r.estMethodMargin + r.totalCostInclusion,
                      r.totalCoreSales,
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
                          {fmtCurrency(r.totalCostInclusion)}円
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
                    const estBeforeRate = calculateGrossProfitRate(
                      r.estMethodMargin + r.totalCostInclusion,
                      r.totalCoreSales,
                    )
                    const estDiff = estBeforeRate - r.estMethodMarginRate
                    return (
                      <>
                        <ExecSummaryValue>
                          {formatPercent(estBeforeRate)} / {formatPercent(r.estMethodMarginRate)}
                        </ExecSummaryValue>
                        <ExecSummarySub>
                          推定法（在庫差分） 減算比 {formatPointDiff(estDiff)} 原価算入費:{' '}
                          {fmtCurrency(r.totalCostInclusion)}円
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
          curCustomers > 0 &&
          (() => {
            const txValue = calculateTransactionValue(r.totalSales, curCustomers)
            const custRatio =
              prevYear.hasPrevYear && prevCustomers > 0 ? curCustomers / prevCustomers : null
            const pyTxValue =
              prevYear.hasPrevYear && prevCustomers > 0
                ? calculateTransactionValue(prevYear.totalSales, prevCustomers)
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
                    客数: {fmtCurrency(curCustomers)}人 / 日平均:{' '}
                    {fmtCurrency(r.averageCustomersPerDay)}人
                  </ExecSummarySub>
                  <ExecSummaryValue>{fmtCurrency(txValue)}円</ExecSummaryValue>
                  {custRatio != null && (
                    <ExecSummarySub $color={sc.cond(custRatio >= 1)}>
                      客数前年比: {formatPercent(custRatio)}
                    </ExecSummarySub>
                  )}
                  {pyTxValue != null && (
                    <ExecSummarySub>前年客単価: {fmtCurrency(pyTxValue)}円</ExecSummarySub>
                  )}
                </ExecSummaryItem>
              </ExecSummaryBar>
            )
          })()}
        {tab === 'customers' && curCustomers === 0 && (
          <ExecSummarySub>客数データなし</ExecSummarySub>
        )}
      </ExecSummaryTabContent>
    </ExecSummaryWrapper>
  )
}
