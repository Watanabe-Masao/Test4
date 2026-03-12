/**
 * 客単価・日販達成率・シンプル内訳の詳細パネル
 *
 * VM (conditionPanelSalesDetail.vm.ts) で計算済みデータを受け取り、
 * レンダリングのみに専念する。
 */
import { useMemo } from 'react'
import { buildTxValueDetailVm, buildDailySalesDetailVm } from './conditionPanelSalesDetail.vm'
import { SIGNAL_COLORS } from './conditionSummaryUtils'
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
  result,
  expandedStore,
  onExpandToggle,
}: TxValueDetailProps) {
  const vm = useMemo(
    () => buildTxValueDetailVm(sortedStoreEntries, stores, result),
    [sortedStoreEntries, stores, result],
  )

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
          {vm.storeRows.flatMap((row, idx) => {
            const isExpanded = expandedStore === row.storeId
            const rows: React.ReactNode[] = []

            if (hasExpanded && idx > 0) {
              rows.push(
                <StoreBorderTr key={`${row.storeId}-border`}>
                  <td colSpan={4} />
                </StoreBorderTr>,
              )
            }

            rows.push(
              <BTr
                key={row.storeId}
                onClick={() => onExpandToggle(row.storeId)}
                style={{ cursor: 'pointer' }}
              >
                <BTd>
                  <ExpandIcon $expanded={isExpanded}>▶</ExpandIcon>
                  <BSignalDot $color={SIGNAL_COLORS.blue} />
                  {row.storeName}
                </BTd>
                <BTd>{row.salesStr}</BTd>
                <BTd>{row.customersStr}</BTd>
                <BTd>{row.txStr}</BTd>
              </BTr>,
            )

            if (isExpanded) {
              rows.push(
                <SubRow key={`${row.storeId}-header`}>
                  <BTd style={{ paddingLeft: '28px', fontSize: '0.7rem', fontWeight: 600 }}>
                    日
                  </BTd>
                  <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>売上</BTd>
                  <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>客数</BTd>
                  <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>客単価</BTd>
                </SubRow>,
              )
              for (const dr of row.dailyRows) {
                rows.push(
                  <SubRow key={`${row.storeId}-${dr.day}`}>
                    <BTd style={{ paddingLeft: '28px' }}>{dr.dayLabel}</BTd>
                    <BTd>{dr.salesStr}</BTd>
                    <BTd>{dr.customersStr}</BTd>
                    <BTd>{dr.txStr}</BTd>
                  </SubRow>,
                )
              }
            }

            return rows
          })}
          <BTr $highlight>
            <BTd $bold>合計</BTd>
            <BTd $bold>{vm.totalSalesStr}</BTd>
            <BTd $bold>{vm.totalCustomersStr}</BTd>
            <BTd $bold>{vm.totalTxStr}</BTd>
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
  result,
  effectiveConfig,
  daysInMonth,
  expandedStore,
  onExpandToggle,
}: DailySalesDetailProps) {
  const vm = useMemo(
    () =>
      buildDailySalesDetailVm(sortedStoreEntries, stores, result, effectiveConfig, daysInMonth),
    [sortedStoreEntries, stores, result, effectiveConfig, daysInMonth],
  )

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
          {vm.storeRows.flatMap((row) => {
            const isExpanded = expandedStore === row.storeId
            const rows: React.ReactNode[] = [
              <BTr
                key={row.storeId}
                onClick={() => onExpandToggle(row.storeId)}
                style={{ cursor: 'pointer' }}
              >
                <BTd>
                  <ExpandIcon $expanded={isExpanded}>▶</ExpandIcon>
                  <BSignalDot $color={row.sigColor} />
                  {row.storeName}
                </BTd>
                <BTd>{row.salesStr}</BTd>
                <BTd>{row.budgetStr}</BTd>
                <BTd $color={row.sigColor}>{row.achievementStr}</BTd>
                <BTd>{row.dailySalesStr}</BTd>
                <BTd>{row.budgetDailyStr}</BTd>
              </BTr>,
            ]

            if (isExpanded) {
              rows.push(
                <SubRow key={`${row.storeId}-header`}>
                  <BTd style={{ paddingLeft: '28px', fontSize: '0.7rem', fontWeight: 600 }}>
                    日
                  </BTd>
                  <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>売上</BTd>
                  <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>予算</BTd>
                  <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>達成率</BTd>
                  <BTd colSpan={2} />
                </SubRow>,
              )
              for (const day of row.dailyBreakdown) {
                rows.push(
                  <SubRow key={`${row.storeId}-${day.day}`}>
                    <BTd style={{ paddingLeft: '28px' }}>{day.dayLabel}</BTd>
                    <BTd>{day.salesStr}</BTd>
                    <BTd>{day.budgetStr}</BTd>
                    <BTd>{day.rateStr}</BTd>
                    <BTd colSpan={2} />
                  </SubRow>,
                )
              }
            }

            return rows
          })}
          <BTr $highlight>
            <BTd $bold>合計</BTd>
            <BTd $bold>{vm.totalSalesStr}</BTd>
            <BTd $bold>{vm.totalBudgetStr}</BTd>
            <BTd $bold $color={vm.totalColor}>
              {vm.totalAchievementStr}
            </BTd>
            <BTd $bold>{vm.totalDailySalesStr}</BTd>
            <BTd $bold>{vm.totalBudgetDailyStr}</BTd>
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
