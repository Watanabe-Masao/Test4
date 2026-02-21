/**
 * データテーブルウィジェット（日別×店舗売上、日別推定在庫）
 *
 * TableWidgets.tsx から分割。
 */
import React, { type ReactNode } from 'react'
import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import type { WidgetContext } from './types'
import { STableWrapper, STableTitle, STable, STh, STd } from '../DashboardPage.styles'

export const ScrollWrapper = styled.div`
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

/* ── 日別推定在庫テーブル ──────────────────────────────── */

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
  const markupRate = r.coreMarkupRate
  const discountRate = r.discountRate
  const divisor = 1 - discountRate

  interface DailyInvRow {
    day: number
    inventoryCost: number
    coreSales: number
    consumable: number
    estCogs: number
    cumInvCost: number
    cumEstCogs: number
    estimatedInv: number
  }

  const rows: DailyInvRow[] = []
  let cumInvCost = 0
  let cumEstCogs = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const rec = r.daily.get(d)
    const inventoryCost = rec
      ? rec.purchase.cost + rec.interStoreIn.cost + rec.interStoreOut.cost - rec.deliverySales.cost
      : 0
    const coreSales = rec?.coreSales ?? 0
    const consumable = rec ? rec.consumable.cost : 0

    const dayGrossSales = divisor > 0 ? coreSales / divisor : coreSales
    const estCogs = dayGrossSales * (1 - markupRate) + consumable

    cumInvCost += inventoryCost
    cumEstCogs += estCogs

    rows.push({
      day: d,
      inventoryCost,
      coreSales,
      consumable,
      estCogs,
      cumInvCost,
      cumEstCogs,
      estimatedInv: openingInv + cumInvCost - cumEstCogs,
    })
  }

  const lastRow = rows[rows.length - 1]
  const totalInvCost = lastRow?.cumInvCost ?? 0
  const totalEstCogs = lastRow?.cumEstCogs ?? 0
  const totalCoreSales = rows.reduce((s, row) => s + row.coreSales, 0)

  return (
    <STableWrapper>
      <STableTitle>
        日別推定在庫
        <span style={{ fontSize: '0.7rem', fontWeight: 400, marginLeft: 8, opacity: 0.6 }}>
          期首在庫: {formatCurrency(openingInv)}
          {closingInv != null && ` / 実在庫: ${formatCurrency(closingInv)}`}
          {` / 値入率: ${formatPercent(markupRate)} / 売変率: ${formatPercent(discountRate)}`}
        </span>
      </STableTitle>
      <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
        <STable>
          <thead>
            <tr>
              <STh style={{ position: 'sticky', top: 0, background: 'inherit', zIndex: 2 }}>日</STh>
              <STh style={{ position: 'sticky', top: 0, background: 'inherit', zIndex: 2 }}>在庫仕入原価</STh>
              <STh style={{ position: 'sticky', top: 0, background: 'inherit', zIndex: 2 }}>コア売上</STh>
              <STh style={{ position: 'sticky', top: 0, background: 'inherit', zIndex: 2 }}>消耗品</STh>
              <STh style={{ position: 'sticky', top: 0, background: 'inherit', zIndex: 2 }}>推定原価</STh>
              <STh style={{ position: 'sticky', top: 0, background: 'inherit', zIndex: 2 }}>仕入累計</STh>
              <STh style={{ position: 'sticky', top: 0, background: 'inherit', zIndex: 2 }}>原価累計</STh>
              <STh style={{ position: 'sticky', top: 0, background: 'inherit', zIndex: 2 }}>推定在庫</STh>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const hasData = row.coreSales > 0 || row.inventoryCost > 0
              return (
                <tr key={row.day} style={!hasData ? { opacity: 0.5 } : undefined}>
                  <STd style={{ textAlign: 'left', fontWeight: 600 }}>{row.day}</STd>
                  <STd>{row.inventoryCost !== 0 ? formatCurrency(row.inventoryCost) : '-'}</STd>
                  <STd>{row.coreSales > 0 ? formatCurrency(row.coreSales) : '-'}</STd>
                  <STd>{row.consumable > 0 ? formatCurrency(row.consumable) : '-'}</STd>
                  <STd>{row.estCogs > 0 ? formatCurrency(row.estCogs) : '-'}</STd>
                  <STd>{formatCurrency(row.cumInvCost)}</STd>
                  <STd>{formatCurrency(row.cumEstCogs)}</STd>
                  <InvTd $neg={row.estimatedInv < 0} style={{ fontWeight: 600 }}>
                    {formatCurrency(row.estimatedInv)}
                  </InvTd>
                </tr>
              )
            })}
            <tr style={{ fontWeight: 700, borderTop: '2px solid' }}>
              <STd style={{ textAlign: 'left' }}>合計</STd>
              <STd>{formatCurrency(totalInvCost)}</STd>
              <STd>{formatCurrency(totalCoreSales)}</STd>
              <STd>{formatCurrency(rows.reduce((s, row) => s + row.consumable, 0))}</STd>
              <STd>{formatCurrency(totalEstCogs)}</STd>
              <STd>{formatCurrency(totalInvCost)}</STd>
              <STd>{formatCurrency(totalEstCogs)}</STd>
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
