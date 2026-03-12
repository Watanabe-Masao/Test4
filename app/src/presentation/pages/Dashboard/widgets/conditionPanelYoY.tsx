/**
 * 前年比（売上・客数）の詳細パネル
 *
 * ConditionDetailPanels.tsx から分割 (Group 3: YoY)
 */
import { useState } from 'react'
import type { StoreResult } from '@/domain/models'
import { formatPercent, formatCurrency } from '@/domain/formatting'
import { safeDivide } from '@/domain/calculations/utils'
import type { PrevYearMonthlyKpi } from '@/application/hooks/usePrevYearMonthlyKpi'
import { SIGNAL_COLORS, metricSignal } from './conditionSummaryUtils'
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

// ─── YoY Helper Functions ──────────────────────────────

/** Store-level prev-year sales from storeContributions, filtered by maxDay */
function computeStorePrevSales(kpi: PrevYearMonthlyKpi, storeId: string, maxDay?: number): number {
  if (!kpi.hasPrevYear) return 0
  return kpi.sameDow.storeContributions
    .filter((c) => c.storeId === storeId && (maxDay == null || c.mappedDay <= maxDay))
    .reduce((sum, c) => sum + c.sales, 0)
}

/** Store-level prev-year customers from storeContributions, filtered by maxDay */
function computeStorePrevCustomers(
  kpi: PrevYearMonthlyKpi,
  storeId: string,
  maxDay?: number,
): number {
  if (!kpi.hasPrevYear) return 0
  return kpi.sameDow.storeContributions
    .filter((c) => c.storeId === storeId && (maxDay == null || c.mappedDay <= maxDay))
    .reduce((sum, c) => sum + c.customers, 0)
}

interface DailyYoYRow {
  readonly day: number
  readonly currentSales: number
  readonly prevSales: number
  readonly currentCustomers: number
  readonly prevCustomers: number
}

/** Build daily YoY comparison rows (all-store aggregate) */
function buildDailyYoYRows(r: StoreResult, kpi: PrevYearMonthlyKpi): DailyYoYRow[] {
  if (!kpi.hasPrevYear) return []

  const mapping = kpi.sameDow.dailyMapping
  const dayMap = new Map<number, { prevSales: number; prevCustomers: number }>()
  for (const row of mapping) {
    dayMap.set(row.currentDay, { prevSales: row.prevSales, prevCustomers: row.prevCustomers })
  }

  const rows: DailyYoYRow[] = []
  const days = [...r.daily.entries()].sort(([a], [b]) => a - b)
  for (const [day, dr] of days) {
    const prev = dayMap.get(day)
    rows.push({
      day,
      currentSales: dr.sales,
      prevSales: prev?.prevSales ?? 0,
      currentCustomers: dr.customers ?? 0,
      prevCustomers: prev?.prevCustomers ?? 0,
    })
  }
  return rows
}

/** Render daily YoY rows with cumulative/daily toggle */
function renderDailyYoYRows(
  rows: DailyYoYRow[],
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
  result: r,
  effectiveConfig,
  prevYear,
  prevYearMonthlyKpi,
  dataMaxDay,
}: SalesYoYDetailProps) {
  const [dailyMode, setDailyMode] = useState<'cumulative' | 'daily'>('cumulative')
  const prevTotal = prevYear.totalSales
  const yoyTotal = safeDivide(r.totalSales, prevTotal, 0)
  const totalSig = metricSignal(yoyTotal, 'salesYoY', effectiveConfig)
  const totalColor = SIGNAL_COLORS[totalSig]

  // Build all-store daily data from prevYearMonthlyKpi (sameDow mapping) and current daily
  const dailyRows = buildDailyYoYRows(r, prevYearMonthlyKpi)

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
          {sortedStoreEntries.map(([storeId, sr]) => {
            const store = stores.get(storeId)
            const storeName = store?.name ?? storeId
            const prevStoreSales = computeStorePrevSales(prevYearMonthlyKpi, storeId, dataMaxDay)
            const storeYoY = safeDivide(sr.totalSales, prevStoreSales, 0)
            const sig =
              prevStoreSales > 0
                ? metricSignal(storeYoY, 'salesYoY', effectiveConfig, sr.storeId)
                : 'blue'
            const sigColor = SIGNAL_COLORS[sig]

            return (
              <BTr key={storeId}>
                <BTd>
                  <BSignalDot $color={sigColor} />
                  {storeName}
                </BTd>
                <BTd>{formatCurrency(sr.totalSales)}</BTd>
                <BTd>{prevStoreSales > 0 ? formatCurrency(prevStoreSales) : '—'}</BTd>
                <BTd $color={sigColor}>{prevStoreSales > 0 ? formatPercent(storeYoY, 2) : '—'}</BTd>
              </BTr>
            )
          })}
          <BTr $highlight>
            <BTd $bold>合計</BTd>
            <BTd $bold>{formatCurrency(r.totalSales)}</BTd>
            <BTd $bold>{formatCurrency(prevTotal)}</BTd>
            <BTd $bold $color={totalColor}>
              {formatPercent(yoyTotal, 2)}
            </BTd>
          </BTr>
        </tbody>
      </BTable>

      {/* All-store daily breakdown */}
      {dailyRows.length > 0 && (
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
            <tbody>{renderDailyYoYRows(dailyRows, dailyMode, 'sales')}</tbody>
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
  result: r,
  effectiveConfig,
  prevYear,
  prevYearMonthlyKpi,
  dataMaxDay,
}: CustomerYoYDetailProps) {
  const [dailyMode, setDailyMode] = useState<'cumulative' | 'daily'>('cumulative')
  const prevTotal = prevYear.totalCustomers
  const yoyTotal = safeDivide(r.totalCustomers, prevTotal, 0)
  const totalSig = metricSignal(yoyTotal, 'customerYoY', effectiveConfig)
  const totalColor = SIGNAL_COLORS[totalSig]

  const dailyRows = buildDailyYoYRows(r, prevYearMonthlyKpi)

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
          {sortedStoreEntries.map(([storeId, sr]) => {
            const store = stores.get(storeId)
            const storeName = store?.name ?? storeId
            const prevStoreCustomers = computeStorePrevCustomers(
              prevYearMonthlyKpi,
              storeId,
              dataMaxDay,
            )
            const storeYoY = safeDivide(sr.totalCustomers, prevStoreCustomers, 0)
            const sig =
              prevStoreCustomers > 0
                ? metricSignal(storeYoY, 'customerYoY', effectiveConfig, sr.storeId)
                : 'blue'
            const sigColor = SIGNAL_COLORS[sig]

            return (
              <BTr key={storeId}>
                <BTd>
                  <BSignalDot $color={sigColor} />
                  {storeName}
                </BTd>
                <BTd>{sr.totalCustomers.toLocaleString()}人</BTd>
                <BTd>
                  {prevStoreCustomers > 0 ? `${prevStoreCustomers.toLocaleString()}人` : '—'}
                </BTd>
                <BTd $color={sigColor}>
                  {prevStoreCustomers > 0 ? formatPercent(storeYoY, 2) : '—'}
                </BTd>
              </BTr>
            )
          })}
          <BTr $highlight>
            <BTd $bold>合計</BTd>
            <BTd $bold>{r.totalCustomers.toLocaleString()}人</BTd>
            <BTd $bold>{prevTotal.toLocaleString()}人</BTd>
            <BTd $bold $color={totalColor}>
              {formatPercent(yoyTotal, 2)}
            </BTd>
          </BTr>
        </tbody>
      </BTable>

      {dailyRows.length > 0 && (
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
            <tbody>{renderDailyYoYRows(dailyRows, dailyMode, 'customers')}</tbody>
          </BTable>
        </>
      )}
    </>
  )
}
