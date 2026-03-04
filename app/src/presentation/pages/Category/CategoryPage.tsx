import { useState, useMemo, useCallback } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import {
  Chip,
  ChipGroup,
  KpiCard,
  ChartErrorBoundary,
  MetricBreakdownPanel,
  PageSkeleton,
} from '@/presentation/components/common'
import {
  useCalculation,
  useStoreSelection,
  useSettings,
  useExplanations,
} from '@/application/hooks'
import { useDataStore } from '@/application/stores/dataStore'
import type { MetricId } from '@/domain/models'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { safeDivide } from '@/domain/calculations/utils'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/constants/categories'
import type { CustomCategory, CategoryType } from '@/domain/models'
import { CUSTOM_CATEGORIES } from '@/domain/models'
import type { PresetCategoryId } from '@/domain/constants/customCategories'
import { isUserCategory } from '@/domain/constants/customCategories'
import {
  ChartGrid,
  Section,
  SectionTitle,
  TableWrapper,
  Table,
  Th,
  Td,
  Tr,
  TrTotal,
  Badge,
  EmptyState,
  ToggleBar,
  ToggleLabel,
  CategorySelect,
  KpiRow,
  SortButton,
  MarkupCell,
  GrossProfitCell,
  SectionHeader,
  SupplierFilterInput,
  SupplierToolbar,
  DrillTr,
  DrillToggle,
  DrillLabel,
} from './CategoryPage.styles'
import { CurrencyUnitToggle } from '@/presentation/components/charts'
import { CrossMultiplicationChart, CompositionChart } from './CategoryCharts'
import {
  StoreComparisonCategoryBarChart,
  StoreComparisonMarkupRadarChart,
} from './CategoryComparisonCharts'
import type { ComparisonMode, CategoryChartItem } from './categoryData'
import {
  CATEGORY_COLORS,
  CUSTOM_CATEGORY_COLORS,
  buildCategoryData,
  buildUnifiedCategoryData,
} from './categoryData'

type SortKey =
  | 'label'
  | 'cost'
  | 'price'
  | 'grossProfit'
  | 'markup'
  | 'costShare'
  | 'priceShare'
  | 'crossMult'
type SortDir = 'asc' | 'desc'

export function CategoryPage() {
  const { isComputing } = useCalculation()
  const { currentResult, selectedResults, storeName, stores } = useStoreSelection()
  const settings = useSettingsStore((s) => s.settings)
  const { updateSettings } = useSettings()
  const explanations = useExplanations()
  const dataStores = useDataStore((s) => s.data.stores)
  const [explainMetric, setExplainMetric] = useState<MetricId | null>(null)
  const handleExplain = useCallback((metricId: MetricId) => {
    setExplainMetric(metricId)
  }, [])
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('total')
  const [supplierSort, setSupplierSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'cost',
    dir: 'desc',
  })
  const [supplierFilter, setSupplierFilter] = useState('')
  // ドリルダウン: カテゴリ→店舗→日別
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [expandedStore, setExpandedStore] = useState<string | null>(null) // "category:storeId"
  // 取引先ドリルダウン: 取引先→店舗→日別
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null) // supplierCode
  const [expandedSupplierStore, setExpandedSupplierStore] = useState<string | null>(null) // "code:storeId"

  // Build store name map for comparison charts (must be before early return)
  const storeNames = useMemo(() => {
    const map = new Map<string, string>()
    selectedResults.forEach((sr) => {
      map.set(sr.storeId, stores.get(sr.storeId)?.name ?? sr.storeId)
    })
    return map
  }, [selectedResults, stores])

  // All useMemo must be before early return (Rules of Hooks)
  const filteredSupplierData = useMemo(() => {
    if (!currentResult) return []
    const supplierList = Array.from(currentResult.supplierTotals.values())
    const tAbsPrice = supplierList.reduce((sum, s) => sum + Math.abs(s.price), 0)
    const tPrice = supplierList.reduce((sum, s) => sum + s.price, 0)
    let list = supplierList
    if (supplierFilter) {
      const q = supplierFilter.toLowerCase()
      list = list.filter(
        (s) => s.supplierName.toLowerCase().includes(q) || s.supplierCode.includes(q),
      )
    }
    const { key, dir } = supplierSort
    const sorted = [...list].sort((a, b) => {
      let va: number, vb: number
      switch (key) {
        case 'cost':
          va = a.cost
          vb = b.cost
          break
        case 'price':
          va = a.price
          vb = b.price
          break
        case 'grossProfit':
          va = a.price - a.cost
          vb = b.price - b.cost
          break
        case 'markup':
          va = a.markupRate
          vb = b.markupRate
          break
        case 'priceShare':
          va = safeDivide(Math.abs(a.price), tAbsPrice, 0)
          vb = safeDivide(Math.abs(b.price), tAbsPrice, 0)
          break
        case 'crossMult':
          va = safeDivide(a.price - a.cost, tPrice, 0)
          vb = safeDivide(b.price - b.cost, tPrice, 0)
          break
        default:
          va = a.cost
          vb = b.cost
      }
      return dir === 'asc' ? va - vb : vb - va
    })
    return sorted
  }, [currentResult, supplierSort, supplierFilter])

  if (isComputing && !currentResult) {
    return (
      <MainContent title="カテゴリ分析" storeName={storeName}>
        <PageSkeleton />
      </MainContent>
    )
  }

  if (!currentResult) {
    return (
      <MainContent title="カテゴリ分析" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const r = currentResult
  const hasMultipleStores = selectedResults.length > 1

  // カテゴリ別データ（標準 + カスタムカテゴリ統合）
  const categoryData = buildUnifiedCategoryData(
    r,
    settings.supplierCategoryMap,
    settings.userCategoryLabels,
  )

  // 取引先別データ
  const supplierData = Array.from(r.supplierTotals.values())
  const totalSupplierPrice = supplierData.reduce((sum, s) => sum + s.price, 0)
  const totalSupplierAbsPrice = supplierData.reduce((sum, s) => sum + Math.abs(s.price), 0)
  const totalSupplierCost = supplierData.reduce((sum, s) => sum + s.cost, 0)

  // --- KPIサマリー（統合データで再計算） ---
  const totalCatCost = categoryData.reduce((s, c) => s + c.cost, 0)
  const totalCatPrice = categoryData.reduce((s, c) => s + c.price, 0)
  const totalGrossProfit = totalCatPrice - totalCatCost
  const overallMarkupRate = safeDivide(totalGrossProfit, totalCatPrice, 0)

  const handleCustomCategoryChange = (supplierCode: string, value: string) => {
    if (!value || value === 'uncategorized') {
      const next = Object.fromEntries(
        Object.entries(settings.supplierCategoryMap).filter(([k]) => k !== supplierCode),
      )
      updateSettings({ supplierCategoryMap: next })
    } else {
      updateSettings({
        supplierCategoryMap: {
          ...settings.supplierCategoryMap,
          [supplierCode]: value as CustomCategory,
        },
      })
    }
  }

  // --- 取引先ソート ---
  const toggleSort = (key: SortKey) => {
    setSupplierSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' },
    )
  }

  const sortIcon = (key: SortKey) =>
    supplierSort.key === key ? (supplierSort.dir === 'asc' ? ' ▲' : ' ▼') : ''

  const showComparison = comparisonMode === 'comparison' && hasMultipleStores

  return (
    <MainContent title="カテゴリ分析" storeName={storeName}>
      <ToggleBar>
        <CurrencyUnitToggle />
      </ToggleBar>
      {/* 比較モード切替 */}
      {hasMultipleStores && (
        <ToggleBar>
          <ToggleLabel>表示モード:</ToggleLabel>
          <ChipGroup>
            <Chip $active={comparisonMode === 'total'} onClick={() => setComparisonMode('total')}>
              合計モード
            </Chip>
            <Chip
              $active={comparisonMode === 'comparison'}
              onClick={() => setComparisonMode('comparison')}
            >
              店舗間比較モード
            </Chip>
          </ChipGroup>
        </ToggleBar>
      )}

      {/* ── 合計モード ── */}
      {!showComparison && (
        <>
          {/* KPIサマリーカード */}
          <KpiRow>
            <KpiCard
              label="全体値入率"
              value={formatPercent(overallMarkupRate)}
              accent={palette.primary}
              onClick={() => handleExplain('averageMarkupRate')}
            />
            <KpiCard
              label="粗利額"
              value={formatCurrency(totalGrossProfit)}
              accent={sc.positive}
              onClick={
                r.invMethodGrossProfit != null
                  ? () => handleExplain('invMethodGrossProfit')
                  : undefined
              }
            />
            <KpiCard
              label="原価合計"
              value={formatCurrency(totalCatCost)}
              accent={palette.warningDark}
              onClick={() => handleExplain('purchaseCost')}
            />
            <KpiCard
              label="売価合計"
              value={formatCurrency(totalCatPrice)}
              accent={palette.blueDark}
              onClick={() => handleExplain('salesTotal')}
            />
          </KpiRow>

          {/* チャート（相乗積 + 構成比）— 統合カテゴリ */}
          <ChartErrorBoundary>
            {(() => {
              const chartItems: CategoryChartItem[] = categoryData.map((d) => ({
                label: d.label,
                cost: d.cost,
                price: d.price,
                markup: d.markup,
                color: d.color,
              }))
              return (
                <ChartGrid>
                  <CrossMultiplicationChart items={chartItems} />
                  <CompositionChart items={chartItems} />
                </ChartGrid>
              )
            })()}
          </ChartErrorBoundary>

          {/* ── カテゴリ明細テーブル ── */}
          <Section>
            <SectionHeader>
              <SectionTitle>カテゴリ明細</SectionTitle>
              <span style={{ fontSize: '0.7rem', color: palette.slate }}>
                標準カテゴリ + カスタムカテゴリの統合集計 / 相乗積合計 = 全体値入率
              </span>
            </SectionHeader>
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <Th>カテゴリ</Th>
                    <Th>原価</Th>
                    <Th>売価</Th>
                    <Th>値入額</Th>
                    <Th>値入率</Th>
                    <Th>構成比（原価）</Th>
                    <Th>売価構成比</Th>
                    <Th>相乗積</Th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const totalAbsCost = categoryData.reduce((s, c) => s + Math.abs(c.cost), 0)
                    const totalAbsPrice = categoryData.reduce((s, c) => s + Math.abs(c.price), 0)
                    const rows: React.ReactNode[] = []

                    for (const d of categoryData) {
                      const catKey = `${d.isCustom ? 'cc-' : ''}${d.category}`
                      const grossProfit = d.price - d.cost
                      const costShare = safeDivide(Math.abs(d.cost), totalAbsCost, 0)
                      const priceShare = safeDivide(Math.abs(d.price), totalAbsPrice, 0)
                      const isExpanded = expandedCategory === catKey
                      const hasStores = selectedResults.length > 0

                      rows.push(
                        <DrillTr
                          key={catKey}
                          $clickable={hasStores}
                          $expanded={isExpanded}
                          aria-expanded={hasStores ? isExpanded : undefined}
                          role={hasStores ? 'button' : undefined}
                          tabIndex={hasStores ? 0 : undefined}
                          onClick={() => {
                            if (!hasStores) return
                            setExpandedCategory(isExpanded ? null : catKey)
                            setExpandedStore(null)
                          }}
                          onKeyDown={(e: React.KeyboardEvent) => {
                            if (!hasStores) return
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setExpandedCategory(isExpanded ? null : catKey)
                              setExpandedStore(null)
                            }
                          }}
                        >
                          <Td>
                            {hasStores && <DrillToggle $expanded={isExpanded}>&#9654;</DrillToggle>}
                            <Badge $color={d.color} />
                            {d.label}
                          </Td>
                          <Td>{formatCurrency(d.cost)}</Td>
                          <Td>{formatCurrency(d.price)}</Td>
                          <GrossProfitCell $positive={grossProfit >= 0}>
                            {formatCurrency(grossProfit)}
                          </GrossProfitCell>
                          <MarkupCell $rate={d.markup}>{formatPercent(d.markup)}</MarkupCell>
                          <Td>{formatPercent(costShare)}</Td>
                          <Td>{formatPercent(priceShare)}</Td>
                          <Td>{formatPercent(d.crossMultiplication)}</Td>
                        </DrillTr>,
                      )

                      // 店舗別ドリルダウン行
                      if (isExpanded) {
                        for (const sr of selectedResults) {
                          const sName = stores.get(sr.storeId)?.name ?? sr.storeId
                          const pair = d.isCustom
                            ? (() => {
                                let c = 0,
                                  p = 0
                                for (const [, st] of sr.supplierTotals) {
                                  if (
                                    settings.supplierCategoryMap[st.supplierCode] === d.category
                                  ) {
                                    c += st.cost
                                    p += st.price
                                  }
                                }
                                return c !== 0 || p !== 0 ? { cost: c, price: p } : null
                              })()
                            : (sr.categoryTotals.get(d.category as CategoryType) ?? null)
                          if (!pair) continue
                          const sGP = pair.price - pair.cost
                          const sMarkup = safeDivide(sGP, pair.price, 0)
                          const storeKey = `${catKey}:${sr.storeId}`
                          const isStoreExpanded = expandedStore === storeKey

                          rows.push(
                            <DrillTr
                              key={storeKey}
                              $depth={1}
                              $catColor={d.color}
                              $clickable
                              $expanded={isStoreExpanded}
                              aria-expanded={isStoreExpanded}
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedStore(isStoreExpanded ? null : storeKey)
                              }}
                              onKeyDown={(e: React.KeyboardEvent) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setExpandedStore(isStoreExpanded ? null : storeKey)
                                }
                              }}
                            >
                              <Td>
                                <DrillLabel $depth={1}>
                                  <DrillToggle $expanded={isStoreExpanded}>&#9654;</DrillToggle>
                                  {sName}
                                </DrillLabel>
                              </Td>
                              <Td>{formatCurrency(pair.cost)}</Td>
                              <Td>{formatCurrency(pair.price)}</Td>
                              <GrossProfitCell $positive={sGP >= 0}>
                                {formatCurrency(sGP)}
                              </GrossProfitCell>
                              <MarkupCell $rate={sMarkup}>{formatPercent(sMarkup)}</MarkupCell>
                              <Td></Td>
                              <Td></Td>
                              <Td></Td>
                            </DrillTr>,
                          )

                          // 日別ドリルダウン行
                          if (isStoreExpanded) {
                            // カテゴリに属する取引先コードを特定
                            const catSuppliers = new Set<string>()
                            for (const [code, st] of sr.supplierTotals) {
                              if (d.isCustom) {
                                if (settings.supplierCategoryMap[st.supplierCode] === d.category)
                                  catSuppliers.add(code)
                              } else if (st.category === d.category) {
                                catSuppliers.add(code)
                              }
                            }

                            const dayEntries = Array.from(sr.daily.entries())
                              .sort(([a], [b]) => a - b)
                              .map(([day, rec]) => {
                                let dayCost = 0,
                                  dayPrice = 0
                                for (const [sup, sp] of rec.supplierBreakdown) {
                                  if (catSuppliers.has(sup)) {
                                    dayCost += sp.cost
                                    dayPrice += sp.price
                                  }
                                }
                                return { day, cost: dayCost, price: dayPrice }
                              })
                              .filter((e) => e.cost !== 0 || e.price !== 0)

                            for (const de of dayEntries) {
                              const dayGP = de.price - de.cost
                              const dayMarkup = safeDivide(dayGP, de.price, 0)
                              rows.push(
                                <DrillTr
                                  key={`${storeKey}:${de.day}`}
                                  $depth={2}
                                  $catColor={d.color}
                                >
                                  <Td>
                                    <DrillLabel $depth={2}>{de.day}日</DrillLabel>
                                  </Td>
                                  <Td>{formatCurrency(de.cost)}</Td>
                                  <Td>{formatCurrency(de.price)}</Td>
                                  <GrossProfitCell $positive={dayGP >= 0}>
                                    {formatCurrency(dayGP)}
                                  </GrossProfitCell>
                                  <MarkupCell $rate={dayMarkup}>
                                    {formatPercent(dayMarkup)}
                                  </MarkupCell>
                                  <Td></Td>
                                  <Td></Td>
                                  <Td></Td>
                                </DrillTr>,
                              )
                            }
                          }
                        }
                      }
                    }

                    rows.push(
                      <TrTotal key="total">
                        <Td>合計</Td>
                        <Td>{formatCurrency(totalCatCost)}</Td>
                        <Td>{formatCurrency(totalCatPrice)}</Td>
                        <Td>{formatCurrency(totalGrossProfit)}</Td>
                        <Td
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleExplain('averageMarkupRate')}
                          title="算出根拠を表示"
                        >
                          {formatPercent(overallMarkupRate)}
                        </Td>
                        <Td>{formatPercent(1)}</Td>
                        <Td>{formatPercent(1)}</Td>
                        <Td>
                          {formatPercent(
                            categoryData.reduce((s, c) => s + c.crossMultiplication, 0),
                          )}
                        </Td>
                      </TrTotal>,
                    )
                    return rows
                  })()}
                </tbody>
              </Table>
            </TableWrapper>
          </Section>

          {/* ── 取引先別集計テーブル ── */}
          {supplierData.length > 0 && (
            <Section>
              <SectionHeader>
                <SectionTitle>取引先別集計（{filteredSupplierData.length}件）</SectionTitle>
                <SupplierToolbar>
                  <SupplierFilterInput
                    type="text"
                    placeholder="取引先名 / コードで検索..."
                    value={supplierFilter}
                    onChange={(e) => setSupplierFilter(e.target.value)}
                  />
                </SupplierToolbar>
              </SectionHeader>
              <TableWrapper>
                <Table>
                  <thead>
                    <tr>
                      <Th>コード</Th>
                      <Th>取引先</Th>
                      <Th>
                        <SortButton onClick={() => toggleSort('cost')}>
                          原価{sortIcon('cost')}
                        </SortButton>
                      </Th>
                      <Th>
                        <SortButton onClick={() => toggleSort('price')}>
                          売価{sortIcon('price')}
                        </SortButton>
                      </Th>
                      <Th>
                        <SortButton onClick={() => toggleSort('grossProfit')}>
                          値入額{sortIcon('grossProfit')}
                        </SortButton>
                      </Th>
                      <Th>
                        <SortButton onClick={() => toggleSort('markup')}>
                          値入率{sortIcon('markup')}
                        </SortButton>
                      </Th>
                      <Th>
                        <SortButton onClick={() => toggleSort('priceShare')}>
                          売価構成比{sortIcon('priceShare')}
                        </SortButton>
                      </Th>
                      <Th>
                        <SortButton onClick={() => toggleSort('crossMult')}>
                          相乗積{sortIcon('crossMult')}
                        </SortButton>
                      </Th>
                      <Th>カテゴリ</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSupplierData.flatMap((s) => {
                      const supplierGP = s.price - s.cost
                      const supplierPriceShare = safeDivide(
                        Math.abs(s.price),
                        totalSupplierAbsPrice,
                        0,
                      )
                      const supplierCrossMult = safeDivide(s.price - s.cost, totalSupplierPrice, 0)
                      const assignedCategory = settings.supplierCategoryMap[s.supplierCode] as
                        | CustomCategory
                        | undefined
                      const isSupExpanded = expandedSupplier === s.supplierCode
                      const rows: React.ReactNode[] = []
                      rows.push(
                        <DrillTr
                          key={s.supplierCode}
                          $clickable={selectedResults.length > 0}
                          $expanded={isSupExpanded}
                          onClick={() => {
                            if (selectedResults.length === 0) return
                            setExpandedSupplier(isSupExpanded ? null : s.supplierCode)
                            setExpandedSupplierStore(null)
                          }}
                        >
                          <Td>{s.supplierCode}</Td>
                          <Td>
                            {selectedResults.length > 0 && (
                              <DrillToggle>{isSupExpanded ? '▾' : '▸'}</DrillToggle>
                            )}
                            {s.supplierName}
                          </Td>
                          <Td>{formatCurrency(s.cost)}</Td>
                          <Td>{formatCurrency(s.price)}</Td>
                          <GrossProfitCell $positive={supplierGP >= 0}>
                            {formatCurrency(supplierGP)}
                          </GrossProfitCell>
                          <MarkupCell $rate={s.markupRate}>
                            {formatPercent(s.markupRate)}
                          </MarkupCell>
                          <Td>{formatPercent(supplierPriceShare)}</Td>
                          <Td>{formatPercent(supplierCrossMult)}</Td>
                          <Td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <CategorySelect
                              value={assignedCategory ?? 'uncategorized'}
                              onChange={(e) =>
                                handleCustomCategoryChange(s.supplierCode, e.target.value)
                              }
                              style={{
                                borderLeft: `3px solid ${assignedCategory ? (isUserCategory(assignedCategory) ? '#14b8a6' : (CUSTOM_CATEGORY_COLORS[assignedCategory as PresetCategoryId] ?? '#94a3b8')) : '#94a3b8'}`,
                              }}
                            >
                              <option value="uncategorized">未分類</option>
                              {CUSTOM_CATEGORIES.map((cc) => (
                                <option key={cc.id} value={cc.id}>
                                  {cc.label}
                                </option>
                              ))}
                              {Object.entries(settings.userCategoryLabels ?? {}).map(
                                ([id, label]) => (
                                  <option key={id} value={id}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </CategorySelect>
                          </Td>
                        </DrillTr>,
                      )
                      // 店舗ドリルダウン
                      if (isSupExpanded) {
                        const catColor = assignedCategory
                          ? isUserCategory(assignedCategory)
                            ? '#14b8a6'
                            : (CUSTOM_CATEGORY_COLORS[assignedCategory as PresetCategoryId] ??
                              '#94a3b8')
                          : '#94a3b8'
                        for (const sr of selectedResults) {
                          const storeSupplier = sr.supplierTotals.get(s.supplierCode)
                          if (!storeSupplier) continue
                          const stGP = storeSupplier.price - storeSupplier.cost
                          const stMR = safeDivide(stGP, storeSupplier.price, 0)
                          const stKey = `${s.supplierCode}:${sr.storeId}`
                          const isStoreExpanded = expandedSupplierStore === stKey
                          const stName = stores.get(sr.storeId)?.name ?? sr.storeId
                          rows.push(
                            <DrillTr
                              key={stKey}
                              $depth={1}
                              $catColor={catColor}
                              $clickable
                              $expanded={isStoreExpanded}
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedSupplierStore(isStoreExpanded ? null : stKey)
                              }}
                            >
                              <Td></Td>
                              <Td>
                                <DrillLabel $depth={1}>
                                  <DrillToggle $expanded={isStoreExpanded}>&#9654;</DrillToggle>
                                  {stName}
                                </DrillLabel>
                              </Td>
                              <Td>{formatCurrency(storeSupplier.cost)}</Td>
                              <Td>{formatCurrency(storeSupplier.price)}</Td>
                              <GrossProfitCell $positive={stGP >= 0}>
                                {formatCurrency(stGP)}
                              </GrossProfitCell>
                              <MarkupCell $rate={stMR}>{formatPercent(stMR)}</MarkupCell>
                              <Td></Td>
                              <Td></Td>
                              <Td></Td>
                            </DrillTr>,
                          )
                          // 日別ドリルダウン
                          if (isStoreExpanded) {
                            const dailyEntries = Array.from(sr.daily.entries())
                              .filter(([, dr]) => {
                                const sup = dr.supplierBreakdown.get(s.supplierCode)
                                return sup && (sup.cost !== 0 || sup.price !== 0)
                              })
                              .sort(([a], [b]) => a - b)
                            for (const [day, dr] of dailyEntries) {
                              const sup = dr.supplierBreakdown.get(s.supplierCode)
                              if (!sup) continue
                              const dayGP = sup.price - sup.cost
                              const dayMR = safeDivide(dayGP, sup.price, 0)
                              rows.push(
                                <DrillTr key={`${stKey}:${day}`} $depth={2} $catColor={catColor}>
                                  <Td></Td>
                                  <Td>
                                    <DrillLabel $depth={2}>
                                      {settings.targetMonth}/{day}日
                                    </DrillLabel>
                                  </Td>
                                  <Td>{formatCurrency(sup.cost)}</Td>
                                  <Td>{formatCurrency(sup.price)}</Td>
                                  <GrossProfitCell $positive={dayGP >= 0}>
                                    {formatCurrency(dayGP)}
                                  </GrossProfitCell>
                                  <MarkupCell $rate={dayMR}>{formatPercent(dayMR)}</MarkupCell>
                                  <Td></Td>
                                  <Td></Td>
                                  <Td></Td>
                                </DrillTr>,
                              )
                            }
                          }
                        }
                      }
                      return rows
                    })}
                    <TrTotal>
                      <Td>合計（{filteredSupplierData.length}件）</Td>
                      <Td></Td>
                      <Td>{formatCurrency(totalSupplierCost)}</Td>
                      <Td>{formatCurrency(totalSupplierPrice)}</Td>
                      <Td>{formatCurrency(totalSupplierPrice - totalSupplierCost)}</Td>
                      <Td>
                        {formatPercent(
                          safeDivide(totalSupplierPrice - totalSupplierCost, totalSupplierPrice, 0),
                        )}
                      </Td>
                      <Td>{formatPercent(1)}</Td>
                      <Td>
                        {formatPercent(
                          safeDivide(totalSupplierPrice - totalSupplierCost, totalSupplierPrice, 0),
                        )}
                      </Td>
                      <Td></Td>
                    </TrTotal>
                  </tbody>
                </Table>
              </TableWrapper>
            </Section>
          )}
        </>
      )}

      {/* ── 店舗間比較モード ── */}
      {showComparison && (
        <>
          {/* 比較チャート */}
          <ChartErrorBoundary>
            <ChartGrid>
              <StoreComparisonCategoryBarChart
                selectedResults={selectedResults}
                storeNames={storeNames}
              />
              <StoreComparisonMarkupRadarChart
                selectedResults={selectedResults}
                storeNames={storeNames}
              />
            </ChartGrid>
          </ChartErrorBoundary>

          <Section>
            <SectionTitle>店舗間カテゴリ比較</SectionTitle>
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <Th>カテゴリ</Th>
                    {selectedResults.map((sr) => (
                      <Th key={`${sr.storeId}-cost`} colSpan={1}>
                        {sr.storeId} 原価
                      </Th>
                    ))}
                    {selectedResults.map((sr) => (
                      <Th key={`${sr.storeId}-price`} colSpan={1}>
                        {sr.storeId} 売価
                      </Th>
                    ))}
                    {selectedResults.map((sr) => (
                      <Th key={`${sr.storeId}-markup`} colSpan={1}>
                        {sr.storeId} 値入率
                      </Th>
                    ))}
                    {selectedResults.map((sr) => (
                      <Th key={`${sr.storeId}-cross`} colSpan={1}>
                        {sr.storeId} 相乗積
                      </Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CATEGORY_ORDER.filter((cat) =>
                    selectedResults.some((sr) => sr.categoryTotals.has(cat)),
                  ).map((cat) => (
                    <Tr key={cat}>
                      <Td>
                        <Badge $color={CATEGORY_COLORS[cat] ?? '#64748b'} />
                        {CATEGORY_LABELS[cat]}
                      </Td>
                      {selectedResults.map((sr) => {
                        const pair = sr.categoryTotals.get(cat)
                        return (
                          <Td key={`${sr.storeId}-cost`}>
                            {pair ? formatCurrency(pair.cost) : '-'}
                          </Td>
                        )
                      })}
                      {selectedResults.map((sr) => {
                        const pair = sr.categoryTotals.get(cat)
                        return (
                          <Td key={`${sr.storeId}-price`}>
                            {pair ? formatCurrency(pair.price) : '-'}
                          </Td>
                        )
                      })}
                      {selectedResults.map((sr) => {
                        const pair = sr.categoryTotals.get(cat)
                        const markup = pair ? safeDivide(pair.price - pair.cost, pair.price, 0) : 0
                        return (
                          <Td key={`${sr.storeId}-markup`}>{pair ? formatPercent(markup) : '-'}</Td>
                        )
                      })}
                      {selectedResults.map((sr) => {
                        const storeData = buildCategoryData(sr)
                        const found = storeData.find((d) => d.category === cat)
                        return (
                          <Td key={`${sr.storeId}-cross`}>
                            {found ? formatPercent(found.crossMultiplication) : '-'}
                          </Td>
                        )
                      })}
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          </Section>

          <Section>
            <SectionTitle>店舗間取引先比較</SectionTitle>
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <Th>取引先</Th>
                    <Th>コード</Th>
                    {selectedResults.map((sr) => (
                      <Th key={`${sr.storeId}-cost`}>{sr.storeId} 原価</Th>
                    ))}
                    {selectedResults.map((sr) => (
                      <Th key={`${sr.storeId}-price`}>{sr.storeId} 売価</Th>
                    ))}
                    {selectedResults.map((sr) => (
                      <Th key={`${sr.storeId}-markup`}>{sr.storeId} 値入率</Th>
                    ))}
                    {selectedResults.map((sr) => (
                      <Th key={`${sr.storeId}-cross`}>{sr.storeId} 相乗積</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Collect all unique supplier codes across stores
                    const allCodes = new Set<string>()
                    const supplierNames = new Map<string, string>()
                    selectedResults.forEach((sr) => {
                      sr.supplierTotals.forEach((st) => {
                        allCodes.add(st.supplierCode)
                        supplierNames.set(st.supplierCode, st.supplierName)
                      })
                    })
                    return Array.from(allCodes).map((code) => (
                      <Tr key={code}>
                        <Td>{supplierNames.get(code) ?? code}</Td>
                        <Td>{code}</Td>
                        {selectedResults.map((sr) => {
                          const st = sr.supplierTotals.get(code)
                          return (
                            <Td key={`${sr.storeId}-cost`}>{st ? formatCurrency(st.cost) : '-'}</Td>
                          )
                        })}
                        {selectedResults.map((sr) => {
                          const st = sr.supplierTotals.get(code)
                          return (
                            <Td key={`${sr.storeId}-price`}>
                              {st ? formatCurrency(st.price) : '-'}
                            </Td>
                          )
                        })}
                        {selectedResults.map((sr) => {
                          const st = sr.supplierTotals.get(code)
                          return (
                            <Td key={`${sr.storeId}-markup`}>
                              {st ? formatPercent(st.markupRate) : '-'}
                            </Td>
                          )
                        })}
                        {selectedResults.map((sr) => {
                          const st = sr.supplierTotals.get(code)
                          if (!st) {
                            return <Td key={`${sr.storeId}-cross`}>-</Td>
                          }
                          const storeTotalPrice = Array.from(sr.supplierTotals.values()).reduce(
                            (sum, s) => sum + s.price,
                            0,
                          )
                          const crossMult = safeDivide(st.price - st.cost, storeTotalPrice, 0)
                          return <Td key={`${sr.storeId}-cross`}>{formatPercent(crossMult)}</Td>
                        })}
                      </Tr>
                    ))
                  })()}
                </tbody>
              </Table>
            </TableWrapper>
          </Section>
        </>
      )}

      {/* 指標説明パネル */}
      {explainMetric && explanations.has(explainMetric) && (
        <MetricBreakdownPanel
          explanation={explanations.get(explainMetric)!}
          allExplanations={explanations}
          stores={dataStores}
          onClose={() => setExplainMetric(null)}
        />
      )}
    </MainContent>
  )
}
