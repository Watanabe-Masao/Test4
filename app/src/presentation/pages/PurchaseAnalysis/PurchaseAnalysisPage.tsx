/**
 * 仕入分析ページ
 *
 * 当年 vs 前年の仕入データを取引先別・カテゴリ別に比較し、
 * 仕入動向を把握するためのダッシュボード。
 */
import { useState, useCallback, useMemo } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { KpiCard, KpiGrid, PageSkeleton } from '@/presentation/components/common'
import { palette } from '@/presentation/theme/tokens'
import { formatCurrency, formatPercent, formatPointDiff } from '@/domain/formatting'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useStoreSelection } from '@/application/hooks'
import { usePeriodSelection } from '@/application/hooks/usePeriodResolver'
import { useDuckDB } from '@/application/hooks/useDuckDB'
import { useDataStore } from '@/application/stores/dataStore'
import { useRepository } from '@/application/context/useRepository'
import { usePurchaseComparisonQuery } from '@/application/hooks/duckdb/usePurchaseComparisonQuery'
import type {
  SupplierComparisonRow,
  CategoryComparisonRow,
} from '@/domain/models/PurchaseComparison'
import {
  Section,
  SectionTitle,
  TableWrapper,
  Table,
  Th,
  Td,
  DiffCell,
  EmptyState,
} from './PurchaseAnalysisPage.styles'

type SortKey = 'name' | 'currentCost' | 'prevCost' | 'costDiff' | 'costChangeRate' | 'currentCostShare' | 'costShareDiff' | 'currentMarkupRate'
type SortDir = 'asc' | 'desc'

function useSort(defaultKey: SortKey = 'currentCost') {
  const [sortKey, setSortKey] = useState<SortKey>(defaultKey)
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(key)
        setSortDir('desc')
      }
    },
    [sortKey],
  )

  return { sortKey, sortDir, handleSort }
}

function sortIndicator(key: SortKey, sortKey: SortKey, sortDir: SortDir): string {
  if (key !== sortKey) return ''
  return sortDir === 'asc' ? ' ▲' : ' ▼'
}

function sortRows<T extends SupplierComparisonRow | CategoryComparisonRow>(
  rows: readonly T[],
  sortKey: SortKey,
  sortDir: SortDir,
): T[] {
  const sorted = [...rows]
  const dir = sortDir === 'asc' ? 1 : -1
  sorted.sort((a, b) => {
    const nameA = 'supplierName' in a ? a.supplierName : (a as CategoryComparisonRow).category
    const nameB = 'supplierName' in b ? b.supplierName : (b as CategoryComparisonRow).category
    switch (sortKey) {
      case 'name':
        return dir * nameA.localeCompare(nameB, 'ja')
      case 'currentCost':
        return dir * (a.currentCost - b.currentCost)
      case 'prevCost':
        return dir * (a.prevCost - b.prevCost)
      case 'costDiff':
        return dir * (a.costDiff - b.costDiff)
      case 'costChangeRate':
        return dir * (a.costChangeRate - b.costChangeRate)
      case 'currentCostShare':
        return dir * (a.currentCostShare - b.currentCostShare)
      case 'costShareDiff':
        return dir * (a.costShareDiff - b.costShareDiff)
      case 'currentMarkupRate':
        return dir * (a.currentMarkupRate - b.currentMarkupRate)
      default:
        return 0
    }
  })
  return sorted
}

function diffColor(val: number): boolean | undefined {
  if (val === 0) return undefined
  return val > 0
}

export function PurchaseAnalysisPage() {
  const settings = useSettingsStore((s) => s.settings)
  const data = useDataStore((s) => s.data)
  const repo = useRepository()
  const { selectedStoreIds } = useStoreSelection()
  const { selection } = usePeriodSelection()

  const { targetYear, targetMonth } = settings
  const prevYear = selection.period2.from.year
  const prevMonth = selection.period2.from.month

  const duck = useDuckDB(data, targetYear, targetMonth, repo)

  const userCategories = useMemo(() => {
    const map = new Map<string, string>()
    const labels = settings.userCategoryLabels ?? {}
    for (const [id, label] of Object.entries(labels)) {
      map.set(id, label)
    }
    return map
  }, [settings.userCategoryLabels])

  const { data: result, isLoading } = usePurchaseComparisonQuery(
    duck.conn,
    duck.dataVersion,
    targetYear,
    targetMonth,
    prevYear,
    prevMonth,
    selectedStoreIds,
    settings.supplierCategoryMap,
    userCategories,
  )

  const supplierSort = useSort('currentCost')
  const categorySort = useSort('currentCost')

  if (isLoading || !result) {
    return (
      <MainContent title="仕入分析">
        {isLoading ? <PageSkeleton /> : <EmptyState>データを読み込んでください</EmptyState>}
      </MainContent>
    )
  }

  const { kpi, bySupplier, byCategory } = result

  const sortedSuppliers = sortRows(bySupplier, supplierSort.sortKey, supplierSort.sortDir)
  const sortedCategories = sortRows(byCategory, categorySort.sortKey, categorySort.sortDir)

  return (
    <MainContent title="仕入分析">
      {/* KPI */}
      <Section>
        <SectionTitle>全体概要（{targetYear}/{targetMonth}月 vs {prevYear}/{prevMonth}月）</SectionTitle>
        <KpiGrid>
          <KpiCard
            label="仕入原価合計"
            value={formatCurrency(kpi.currentTotalCost)}
            subText={`前年: ${formatCurrency(kpi.prevTotalCost)} / 差額: ${kpi.totalCostDiff >= 0 ? '+' : ''}${formatCurrency(kpi.totalCostDiff)}`}
            accent={kpi.totalCostDiff >= 0 ? palette.negative : palette.positive}
          />
          <KpiCard
            label="仕入売価合計"
            value={formatCurrency(kpi.currentTotalPrice)}
            subText={`前年: ${formatCurrency(kpi.prevTotalPrice)} / 差額: ${kpi.totalPriceDiff >= 0 ? '+' : ''}${formatCurrency(kpi.totalPriceDiff)}`}
            accent={kpi.totalPriceDiff >= 0 ? palette.negative : palette.positive}
          />
          <KpiCard
            label="値入率"
            value={formatPercent(kpi.currentMarkupRate)}
            subText={`前年: ${formatPercent(kpi.prevMarkupRate)} / ${formatPointDiff(kpi.markupRateDiff)}`}
            accent={kpi.markupRateDiff >= 0 ? palette.positive : palette.negative}
          />
          <KpiCard
            label="仕入対売上比率"
            value={formatPercent(kpi.currentCostToSalesRatio)}
            subText={`前年: ${formatPercent(kpi.prevCostToSalesRatio)} / 売上: ${formatCurrency(kpi.currentSales)}`}
            accent={
              kpi.currentCostToSalesRatio <= kpi.prevCostToSalesRatio
                ? palette.positive
                : palette.negative
            }
          />
        </KpiGrid>
      </Section>

      {/* 取引先別 */}
      <Section>
        <SectionTitle>取引先別比較（{bySupplier.length}件）</SectionTitle>
        <ComparisonTable
          rows={sortedSuppliers}
          nameAccessor={(r) => (r as SupplierComparisonRow).supplierName}
          sort={supplierSort}
        />
      </Section>

      {/* カテゴリ別 */}
      <Section>
        <SectionTitle>カテゴリ別比較（{byCategory.length}件）</SectionTitle>
        <ComparisonTable
          rows={sortedCategories}
          nameAccessor={(r) => (r as CategoryComparisonRow).category}
          sort={categorySort}
        />
      </Section>
    </MainContent>
  )
}

// ── 共通比較テーブル ──

function ComparisonTable<T extends SupplierComparisonRow | CategoryComparisonRow>({
  rows,
  nameAccessor,
  sort,
}: {
  rows: readonly T[]
  nameAccessor: (row: T) => string
  sort: ReturnType<typeof useSort>
}) {
  const { sortKey, sortDir, handleSort } = sort

  if (rows.length === 0) {
    return <EmptyState>データがありません</EmptyState>
  }

  return (
    <TableWrapper>
      <Table>
        <thead>
          <tr>
            <Th $align="left" $sortable onClick={() => handleSort('name')}>
              名称{sortIndicator('name', sortKey, sortDir)}
            </Th>
            <Th $sortable onClick={() => handleSort('currentCost')}>
              当年原価{sortIndicator('currentCost', sortKey, sortDir)}
            </Th>
            <Th $sortable onClick={() => handleSort('prevCost')}>
              前年原価{sortIndicator('prevCost', sortKey, sortDir)}
            </Th>
            <Th $sortable onClick={() => handleSort('costDiff')}>
              差額{sortIndicator('costDiff', sortKey, sortDir)}
            </Th>
            <Th $sortable onClick={() => handleSort('costChangeRate')}>
              増減率{sortIndicator('costChangeRate', sortKey, sortDir)}
            </Th>
            <Th $sortable onClick={() => handleSort('currentCostShare')}>
              構成比{sortIndicator('currentCostShare', sortKey, sortDir)}
            </Th>
            <Th $sortable onClick={() => handleSort('costShareDiff')}>
              構成比変化{sortIndicator('costShareDiff', sortKey, sortDir)}
            </Th>
            <Th $sortable onClick={() => handleSort('currentMarkupRate')}>
              値入率{sortIndicator('currentMarkupRate', sortKey, sortDir)}
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <Td $align="left">{nameAccessor(row)}</Td>
              <Td>{formatCurrency(row.currentCost)}</Td>
              <Td>{formatCurrency(row.prevCost)}</Td>
              <DiffCell $positive={diffColor(row.costDiff)}>
                {row.costDiff >= 0 ? '+' : ''}
                {formatCurrency(row.costDiff)}
              </DiffCell>
              <DiffCell $positive={diffColor(row.costChangeRate)}>
                {row.costChangeRate >= 0 ? '+' : ''}
                {formatPercent(row.costChangeRate)}
              </DiffCell>
              <Td>{formatPercent(row.currentCostShare)}</Td>
              <DiffCell $positive={diffColor(row.costShareDiff)}>
                {formatPointDiff(row.costShareDiff)}
              </DiffCell>
              <Td>
                {formatPercent(row.currentMarkupRate)}
                <span style={{ opacity: 0.5, marginLeft: 4 }}>
                  ({formatPercent(row.prevMarkupRate)})
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableWrapper>
  )
}
