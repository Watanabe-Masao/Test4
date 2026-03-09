/**
 * 仕入分析ページ
 *
 * 当期 vs 比較期の仕入データを取引先別・カテゴリ別に比較し、
 * 仕入動向を把握するためのダッシュボード。
 * period1/period2（日付範囲）ベースで同曜日比較にも対応。
 */
import { useState, useCallback, useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts'
import { MainContent } from '@/presentation/components/Layout'
import { KpiCard, KpiGrid, PageSkeleton } from '@/presentation/components/common'
import {
  SafeResponsiveContainer,
  createChartTooltip,
} from '@/presentation/components/charts/chartInfra'
import { useChartTheme, toAxisYen } from '@/presentation/components/charts/chartTheme'
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
  ChartWrapper,
  SubNote,
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

  const { kpi, bySupplier, byCategory, byStore, daily } = result

  const sortedSuppliers = sortRows(bySupplier, supplierSort.sortKey, supplierSort.sortDir)
  const sortedCategories = sortRows(byCategory, categorySort.sortKey, categorySort.sortDir)

  // 期間ラベル
  const curLabel = periodLabel(selection.period1)
  const prevLabel = periodLabel(selection.period2)

  return (
    <MainContent title="仕入分析">
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

      {/* 日別累計チャート */}
      <Section>
        <SectionTitle>日別仕入推移（累計）</SectionTitle>
        <PurchaseDailyChart currentDaily={daily.current} prevDaily={daily.prev} />
      </Section>

      {/* カテゴリ明細 */}
      <Section>
        <SectionHeader>
          <SectionTitle>カテゴリ明細</SectionTitle>
          <SubNote>標準カテゴリ + カスタムカテゴリの統合集計 / 相乗積合計 = 全体値入率</SubNote>
        </SectionHeader>
        <CategoryDetailTable rows={sortedCategories} kpi={kpi} sort={categorySort} />
      </Section>

      {/* 店舗別比較 */}
      {byStore.length > 1 && (
        <Section>
          <SectionTitle>店舗別比較（{byStore.length}店舗）</SectionTitle>
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

// ── カテゴリ明細テーブル ──

function CategoryDetailTable({
  rows,
  kpi,
  sort,
}: {
  rows: readonly CategoryComparisonRow[]
  kpi: { currentTotalCost: number; currentTotalPrice: number; currentMarkupRate: number }
  sort: ReturnType<typeof useSort>
}) {
  const { sortKey, sortDir, handleSort } = sort

  if (rows.length === 0) {
    return <EmptyState>データがありません</EmptyState>
  }

  const totalCost = rows.reduce((s, r) => s + r.currentCost, 0)
  const totalPrice = rows.reduce((s, r) => s + r.currentPrice, 0)
  const totalMarkup = totalPrice - totalCost
  const totalCrossMult = rows.reduce((s, r) => s + r.crossMultiplication, 0)

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
            <Th $sortable onClick={() => handleSort('currentCostShare')}>
              構成比（原価）{sortIndicator('currentCostShare', sortKey, sortDir)}
            </Th>
            <Th>売価構成比</Th>
            <Th>相乗積</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const markup = row.currentPrice - row.currentCost
            const prevMarkupRate = row.prevMarkupRate
            const markupDiff = row.currentMarkupRate - prevMarkupRate
            return (
              <tr key={row.categoryId}>
                <Td $align="left">
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
                <Td>{formatPercent(row.currentCostShare)}</Td>
                <Td>{formatPercent(row.currentPriceShare)}</Td>
                <Td>{formatPercent(row.crossMultiplication)}</Td>
              </tr>
            )
          })}
          <TrTotal>
            <Td $align="left">合計</Td>
            <Td>{formatCurrency(totalCost)}</Td>
            <Td>{formatCurrency(totalPrice)}</Td>
            <Td>{formatCurrency(totalMarkup)}</Td>
            <Td>{formatPercent(kpi.currentMarkupRate)}</Td>
            <Td>{formatPercent(1)}</Td>
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

// ── 店舗別比較テーブル ──

function StoreComparisonTable({ rows }: { rows: readonly StoreComparisonRow[] }) {
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
            return (
              <tr key={row.storeId}>
                <Td $align="left">{row.storeName}</Td>
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
              </tr>
            )
          })}
        </tbody>
      </Table>
    </TableWrapper>
  )
}

// ── 日別累計チャート ──

interface DailyChartPoint {
  day: number
  curCost: number
  curCumCost: number
  curCumMarkup: number
  curCumSales: number
  prevCumCost: number | null
  prevCumMarkup: number | null
  prevCumSales: number | null
}

function PurchaseDailyChart({
  currentDaily,
  prevDaily,
}: {
  currentDaily: readonly {
    day: number
    cost: number
    price: number
    markup: number
    sales: number
  }[]
  prevDaily: readonly { day: number; cost: number; price: number; markup: number; sales: number }[]
}) {
  const ct = useChartTheme()

  const chartData = useMemo(() => {
    const curMap = new Map(currentDaily.map((d) => [d.day, d]))
    const prevMap = new Map(prevDaily.map((d) => [d.day, d]))
    const maxDay = Math.max(...currentDaily.map((d) => d.day), ...prevDaily.map((d) => d.day), 1)

    const points: DailyChartPoint[] = []
    let curCumCost = 0
    let curCumMarkup = 0
    let curCumSales = 0
    let prevCumCost = 0
    let prevCumMarkup = 0
    let prevCumSales = 0

    for (let day = 1; day <= maxDay; day++) {
      const cur = curMap.get(day)
      const prev = prevMap.get(day)
      if (cur) {
        curCumCost += cur.cost
        curCumMarkup += cur.markup
        curCumSales += cur.sales
      }
      if (prev) {
        prevCumCost += prev.cost
        prevCumMarkup += prev.markup
        prevCumSales += prev.sales
      }
      points.push({
        day,
        curCost: cur?.cost ?? 0,
        curCumCost,
        curCumMarkup,
        curCumSales,
        prevCumCost: prevDaily.length > 0 ? prevCumCost : null,
        prevCumMarkup: prevDaily.length > 0 ? prevCumMarkup : null,
        prevCumSales: prevDaily.length > 0 ? prevCumSales : null,
      })
    }
    return points
  }, [currentDaily, prevDaily])

  if (chartData.length === 0) {
    return <EmptyState>日別データがありません</EmptyState>
  }

  return (
    <ChartWrapper>
      <SafeResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: ct.fontSize.sm, fill: ct.textMuted }}
            tickFormatter={(v: number) => `${v}日`}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={toAxisYen}
            tick={{ fontSize: ct.fontSize.sm, fill: ct.textMuted }}
          />
          <Tooltip
            content={createChartTooltip({
              ct,
              formatter: (value, name) => [
                `${Math.round(Number(value)).toLocaleString('ja-JP')}円`,
                name,
              ],
              labelFormatter: (label) => `${label}日`,
            })}
          />
          <Legend wrapperStyle={{ fontSize: ct.fontSize.sm }} />
          {/* 当期日別仕入（バー） */}
          <Bar yAxisId="left" dataKey="curCost" name="当期仕入原価" barSize={8} opacity={0.6}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={palette.primary} />
            ))}
          </Bar>
          {/* 当期累計原価（太い線） */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="curCumCost"
            name="当期累計原価"
            stroke={palette.primary}
            strokeWidth={2.5}
            dot={false}
          />
          {/* 当期累計値入高（緑） */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="curCumMarkup"
            name="当期累計値入高"
            stroke={palette.successDark}
            strokeWidth={2}
            dot={false}
          />
          {/* 前年累計原価（破線） */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="prevCumCost"
            name="前年累計原価"
            stroke={palette.slate}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
          />
          {/* 前年累計値入高（破線） */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="prevCumMarkup"
            name="前年累計値入高"
            stroke={palette.warningDark}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
          />
          {/* 当期累計売上（赤系） */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="curCumSales"
            name="当期累計売上"
            stroke={palette.dangerDark}
            strokeWidth={2}
            dot={false}
          />
          {/* 前年累計売上（破線） */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="prevCumSales"
            name="前年累計売上"
            stroke={palette.pinkDark}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
          />
        </ComposedChart>
      </SafeResponsiveContainer>
    </ChartWrapper>
  )
}
