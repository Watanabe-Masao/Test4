/**
 * カテゴリ明細テーブル・店舗別比較テーブル
 */
import { Fragment, useState, useCallback } from 'react'
import { formatCurrency, formatPercent, formatPointDiff } from '@/domain/formatting'
import type {
  SupplierComparisonRow,
  CategoryComparisonRow,
  StoreComparisonRow,
} from '@/domain/models/PurchaseComparison'
import {
  TableWrapper,
  Table,
  Th,
  Td,
  DiffCell,
  TrTotal,
  Badge,
  MarkupCell,
  MarkupIndicator,
  EmptyState,
  DrillTr,
  DrillToggle,
  ChildTr,
} from './PurchaseAnalysisPage.styles'
import { type useSort, sortIndicator, diffColor } from './purchaseAnalysisHelpers'

// ── カテゴリ明細テーブル（ドリルダウン付き） ──

export function CategoryDetailTable({
  rows,
  kpi,
  sort,
  categorySuppliers,
}: {
  rows: readonly CategoryComparisonRow[]
  kpi: { currentTotalCost: number; currentTotalPrice: number; currentMarkupRate: number }
  sort: ReturnType<typeof useSort>
  categorySuppliers: Readonly<Record<string, readonly SupplierComparisonRow[]>>
}) {
  const { sortKey, sortDir, handleSort } = sort
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const toggleCategory = useCallback((catId: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }, [])

  if (rows.length === 0) {
    return <EmptyState>データがありません</EmptyState>
  }

  const totalCost = rows.reduce((s, r) => s + r.currentCost, 0)
  const totalPrice = rows.reduce((s, r) => s + r.currentPrice, 0)
  const totalMarkup = totalPrice - totalCost
  const totalCrossMult = rows.reduce((s, r) => s + r.crossMultiplication, 0)
  const totalPrevCost = rows.reduce((s, r) => s + r.prevCost, 0)
  const totalPrevPrice = rows.reduce((s, r) => s + r.prevPrice, 0)

  return (
    <TableWrapper>
      <Table>
        <thead>
          <tr>
            <Th $align="left" $sortable onClick={() => handleSort('name')}>
              カテゴリ{sortIndicator('name', sortKey, sortDir)}
            </Th>
            <Th $sortable onClick={() => handleSort('currentCost')}>
              原価{sortIndicator('currentCost', sortKey, sortDir)}
            </Th>
            <Th>売価</Th>
            <Th>値入額</Th>
            <Th $sortable onClick={() => handleSort('currentMarkupRate')}>
              値入率{sortIndicator('currentMarkupRate', sortKey, sortDir)}
            </Th>
            <Th $sortable onClick={() => handleSort('prevCost')}>
              前年原価{sortIndicator('prevCost', sortKey, sortDir)}
            </Th>
            <Th>前年売価</Th>
            <Th>前年値入率</Th>
            <Th $sortable onClick={() => handleSort('costDiff')}>
              原価差額{sortIndicator('costDiff', sortKey, sortDir)}
            </Th>
            <Th $sortable onClick={() => handleSort('currentCostShare')}>
              構成比{sortIndicator('currentCostShare', sortKey, sortDir)}
            </Th>
            <Th>相乗積</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const markup = row.currentPrice - row.currentCost
            const markupDiff = row.currentMarkupRate - row.prevMarkupRate
            const isExpanded = expandedCats.has(row.categoryId)
            const suppliers = categorySuppliers[row.categoryId] ?? []
            const hasChildren = suppliers.length > 0

            return (
              <Fragment key={row.categoryId}>
                <DrillTr
                  $expanded={isExpanded}
                  onClick={() => hasChildren && toggleCategory(row.categoryId)}
                >
                  <Td $align="left">
                    {hasChildren && <DrillToggle>{isExpanded ? '▼' : '▶'}</DrillToggle>}
                    <Badge $color={row.color} />
                    {row.category}
                  </Td>
                  <Td>{formatCurrency(row.currentCost)}</Td>
                  <Td>{formatCurrency(row.currentPrice)}</Td>
                  <DiffCell $positive={diffColor(markup)}>{formatCurrency(markup)}</DiffCell>
                  <MarkupCell $rate={row.currentMarkupRate}>
                    {formatPercent(row.currentMarkupRate)}
                    {markupDiff !== 0 && (
                      <MarkupIndicator $isDown={markupDiff < 0}>
                        {markupDiff > 0 ? '▲' : '▼'}
                      </MarkupIndicator>
                    )}
                  </MarkupCell>
                  <Td>{formatCurrency(row.prevCost)}</Td>
                  <Td>{formatCurrency(row.prevPrice)}</Td>
                  <Td>{formatPercent(row.prevMarkupRate)}</Td>
                  <DiffCell $positive={diffColor(row.costDiff)}>
                    {row.costDiff >= 0 ? '+' : ''}
                    {formatCurrency(row.costDiff)}
                  </DiffCell>
                  <Td>{formatPercent(row.currentCostShare)}</Td>
                  <Td>{formatPercent(row.crossMultiplication)}</Td>
                </DrillTr>
                {isExpanded &&
                  suppliers.map((s) => {
                    const sMarkup = s.currentPrice - s.currentCost
                    return (
                      <ChildTr key={s.supplierCode}>
                        <Td $align="left" style={{ paddingLeft: 32 }}>
                          {s.supplierName}
                        </Td>
                        <Td>{formatCurrency(s.currentCost)}</Td>
                        <Td>{formatCurrency(s.currentPrice)}</Td>
                        <Td>{formatCurrency(sMarkup)}</Td>
                        <Td>{formatPercent(s.currentMarkupRate)}</Td>
                        <Td>{formatCurrency(s.prevCost)}</Td>
                        <Td>{formatCurrency(s.prevPrice)}</Td>
                        <Td>{formatPercent(s.prevMarkupRate)}</Td>
                        <DiffCell $positive={diffColor(s.costDiff)}>
                          {s.costDiff >= 0 ? '+' : ''}
                          {formatCurrency(s.costDiff)}
                        </DiffCell>
                        <Td>{formatPercent(s.currentCostShare)}</Td>
                        <Td>-</Td>
                      </ChildTr>
                    )
                  })}
              </Fragment>
            )
          })}
          <TrTotal>
            <Td $align="left">合計</Td>
            <Td>{formatCurrency(totalCost)}</Td>
            <Td>{formatCurrency(totalPrice)}</Td>
            <Td>{formatCurrency(totalMarkup)}</Td>
            <Td>{formatPercent(kpi.currentMarkupRate)}</Td>
            <Td>{formatCurrency(totalPrevCost)}</Td>
            <Td>{formatCurrency(totalPrevPrice)}</Td>
            <Td>{formatPercent(totalPrevPrice > 0 ? 1 - totalPrevCost / totalPrevPrice : 0)}</Td>
            <Td>
              {totalCost - totalPrevCost >= 0 ? '+' : ''}
              {formatCurrency(totalCost - totalPrevCost)}
            </Td>
            <Td>{formatPercent(1)}</Td>
            <Td>{formatPercent(totalCrossMult)}</Td>
          </TrTotal>
        </tbody>
      </Table>
    </TableWrapper>
  )
}

// ── 店舗別比較テーブル（ドリルダウン付き） ──

export function StoreComparisonTable({ rows }: { rows: readonly StoreComparisonRow[] }) {
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set())

  const toggleStore = useCallback((storeId: string) => {
    setExpandedStores((prev) => {
      const next = new Set(prev)
      if (next.has(storeId)) next.delete(storeId)
      else next.add(storeId)
      return next
    })
  }, [])

  if (rows.length === 0) return null

  return (
    <TableWrapper>
      <Table>
        <thead>
          <tr>
            <Th $align="left">店舗</Th>
            <Th>当期原価</Th>
            <Th>当期売価</Th>
            <Th>当期値入額</Th>
            <Th>当期値入率</Th>
            <Th>前年原価</Th>
            <Th>前年売価</Th>
            <Th>前年値入率</Th>
            <Th>原価差額</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const curMarkup = row.currentPrice - row.currentCost
            const markupDiff = row.currentMarkupRate - row.prevMarkupRate
            const isExpanded = expandedStores.has(row.storeId)
            return (
              <Fragment key={row.storeId}>
                <DrillTr $expanded={isExpanded} onClick={() => toggleStore(row.storeId)}>
                  <Td $align="left">
                    <DrillToggle>{isExpanded ? '▼' : '▶'}</DrillToggle>
                    {row.storeName}
                  </Td>
                  <Td>{formatCurrency(row.currentCost)}</Td>
                  <Td>{formatCurrency(row.currentPrice)}</Td>
                  <DiffCell $positive={diffColor(curMarkup)}>{formatCurrency(curMarkup)}</DiffCell>
                  <MarkupCell $rate={row.currentMarkupRate}>
                    {formatPercent(row.currentMarkupRate)}
                    {markupDiff !== 0 && (
                      <MarkupIndicator $isDown={markupDiff < 0}>
                        {markupDiff > 0 ? '▲' : '▼'}
                      </MarkupIndicator>
                    )}
                  </MarkupCell>
                  <Td>{formatCurrency(row.prevCost)}</Td>
                  <Td>{formatCurrency(row.prevPrice)}</Td>
                  <Td>{formatPercent(row.prevMarkupRate)}</Td>
                  <DiffCell $positive={diffColor(row.costDiff)}>
                    {row.costDiff >= 0 ? '+' : ''}
                    {formatCurrency(row.costDiff)}
                  </DiffCell>
                </DrillTr>
                {isExpanded && (
                  <ChildTr>
                    <Td colSpan={9} $align="left" style={{ paddingLeft: 32 }}>
                      原価前年比:{' '}
                      {formatPercent(row.prevCost > 0 ? row.currentCost / row.prevCost : 0)}
                      {' / '}
                      売価前年比:{' '}
                      {formatPercent(row.prevPrice > 0 ? row.currentPrice / row.prevPrice : 0)}
                      {' / '}
                      値入率変化: {formatPointDiff(markupDiff)}
                    </Td>
                  </ChildTr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </Table>
    </TableWrapper>
  )
}
