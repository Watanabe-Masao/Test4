/**
 * 総仕入前年比の詳細パネル
 *
 * conditionPanelYoY.tsx から分離（G6: 600行上限）。
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { buildTotalCostYoYDetailVm } from './conditionPanelYoY.vm'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { Store } from '@/domain/models/record'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import {
  DetailHeader,
  DetailTitle,
  BTable,
  BTh,
  BTd,
  BTr,
  BSignalDot,
} from './ConditionSummary.styles'
import {
  TotalSection,
  TotalGrid,
  TotalCell,
  SmallLabel,
  BigValue,
  AchValue,
} from './ConditionSummaryEnhanced.styles'

// ─── TotalCost YoY Detail ─────────────────────────────

export interface TotalCostYoYDetailProps {
  readonly sortedStoreEntries: readonly [string, StoreResult][]
  readonly stores: ReadonlyMap<string, Store>
  readonly effectiveConfig: ConditionSummaryConfig
  readonly prevYearStoreCostPrice?: ReadonlyMap<string, { cost: number; price: number }>
  readonly fmtCurrency: (n: number) => string
}

export function TotalCostYoYDetailTable({
  sortedStoreEntries,
  stores,
  effectiveConfig,
  prevYearStoreCostPrice,
}: TotalCostYoYDetailProps) {
  const { format: fmtCurrency } = useCurrencyFormat()

  const vm = useMemo(
    () =>
      buildTotalCostYoYDetailVm(
        sortedStoreEntries,
        stores,
        effectiveConfig,
        prevYearStoreCostPrice,
        fmtCurrency,
      ),
    [sortedStoreEntries, stores, effectiveConfig, prevYearStoreCostPrice, fmtCurrency],
  )

  return (
    <>
      <TotalSection>
        <TotalGrid>
          <TotalCell>
            <SmallLabel>当年総仕入</SmallLabel>
            <BigValue>{vm.totalCurrentStr}</BigValue>
          </TotalCell>
          <TotalCell $align="center">
            <SmallLabel>前年総仕入</SmallLabel>
            <BigValue>{vm.totalPrevStr}</BigValue>
          </TotalCell>
          <TotalCell $align="right">
            <SmallLabel>前年比</SmallLabel>
            <AchValue $color={vm.totalColor}>{vm.totalYoYStr}</AchValue>
          </TotalCell>
        </TotalGrid>
      </TotalSection>

      {vm.storeRows.length > 1 && (
        <>
          <DetailHeader style={{ padding: '12px 16px 0' }}>
            <DetailTitle>店舗内訳</DetailTitle>
          </DetailHeader>
          <BTable>
            <thead>
              <tr>
                <BTh>店舗名</BTh>
                <BTh>当年仕入</BTh>
                <BTh>前年仕入</BTh>
                <BTh>前年比</BTh>
              </tr>
            </thead>
            <tbody>
              {vm.storeRows.map((row) => (
                <BTr key={row.storeId}>
                  <BTd>
                    <BSignalDot $color={row.sigColor} />
                    {row.storeName}
                  </BTd>
                  <BTd>{row.currentCostStr}</BTd>
                  <BTd>{row.prevCostStr}</BTd>
                  <BTd $color={row.sigColor}>{row.yoyStr}</BTd>
                </BTr>
              ))}
            </tbody>
          </BTable>
        </>
      )}
    </>
  )
}
