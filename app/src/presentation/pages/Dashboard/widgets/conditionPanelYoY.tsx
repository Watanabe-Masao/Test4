/**
 * 前年比（売上・客数）の詳細パネル
 *
 * VM (conditionPanelYoY.vm.ts) で計算済みデータを受け取り、
 * レンダリングのみに専念する。
 */
import { useState, useMemo } from 'react'
import { formatPercent, formatCurrency } from '@/domain/formatting'
import { safeDivide } from '@/domain/calculations/utils'
import {
  type DailyYoYRow,
  buildSalesYoYDetailVm,
  buildCustomerYoYDetailVm,
} from './conditionPanelYoY.vm'
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
import type { SalesYoYDetailProps, CustomerYoYDetailProps } from './conditionDetailTypes'

// ─── Daily YoY Rendering ──────────────────────────────

function renderDailyYoYRows(
  rows: readonly DailyYoYRow[],
  mode: 'cumulative' | 'daily',
  metric: 'sales' | 'customers',
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
    const yoy = safeDivide(displayCurrent, displayPrev, 0)

    const fmtVal =
      metric === 'sales'
        ? (v: number) => formatCurrency(v)
        : (v: number) => `${v.toLocaleString()}人`

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
      ),
    [sortedStoreEntries, stores, result, effectiveConfig, prevYear, prevYearMonthlyKpi, dataMaxDay],
  )

  return (
    <>
      <DetailHeader>
        <DetailTitle>売上前年比 — 店舗内訳</DetailTitle>
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
          <BTr $highlight>
            <BTd $bold>合計</BTd>
            <BTd $bold>{vm.totalCurrentStr}</BTd>
            <BTd $bold>{vm.totalPrevStr}</BTd>
            <BTd $bold $color={vm.totalColor}>
              {vm.totalYoYStr}
            </BTd>
          </BTr>
        </tbody>
      </BTable>

      {vm.hasDailyRows && (
        <>
          <DetailHeader style={{ marginTop: '16px' }}>
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
            <tbody>{renderDailyYoYRows(vm.dailyRows, dailyMode, 'sales')}</tbody>
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
  const [dailyMode, setDailyMode] = useState<'cumulative' | 'daily'>('cumulative')

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

  return (
    <>
      <DetailHeader>
        <DetailTitle>客数前年比 — 店舗内訳</DetailTitle>
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
            <BTr key={row.storeId}>
              <BTd>
                <BSignalDot $color={row.sigColor} />
                {row.storeName}
              </BTd>
              <BTd>{row.currentCustomersStr}</BTd>
              <BTd>{row.prevCustomersStr}</BTd>
              <BTd $color={row.sigColor}>{row.yoyStr}</BTd>
            </BTr>
          ))}
          <BTr $highlight>
            <BTd $bold>合計</BTd>
            <BTd $bold>{vm.totalCurrentStr}</BTd>
            <BTd $bold>{vm.totalPrevStr}</BTd>
            <BTd $bold $color={vm.totalColor}>
              {vm.totalYoYStr}
            </BTd>
          </BTr>
        </tbody>
      </BTable>

      {vm.hasDailyRows && (
        <>
          <DetailHeader style={{ marginTop: '16px' }}>
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
            <tbody>{renderDailyYoYRows(vm.dailyRows, dailyMode, 'customers')}</tbody>
          </BTable>
        </>
      )}
    </>
  )
}
