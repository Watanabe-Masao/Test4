/**
 * 前年比（売上・客数・点数・総仕入）の詳細パネル
 *
 * VM (conditionPanelYoY.vm.ts) で計算済みデータを受け取り、
 * レンダリングのみに専念する。
 *
 * 店舗行をクリック → 日別モーダル（conditionPanelYoYDailyModal.tsx）を表示。
 */
import { useState, useMemo, useCallback } from 'react'
import { formatPercent } from '@/domain/formatting'
import { calculateYoYRatio } from '@/domain/calculations/utils'
import {
  useCurrencyFormat,
  type CurrencyFormatter,
} from '@/presentation/components/charts/chartTheme'
import {
  type DailyYoYRow,
  type ItemsYoYDailyRow,
  buildDailyYoYRows,
  buildSalesYoYDetailVm,
  buildCustomerYoYDetailVm,
  buildItemsYoYDetailVm,
  buildItemsYoYStoreDailyRows,
} from './conditionPanelYoY.vm'
import { CustomerYoYDailyModal, ItemsYoYDailyModal } from './conditionPanelYoYDailyModal'
import type { PrevYearMonthlyKpi } from '@/application/comparison/comparisonTypes'
import type { CurrentCtsQuantity } from './types'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { Store } from '@/domain/models/record'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
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
import {
  TotalSection,
  TotalGrid,
  TotalCell,
  SmallLabel,
  BigValue,
  AchValue,
} from './ConditionSummaryEnhanced.styles'
import type { SalesYoYDetailProps, CustomerYoYDetailProps } from './conditionDetailTypes'

// ─── Daily YoY Rendering ──────────────────────────────

function renderDailyYoYRows(
  rows: readonly DailyYoYRow[],
  mode: 'cumulative' | 'daily',
  metric: 'sales' | 'customers',
  fmtCurrency: CurrencyFormatter,
): React.ReactNode[] {
  let cumCurrent = 0
  let cumPrev = 0

  return rows.map((row) => {
    const currentVal = metric === 'sales' ? row.currentSales : row.currentCustomers
    const prevVal = metric === 'sales' ? row.prevSales : row.prevCustomers
    cumCurrent += currentVal
    cumPrev += prevVal

    const displayCurrent = mode === 'cumulative' ? cumCurrent : currentVal
    const displayPrev = mode === 'cumulative' ? cumPrev : prevVal
    const yoy = calculateYoYRatio(displayCurrent, displayPrev)

    const fmtVal =
      metric === 'sales' ? (v: number) => fmtCurrency(v) : (v: number) => `${v.toLocaleString()}人`

    return (
      <BTr key={row.day}>
        <BTd>{row.day}日</BTd>
        <BTd>{fmtVal(displayCurrent)}</BTd>
        <BTd>{displayPrev > 0 ? fmtVal(displayPrev) : '—'}</BTd>
        <BTd>{displayPrev > 0 ? formatPercent(yoy, 2) : '—'}</BTd>
      </BTr>
    )
  })
}

// ─── Items YoY Daily Row Renderer ─────────────────────

function renderItemsDailyRows(
  rows: readonly ItemsYoYDailyRow[],
  mode: 'cumulative' | 'daily',
): React.ReactNode[] {
  let cumCur = 0
  let cumPrev = 0

  return rows.map((row) => {
    cumCur += row.currentQty
    cumPrev += row.prevQty
    const cur = mode === 'cumulative' ? cumCur : row.currentQty
    const prev = mode === 'cumulative' ? cumPrev : row.prevQty
    const yoy = calculateYoYRatio(cur, prev)

    return (
      <BTr key={row.day}>
        <BTd>{row.day}日</BTd>
        <BTd>{cur.toLocaleString()}点</BTd>
        <BTd>{prev > 0 ? `${prev.toLocaleString()}点` : '—'}</BTd>
        <BTd>{prev > 0 ? formatPercent(yoy, 2) : '—'}</BTd>
      </BTr>
    )
  })
}

// ─── Sales YoY Detail ──────────────────────────────────

export function SalesYoYDetailTable({
  sortedStoreEntries,
  stores,
  result,
  effectiveConfig,
  prevYear,
  prevYearMonthlyKpi,
  dataMaxDay,
}: SalesYoYDetailProps) {
  const [dailyMode, setDailyMode] = useState<'cumulative' | 'daily'>('cumulative')
  const { format: fmtCurrency } = useCurrencyFormat()

  const vm = useMemo(
    () =>
      buildSalesYoYDetailVm(
        sortedStoreEntries,
        stores,
        result,
        effectiveConfig,
        prevYear,
        prevYearMonthlyKpi,
        dataMaxDay,
        fmtCurrency,
      ),
    [
      sortedStoreEntries,
      stores,
      result,
      effectiveConfig,
      prevYear,
      prevYearMonthlyKpi,
      dataMaxDay,
      fmtCurrency,
    ],
  )

  return (
    <>
      <TotalSection>
        <TotalGrid>
          <TotalCell>
            <SmallLabel>当年売上</SmallLabel>
            <BigValue>{vm.totalCurrentStr}</BigValue>
          </TotalCell>
          <TotalCell $align="center">
            <SmallLabel>前年売上</SmallLabel>
            <BigValue>{vm.totalPrevStr}</BigValue>
          </TotalCell>
          <TotalCell $align="right">
            <SmallLabel>前年比</SmallLabel>
            <AchValue $color={vm.totalColor}>{vm.totalYoYStr}</AchValue>
          </TotalCell>
        </TotalGrid>
      </TotalSection>

      <DetailHeader style={{ padding: '12px 16px 0' }}>
        <DetailTitle>店舗内訳</DetailTitle>
      </DetailHeader>
      <BTable>
        <thead>
          <tr>
            <BTh>店舗名</BTh>
            <BTh>当年売上</BTh>
            <BTh>前年売上</BTh>
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
              <BTd>{row.currentSalesStr}</BTd>
              <BTd>{row.prevSalesStr}</BTd>
              <BTd $color={row.sigColor}>{row.yoyStr}</BTd>
            </BTr>
          ))}
        </tbody>
      </BTable>

      {vm.hasDailyRows && (
        <>
          <DetailHeader style={{ marginTop: '16px', padding: '0 16px' }}>
            <DetailTitle>全店 日別推移</DetailTitle>
            <ToggleGroup>
              <ToggleBtn
                $active={dailyMode === 'cumulative'}
                onClick={() => setDailyMode('cumulative')}
              >
                累計
              </ToggleBtn>
              <ToggleBtn $active={dailyMode === 'daily'} onClick={() => setDailyMode('daily')}>
                日別
              </ToggleBtn>
            </ToggleGroup>
          </DetailHeader>
          <BTable>
            <thead>
              <tr>
                <BTh>日</BTh>
                <BTh>当年</BTh>
                <BTh>前年</BTh>
                <BTh>前年比</BTh>
              </tr>
            </thead>
            <tbody>{renderDailyYoYRows(vm.dailyRows, dailyMode, 'sales', fmtCurrency)}</tbody>
          </BTable>
        </>
      )}
    </>
  )
}

// ─── Customer YoY Detail ───────────────────────────────

export function CustomerYoYDetailTable({
  sortedStoreEntries,
  stores,
  result,
  effectiveConfig,
  prevYear,
  prevYearMonthlyKpi,
  dataMaxDay,
}: CustomerYoYDetailProps) {
  const [dailyStoreId, setDailyStoreId] = useState<string | null>(null)
  const [dailyMode, setDailyMode] = useState<'cumulative' | 'daily'>('cumulative')
  const { format: fmtCurrency } = useCurrencyFormat()

  const vm = useMemo(
    () =>
      buildCustomerYoYDetailVm(
        sortedStoreEntries,
        stores,
        result,
        effectiveConfig,
        prevYear,
        prevYearMonthlyKpi,
        dataMaxDay,
      ),
    [sortedStoreEntries, stores, result, effectiveConfig, prevYear, prevYearMonthlyKpi, dataMaxDay],
  )

  const handleStoreClick = useCallback((storeId: string) => {
    setDailyStoreId(storeId)
  }, [])

  const handleCloseModal = useCallback(() => {
    setDailyStoreId(null)
  }, [])

  const modalDailyRows = useMemo(() => {
    if (!dailyStoreId) return []
    const sr = sortedStoreEntries.find(([id]) => id === dailyStoreId)?.[1]
    if (!sr) return []
    return buildDailyYoYRows(sr, prevYearMonthlyKpi)
  }, [dailyStoreId, sortedStoreEntries, prevYearMonthlyKpi])

  const modalStoreName = dailyStoreId ? (stores.get(dailyStoreId)?.name ?? dailyStoreId) : ''

  return (
    <>
      <TotalSection>
        <TotalGrid>
          <TotalCell>
            <SmallLabel>当年客数</SmallLabel>
            <BigValue>{vm.totalCurrentStr}</BigValue>
          </TotalCell>
          <TotalCell $align="center">
            <SmallLabel>前年客数</SmallLabel>
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
                <BTh>当年客数</BTh>
                <BTh>前年客数</BTh>
                <BTh>前年比</BTh>
              </tr>
            </thead>
            <tbody>
              {vm.storeRows.map((row) => (
                <BTr
                  key={row.storeId}
                  onClick={() => handleStoreClick(row.storeId)}
                  style={{ cursor: 'pointer' }}
                >
                  <BTd>
                    <BSignalDot $color={row.sigColor} />
                    {row.storeName}
                  </BTd>
                  <BTd>{row.currentCustomersStr}</BTd>
                  <BTd>{row.prevCustomersStr}</BTd>
                  <BTd $color={row.sigColor}>{row.yoyStr}</BTd>
                </BTr>
              ))}
            </tbody>
          </BTable>
        </>
      )}

      {vm.hasDailyRows && (
        <>
          <DetailHeader style={{ marginTop: '16px', padding: '0 16px' }}>
            <DetailTitle>全店 日別推移</DetailTitle>
            <ToggleGroup>
              <ToggleBtn
                $active={dailyMode === 'cumulative'}
                onClick={() => setDailyMode('cumulative')}
              >
                累計
              </ToggleBtn>
              <ToggleBtn $active={dailyMode === 'daily'} onClick={() => setDailyMode('daily')}>
                日別
              </ToggleBtn>
            </ToggleGroup>
          </DetailHeader>
          <BTable>
            <thead>
              <tr>
                <BTh>日</BTh>
                <BTh>当年</BTh>
                <BTh>前年</BTh>
                <BTh>前年比</BTh>
              </tr>
            </thead>
            <tbody>{renderDailyYoYRows(vm.dailyRows, dailyMode, 'customers', fmtCurrency)}</tbody>
          </BTable>
        </>
      )}

      {dailyStoreId != null && modalDailyRows.length > 0 && (
        <CustomerYoYDailyModal
          storeName={modalStoreName}
          dailyRows={modalDailyRows}
          onClose={handleCloseModal}
        />
      )}
    </>
  )
}

// ─── Items YoY Detail ─────────────────────────────────

export interface ItemsYoYDetailProps {
  readonly sortedStoreEntries: readonly [string, StoreResult][]
  readonly stores: ReadonlyMap<string, Store>
  readonly effectiveConfig: ConditionSummaryConfig
  readonly currentCtsQuantity: CurrentCtsQuantity
  readonly effectiveDay: number
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi
}

export function ItemsYoYDetailTable({
  sortedStoreEntries,
  stores,
  effectiveConfig,
  currentCtsQuantity,
  effectiveDay,
  prevYearMonthlyKpi,
}: ItemsYoYDetailProps) {
  const [dailyMode, setDailyMode] = useState<'cumulative' | 'daily'>('cumulative')
  const [dailyStoreId, setDailyStoreId] = useState<string | null>(null)

  const vm = useMemo(
    () =>
      buildItemsYoYDetailVm(
        sortedStoreEntries,
        stores,
        effectiveConfig,
        currentCtsQuantity,
        prevYearMonthlyKpi,
        effectiveDay,
      ),
    [
      sortedStoreEntries,
      stores,
      effectiveConfig,
      currentCtsQuantity,
      prevYearMonthlyKpi,
      effectiveDay,
    ],
  )

  const handleStoreClick = useCallback((storeId: string) => {
    setDailyStoreId(storeId)
  }, [])

  const handleCloseModal = useCallback(() => {
    setDailyStoreId(null)
  }, [])

  const modalDailyRows = useMemo(() => {
    if (!dailyStoreId) return []
    return buildItemsYoYStoreDailyRows(
      currentCtsQuantity,
      prevYearMonthlyKpi,
      effectiveDay,
      dailyStoreId,
    )
  }, [dailyStoreId, currentCtsQuantity, prevYearMonthlyKpi, effectiveDay])

  const modalStoreName = dailyStoreId ? (stores.get(dailyStoreId)?.name ?? dailyStoreId) : ''

  return (
    <>
      <TotalSection>
        <TotalGrid>
          <TotalCell>
            <SmallLabel>当年点数</SmallLabel>
            <BigValue>{vm.totalCurrentStr}</BigValue>
          </TotalCell>
          <TotalCell $align="center">
            <SmallLabel>前年点数</SmallLabel>
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
                <BTh>当年点数</BTh>
                <BTh>前年点数</BTh>
                <BTh>前年比</BTh>
              </tr>
            </thead>
            <tbody>
              {vm.storeRows.map((row) => (
                <BTr
                  key={row.storeId}
                  onClick={() => handleStoreClick(row.storeId)}
                  style={{ cursor: 'pointer' }}
                >
                  <BTd>
                    <BSignalDot $color={row.sigColor} />
                    {row.storeName}
                  </BTd>
                  <BTd>{row.currentQtyStr}</BTd>
                  <BTd>{row.prevQtyStr}</BTd>
                  <BTd $color={row.sigColor}>{row.yoyStr}</BTd>
                </BTr>
              ))}
            </tbody>
          </BTable>
        </>
      )}

      {vm.hasDailyRows && (
        <>
          <DetailHeader style={{ marginTop: '16px', padding: '0 16px' }}>
            <DetailTitle>全店 日別推移</DetailTitle>
            <ToggleGroup>
              <ToggleBtn
                $active={dailyMode === 'cumulative'}
                onClick={() => setDailyMode('cumulative')}
              >
                累計
              </ToggleBtn>
              <ToggleBtn $active={dailyMode === 'daily'} onClick={() => setDailyMode('daily')}>
                日別
              </ToggleBtn>
            </ToggleGroup>
          </DetailHeader>
          <BTable>
            <thead>
              <tr>
                <BTh>日</BTh>
                <BTh>当年</BTh>
                <BTh>前年</BTh>
                <BTh>前年比</BTh>
              </tr>
            </thead>
            <tbody>{renderItemsDailyRows(vm.dailyRows, dailyMode)}</tbody>
          </BTable>
        </>
      )}

      {dailyStoreId != null && modalDailyRows.length > 0 && (
        <ItemsYoYDailyModal
          storeName={modalStoreName}
          dailyRows={modalDailyRows}
          onClose={handleCloseModal}
        />
      )}
    </>
  )
}

// ─── TotalCost YoY Detail (re-export from split file) ──
export { TotalCostYoYDetailTable } from './conditionPanelYoYCost'
export type { TotalCostYoYDetailProps } from './conditionPanelYoYCost'
