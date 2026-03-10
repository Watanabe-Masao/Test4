/**
 * 仕入分析ページ
 *
 * 当期 vs 比較期の仕入データを取引先別・カテゴリ別に比較し、
 * 仕入動向を把握するためのダッシュボード。
 * period1/period2（日付範囲）ベースで同曜日比較にも対応。
 */
import { Fragment, useState, useCallback, useMemo, memo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
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
import { deriveDowOffset } from '@/domain/models/PeriodSelection'
import { ComparisonPresetToggle } from '@/presentation/components/Layout/ComparisonPresetToggle'
import type {
  SupplierComparisonRow,
  CategoryComparisonRow,
  StoreComparisonRow,
  PurchaseDailyPivotData,
  PurchaseComparisonKpi,
  PurchaseDailyData,
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
  TabBar,
  TabButton,
  ToggleRow,
  TrSubtotal,
  DowCell,
  ChartWrapper,
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

  const dowOffset = useMemo(
    () => deriveDowOffset(selection.period1, selection.period2, selection.activePreset),
    [selection.period1, selection.period2, selection.activePreset],
  )

  const { data: result, isLoading } = usePurchaseComparisonQuery(
    duck.conn,
    duck.dataVersion,
    selection.period1,
    selection.period2,
    selectedStoreIds,
    settings.supplierCategoryMap,
    userCategories,
    storeNames,
    dowOffset,
  )

  const categorySort = useSort('currentCost')

  // 初回ロード時のみスケルトン表示。以降はデータ保持したまま再読み込み
  if (!result) {
    return (
      <MainContent title="仕入分析">
        {isLoading ? <PageSkeleton /> : <EmptyState>データを読み込んでください</EmptyState>}
      </MainContent>
    )
  }

  const { kpi, byCategory, byStore, daily, dailyPivot, categorySuppliers, isDetailReady } = result

  const sortedCategories = sortRows(byCategory, categorySort.sortKey, categorySort.sortDir)

  // 期間ラベル
  const curLabel = periodLabel(selection.period1)
  const prevLabel = periodLabel(selection.period2)

  return (
    <MainContent title="仕入分析">
      {/* 比較プリセット切り替え + ローディング */}
      <SectionHeader>
        <ComparisonPresetToggle />
        {isLoading && <SubNote>データ更新中...</SubNote>}
      </SectionHeader>

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

      {/* 詳細セクション: KPI先行表示後に詳細をロード */}
      {!isDetailReady ? (
        <Section>
          <PageSkeleton />
        </Section>
      ) : (
        <>
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

          {/* 売上 vs 仕入 チャート */}
          <Section>
            <SectionTitle>売上 vs 仕入原価（日別推移）</SectionTitle>
            <PurchaseVsSalesChart daily={daily} />
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
        </>
      )}
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

// ── 曜日ラベル ──

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const
const DOW_OPTIONS = DOW_LABELS.map((label, i) => ({ value: i, label }))

// ── 小計計算（コンポーネント側で動的に算出） ──

interface WeekSubtotal {
  readonly afterDay: number
  readonly cells: Readonly<
    Record<string, { cost: number; price: number; prevCost: number; prevPrice: number }>
  >
  readonly totalCost: number
  readonly totalPrice: number
  readonly prevTotalCost: number
  readonly prevTotalPrice: number
}

function computeSubtotals(
  rows: readonly import('@/domain/models/PurchaseComparison').PurchaseDailyPivotRow[],
  columnKeys: readonly string[],
  startDow: number,
): WeekSubtotal[] {
  const result: WeekSubtotal[] = []
  const emptyAccum = () => ({ cost: 0, price: 0, prevCost: 0, prevPrice: 0 })
  let accum: Record<string, { cost: number; price: number; prevCost: number; prevPrice: number }> =
    {}
  for (const k of columnKeys) accum[k] = emptyAccum()
  let totalCost = 0
  let totalPrice = 0
  let prevTotalCost = 0
  let prevTotalPrice = 0
  let count = 0

  // 小計は「選択した曜日の前日」で締める（＝選択曜日が週の開始日）
  const endDow = (startDow + 6) % 7

  for (const row of rows) {
    for (const k of columnKeys) {
      const c = row.cells[k]
      accum[k].cost += c.cost
      accum[k].price += c.price
      accum[k].prevCost += c.prevCost
      accum[k].prevPrice += c.prevPrice
    }
    totalCost += row.totalCost
    totalPrice += row.totalPrice
    prevTotalCost += row.prevTotalCost
    prevTotalPrice += row.prevTotalPrice
    count++

    if (row.dayOfWeek === endDow && count > 0) {
      result.push({
        afterDay: row.day,
        cells: { ...accum },
        totalCost,
        totalPrice,
        prevTotalCost,
        prevTotalPrice,
      })
      accum = {}
      for (const k of columnKeys) accum[k] = emptyAccum()
      totalCost = 0
      totalPrice = 0
      prevTotalCost = 0
      prevTotalPrice = 0
      count = 0
    }
  }
  // 残りを最後の小計として追加
  if (count > 0) {
    result.push({
      afterDay: rows[rows.length - 1].day,
      cells: { ...accum },
      totalCost,
      totalPrice,
      prevTotalCost,
      prevTotalPrice,
    })
  }
  return result
}

// ── カテゴリ別日別ピボットテーブル（タブ切り替え） ──

const fmtOrDash = (val: number) => (val !== 0 ? formatCurrency(val) : '-')

const PurchaseDailyPivotTable = memo(function PurchaseDailyPivotTable({
  pivot,
}: {
  pivot: PurchaseDailyPivotData
}) {
  const [activeTab, setActiveTab] = useState<string>('__all__')
  const [showSubtotals, setShowSubtotals] = useState(true)
  const [subtotalStartDow, setSubtotalStartDow] = useState(1) // デフォルト: 月曜起点

  const columnKeys = useMemo(() => pivot.columns.map((c) => c.key), [pivot.columns])

  const subtotalMap = useMemo(() => {
    if (!showSubtotals) return new Map<number, WeekSubtotal>()
    const subs = computeSubtotals(pivot.rows, columnKeys, subtotalStartDow)
    return new Map(subs.map((s) => [s.afterDay, s]))
  }, [pivot.rows, columnKeys, subtotalStartDow, showSubtotals])

  if (pivot.columns.length === 0) {
    return <EmptyState>日別データがありません</EmptyState>
  }

  const isAllTab = activeTab === '__all__'
  const activeCol = pivot.columns.find((c) => c.key === activeTab)

  // セルの値を取得するヘルパー
  const getCost = (row: import('@/domain/models/PurchaseComparison').PurchaseDailyPivotRow) =>
    isAllTab ? row.totalCost : (row.cells[activeTab]?.cost ?? 0)
  const getPrice = (row: import('@/domain/models/PurchaseComparison').PurchaseDailyPivotRow) =>
    isAllTab ? row.totalPrice : (row.cells[activeTab]?.price ?? 0)
  const getPrevCost = (row: import('@/domain/models/PurchaseComparison').PurchaseDailyPivotRow) =>
    isAllTab ? row.prevTotalCost : (row.cells[activeTab]?.prevCost ?? 0)
  const getPrevPrice = (row: import('@/domain/models/PurchaseComparison').PurchaseDailyPivotRow) =>
    isAllTab ? row.prevTotalPrice : (row.cells[activeTab]?.prevPrice ?? 0)

  const getSubCost = (sub: WeekSubtotal) =>
    isAllTab ? sub.totalCost : (sub.cells[activeTab]?.cost ?? 0)
  const getSubPrice = (sub: WeekSubtotal) =>
    isAllTab ? sub.totalPrice : (sub.cells[activeTab]?.price ?? 0)
  const getSubPrevCost = (sub: WeekSubtotal) =>
    isAllTab ? sub.prevTotalCost : (sub.cells[activeTab]?.prevCost ?? 0)
  const getSubPrevPrice = (sub: WeekSubtotal) =>
    isAllTab ? sub.prevTotalPrice : (sub.cells[activeTab]?.prevPrice ?? 0)

  // 合計
  const totCost = isAllTab ? pivot.totals.grandCost : (pivot.totals.byColumn[activeTab]?.cost ?? 0)
  const totPrice = isAllTab
    ? pivot.totals.grandPrice
    : (pivot.totals.byColumn[activeTab]?.price ?? 0)
  const totPrevCost = isAllTab
    ? pivot.totals.prevGrandCost
    : (pivot.totals.byColumn[activeTab]?.prevCost ?? 0)
  const totPrevPrice = isAllTab
    ? pivot.totals.prevGrandPrice
    : (pivot.totals.byColumn[activeTab]?.prevPrice ?? 0)

  const markupRateVal = (cost: number, price: number) => (price > 0 ? 1 - cost / price : 0)

  return (
    <>
      {/* タブ */}
      <TabBar>
        <TabButton $active={isAllTab} $color="#3b82f6" onClick={() => setActiveTab('__all__')}>
          全カテゴリ
        </TabButton>
        {pivot.columns.map((col) => (
          <TabButton
            key={col.key}
            $active={activeTab === col.key}
            $color={col.color}
            onClick={() => setActiveTab(col.key)}
          >
            {col.label}
          </TabButton>
        ))}
      </TabBar>

      {/* 小計コントロール */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <ToggleRow>
          <input
            type="checkbox"
            checked={showSubtotals}
            onChange={(e) => setShowSubtotals(e.target.checked)}
          />
          小計を表示
        </ToggleRow>
        {showSubtotals && (
          <ToggleRow as="span">
            起点曜日:
            <select
              value={subtotalStartDow}
              onChange={(e) => setSubtotalStartDow(Number(e.target.value))}
              style={{ padding: '2px 4px', fontSize: '0.85rem' }}
            >
              {DOW_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </ToggleRow>
        )}
      </div>

      {/* テーブル */}
      <PivotTableWrapper>
        <Table>
          <thead>
            <tr>
              <Th rowSpan={2}>日付</Th>
              <Th rowSpan={2}>曜</Th>
              <PivotGroupTh colSpan={3}>
                当期{activeCol ? `（${activeCol.label}）` : ''}
              </PivotGroupTh>
              <PivotGroupTh colSpan={3}>前期</PivotGroupTh>
              <PivotGroupTh colSpan={2}>差異</PivotGroupTh>
            </tr>
            <tr>
              <PivotSubTh className="group-start">原価</PivotSubTh>
              <PivotSubTh>売価</PivotSubTh>
              <PivotSubTh>値入率</PivotSubTh>
              <PivotSubTh className="group-start">原価</PivotSubTh>
              <PivotSubTh>売価</PivotSubTh>
              <PivotSubTh>値入率</PivotSubTh>
              <PivotSubTh className="group-start">原価</PivotSubTh>
              <PivotSubTh>売価</PivotSubTh>
            </tr>
          </thead>
          <tbody>
            {pivot.rows.map((row) => {
              const cost = getCost(row)
              const price = getPrice(row)
              const prevCost = getPrevCost(row)
              const prevPrice = getPrevPrice(row)
              const sub = subtotalMap.get(row.day)

              return (
                <Fragment key={row.day}>
                  <tr>
                    <Td>{row.day}日</Td>
                    <DowCell $dow={row.dayOfWeek}>{DOW_LABELS[row.dayOfWeek]}</DowCell>
                    <PivotTd $groupStart $negative={cost < 0}>
                      {fmtOrDash(cost)}
                    </PivotTd>
                    <PivotTd $negative={price < 0}>{fmtOrDash(price)}</PivotTd>
                    <PivotTd>{price > 0 ? formatPercent(markupRateVal(cost, price)) : '-'}</PivotTd>
                    <PivotTd $groupStart>{fmtOrDash(prevCost)}</PivotTd>
                    <PivotTd>{fmtOrDash(prevPrice)}</PivotTd>
                    <PivotTd>
                      {prevPrice > 0 ? formatPercent(markupRateVal(prevCost, prevPrice)) : '-'}
                    </PivotTd>
                    <DiffCell $groupStart $positive={diffColor(cost - prevCost)}>
                      {cost - prevCost !== 0 ? fmtOrDash(cost - prevCost) : '-'}
                    </DiffCell>
                    <DiffCell $positive={diffColor(price - prevPrice)}>
                      {price - prevPrice !== 0 ? fmtOrDash(price - prevPrice) : '-'}
                    </DiffCell>
                  </tr>
                  {showSubtotals && sub && (
                    <TrSubtotal>
                      <Td $align="left" colSpan={2}>
                        小計
                      </Td>
                      <PivotTd $groupStart>{formatCurrency(getSubCost(sub))}</PivotTd>
                      <PivotTd>{formatCurrency(getSubPrice(sub))}</PivotTd>
                      <PivotTd>
                        {formatPercent(markupRateVal(getSubCost(sub), getSubPrice(sub)))}
                      </PivotTd>
                      <PivotTd $groupStart>{formatCurrency(getSubPrevCost(sub))}</PivotTd>
                      <PivotTd>{formatCurrency(getSubPrevPrice(sub))}</PivotTd>
                      <PivotTd>
                        {formatPercent(markupRateVal(getSubPrevCost(sub), getSubPrevPrice(sub)))}
                      </PivotTd>
                      <DiffCell
                        $groupStart
                        $positive={diffColor(getSubCost(sub) - getSubPrevCost(sub))}
                      >
                        {formatCurrency(getSubCost(sub) - getSubPrevCost(sub))}
                      </DiffCell>
                      <DiffCell $positive={diffColor(getSubPrice(sub) - getSubPrevPrice(sub))}>
                        {formatCurrency(getSubPrice(sub) - getSubPrevPrice(sub))}
                      </DiffCell>
                    </TrSubtotal>
                  )}
                </Fragment>
              )
            })}
            <TrTotal>
              <Td $align="left" colSpan={2}>
                合計
              </Td>
              <PivotTd $groupStart>{formatCurrency(totCost)}</PivotTd>
              <PivotTd>{formatCurrency(totPrice)}</PivotTd>
              <PivotTd>{formatPercent(markupRateVal(totCost, totPrice))}</PivotTd>
              <PivotTd $groupStart>{formatCurrency(totPrevCost)}</PivotTd>
              <PivotTd>{formatCurrency(totPrevPrice)}</PivotTd>
              <PivotTd>{formatPercent(markupRateVal(totPrevCost, totPrevPrice))}</PivotTd>
              <DiffCell $groupStart $positive={diffColor(totCost - totPrevCost)}>
                {formatCurrency(totCost - totPrevCost)}
              </DiffCell>
              <DiffCell $positive={diffColor(totPrice - totPrevPrice)}>
                {formatCurrency(totPrice - totPrevPrice)}
              </DiffCell>
            </TrTotal>
          </tbody>
        </Table>
      </PivotTableWrapper>
    </>
  )
})

// ── 売上 vs 仕入原価 チャート ──

function buildSalesVsCostData(daily: PurchaseDailyData) {
  const salesMap = new Map(daily.current.map((d) => [d.day, d]))
  const allDays = Array.from(new Set([...daily.current.map((d) => d.day)])).sort((a, b) => a - b)

  const points = allDays.map((day) => {
    const cur = salesMap.get(day)
    return { day, sales: cur?.sales ?? 0, cost: cur?.cost ?? 0 }
  })
  const cumSalesArr = points.reduce<number[]>((acc, p, i) => {
    acc.push((i > 0 ? acc[i - 1] : 0) + p.sales)
    return acc
  }, [])
  const cumCostArr = points.reduce<number[]>((acc, p, i) => {
    acc.push((i > 0 ? acc[i - 1] : 0) + p.cost)
    return acc
  }, [])

  return points.map((p, i) => ({
    day: `${p.day}日`,
    sales: Math.round(p.sales),
    cost: Math.round(p.cost),
    cumSales: Math.round(cumSalesArr[i]),
    cumCost: Math.round(cumCostArr[i]),
    cumDiff: Math.round(cumSalesArr[i] - cumCostArr[i]),
    costToSalesRatio:
      cumSalesArr[i] > 0 ? Math.round((cumCostArr[i] / cumSalesArr[i]) * 10000) / 100 : 0,
  }))
}

const PurchaseVsSalesChart = memo(function PurchaseVsSalesChart({
  daily,
}: {
  daily: PurchaseDailyData
}) {
  const chartData = useMemo(() => buildSalesVsCostData(daily), [daily])

  if (chartData.length === 0) {
    return <EmptyState>日別データがありません</EmptyState>
  }

  const fmtYen = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`
    return String(v)
  }

  return (
    <>
      <ChartWrapper style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="day" fontSize={11} />
            <YAxis yAxisId="left" tickFormatter={fmtYen} fontSize={11} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={fmtYen} fontSize={11} />
            <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
            <Legend />
            <Bar yAxisId="left" dataKey="sales" name="売上" fill={palette.positive} opacity={0.7} />
            <Bar
              yAxisId="left"
              dataKey="cost"
              name="仕入原価"
              fill={palette.negative}
              opacity={0.7}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumDiff"
              name="累計差（売上-仕入）"
              stroke={palette.info}
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartWrapper>
      <SubNote style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>
        仕入対売上比率（累計）
      </SubNote>
      <ChartWrapper style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="day" fontSize={11} />
            <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} fontSize={11} />
            <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, '仕入/売上比率']} />
            <Line
              type="monotone"
              dataKey="costToSalesRatio"
              name="仕入/売上比率"
              stroke={palette.warning}
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartWrapper>
    </>
  )
})
