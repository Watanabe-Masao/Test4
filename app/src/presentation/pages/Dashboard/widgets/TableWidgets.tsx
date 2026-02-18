import type { ReactNode } from 'react'
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
  }
  const ordered = [1, 2, 3, 4, 5, 6, 0].map(i => {
    const b = buckets[i]
    const avgSales = b.salesCount > 0 ? b.salesTotal / b.salesCount : 0
    const avgBudget = b.budgetCount > 0 ? b.budgetTotal / b.budgetCount : 0
    const avgPrevYear = b.prevYearCount > 0 ? b.prevYearTotal / b.prevYearCount : 0
    return { label: DOW_LABELS[i], avgSales, avgBudget, diff: avgSales - avgBudget, salesCount: b.salesCount, budgetCount: b.budgetCount, avgPrevYear }
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
          </tr>
        </thead>
        <tbody>
          {ordered.map(a => {
            const diffColor = a.diff >= 0 ? '#22c55e' : '#ef4444'
            const pyRatio = a.avgPrevYear > 0 ? a.avgSales / a.avgPrevYear : 0
            const pyColor = pyRatio >= 1 ? '#22c55e' : '#ef4444'
            const pyDiff = a.avgSales - a.avgPrevYear
            const pyDiffColor = pyDiff >= 0 ? '#22c55e' : '#ef4444'
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
      }
      prevYearWeekSales += prevYear.daily.get(d)?.sales ?? 0
    }
    const markupRate = totalPurchasePrice > 0
      ? (totalPurchasePrice - totalPurchaseCost) / totalPurchasePrice
      : 0
    return { weekNumber, startDay, endDay, totalSales, totalBudget, diff: totalSales - totalBudget, markupRate, days, prevYearWeekSales }
  })

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
          </tr>
        </thead>
        <tbody>
          {summaries.map(w => {
            const achievement = w.totalBudget > 0 ? w.totalSales / w.totalBudget : 0
            const diffColor = w.diff >= 0 ? '#22c55e' : '#ef4444'
            const achColor = achievement >= 1 ? '#22c55e' : achievement >= 0.9 ? '#f59e0b' : '#ef4444'
            const pyWeekRatio = w.prevYearWeekSales > 0 ? w.totalSales / w.prevYearWeekSales : 0
            const pyWeekColor = pyWeekRatio >= 1 ? '#22c55e' : '#ef4444'
            const pyWeekDiff = w.totalSales - w.prevYearWeekSales
            const pyWeekDiffColor = pyWeekDiff >= 0 ? '#22c55e' : '#ef4444'
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
              </tr>
            )
          })}
        </tbody>
      </STable>
    </STableWrapper>
  )
}
