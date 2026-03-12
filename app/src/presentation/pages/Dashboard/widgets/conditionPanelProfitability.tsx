/**
 * 粗利率・売変率の詳細パネル
 *
 * VM (conditionPanelProfitability.vm.ts) で計算済みデータを受け取り、
 * レンダリングのみに専念する。
 */
import { useMemo } from 'react'
import { DISCOUNT_TYPES } from '@/domain/models'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { buildGpRateDetailVm, buildDiscountRateDetailVm } from './conditionPanelProfitability.vm'
import {
  DetailHeader,
  DetailTitle,
  ToggleGroup,
  ToggleBtn,
  BTable,
  BTh,
  BTd,
  BTr,
  BSignalDot,
} from './ConditionSummary.styles'
import type { DetailPanelProps } from './conditionDetailTypes'

// ─── GP Rate Detail ─────────────────────────────────────

export function GpRateDetailTable({
  sortedStoreEntries,
  stores,
  result,
  effectiveConfig,
  displayMode,
  onDisplayModeChange,
  elapsedDays,
  daysInMonth,
}: DetailPanelProps) {
  const { format: fmtCurrency } = useCurrencyFormat()
  const vm = useMemo(
    () =>
      buildGpRateDetailVm(
        sortedStoreEntries,
        stores,
        result,
        effectiveConfig,
        elapsedDays,
        daysInMonth,
        fmtCurrency,
      ),
    [sortedStoreEntries, stores, result, effectiveConfig, elapsedDays, daysInMonth, fmtCurrency],
  )

  return (
    <>
      <DetailHeader>
        <DetailTitle>粗利率 — 店舗内訳</DetailTitle>
        <ToggleGroup>
          <ToggleBtn $active={displayMode === 'rate'} onClick={() => onDisplayModeChange('rate')}>
            率
          </ToggleBtn>
          <ToggleBtn
            $active={displayMode === 'amount'}
            onClick={() => onDisplayModeChange('amount')}
          >
            金額
          </ToggleBtn>
        </ToggleGroup>
      </DetailHeader>
      <BTable>
        <thead>
          <tr>
            <BTh>店舗名</BTh>
            {displayMode === 'rate' ? (
              <>
                <BTh>粗利率予算</BTh>
                <BTh>原算前粗利率</BTh>
                <BTh>原価算後粗利率</BTh>
                <BTh>差異</BTh>
              </>
            ) : (
              <>
                <BTh>粗利予算額</BTh>
                <BTh>原算前粗利額</BTh>
                <BTh>原価算後粗利額</BTh>
                <BTh>差異</BTh>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {vm.storeRows.map((row) =>
            displayMode === 'rate' ? (
              <BTr key={row.storeId}>
                <BTd>
                  <BSignalDot $color={row.sigColor} />
                  {row.storeName}
                </BTd>
                <BTd>{row.budgetRate}</BTd>
                <BTd>{row.beforeRate}</BTd>
                <BTd>
                  {row.afterRate} ({row.costInclusionRate})
                </BTd>
                <BTd $color={row.sigColor}>{row.diffPointStr}</BTd>
              </BTr>
            ) : (
              <BTr key={row.storeId}>
                <BTd>
                  <BSignalDot $color={row.sigColor} />
                  {row.storeName}
                </BTd>
                <BTd>{row.gpBudgetAmt}</BTd>
                <BTd>{row.gpBeforeAmt}</BTd>
                <BTd>{row.gpAfterAmt}</BTd>
                <BTd $color={row.sigColor}>
                  {row.diffAmtSign}
                  {row.diffAmtStr}
                </BTd>
              </BTr>
            ),
          )}
          {/* Total row */}
          {displayMode === 'rate' ? (
            <BTr $highlight>
              <BTd $bold>合計</BTd>
              <BTd $bold>{vm.total.budgetRate}</BTd>
              <BTd $bold>{vm.total.beforeRate}</BTd>
              <BTd $bold>
                {vm.total.afterRate} ({vm.total.costInclusionRate})
              </BTd>
              <BTd $bold $color={vm.total.totalColor}>
                {vm.total.diffPointStr}
              </BTd>
            </BTr>
          ) : (
            <BTr $highlight>
              <BTd $bold>合計</BTd>
              <BTd $bold>{vm.total.gpBudgetAmt}</BTd>
              <BTd $bold>{vm.total.gpBeforeAmt}</BTd>
              <BTd $bold>{vm.total.gpAfterAmt}</BTd>
              <BTd $bold $color={vm.total.totalColor}>
                {vm.total.totalDiffAmtSign}
                {vm.total.totalDiffAmtStr}
              </BTd>
            </BTr>
          )}
        </tbody>
      </BTable>
    </>
  )
}

// ─── Discount Rate Detail ───────────────────────────────

export function DiscountRateDetailTable({
  sortedStoreEntries,
  stores,
  result,
  effectiveConfig,
  displayMode,
  onDisplayModeChange,
}: DetailPanelProps) {
  const { format: fmtCurrency } = useCurrencyFormat()
  const vm = useMemo(
    () =>
      buildDiscountRateDetailVm(sortedStoreEntries, stores, result, effectiveConfig, fmtCurrency),
    [sortedStoreEntries, stores, result, effectiveConfig, fmtCurrency],
  )

  return (
    <>
      <DetailHeader>
        <DetailTitle>売変率 — 店舗内訳</DetailTitle>
        <ToggleGroup>
          <ToggleBtn $active={displayMode === 'rate'} onClick={() => onDisplayModeChange('rate')}>
            率
          </ToggleBtn>
          <ToggleBtn
            $active={displayMode === 'amount'}
            onClick={() => onDisplayModeChange('amount')}
          >
            金額
          </ToggleBtn>
        </ToggleGroup>
      </DetailHeader>
      <BTable>
        <thead>
          <tr>
            <BTh>店舗名</BTh>
            <BTh>売変率</BTh>
            {DISCOUNT_TYPES.map((dt) => (
              <BTh key={dt.type}>
                {dt.label}({dt.type})
              </BTh>
            ))}
          </tr>
        </thead>
        <tbody>
          {vm.storeRows.map((row) => (
            <BTr key={row.storeId}>
              <BTd>
                <BSignalDot $color={row.sigColor} />
                {row.storeName}
              </BTd>
              <BTd $color={row.sigColor}>{displayMode === 'rate' ? row.rateStr : row.amtStr}</BTd>
              {row.entries.map((e) => (
                <BTd key={e.type}>{displayMode === 'rate' ? e.rateStr : e.amtStr}</BTd>
              ))}
            </BTr>
          ))}
          {/* Total row */}
          <BTr $highlight>
            <BTd $bold>合計</BTd>
            <BTd $bold $color={vm.total.totalColor}>
              {displayMode === 'rate' ? vm.total.rateStr : vm.total.amtStr}
            </BTd>
            {vm.total.entries.map((e) => (
              <BTd key={e.type} $bold>
                {displayMode === 'rate' ? e.rateStr : e.amtStr}
              </BTd>
            ))}
          </BTr>
        </tbody>
      </BTable>
    </>
  )
}
