import React, { type ReactNode } from 'react'
import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { getWeekRanges } from '@/domain/calculations/forecast'
import type { WidgetContext } from './types'
import { STableWrapper, STableTitle, STable, STh, STd } from '../DashboardPage.styles'

export function renderDowAverage(ctx: WidgetContext): ReactNode {
  const { result: r, year, month, prevYear } = ctx
  const dailySales = new Map<number, number>()
  const dailyBudget = new Map<number, number>()
  for (const [d, rec] of r.daily) {
    dailySales.set(d, rec.sales)
  }
  for (const [d, b] of r.budgetDaily) {
    dailyBudget.set(d, b)
  }

  const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']
  const buckets = Array.from({ length: 7 }, () => ({
    salesTotal: 0, salesCount: 0,
    budgetTotal: 0, budgetCount: 0,
    prevYearTotal: 0, prevYearCount: 0,
    customersTotal: 0, customersCount: 0,
  }))
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const sales = dailySales.get(d) ?? 0
    const budget = dailyBudget.get(d) ?? 0
    const dow = new Date(year, month - 1, d).getDay()
    if (sales > 0) {
      buckets[dow].salesTotal += sales
      buckets[dow].salesCount++
    }
    if (budget > 0) {
      buckets[dow].budgetTotal += budget
      buckets[dow].budgetCount++
    }
    const pySales = prevYear.daily.get(d)?.sales ?? 0
    if (pySales > 0) {
      buckets[dow].prevYearTotal += pySales
      buckets[dow].prevYearCount++
    }
    const cust = r.daily.get(d)?.customers ?? 0
    if (cust > 0) {
      buckets[dow].customersTotal += cust
      buckets[dow].customersCount++
    }
  }
  const hasCustomers = buckets.some(b => b.customersTotal > 0)
  const ordered = [1, 2, 3, 4, 5, 6, 0].map(i => {
    const b = buckets[i]
    const avgSales = b.salesCount > 0 ? b.salesTotal / b.salesCount : 0
    const avgBudget = b.budgetCount > 0 ? b.budgetTotal / b.budgetCount : 0
    const avgPrevYear = b.prevYearCount > 0 ? b.prevYearTotal / b.prevYearCount : 0
    const avgCustomers = b.customersCount > 0 ? Math.round(b.customersTotal / b.customersCount) : 0
    const avgTxValue = b.customersCount > 0 && b.customersTotal > 0
      ? Math.round(b.salesTotal / b.customersTotal)
      : 0
    return { label: DOW_LABELS[i], avgSales, avgBudget, diff: avgSales - avgBudget, salesCount: b.salesCount, budgetCount: b.budgetCount, avgPrevYear, avgCustomers, avgTxValue }
  })

  return (
    <STableWrapper>
      <STableTitle>曜日平均</STableTitle>
      <STable>
        <thead>
          <tr>
            <STh>曜日</STh>
            <STh>平均売上</STh>
            <STh>実績日数</STh>
            <STh>平均予算</STh>
            <STh>予算日数</STh>
            <STh>平均差</STh>
            {prevYear.hasPrevYear && <STh>前年同曜日平均</STh>}
            {prevYear.hasPrevYear && <STh>前年差額</STh>}
            {prevYear.hasPrevYear && <STh>前年同曜日比</STh>}
            {hasCustomers && <STh>平均客数</STh>}
            {hasCustomers && <STh>客単価</STh>}
          </tr>
        </thead>
        <tbody>
          {ordered.map(a => {
            const diffColor = sc.cond(a.diff >= 0)
            const pyRatio = a.avgPrevYear > 0 ? a.avgSales / a.avgPrevYear : 0
            const pyColor = sc.cond(pyRatio >= 1)
            const pyDiff = a.avgSales - a.avgPrevYear
            const pyDiffColor = sc.cond(pyDiff >= 0)
            return (
              <tr key={a.label}>
                <STd>{a.label}</STd>
                <STd>{formatCurrency(a.avgSales)}</STd>
                <STd>{a.salesCount}日</STd>
                <STd>{formatCurrency(a.avgBudget)}</STd>
                <STd>{a.budgetCount}日</STd>
                <STd style={{ color: diffColor }}>{formatCurrency(a.diff)}</STd>
                {prevYear.hasPrevYear && <STd>{formatCurrency(a.avgPrevYear)}</STd>}
                {prevYear.hasPrevYear && <STd style={{ color: a.avgPrevYear > 0 ? pyDiffColor : undefined }}>{a.avgPrevYear > 0 ? formatCurrency(pyDiff) : '-'}</STd>}
                {prevYear.hasPrevYear && <STd style={{ color: a.avgPrevYear > 0 ? pyColor : undefined }}>{a.avgPrevYear > 0 ? formatPercent(pyRatio, 0) : '-'}</STd>}
                {hasCustomers && <STd>{a.avgCustomers > 0 ? `${a.avgCustomers.toLocaleString('ja-JP')}人` : '-'}</STd>}
                {hasCustomers && <STd>{a.avgTxValue > 0 ? formatCurrency(a.avgTxValue) + '円' : '-'}</STd>}
              </tr>
            )
          })}
        </tbody>
      </STable>
    </STableWrapper>
  )
}

export function renderWeeklySummary(ctx: WidgetContext): ReactNode {
  const { result: r, year, month, prevYear } = ctx

  const weekRanges = getWeekRanges(year, month)
  const summaries = weekRanges.map(({ weekNumber, startDay, endDay }) => {
    let totalSales = 0
    let totalBudget = 0
    let totalPurchasePrice = 0
    let totalPurchaseCost = 0
    let days = 0
    let prevYearWeekSales = 0
    let totalCustomers = 0
    for (let d = startDay; d <= endDay; d++) {
      const rec = r.daily.get(d)
      const budget = r.budgetDaily.get(d) ?? 0
      const sales = rec?.sales ?? 0
      if (sales > 0) days++
      totalSales += sales
      totalBudget += budget
      if (rec) {
        totalPurchasePrice += rec.purchase.price + rec.flowers.price + rec.directProduce.price
        totalPurchaseCost += rec.purchase.cost + rec.flowers.cost + rec.directProduce.cost
        totalCustomers += rec.customers ?? 0
      }
      prevYearWeekSales += prevYear.daily.get(d)?.sales ?? 0
    }
    const markupRate = totalPurchasePrice > 0
      ? (totalPurchasePrice - totalPurchaseCost) / totalPurchasePrice
      : 0
    const weekTxValue = totalCustomers > 0 ? Math.round(totalSales / totalCustomers) : 0
    return { weekNumber, startDay, endDay, totalSales, totalBudget, diff: totalSales - totalBudget, markupRate, days, prevYearWeekSales, totalCustomers, weekTxValue }
  })
  const hasWeeklyCustomers = summaries.some(w => w.totalCustomers > 0)

  return (
    <STableWrapper>
      <STableTitle>週別サマリー</STableTitle>
      <STable>
        <thead>
          <tr>
            <STh>週</STh>
            <STh>期間</STh>
            <STh>売上</STh>
            <STh>予算</STh>
            <STh>予算差</STh>
            <STh>達成率</STh>
            <STh>値入率</STh>
            <STh>日数</STh>
            {prevYear.hasPrevYear && <STh>前年同曜日売上</STh>}
            {prevYear.hasPrevYear && <STh>前年差額</STh>}
            {prevYear.hasPrevYear && <STh>前年同曜日比</STh>}
            {hasWeeklyCustomers && <STh>客数</STh>}
            {hasWeeklyCustomers && <STh>客単価</STh>}
          </tr>
        </thead>
        <tbody>
          {summaries.map(w => {
            const achievement = w.totalBudget > 0 ? w.totalSales / w.totalBudget : 0
            const diffColor = sc.cond(w.diff >= 0)
            const achColor = sc.achievement(achievement)
            const pyWeekRatio = w.prevYearWeekSales > 0 ? w.totalSales / w.prevYearWeekSales : 0
            const pyWeekColor = sc.cond(pyWeekRatio >= 1)
            const pyWeekDiff = w.totalSales - w.prevYearWeekSales
            const pyWeekDiffColor = sc.cond(pyWeekDiff >= 0)
            return (
              <tr key={w.weekNumber}>
                <STd>第{w.weekNumber}週</STd>
                <STd>{month}/{w.startDay}～{month}/{w.endDay}</STd>
                <STd>{formatCurrency(w.totalSales)}</STd>
                <STd>{formatCurrency(w.totalBudget)}</STd>
                <STd style={{ color: diffColor }}>{formatCurrency(w.diff)}</STd>
                <STd style={{ color: achColor }}>{w.totalBudget > 0 ? formatPercent(achievement, 0) : '-'}</STd>
                <STd>{formatPercent(w.markupRate)}</STd>
                <STd>{w.days}日</STd>
                {prevYear.hasPrevYear && <STd>{formatCurrency(w.prevYearWeekSales)}</STd>}
                {prevYear.hasPrevYear && <STd style={{ color: w.prevYearWeekSales > 0 ? pyWeekDiffColor : undefined }}>{w.prevYearWeekSales > 0 ? formatCurrency(pyWeekDiff) : '-'}</STd>}
                {prevYear.hasPrevYear && <STd style={{ color: w.prevYearWeekSales > 0 ? pyWeekColor : undefined }}>{w.prevYearWeekSales > 0 ? formatPercent(pyWeekRatio, 0) : '-'}</STd>}
                {hasWeeklyCustomers && <STd>{w.totalCustomers > 0 ? `${w.totalCustomers.toLocaleString('ja-JP')}人` : '-'}</STd>}
                {hasWeeklyCustomers && <STd>{w.weekTxValue > 0 ? formatCurrency(w.weekTxValue) + '円' : '-'}</STd>}
              </tr>
            )
          })}
        </tbody>
      </STable>
    </STableWrapper>
  )
}

/* ── 日別×店舗別 売上・売変・客数 テーブル ──────────────── */

const ScrollWrapper = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`

const GroupTh = styled(STh)`
  text-align: center;
  font-size: 0.6rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const SubTh = styled(STh)`
  text-align: center;
  font-size: 0.55rem;
  white-space: nowrap;
`

const SummaryRow = styled.tr`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
  font-weight: 600;
`

const StickyTd = styled(STd)`
  position: sticky;
  left: 0;
  z-index: 1;
  background: inherit;
`

const DOW_LABELS_TABLE = ['日', '月', '火', '水', '木', '金', '土'] as const
const DOW_COLORS: Record<number, string | undefined> = { 0: '#ef4444', 6: '#3b82f6' }

export function renderDailyStoreSalesTable(ctx: WidgetContext): ReactNode {
  const { result: r, allStoreResults, stores, year, month, daysInMonth } = ctx

  // Individual stores sorted by code
  const storeEntries: { id: string; label: string; result: typeof r }[] = []
  const sorted = [...allStoreResults.entries()]
    .sort(([, a], [, b]) => {
      const sa = stores.get(a.storeId)
      const sb = stores.get(b.storeId)
      return (sa?.code ?? a.storeId).localeCompare(sb?.code ?? b.storeId)
    })
  for (const [id, sr] of sorted) {
    const store = stores.get(id)
    const label = store ? `${store.code}:${store.name}` : id
    storeEntries.push({ id, label, result: sr })
  }

  const hasMultiStore = storeEntries.length > 1
  const hasCustomers = r.totalCustomers > 0
  const colCount = hasCustomers ? 3 : 2

  // Days
  const days: number[] = []
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  // Period totals
  const getStoreTotals = (sr: typeof r) => {
    let sales = 0, discount = 0, customers = 0
    for (const [, rec] of sr.daily) {
      sales += rec.sales
      discount += rec.discountAmount
      customers += rec.customers ?? 0
    }
    return { sales, discount, customers }
  }

  const renderStoreCells = (sr: typeof r, day: number, borderStyle: string) => {
    const rec = sr.daily.get(day)
    return (
      <>
        <STd style={{ borderLeft: borderStyle }}>
          {rec ? formatCurrency(rec.sales) : ''}
        </STd>
        <STd style={{ color: rec && rec.discountAmount !== 0 ? sc.negative : undefined }}>
          {rec ? formatCurrency(rec.discountAmount) : ''}
        </STd>
        {hasCustomers && (
          <STd>{rec?.customers ? rec.customers.toLocaleString('ja-JP') : ''}</STd>
        )}
      </>
    )
  }

  const renderStoreTotalCells = (sr: typeof r, borderStyle: string) => {
    const t = getStoreTotals(sr)
    return (
      <>
        <STd style={{ borderLeft: borderStyle }}>{formatCurrency(t.sales)}</STd>
        <STd style={{ color: sc.negative }}>{formatCurrency(t.discount)}</STd>
        {hasCustomers && <STd>{t.customers.toLocaleString('ja-JP')}</STd>}
      </>
    )
  }

  const renderSubHeaders = (borderStyle: string) => (
    <>
      <SubTh style={{ borderLeft: borderStyle }}>販売金額</SubTh>
      <SubTh>売変合計金額</SubTh>
      {hasCustomers && <SubTh>来店客数</SubTh>}
    </>
  )

  const aggBorder = '2px solid rgba(99,102,241,0.4)'
  const storeBorder = '2px solid rgba(99,102,241,0.2)'

  return (
    <STableWrapper>
      <STableTitle>売上・売変・客数（日別×店舗）</STableTitle>
      <ScrollWrapper>
        <STable>
          <thead>
            <tr>
              <GroupTh rowSpan={2} style={{ position: 'sticky', left: 0, zIndex: 2, minWidth: 120 }}>日付</GroupTh>
              {hasMultiStore && (
                <GroupTh colSpan={colCount} style={{ borderLeft: aggBorder }}>【店舗】全店合計</GroupTh>
              )}
              {storeEntries.map((s) => (
                <GroupTh key={s.id} colSpan={colCount} style={{ borderLeft: storeBorder }}>{s.label}</GroupTh>
              ))}
            </tr>
            <tr>
              {hasMultiStore && renderSubHeaders(aggBorder)}
              {storeEntries.map((s) => (
                <React.Fragment key={s.id}>{renderSubHeaders(storeBorder)}</React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            <SummaryRow>
              <StickyTd style={{ fontWeight: 600 }}>【期間別】</StickyTd>
              {hasMultiStore && renderStoreTotalCells(r, aggBorder)}
              {storeEntries.map((s) => (
                <React.Fragment key={s.id}>{renderStoreTotalCells(s.result, storeBorder)}</React.Fragment>
              ))}
            </SummaryRow>
            {days.map((d) => {
              const dow = new Date(year, month - 1, d).getDay()
              const dowLabel = DOW_LABELS_TABLE[dow]
              const dowColor = DOW_COLORS[dow]
              const dateStr = `${year}年${String(month).padStart(2, '0')}月${String(d).padStart(2, '0')}日(${dowLabel})`
              return (
                <tr key={d}>
                  <StickyTd style={{ whiteSpace: 'nowrap', fontSize: '0.6rem', color: dowColor }}>
                    {dateStr}
                  </StickyTd>
                  {hasMultiStore && renderStoreCells(r, d, aggBorder)}
                  {storeEntries.map((s) => (
                    <React.Fragment key={s.id}>{renderStoreCells(s.result, d, storeBorder)}</React.Fragment>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </STable>
      </ScrollWrapper>
    </STableWrapper>
  )
}
