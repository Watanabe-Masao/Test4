/**
 * 前年比（売上・客数・点数・総仕入）の詳細パネル
 *
 * VM (conditionPanelYoY.vm.ts) で計算済みデータを受け取り、
 * レンダリングのみに専念する。
 *
 * 店舗行をクリック → 日別モーダル（conditionPanelYoYDailyModal.tsx）を表示。
 *
 * @responsibility R:unclassified
 */
import { useState, useMemo, useCallback } from 'react'
import { formatPercent } from '@/domain/formatting'
import { calculateYoYRatio } from '@/domain/calculations/utils'
import {
  useCurrencyFormat,
  type CurrencyFormatter,
} from '@/presentation/components/charts/chartTheme'
import {
  buildStoreDailyYoYRows,
  buildSalesYoYDetailVm,
  buildCustomerYoYDetailVm,
} from './conditionPanelYoY.vm'
import type { DailyYoYRow } from './conditionPanelYoY.vm'
import { CustomerYoYDailyModal } from './conditionPanelYoYDailyModal'
import { ToggleGroup, ToggleBtn } from './ConditionSummary.styles'
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
import type { SalesYoYDetailProps, CustomerYoYDetailProps } from './conditionDetailTypes'

// ─── Daily YoY Rendering ──────────────────────────────

const DAILY_COLS = '0.6fr 1fr 1fr 1fr'
const STORE_COLS = '1.2fr 1fr 1fr 1fr'

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

    const yoyColor =
      displayPrev > 0 ? (yoy >= 1.0 ? '#10b981' : yoy >= 0.97 ? '#eab308' : '#ef4444') : undefined

    return (
      <StoreRowWrapper key={row.day}>
        <StoreRowGrid style={{ gridTemplateColumns: DAILY_COLS }}>
          <MonoSm>{row.day}日</MonoSm>
          <MonoSm style={{ textAlign: 'right' }}>{fmtVal(displayCurrent)}</MonoSm>
          <MonoSm style={{ textAlign: 'right' }}>
            {displayPrev > 0 ? fmtVal(displayPrev) : '—'}
          </MonoSm>
          <MonoMd $bold $color={yoyColor} style={{ textAlign: 'right' }}>
            {displayPrev > 0 ? formatPercent(yoy, 2) : '—'}
          </MonoMd>
        </StoreRowGrid>
      </StoreRowWrapper>
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

      <div style={{ padding: '12px 16px 4px' }}>
        <SectionLabel>店舗内訳</SectionLabel>
      </div>
      <TableHeaderRow style={{ gridTemplateColumns: STORE_COLS }}>
        <TableHeaderCell>店名</TableHeaderCell>
        <TableHeaderCell $align="right">当年売上</TableHeaderCell>
        <TableHeaderCell $align="right">前年売上</TableHeaderCell>
        <TableHeaderCell $align="right">前年比</TableHeaderCell>
      </TableHeaderRow>
      <div>
        {vm.storeRows.map((row) => (
          <StoreRowWrapper key={row.storeId}>
            <StoreRowGrid style={{ gridTemplateColumns: STORE_COLS }}>
              <StoreName>{row.storeName}</StoreName>
              <MonoSm style={{ textAlign: 'right' }}>{row.currentSalesStr}</MonoSm>
              <MonoSm style={{ textAlign: 'right' }}>{row.prevSalesStr}</MonoSm>
              <MonoMd $bold $color={row.sigColor} style={{ textAlign: 'right' }}>
                {row.yoyStr}
              </MonoMd>
            </StoreRowGrid>
          </StoreRowWrapper>
        ))}
      </div>

      {vm.hasDailyRows && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 16px 4px',
            }}
          >
            <SectionLabel>全店 日別推移</SectionLabel>
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
          </div>
          <TableHeaderRow style={{ gridTemplateColumns: DAILY_COLS }}>
            <TableHeaderCell>日</TableHeaderCell>
            <TableHeaderCell $align="right">当年</TableHeaderCell>
            <TableHeaderCell $align="right">前年</TableHeaderCell>
            <TableHeaderCell $align="right">前年比</TableHeaderCell>
          </TableHeaderRow>
          <div>{renderDailyYoYRows(vm.dailyRows, dailyMode, 'sales', fmtCurrency)}</div>
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
  curTotalCustomers,
  prevTotalCustomers,
  storeCustomerMap,
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
        curTotalCustomers,
        prevTotalCustomers,
        storeCustomerMap,
      ),
    [
      sortedStoreEntries,
      stores,
      result,
      effectiveConfig,
      prevYear,
      prevYearMonthlyKpi,
      dataMaxDay,
      curTotalCustomers,
      prevTotalCustomers,
      storeCustomerMap,
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
    const sr = sortedStoreEntries.find(([id]) => id === dailyStoreId)?.[1]
    if (!sr) return []
    return buildStoreDailyYoYRows(sr, prevYearMonthlyKpi, dailyStoreId)
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
          <div style={{ padding: '12px 16px 4px' }}>
            <SectionLabel>店舗内訳</SectionLabel>
          </div>
          <TableHeaderRow style={{ gridTemplateColumns: STORE_COLS }}>
            <TableHeaderCell>店名</TableHeaderCell>
            <TableHeaderCell $align="right">当年客数</TableHeaderCell>
            <TableHeaderCell $align="right">前年客数</TableHeaderCell>
            <TableHeaderCell $align="right">前年比</TableHeaderCell>
          </TableHeaderRow>
          <div>
            {vm.storeRows.map((row) => (
              <StoreRowWrapper
                key={row.storeId}
                $clickable
                onClick={() => handleStoreClick(row.storeId)}
              >
                <StoreRowGrid style={{ gridTemplateColumns: STORE_COLS }}>
                  <StoreName>{row.storeName}</StoreName>
                  <MonoSm style={{ textAlign: 'right' }}>{row.currentCustomersStr}</MonoSm>
                  <MonoSm style={{ textAlign: 'right' }}>{row.prevCustomersStr}</MonoSm>
                  <MonoMd $bold $color={row.sigColor} style={{ textAlign: 'right' }}>
                    {row.yoyStr}
                  </MonoMd>
                </StoreRowGrid>
              </StoreRowWrapper>
            ))}
          </div>
        </>
      )}

      {vm.hasDailyRows && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 16px 4px',
            }}
          >
            <SectionLabel>全店 日別推移</SectionLabel>
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
          </div>
          <TableHeaderRow style={{ gridTemplateColumns: DAILY_COLS }}>
            <TableHeaderCell>日</TableHeaderCell>
            <TableHeaderCell $align="right">当年</TableHeaderCell>
            <TableHeaderCell $align="right">前年</TableHeaderCell>
            <TableHeaderCell $align="right">前年比</TableHeaderCell>
          </TableHeaderRow>
          <div>{renderDailyYoYRows(vm.dailyRows, dailyMode, 'customers', fmtCurrency)}</div>
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

// ─── Items YoY Detail（分離済み: conditionPanelYoYItems.tsx） ──
export { ItemsYoYDetailTable } from './conditionPanelYoYItems'
export type { ItemsYoYDetailProps } from './conditionPanelYoYItems'

// ─── TotalCost YoY Detail (re-export from split file) ──
export { TotalCostYoYDetailTable } from './conditionPanelYoYCost'
export type { TotalCostYoYDetailProps } from './conditionPanelYoYCost'
