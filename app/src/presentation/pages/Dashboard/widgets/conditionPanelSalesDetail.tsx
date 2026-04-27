/**
 * 客単価・日販達成率・シンプル内訳の詳細パネル
 *
 * VM (conditionPanelSalesDetail.vm.ts) で計算済みデータを受け取り、
 * レンダリングのみに専念する。
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
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
  BreakdownRow,
  BreakdownLabel,
  BreakdownValue,
  BreakdownSignal,
} from './ConditionSummary.styles'
import {
  TotalSection,
  TotalGrid,
  TotalCell,
  SmallLabel,
  BigValue,
  StoreRowWrapper,
  StoreRowGrid,
  StoreName,
  MonoSm,
  MonoMd,
  TableHeaderRow,
  TableHeaderCell,
  SectionLabel,
} from './ConditionSummaryEnhanced.styles'
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
  storeCustomerMap,
  grandTotalCustomers,
}: TxValueDetailProps) {
  const { format: fmtCurrency } = useCurrencyFormat()
  const vm = useMemo(
    () =>
      buildTxValueDetailVm(
        sortedStoreEntries,
        stores,
        result,
        fmtCurrency,
        storeCustomerMap,
        grandTotalCustomers,
      ),
    [sortedStoreEntries, stores, result, fmtCurrency, storeCustomerMap, grandTotalCustomers],
  )

  const TX_COLS = '1.2fr 1fr 1fr 1fr'

  return (
    <>
      <TotalSection>
        <TotalGrid>
          <TotalCell>
            <SmallLabel>売上</SmallLabel>
            <BigValue>{vm.totalSalesStr}</BigValue>
          </TotalCell>
          <TotalCell $align="center">
            <SmallLabel>客数</SmallLabel>
            <BigValue>{vm.totalCustStr}</BigValue>
          </TotalCell>
          <TotalCell $align="right">
            <SmallLabel>客単価</SmallLabel>
            <BigValue>{vm.totalTxStr}</BigValue>
          </TotalCell>
        </TotalGrid>
      </TotalSection>

      <div style={{ padding: '12px 16px 4px' }}>
        <SectionLabel>店舗内訳</SectionLabel>
      </div>
      <TableHeaderRow style={{ gridTemplateColumns: TX_COLS }}>
        <TableHeaderCell>店名</TableHeaderCell>
        <TableHeaderCell $align="right">売上</TableHeaderCell>
        <TableHeaderCell $align="right">客数</TableHeaderCell>
        <TableHeaderCell $align="right">客単価</TableHeaderCell>
      </TableHeaderRow>
      <div>
        {vm.storeRows.map((row) => {
          const isExpanded = expandedStore === row.storeId
          return (
            <div key={row.storeId}>
              <StoreRowWrapper $clickable onClick={() => onExpandToggle(row.storeId)}>
                <StoreRowGrid style={{ gridTemplateColumns: TX_COLS }}>
                  <StoreName>
                    <ExpandIcon $expanded={isExpanded}>▶</ExpandIcon>
                    {row.storeName}
                  </StoreName>
                  <MonoSm style={{ textAlign: 'right' }}>{row.salesStr}</MonoSm>
                  <MonoSm style={{ textAlign: 'right' }}>{row.customersStr}</MonoSm>
                  <MonoMd $bold style={{ textAlign: 'right' }}>
                    {row.txStr}
                  </MonoMd>
                </StoreRowGrid>
              </StoreRowWrapper>
              {isExpanded && (
                <>
                  <StoreRowWrapper
                    style={{
                      background: 'var(--sub-row-bg, rgba(0,0,0,0.02))',
                      padding: '2px 16px',
                    }}
                  >
                    <StoreRowGrid style={{ gridTemplateColumns: TX_COLS }}>
                      <MonoSm style={{ paddingLeft: 16, fontWeight: 600 }}>日</MonoSm>
                      <MonoSm style={{ textAlign: 'right', fontWeight: 600 }}>売上</MonoSm>
                      <MonoSm style={{ textAlign: 'right', fontWeight: 600 }}>客数</MonoSm>
                      <MonoSm style={{ textAlign: 'right', fontWeight: 600 }}>客単価</MonoSm>
                    </StoreRowGrid>
                  </StoreRowWrapper>
                  {row.dailyRows.map((dr) => (
                    <StoreRowWrapper
                      key={dr.day}
                      style={{
                        background: 'var(--sub-row-bg, rgba(0,0,0,0.02))',
                        padding: '2px 16px',
                      }}
                    >
                      <StoreRowGrid style={{ gridTemplateColumns: TX_COLS }}>
                        <MonoSm style={{ paddingLeft: 16 }}>{dr.dayLabel}</MonoSm>
                        <MonoSm style={{ textAlign: 'right' }}>{dr.salesStr}</MonoSm>
                        <MonoSm style={{ textAlign: 'right' }}>{dr.customersStr}</MonoSm>
                        <MonoSm style={{ textAlign: 'right' }}>{dr.txStr}</MonoSm>
                      </StoreRowGrid>
                    </StoreRowWrapper>
                  ))}
                </>
              )}
            </div>
          )
        })}
      </div>
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
  const { format: fmtCurrency } = useCurrencyFormat()
  const vm = useMemo(
    () =>
      buildDailySalesDetailVm(
        sortedStoreEntries,
        stores,
        result,
        effectiveConfig,
        daysInMonth,
        fmtCurrency,
      ),
    [sortedStoreEntries, stores, result, effectiveConfig, daysInMonth, fmtCurrency],
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
                  <BTd style={{ paddingLeft: '28px', fontSize: '0.7rem', fontWeight: 600 }}>日</BTd>
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
