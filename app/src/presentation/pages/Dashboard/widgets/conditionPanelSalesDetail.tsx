/**
 * 客単価・日販達成率・シンプル内訳の詳細パネル
 *
 * ConditionDetailPanels.tsx から分割 (Group 4: Sales Detail)
 */
import { formatPercent, formatCurrency } from '@/domain/formatting'
import { safeDivide } from '@/domain/calculations/utils'
import { SIGNAL_COLORS, metricSignal } from './conditionSummaryUtils'
import {
  DetailHeader,
  DetailTitle,
  BTable,
  BTh,
  BTd,
  BTr,
  BSignalDot,
  ExpandIcon,
  SubRow,
  StoreBorderTr,
  BreakdownRow,
  BreakdownLabel,
  BreakdownValue,
  BreakdownSignal,
} from './ConditionSummary.styles'
import type {
  TxValueDetailProps,
  DailySalesDetailProps,
  SimpleBreakdownProps,
} from './conditionDetailTypes'

// ─── Tx Value Detail ───────────────────────────────────

export function TxValueDetailTable({
  sortedStoreEntries,
  stores,
  result: r,
  expandedStore,
  onExpandToggle,
}: TxValueDetailProps) {
  const txTotal = r.transactionValue
  const fmtTx = (v: number) =>
    `${v.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}円`
  const hasExpanded = expandedStore != null

  return (
    <>
      <DetailHeader>
        <DetailTitle>客単価 — 店舗内訳</DetailTitle>
      </DetailHeader>
      <BTable>
        <thead>
          <tr>
            <BTh>店舗名</BTh>
            <BTh>売上</BTh>
            <BTh>客数</BTh>
            <BTh>客単価</BTh>
          </tr>
        </thead>
        <tbody>
          {sortedStoreEntries.flatMap(([storeId, sr], idx) => {
            const store = stores.get(storeId)
            const storeName = store?.name ?? storeId
            const storeTx = sr.transactionValue
            const isExpanded = expandedStore === storeId

            const rows: React.ReactNode[] = []

            // Store boundary separator when any store is expanded (except first)
            if (hasExpanded && idx > 0) {
              rows.push(
                <StoreBorderTr key={`${storeId}-border`}>
                  <td colSpan={4} />
                </StoreBorderTr>,
              )
            }

            rows.push(
              <BTr
                key={storeId}
                onClick={() => onExpandToggle(storeId)}
                style={{ cursor: 'pointer' }}
              >
                <BTd>
                  <ExpandIcon $expanded={isExpanded}>▶</ExpandIcon>
                  <BSignalDot $color={SIGNAL_COLORS.blue} />
                  {storeName}
                </BTd>
                <BTd>{formatCurrency(sr.totalSales)}</BTd>
                <BTd>{sr.totalCustomers.toLocaleString()}人</BTd>
                <BTd>{fmtTx(storeTx)}</BTd>
              </BTr>,
            )

            // Daily trend per store
            if (isExpanded) {
              rows.push(
                <SubRow key={`${storeId}-header`}>
                  <BTd style={{ paddingLeft: '28px', fontSize: '0.7rem', fontWeight: 600 }}>日</BTd>
                  <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>売上</BTd>
                  <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>客数</BTd>
                  <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>客単価</BTd>
                </SubRow>,
              )
              const days = [...sr.daily.entries()].sort(([a], [b]) => a - b)
              for (const [day, dr] of days) {
                const customers = dr.customers ?? 0
                const dayTx = safeDivide(dr.sales, customers, 0)
                rows.push(
                  <SubRow key={`${storeId}-${day}`}>
                    <BTd style={{ paddingLeft: '28px' }}>{day}日</BTd>
                    <BTd>{formatCurrency(dr.sales)}</BTd>
                    <BTd>{customers.toLocaleString()}人</BTd>
                    <BTd>{fmtTx(dayTx)}</BTd>
                  </SubRow>,
                )
              }
            }

            return rows
          })}
          <BTr $highlight>
            <BTd $bold>合計</BTd>
            <BTd $bold>{formatCurrency(r.totalSales)}</BTd>
            <BTd $bold>{r.totalCustomers.toLocaleString()}人</BTd>
            <BTd $bold>{fmtTx(txTotal)}</BTd>
          </BTr>
        </tbody>
      </BTable>
    </>
  )
}

// ─── Daily Sales Achievement Detail ────────────────────

export function DailySalesDetailTable({
  sortedStoreEntries,
  stores,
  result: r,
  effectiveConfig,
  daysInMonth,
  expandedStore,
  onExpandToggle,
}: DailySalesDetailProps) {
  const budgetDailyAvg = daysInMonth > 0 ? r.budget / daysInMonth : 0
  const dailyRatio = safeDivide(r.averageDailySales, budgetDailyAvg, 0)
  const totalSig = metricSignal(dailyRatio, 'dailySales', effectiveConfig)
  const totalColor = SIGNAL_COLORS[totalSig]

  return (
    <>
      <DetailHeader>
        <DetailTitle>売上予算達成率 — 店舗内訳</DetailTitle>
      </DetailHeader>
      <BTable>
        <thead>
          <tr>
            <BTh>店舗名</BTh>
            <BTh>実績売上</BTh>
            <BTh>予算</BTh>
            <BTh>達成率</BTh>
            <BTh>日販</BTh>
            <BTh>予算日販</BTh>
          </tr>
        </thead>
        <tbody>
          {sortedStoreEntries.flatMap(([storeId, sr]) => {
            const store = stores.get(storeId)
            const storeName = store?.name ?? storeId
            const storeBudgetDaily = daysInMonth > 0 ? sr.budget / daysInMonth : 0
            const storeRatio = safeDivide(sr.averageDailySales, storeBudgetDaily, 0)
            const achievementRate = safeDivide(sr.totalSales, sr.budget, 0)
            const sig =
              storeBudgetDaily > 0
                ? metricSignal(storeRatio, 'dailySales', effectiveConfig, sr.storeId)
                : 'blue'
            const sigColor = SIGNAL_COLORS[sig]
            const isExpanded = expandedStore === storeId

            const rows: React.ReactNode[] = [
              <BTr
                key={storeId}
                onClick={() => onExpandToggle(storeId)}
                style={{ cursor: 'pointer' }}
              >
                <BTd>
                  <ExpandIcon $expanded={isExpanded}>▶</ExpandIcon>
                  <BSignalDot $color={sigColor} />
                  {storeName}
                </BTd>
                <BTd>{formatCurrency(sr.totalSales)}</BTd>
                <BTd>{formatCurrency(sr.budget)}</BTd>
                <BTd $color={sigColor}>
                  {sr.budget > 0 ? formatPercent(achievementRate, 2) : '—'}
                </BTd>
                <BTd>{formatCurrency(sr.averageDailySales)}</BTd>
                <BTd>{formatCurrency(storeBudgetDaily)}</BTd>
              </BTr>,
            ]

            // Daily breakdown per store
            if (isExpanded) {
              rows.push(
                <SubRow key={`${storeId}-header`}>
                  <BTd style={{ paddingLeft: '28px', fontSize: '0.7rem', fontWeight: 600 }}>日</BTd>
                  <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>売上</BTd>
                  <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>予算</BTd>
                  <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>達成率</BTd>
                  <BTd colSpan={2} />
                </SubRow>,
              )
              const days = [...sr.daily.entries()].sort(([a], [b]) => a - b)
              let cumSales = 0
              let cumBudget = 0
              for (const [day, dr] of days) {
                const dayBudget = sr.budgetDaily.get(day) ?? 0
                cumSales += dr.sales
                cumBudget += dayBudget
                const dayRate = safeDivide(cumSales, cumBudget, 0)
                rows.push(
                  <SubRow key={`${storeId}-${day}`}>
                    <BTd style={{ paddingLeft: '28px' }}>{day}日</BTd>
                    <BTd>{formatCurrency(dr.sales)}</BTd>
                    <BTd>{formatCurrency(dayBudget)}</BTd>
                    <BTd>{cumBudget > 0 ? formatPercent(dayRate, 2) : '—'}</BTd>
                    <BTd colSpan={2} />
                  </SubRow>,
                )
              }
            }

            return rows
          })}
          <BTr $highlight>
            <BTd $bold>合計</BTd>
            <BTd $bold>{formatCurrency(r.totalSales)}</BTd>
            <BTd $bold>{formatCurrency(r.budget)}</BTd>
            <BTd $bold $color={totalColor}>
              {r.budget > 0 ? formatPercent(safeDivide(r.totalSales, r.budget, 0), 2) : '—'}
            </BTd>
            <BTd $bold>{formatCurrency(r.averageDailySales)}</BTd>
            <BTd $bold>{formatCurrency(budgetDailyAvg)}</BTd>
          </BTr>
        </tbody>
      </BTable>
    </>
  )
}

// ─── Simple Breakdown ───────────────────────────────────

export function SimpleBreakdown({
  breakdownItem,
  sortedStoreEntries,
  stores,
}: SimpleBreakdownProps) {
  if (!breakdownItem.storeValue) return null
  return (
    <>
      <DetailTitle style={{ marginBottom: '16px' }}>{breakdownItem.label} — 店舗内訳</DetailTitle>
      {sortedStoreEntries.map(([storeId, sr]) => {
        const store = stores.get(storeId)
        const storeName = store?.name ?? storeId
        const bv = breakdownItem.storeValue!(sr)
        const signalColor = SIGNAL_COLORS[bv.signal]
        return (
          <BreakdownRow key={storeId}>
            <BreakdownLabel>
              <BreakdownSignal $color={signalColor} />
              {storeName}
            </BreakdownLabel>
            <BreakdownValue $color={signalColor}>{bv.value}</BreakdownValue>
          </BreakdownRow>
        )
      })}
      <BreakdownRow $bold>
        <BreakdownLabel>合計</BreakdownLabel>
        <BreakdownValue $color={SIGNAL_COLORS[breakdownItem.signal]}>
          {breakdownItem.value}
        </BreakdownValue>
      </BreakdownRow>
    </>
  )
}
