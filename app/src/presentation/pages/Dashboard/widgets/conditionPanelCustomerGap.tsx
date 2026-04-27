/**
 * 客数GAP 店別詳細テーブル
 *
 * 点数客数GAP / 金額客数GAP の店別内訳を表示する。
 * calculateCustomerGap 正本関数を店舗単位で呼び出し、GAP を算出する。
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import { formatPercent } from '@/domain/formatting'
import { calculateCustomerGap } from '@/domain/calculations/customerGap'
import type { CustomerGapResult } from '@/domain/calculations/customerGap'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { Store } from '@/domain/models/record'
import type { PrevYearMonthlyKpi } from '@/application/comparison/comparisonTypes'
import type { CustomerFactReadModel } from '@/application/readModels/customerFact'
import { toStoreCustomerRows } from '@/application/readModels/customerFact'
import {
  aggregateContributions,
  indexContributionsByStore,
} from '@/application/comparison/viewModels'
import type { CurrentCtsQuantity } from './types'
import {
  TotalSection,
  TotalGrid,
  TotalCell,
  SmallLabel,
  BigValue,
  AchValue,
  StoreRowWrapper,
  StoreRowGrid,
  StoreName,
  MonoSm,
  MonoMd,
  TableHeaderRow,
  TableHeaderCell,
  SectionLabel,
} from './ConditionSummaryEnhanced.styles'
import { computeStorePrevSales, computeStorePrevCustomers } from './conditionPanelYoY.vm'

const STORE_COLS = '1.2fr 0.8fr 0.8fr 0.8fr 0.8fr'

interface CustomerGapDetailProps {
  readonly gapType: 'quantity' | 'amount'
  readonly sortedStoreEntries: readonly [string, StoreResult][]
  readonly stores: ReadonlyMap<string, Store>
  readonly result: StoreResult
  readonly customerFact: CustomerFactReadModel
  readonly prevTotalCustomers: number
  readonly prevTotalSales: number
  readonly currentCtsQuantity: CurrentCtsQuantity
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi
  readonly effectiveDay: number
}

interface StoreGapRow {
  readonly storeId: string
  readonly storeName: string
  readonly gap: CustomerGapResult | null
}

export function gapColor(v: number): string {
  return v >= 0 ? '#10b981' : '#ef4444'
}

export function fmtGap(v: number): string {
  return `${v >= 0 ? '+' : ''}${formatPercent(v, 1)}`
}

export function CustomerGapDetailTable({
  gapType,
  sortedStoreEntries,
  stores,
  result,
  customerFact,
  prevTotalCustomers,
  prevTotalSales,
  currentCtsQuantity,
  prevYearMonthlyKpi,
  effectiveDay,
}: CustomerGapDetailProps) {
  const isQty = gapType === 'quantity'

  // 共通 VM 経由で店舗別前年販売点数を集約
  const prevQtyByStoreAgg = useMemo(
    () => indexContributionsByStore(prevYearMonthlyKpi.sameDow.storeContributions, effectiveDay),
    [prevYearMonthlyKpi, effectiveDay],
  )

  // CustomerFact → 店舗別客数マップ
  const storeCustomerMap = useMemo(() => toStoreCustomerRows(customerFact), [customerFact])

  // Total gap（共通 VM 経由で全店集約）
  const totalGap = useMemo(() => {
    if (prevTotalCustomers <= 0) return null
    const totalCurQty = currentCtsQuantity.total
    const totalAgg = aggregateContributions(prevYearMonthlyKpi.sameDow.storeContributions, {
      maxDay: effectiveDay,
    })
    const totalPrevQty = totalAgg.ctsQuantity
    return calculateCustomerGap({
      curCustomers: customerFact.grandTotalCustomers,
      prevCustomers: prevTotalCustomers,
      curQuantity: totalCurQty,
      prevQuantity: totalPrevQty,
      curSales: result.totalSales,
      prevSales: prevTotalSales,
    })
  }, [
    result,
    customerFact,
    prevTotalCustomers,
    prevTotalSales,
    currentCtsQuantity,
    prevYearMonthlyKpi,
    effectiveDay,
  ])

  // Per-store gaps
  const storeRows = useMemo<readonly StoreGapRow[]>(() => {
    return sortedStoreEntries.map(([storeId, sr]) => {
      const storeName = stores.get(storeId)?.name ?? storeId
      const curCustomers = storeCustomerMap.get(storeId) ?? 0
      const prevCustomers = computeStorePrevCustomers(prevYearMonthlyKpi, storeId, effectiveDay)
      const prevSales = computeStorePrevSales(prevYearMonthlyKpi, storeId, effectiveDay)
      const curQty = currentCtsQuantity.byStore.get(storeId) ?? 0
      const prevQty = prevQtyByStoreAgg.get(storeId)?.ctsQuantity ?? 0
      const gap =
        prevCustomers > 0 && prevQty > 0 && prevSales > 0
          ? calculateCustomerGap({
              curCustomers,
              prevCustomers,
              curQuantity: curQty,
              prevQuantity: prevQty,
              curSales: sr.totalSales,
              prevSales,
            })
          : null
      return { storeId, storeName, gap }
    })
  }, [
    sortedStoreEntries,
    stores,
    storeCustomerMap,
    prevYearMonthlyKpi,
    effectiveDay,
    currentCtsQuantity,
    prevQtyByStoreAgg,
  ])

  const totalGapValue = totalGap
    ? isQty
      ? totalGap.quantityCustomerGap
      : totalGap.amountCustomerGap
    : null

  return (
    <>
      <TotalSection>
        <TotalGrid>
          <TotalCell>
            <SmallLabel>客数前年比</SmallLabel>
            <BigValue>{totalGap ? formatPercent(totalGap.customerYoY, 2) : '—'}</BigValue>
          </TotalCell>
          <TotalCell $align="center">
            <SmallLabel>{isQty ? '点数前年比' : '金額前年比'}</SmallLabel>
            <BigValue>
              {totalGap ? formatPercent(isQty ? totalGap.quantityYoY : totalGap.salesYoY, 2) : '—'}
            </BigValue>
          </TotalCell>
          <TotalCell $align="right">
            <SmallLabel>{isQty ? '点数客数GAP' : '金額客数GAP'}</SmallLabel>
            <AchValue $color={totalGapValue != null ? gapColor(totalGapValue) : '#94a3b8'}>
              {totalGapValue != null ? fmtGap(totalGapValue) : '—'}
            </AchValue>
          </TotalCell>
        </TotalGrid>
      </TotalSection>

      {storeRows.length > 1 && (
        <>
          <div style={{ padding: '12px 16px 4px' }}>
            <SectionLabel>店舗内訳</SectionLabel>
          </div>
          <TableHeaderRow style={{ gridTemplateColumns: STORE_COLS }}>
            <TableHeaderCell>店名</TableHeaderCell>
            <TableHeaderCell $align="right">客数前年比</TableHeaderCell>
            <TableHeaderCell $align="right">{isQty ? '点数前年比' : '金額前年比'}</TableHeaderCell>
            <TableHeaderCell $align="right">GAP</TableHeaderCell>
            <TableHeaderCell $align="right">{isQty ? '点数/人' : '金額/人'}</TableHeaderCell>
          </TableHeaderRow>
          <div>
            {storeRows.map((row) => {
              const g = row.gap
              const gv = g ? (isQty ? g.quantityCustomerGap : g.amountCustomerGap) : null
              const metricYoY = g ? (isQty ? g.quantityYoY : g.salesYoY) : null
              // 1人あたり指標の前年比 = metric前年比 / 客数前年比
              const perCapitaYoY =
                g && g.customerYoY > 0 ? (isQty ? g.quantityYoY : g.salesYoY) / g.customerYoY : null
              return (
                <StoreRowWrapper key={row.storeId}>
                  <StoreRowGrid style={{ gridTemplateColumns: STORE_COLS }}>
                    <StoreName>{row.storeName}</StoreName>
                    <MonoSm style={{ textAlign: 'right' }}>
                      {g ? formatPercent(g.customerYoY, 2) : '—'}
                    </MonoSm>
                    <MonoSm style={{ textAlign: 'right' }}>
                      {metricYoY != null ? formatPercent(metricYoY, 2) : '—'}
                    </MonoSm>
                    <MonoMd
                      $bold
                      $color={gv != null ? gapColor(gv) : undefined}
                      style={{ textAlign: 'right' }}
                    >
                      {gv != null ? fmtGap(gv) : '—'}
                    </MonoMd>
                    <MonoSm
                      $color={perCapitaYoY != null ? gapColor(perCapitaYoY - 1) : undefined}
                      style={{ textAlign: 'right' }}
                    >
                      {perCapitaYoY != null ? formatPercent(perCapitaYoY, 2) : '—'}
                    </MonoSm>
                  </StoreRowGrid>
                </StoreRowWrapper>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
