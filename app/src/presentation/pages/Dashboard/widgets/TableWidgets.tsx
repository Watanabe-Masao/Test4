import React, { type ReactNode } from 'react'
import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { getWeekRanges } from '@/domain/calculations/forecast'
import type { DepartmentKpiRecord } from '@/domain/models'
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

/* ── 部門別KPI一覧テーブル ──────────────────────────────── */

const KpiGroupTh = styled(STh)`
  text-align: center;
  font-size: 0.6rem;
  white-space: nowrap;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const KpiSubTh = styled(STh)`
  text-align: center;
  font-size: 0.55rem;
  white-space: nowrap;
`

const BudgetTh = styled(KpiSubTh)`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(234,179,8,0.15)' : 'rgba(234,179,8,0.12)'};
`

const BudgetTd = styled(STd)`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(234,179,8,0.08)' : 'rgba(234,179,8,0.06)'};
`

function fmtPct(v: number): string {
  // 既に小数 (0.2220) なら %表示, 1超えなら既にパーセント値
  const pct = Math.abs(v) <= 1 ? v * 100 : v
  return `${pct.toFixed(2)}%`
}

function fmtPtDiff(v: number): string {
  // ポイント差異（例: 0.31 → +0.31pt）
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}`
}

function renderKpiRow(rec: DepartmentKpiRecord): ReactNode {
  const varColor = sc.cond(rec.gpRateVariance >= 0)
  const salesDiffColor = sc.cond(rec.salesVariance >= 0)
  const achColor = sc.achievement(Math.abs(rec.salesAchievement) <= 1 ? rec.salesAchievement : rec.salesAchievement / 100)
  const discColor = sc.negative

  return (
    <tr key={rec.deptCode}>
      <STd style={{ fontWeight: 600 }}>{rec.deptCode}</STd>
      <STd>{rec.deptName || '-'}</STd>
      <BudgetTd>{fmtPct(rec.gpRateBudget)}</BudgetTd>
      <STd>{fmtPct(rec.gpRateActual)}</STd>
      <STd style={{ color: varColor }}>{fmtPtDiff(rec.gpRateVariance)}</STd>
      <BudgetTd>{fmtPct(rec.markupRate)}</BudgetTd>
      <STd style={{ color: discColor }}>{fmtPct(rec.discountRate)}</STd>
      <BudgetTd>{formatCurrency(rec.salesBudget)}</BudgetTd>
      <STd>{formatCurrency(rec.salesActual)}</STd>
      <STd style={{ color: salesDiffColor }}>{formatCurrency(rec.salesVariance)}</STd>
      <STd style={{ color: achColor }}>{fmtPct(rec.salesAchievement)}</STd>
      <STd>{formatCurrency(rec.openingInventory)}</STd>
      <STd>{formatCurrency(rec.closingInventory)}</STd>
      <BudgetTd>{fmtPct(rec.gpRateLanding)}</BudgetTd>
      <STd>{rec.salesLanding ? formatCurrency(rec.salesLanding) : '-'}</STd>
    </tr>
  )
}

// ─── 日別推定在庫テーブル ────────────────────────────────

const InvTd = styled(STd)<{ $neg?: boolean }>`
  color: ${({ $neg, theme }) => $neg ? theme.colors.palette.danger : theme.colors.text2};
`

export function renderDailyInventoryTable(ctx: WidgetContext): ReactNode {
  const { result: r, daysInMonth } = ctx

  const openingInv = r.openingInventory
  if (openingInv == null) {
    return (
      <STableWrapper>
        <STableTitle>日別推定在庫</STableTitle>
        <div style={{ padding: '16px', color: '#888', fontSize: '0.8rem' }}>
          期首在庫が設定されていないため表示できません
        </div>
      </STableWrapper>
    )
  }

  const closingInv = r.closingInventory

  // 日別データ構築
  interface DailyInvRow {
    day: number
    purchaseCost: number
    interStoreNet: number
    salesAmount: number
    estCogs: number
    cumPurchase: number
    cumCogs: number
    estimatedInv: number
  }

  const rows: DailyInvRow[] = []
  let cumPurchase = 0
  let cumCogs = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const rec = r.daily.get(d)
    const purchaseCost = rec ? rec.purchase.cost : 0
    const interStoreNet = rec ? rec.interStoreIn.cost + rec.interStoreOut.cost : 0
    const salesAmount = rec?.sales ?? 0
    // 推定売上原価: 仕入原価があればそれを使用、なければ売上 × 0.74（概算原価率）
    const dayCost = rec ? rec.purchase.cost : 0
    const estCogs = dayCost > 0 ? dayCost : salesAmount * 0.74

    cumPurchase += purchaseCost + interStoreNet
    cumCogs += estCogs

    rows.push({
      day: d,
      purchaseCost,
      interStoreNet,
      salesAmount,
      estCogs,
      cumPurchase,
      cumCogs,
      estimatedInv: openingInv + cumPurchase - cumCogs,
    })
  }

  const lastRow = rows[rows.length - 1]
  const totalPurchase = lastRow?.cumPurchase ?? 0
  const totalCogs = lastRow?.cumCogs ?? 0
  const totalSales = rows.reduce((s, r) => s + r.salesAmount, 0)

  return (
    <STableWrapper>
      <STableTitle>
        日別推定在庫
        <span style={{ fontSize: '0.7rem', fontWeight: 400, marginLeft: 8, opacity: 0.6 }}>
          期首在庫: {formatCurrency(openingInv)}
          {closingInv != null && ` / 実在庫: ${formatCurrency(closingInv)}`}
        </span>
      </STableTitle>
      <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
        <STable>
          <thead>
            <tr>
              <STh style={{ position: 'sticky', top: 0, background: 'inherit', zIndex: 2 }}>日</STh>
              <STh style={{ position: 'sticky', top: 0, background: 'inherit', zIndex: 2 }}>仕入原価</STh>
              <STh style={{ position: 'sticky', top: 0, background: 'inherit', zIndex: 2 }}>店間入出</STh>
              <STh style={{ position: 'sticky', top: 0, background: 'inherit', zIndex: 2 }}>売上</STh>
              <STh style={{ position: 'sticky', top: 0, background: 'inherit', zIndex: 2 }}>推定原価</STh>
              <STh style={{ position: 'sticky', top: 0, background: 'inherit', zIndex: 2 }}>仕入累計</STh>
              <STh style={{ position: 'sticky', top: 0, background: 'inherit', zIndex: 2 }}>原価累計</STh>
              <STh style={{ position: 'sticky', top: 0, background: 'inherit', zIndex: 2 }}>推定在庫</STh>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const hasSales = row.salesAmount > 0 || row.purchaseCost > 0
              return (
                <tr key={row.day} style={!hasSales ? { opacity: 0.5 } : undefined}>
                  <STd style={{ textAlign: 'left', fontWeight: 600 }}>{row.day}</STd>
                  <STd>{row.purchaseCost > 0 ? formatCurrency(row.purchaseCost) : '-'}</STd>
                  <InvTd $neg={row.interStoreNet < 0}>
                    {row.interStoreNet !== 0 ? formatCurrency(row.interStoreNet) : '-'}
                  </InvTd>
                  <STd>{row.salesAmount > 0 ? formatCurrency(row.salesAmount) : '-'}</STd>
                  <STd>{row.estCogs > 0 ? formatCurrency(row.estCogs) : '-'}</STd>
                  <STd>{formatCurrency(row.cumPurchase)}</STd>
                  <STd>{formatCurrency(row.cumCogs)}</STd>
                  <InvTd $neg={row.estimatedInv < 0} style={{ fontWeight: 600 }}>
                    {formatCurrency(row.estimatedInv)}
                  </InvTd>
                </tr>
              )
            })}
            <tr style={{ fontWeight: 700, borderTop: '2px solid' }}>
              <STd style={{ textAlign: 'left' }}>合計</STd>
              <STd>{formatCurrency(rows.reduce((s, r) => s + r.purchaseCost, 0))}</STd>
              <STd>{formatCurrency(rows.reduce((s, r) => s + r.interStoreNet, 0))}</STd>
              <STd>{formatCurrency(totalSales)}</STd>
              <STd>{formatCurrency(totalCogs)}</STd>
              <STd>{formatCurrency(totalPurchase)}</STd>
              <STd>{formatCurrency(totalCogs)}</STd>
              <InvTd $neg={(lastRow?.estimatedInv ?? 0) < 0} style={{ fontWeight: 700 }}>
                {formatCurrency(lastRow?.estimatedInv ?? 0)}
              </InvTd>
            </tr>
          </tbody>
        </STable>
      </div>
    </STableWrapper>
  )
}

export function renderDepartmentKpiTable(ctx: WidgetContext): ReactNode {
  const { departmentKpi } = ctx
  if (departmentKpi.records.length === 0) {
    return (
      <STableWrapper>
        <STableTitle>部門別KPI一覧</STableTitle>
        <div style={{ padding: '16px', fontSize: '0.7rem', color: '#888' }}>
          部門別KPIデータが取り込まれていません。「部門別」を含むCSV/Excelファイルをドロップしてください。
        </div>
      </STableWrapper>
    )
  }

  const groupBorder = '2px solid rgba(99,102,241,0.25)'

  return (
    <STableWrapper>
      <STableTitle>部門別KPI一覧</STableTitle>
      <ScrollWrapper>
        <STable>
          <thead>
            <tr>
              <KpiGroupTh rowSpan={2}>部門</KpiGroupTh>
              <KpiGroupTh rowSpan={2}>名称</KpiGroupTh>
              <KpiGroupTh colSpan={3} style={{ borderLeft: groupBorder }}>粗利</KpiGroupTh>
              <KpiGroupTh colSpan={2} style={{ borderLeft: groupBorder }}>値入/売変</KpiGroupTh>
              <KpiGroupTh colSpan={4} style={{ borderLeft: groupBorder }}>売上</KpiGroupTh>
              <KpiGroupTh colSpan={2} style={{ borderLeft: groupBorder }}>在庫</KpiGroupTh>
              <KpiGroupTh colSpan={2} style={{ borderLeft: groupBorder }}>着地</KpiGroupTh>
            </tr>
            <tr>
              {/* 粗利 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>粗利率予算</BudgetTh>
              <KpiSubTh>粗利率実績</KpiSubTh>
              <KpiSubTh>予算差異</KpiSubTh>
              {/* 値入/売変 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>値入</BudgetTh>
              <KpiSubTh>売変</KpiSubTh>
              {/* 売上 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>予算</BudgetTh>
              <KpiSubTh>実績</KpiSubTh>
              <KpiSubTh>差異</KpiSubTh>
              <KpiSubTh>達成率</KpiSubTh>
              {/* 在庫 */}
              <KpiSubTh style={{ borderLeft: groupBorder }}>機首在庫</KpiSubTh>
              <KpiSubTh>期末在庫</KpiSubTh>
              {/* 着地 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>最終粗利着地</BudgetTh>
              <KpiSubTh>最終売上着地</KpiSubTh>
            </tr>
          </thead>
          <tbody>
            {departmentKpi.records.map((rec) => renderKpiRow(rec))}
          </tbody>
        </STable>
      </ScrollWrapper>
    </STableWrapper>
  )
}
