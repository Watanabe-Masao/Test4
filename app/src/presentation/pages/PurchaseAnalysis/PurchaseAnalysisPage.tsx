/**
 * 仕入分析ページ
 *
 * 当期 vs 比較期の仕入データを取引先別・カテゴリ別に比較し、
 * 仕入動向を把握するためのダッシュボード。
 * period1/period2（日付範囲）ベースで同曜日比較にも対応。
 */
import { Fragment, useState, useCallback, useMemo } from 'react'
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
  StoreComparisonRow,
  PurchaseDailyPivotData,
  PurchaseComparisonKpi,
} from '@/domain/models/PurchaseComparison'
import {
  Section,
  SectionTitle,
  SectionHeader,
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
  SubNote,
  PivotTableWrapper,
  PivotGroupTh,
  PurchasePivotGroupTh,
  PivotSubTh,
  PivotTd,
  DrillTr,
  DrillToggle,
  ChildTr,
  ProgressSection,
  ProgressCard,
  ProgressLabel,
  ProgressValue,
  ProgressSub,
  ProgressBar,
  ProgressFill,
} from './PurchaseAnalysisPage.styles'

// ── ソート ──

type SortKey =
  | 'name'
  | 'currentCost'
  | 'prevCost'
  | 'costDiff'
  | 'costChangeRate'
  | 'currentCostShare'
  | 'costShareDiff'
  | 'currentMarkupRate'
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

// ── 期間ラベル ──

function periodLabel(range: {
  from: { year: number; month: number; day: number }
  to: { year: number; month: number; day: number }
}): string {
  const { from, to } = range
  if (from.year === to.year && from.month === to.month) {
    return `${from.year}/${from.month}/${from.day}〜${to.day}`
  }
  return `${from.year}/${from.month}/${from.day}〜${to.year}/${to.month}/${to.day}`
}

// ── メインコンポーネント ──

export function PurchaseAnalysisPage() {
  const settings = useSettingsStore((s) => s.settings)
  const data = useDataStore((s) => s.data)
  const repo = useRepository()
  const { selectedStoreIds, stores } = useStoreSelection()
  const { selection } = usePeriodSelection()

  const { targetYear, targetMonth } = settings

  const duck = useDuckDB(data, targetYear, targetMonth, repo)

  const userCategories = useMemo(() => {
    const map = new Map<string, string>()
    const labels = settings.userCategoryLabels ?? {}
    for (const [id, label] of Object.entries(labels)) {
      map.set(id, label)
    }
    return map
  }, [settings.userCategoryLabels])

  const storeNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const [id, s] of stores) {
      map.set(id, s.name)
    }
    return map
  }, [stores])

  const { data: result, isLoading } = usePurchaseComparisonQuery(
    duck.conn,
    duck.dataVersion,
    selection.period1,
    selection.period2,
    selectedStoreIds,
    settings.supplierCategoryMap,
    userCategories,
    storeNames,
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

  const { kpi, bySupplier, byCategory, byStore, dailyPivot, categorySuppliers } = result

  const sortedSuppliers = sortRows(bySupplier, supplierSort.sortKey, supplierSort.sortDir)
  const sortedCategories = sortRows(byCategory, categorySort.sortKey, categorySort.sortDir)

  // 期間ラベル
  const curLabel = periodLabel(selection.period1)
  const prevLabel = periodLabel(selection.period2)

  return (
    <MainContent title="仕入分析">
      {/* 前年対比進捗 */}
      <Section>
        <SectionTitle>前年対比進捗</SectionTitle>
        <YoyProgressCards kpi={kpi} />
      </Section>

      {/* KPI */}
      <Section>
        <SectionHeader>
          <SectionTitle>全体概要</SectionTitle>
          <SubNote>
            当期: {curLabel} / 比較: {prevLabel}
          </SubNote>
        </SectionHeader>
        <KpiGrid>
          <KpiCard
            label="仕入原価合計"
            value={formatCurrency(kpi.currentTotalCost)}
            subText={`前年比: ${formatPercent(kpi.prevTotalCost > 0 ? kpi.currentTotalCost / kpi.prevTotalCost : 0)} / 前年: ${formatCurrency(kpi.prevTotalCost)} / 差額: ${kpi.totalCostDiff >= 0 ? '+' : ''}${formatCurrency(kpi.totalCostDiff)}`}
            accent={kpi.totalCostDiff >= 0 ? palette.negative : palette.positive}
          />
          <KpiCard
            label="仕入売価合計"
            value={formatCurrency(kpi.currentTotalPrice)}
            subText={`前年比: ${formatPercent(kpi.prevTotalPrice > 0 ? kpi.currentTotalPrice / kpi.prevTotalPrice : 0)} / 前年: ${formatCurrency(kpi.prevTotalPrice)} / 差額: ${kpi.totalPriceDiff >= 0 ? '+' : ''}${formatCurrency(kpi.totalPriceDiff)}`}
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

      {/* カテゴリ別日別明細 */}
      <Section>
        <SectionTitle>カテゴリ別日別明細（原価/売価）</SectionTitle>
        <PurchaseDailyPivotTable pivot={dailyPivot} />
      </Section>

      {/* カテゴリ明細（ドリルダウン付き） */}
      <Section>
        <SectionHeader>
          <SectionTitle>カテゴリ明細</SectionTitle>
          <SubNote>
            標準カテゴリ + カスタムカテゴリの統合集計 / 相乗積合計 = 全体値入率 / クリックで展開
          </SubNote>
        </SectionHeader>
        <CategoryDetailTable
          rows={sortedCategories}
          kpi={kpi}
          sort={categorySort}
          categorySuppliers={categorySuppliers}
        />
      </Section>

      {/* 店舗別比較（ドリルダウン付き） */}
      {byStore.length > 1 && (
        <Section>
          <SectionHeader>
            <SectionTitle>店舗別比較（{byStore.length}店舗）</SectionTitle>
            <SubNote>クリックで取引先別の内訳を表示</SubNote>
          </SectionHeader>
          <StoreComparisonTable rows={byStore} />
        </Section>
      )}

      {/* 取引先別 */}
      <Section>
        <SectionTitle>取引先別比較（{bySupplier.length}件）</SectionTitle>
        <SupplierComparisonTable rows={sortedSuppliers} sort={supplierSort} />
      </Section>
    </MainContent>
  )
}

// ── 前年対比進捗カード ──

function YoyProgressCards({ kpi }: { kpi: PurchaseComparisonKpi }) {
  const salesRatio = kpi.prevSales > 0 ? kpi.currentSales / kpi.prevSales : 0
  const costRatio = kpi.prevTotalCost > 0 ? kpi.currentTotalCost / kpi.prevTotalCost : 0
  const priceRatio = kpi.prevTotalPrice > 0 ? kpi.currentTotalPrice / kpi.prevTotalPrice : 0

  const salesColor = salesRatio >= 1 ? palette.positive : palette.warning
  const costColor = costRatio <= 1 ? palette.positive : palette.negative
  const priceColor = priceRatio <= 1 ? palette.positive : palette.negative

  return (
    <ProgressSection>
      <ProgressCard>
        <ProgressLabel>売上 前年比</ProgressLabel>
        <ProgressValue $accent={salesColor}>{formatPercent(salesRatio)}</ProgressValue>
        <ProgressSub>
          当期: {formatCurrency(kpi.currentSales)} / 前年: {formatCurrency(kpi.prevSales)}
        </ProgressSub>
        <ProgressBar>
          <ProgressFill $width={salesRatio * 100} $color={salesColor} />
        </ProgressBar>
      </ProgressCard>
      <ProgressCard>
        <ProgressLabel>仕入原価 前年比</ProgressLabel>
        <ProgressValue $accent={costColor}>{formatPercent(costRatio)}</ProgressValue>
        <ProgressSub>
          当期: {formatCurrency(kpi.currentTotalCost)} / 前年: {formatCurrency(kpi.prevTotalCost)}
        </ProgressSub>
        <ProgressBar>
          <ProgressFill $width={costRatio * 100} $color={costColor} />
        </ProgressBar>
      </ProgressCard>
      <ProgressCard>
        <ProgressLabel>仕入売価 前年比</ProgressLabel>
        <ProgressValue $accent={priceColor}>{formatPercent(priceRatio)}</ProgressValue>
        <ProgressSub>
          当期: {formatCurrency(kpi.currentTotalPrice)} / 前年: {formatCurrency(kpi.prevTotalPrice)}
        </ProgressSub>
        <ProgressBar>
          <ProgressFill $width={priceRatio * 100} $color={priceColor} />
        </ProgressBar>
      </ProgressCard>
    </ProgressSection>
  )
}

// ── カテゴリ明細テーブル（ドリルダウン付き） ──

function CategoryDetailTable({
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

// ── 取引先別比較テーブル ──

function SupplierComparisonTable({
  rows,
  sort,
}: {
  rows: readonly SupplierComparisonRow[]
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
              取引先{sortIndicator('name', sortKey, sortDir)}
            </Th>
            <Th $sortable onClick={() => handleSort('currentCost')}>
              当期原価{sortIndicator('currentCost', sortKey, sortDir)}
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
              <Td $align="left">{row.supplierName}</Td>
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

// ── 店舗別比較テーブル（ドリルダウン付き） ──

function StoreComparisonTable({ rows }: { rows: readonly StoreComparisonRow[] }) {
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

// ── カテゴリ別日別ピボットテーブル ──

const fmtOrDash = (val: number) => (val !== 0 ? formatCurrency(val) : '-')

function PurchaseDailyPivotTable({ pivot }: { pivot: PurchaseDailyPivotData }) {
  if (pivot.columns.length === 0) {
    return <EmptyState>日別データがありません</EmptyState>
  }

  return (
    <PivotTableWrapper>
      <Table>
        <thead>
          <tr>
            <Th rowSpan={2}>日付</Th>
            {pivot.columns.map((col) => (
              <PurchasePivotGroupTh key={col.key} colSpan={2} $color={col.color}>
                {col.label}
              </PurchasePivotGroupTh>
            ))}
            <PivotGroupTh colSpan={2}>合計</PivotGroupTh>
          </tr>
          <tr>
            {pivot.columns.map((col) => (
              <Fragment key={col.key}>
                <PivotSubTh className="group-start">原価</PivotSubTh>
                <PivotSubTh>売価</PivotSubTh>
              </Fragment>
            ))}
            <PivotSubTh className="group-start">原価</PivotSubTh>
            <PivotSubTh>売価</PivotSubTh>
          </tr>
        </thead>
        <tbody>
          {pivot.rows.map((row) => (
            <tr key={row.day}>
              <Td>{row.day}日</Td>
              {pivot.columns.map((col) => {
                const cell = row.cells[col.key]
                return (
                  <Fragment key={col.key}>
                    <PivotTd $groupStart $negative={cell.cost < 0}>
                      {fmtOrDash(cell.cost)}
                    </PivotTd>
                    <PivotTd $negative={cell.price < 0}>{fmtOrDash(cell.price)}</PivotTd>
                  </Fragment>
                )
              })}
              <PivotTd $groupStart>{fmtOrDash(row.totalCost)}</PivotTd>
              <PivotTd>{fmtOrDash(row.totalPrice)}</PivotTd>
            </tr>
          ))}
          <TrTotal>
            <Td>合計</Td>
            {pivot.columns.map((col) => {
              const cell = pivot.totals.byColumn[col.key]
              return (
                <Fragment key={col.key}>
                  <PivotTd $groupStart>{formatCurrency(cell.cost)}</PivotTd>
                  <PivotTd>{formatCurrency(cell.price)}</PivotTd>
                </Fragment>
              )
            })}
            <PivotTd $groupStart>{formatCurrency(pivot.totals.grandCost)}</PivotTd>
            <PivotTd>{formatCurrency(pivot.totals.grandPrice)}</PivotTd>
          </TrTotal>
        </tbody>
      </Table>
    </PivotTableWrapper>
  )
}
