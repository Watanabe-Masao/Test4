import { useState, useMemo } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { Chip, ChipGroup, KpiCard } from '@/presentation/components/common'
import { useCalculation, useStoreSelection, useSettings } from '@/application/hooks'
import { useAppState } from '@/application/context'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { safeDivide } from '@/domain/calculations/utils'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/constants/categories'
import type { CustomCategory } from '@/domain/models'
import { CUSTOM_CATEGORIES } from '@/domain/models'
import {
  ChartGrid, Section, SectionTitle, TableWrapper, Table, Th, Td, Tr, TrTotal,
  Badge, EmptyState, ToggleBar, ToggleLabel, CategorySelect, CustomCategoryBadge,
  KpiRow, SortButton, MarkupCell, GrossProfitCell, SectionHeader,
  SupplierFilterInput, SupplierToolbar,
} from './CategoryPage.styles'
import { CrossMultiplicationChart, CompositionChart } from './CategoryCharts'
import {
  StoreComparisonCategoryBarChart,
  StoreComparisonMarkupRadarChart,
} from './CategoryComparisonCharts'
import type { ComparisonMode, CategoryChartItem } from './categoryData'
import { CATEGORY_COLORS, buildCategoryData, buildCustomCategoryData } from './categoryData'

type SortKey = 'label' | 'cost' | 'price' | 'grossProfit' | 'markup' | 'costShare' | 'priceShare' | 'crossMult'
type SortDir = 'asc' | 'desc'

export function CategoryPage() {
  const { isCalculated } = useCalculation()
  const { currentResult, selectedResults, storeName, stores } = useStoreSelection()
  const appState = useAppState()
  const { updateSettings } = useSettings()
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('total')
  const [supplierSort, setSupplierSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'cost', dir: 'desc' })
  const [supplierFilter, setSupplierFilter] = useState('')

  // Build store name map for comparison charts (must be before early return)
  const storeNames = useMemo(() => {
    const map = new Map<string, string>()
    selectedResults.forEach((sr) => {
      map.set(sr.storeId, stores.get(sr.storeId)?.name ?? sr.storeId)
    })
    return map
  }, [selectedResults, stores])

  if (!isCalculated || !currentResult) {
    return (
      <MainContent title="カテゴリ分析" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const r = currentResult
  const hasMultipleStores = selectedResults.length > 1

  // カテゴリ別データ（標準カテゴリ）
  const categoryData = buildCategoryData(r)

  // 取引先別データ
  const supplierData = Array.from(r.supplierTotals.values())
  const totalSupplierPrice = supplierData.reduce((sum, s) => sum + s.price, 0)
  const totalSupplierAbsPrice = supplierData.reduce((sum, s) => sum + Math.abs(s.price), 0)
  const totalSupplierCost = supplierData.reduce((sum, s) => sum + s.cost, 0)

  // カスタムカテゴリ集計データ
  const customCategoryData = buildCustomCategoryData(r, appState.settings.supplierCategoryMap)

  // --- KPIサマリー ---
  const totalCatCost = categoryData.reduce((s, c) => s + c.cost, 0)
  const totalCatPrice = categoryData.reduce((s, c) => s + c.price, 0)
  const totalGrossProfit = totalCatPrice - totalCatCost
  const overallMarkupRate = safeDivide(totalGrossProfit, totalCatPrice, 0)

  const handleCustomCategoryChange = (supplierCode: string, newCategory: CustomCategory) => {
    const currentMap = appState.settings.supplierCategoryMap
    updateSettings({
      supplierCategoryMap: { ...currentMap, [supplierCode]: newCategory },
    })
  }

  // --- 取引先ソート ---
  const toggleSort = (key: SortKey) => {
    setSupplierSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' },
    )
  }

  const sortIcon = (key: SortKey) =>
    supplierSort.key === key ? (supplierSort.dir === 'asc' ? ' ▲' : ' ▼') : ''

  const filteredSupplierData = useMemo(() => {
    let list = supplierData
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
        case 'cost': va = a.cost; vb = b.cost; break
        case 'price': va = a.price; vb = b.price; break
        case 'grossProfit': va = a.price - a.cost; vb = b.price - b.cost; break
        case 'markup': va = a.markupRate; vb = b.markupRate; break
        case 'priceShare':
          va = safeDivide(Math.abs(a.price), totalSupplierAbsPrice, 0)
          vb = safeDivide(Math.abs(b.price), totalSupplierAbsPrice, 0)
          break
        case 'crossMult':
          va = safeDivide(a.price - a.cost, totalSupplierPrice, 0)
          vb = safeDivide(b.price - b.cost, totalSupplierPrice, 0)
          break
        default: va = a.cost; vb = b.cost
      }
      return dir === 'asc' ? va - vb : vb - va
    })
    return sorted
  }, [supplierData, supplierSort, supplierFilter, totalSupplierAbsPrice, totalSupplierPrice])

  const showComparison = comparisonMode === 'comparison' && hasMultipleStores

  return (
    <MainContent title="カテゴリ分析" storeName={storeName}>
      {/* 比較モード切替 */}
      {hasMultipleStores && (
        <ToggleBar>
          <ToggleLabel>表示モード:</ToggleLabel>
          <ChipGroup>
            <Chip
              $active={comparisonMode === 'total'}
              onClick={() => setComparisonMode('total')}
            >
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
            <KpiCard label="全体値入率" value={formatPercent(overallMarkupRate)} accent="#6366f1" />
            <KpiCard label="粗利額" value={formatCurrency(totalGrossProfit)} accent="#22c55e" />
            <KpiCard label="原価合計" value={formatCurrency(totalCatCost)} accent="#f59e0b" />
            <KpiCard label="売価合計" value={formatCurrency(totalCatPrice)} accent="#3b82f6" />
          </KpiRow>

          {/* チャート（相乗積 + 構成比）— 標準カテゴリのみ */}
          {(() => {
            const chartItems: CategoryChartItem[] = categoryData.map((d) => ({
              label: d.label, cost: d.cost, price: d.price, markup: d.markup, color: d.color,
            }))
            return (
              <ChartGrid>
                <CrossMultiplicationChart items={chartItems} />
                <CompositionChart items={chartItems} />
              </ChartGrid>
            )
          })()}

          {/* ── カテゴリ別集計テーブル ── */}
          <Section>
            <SectionHeader>
              <SectionTitle>カテゴリ別集計</SectionTitle>
              <span style={{ fontSize: '0.7rem', color: '#888' }}>
                相乗積合計 = 全体値入率
              </span>
            </SectionHeader>
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <Th>カテゴリ</Th>
                    <Th>原価</Th>
                    <Th>売価</Th>
                    <Th>粗利額</Th>
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
                    return (
                      <>
                        {categoryData.map((d) => {
                          const grossProfit = d.price - d.cost
                          const costShare = safeDivide(Math.abs(d.cost), totalAbsCost, 0)
                          const priceShare = safeDivide(Math.abs(d.price), totalAbsPrice, 0)
                          return (
                            <Tr key={d.category}>
                              <Td><Badge $color={d.color} />{d.label}</Td>
                              <Td>{formatCurrency(d.cost)}</Td>
                              <Td>{formatCurrency(d.price)}</Td>
                              <GrossProfitCell $positive={grossProfit >= 0}>
                                {formatCurrency(grossProfit)}
                              </GrossProfitCell>
                              <MarkupCell $rate={d.markup}>{formatPercent(d.markup)}</MarkupCell>
                              <Td>{formatPercent(costShare)}</Td>
                              <Td>{formatPercent(priceShare)}</Td>
                              <Td>{formatPercent(d.crossMultiplication)}</Td>
                            </Tr>
                          )
                        })}
                        <TrTotal>
                          <Td>合計</Td>
                          <Td>{formatCurrency(totalCatCost)}</Td>
                          <Td>{formatCurrency(totalCatPrice)}</Td>
                          <Td>{formatCurrency(totalGrossProfit)}</Td>
                          <Td>{formatPercent(overallMarkupRate)}</Td>
                          <Td>{formatPercent(1)}</Td>
                          <Td>{formatPercent(1)}</Td>
                          <Td>{formatPercent(categoryData.reduce((s, c) => s + c.crossMultiplication, 0))}</Td>
                        </TrTotal>
                      </>
                    )
                  })()}
                </tbody>
              </Table>
            </TableWrapper>
          </Section>

          {/* ── カスタムカテゴリ集計テーブル（独立） ── */}
          {customCategoryData.length > 0 && (
            <Section>
              <SectionHeader>
                <SectionTitle>カスタムカテゴリ集計</SectionTitle>
                <span style={{ fontSize: '0.7rem', color: '#888' }}>
                  取引先を独自グルーピングした集計
                </span>
              </SectionHeader>
              <TableWrapper>
                <Table>
                  <thead>
                    <tr>
                      <Th>カテゴリ</Th>
                      <Th>原価</Th>
                      <Th>売価</Th>
                      <Th>粗利額</Th>
                      <Th>値入率</Th>
                      <Th>構成比（原価）</Th>
                      <Th>売価構成比</Th>
                      <Th>相乗積</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const ccTotalCost = customCategoryData.reduce((s, c) => s + c.cost, 0)
                      const ccTotalPrice = customCategoryData.reduce((s, c) => s + c.price, 0)
                      const ccTotalAbsCost = customCategoryData.reduce((s, c) => s + Math.abs(c.cost), 0)
                      const ccTotalAbsPrice = customCategoryData.reduce((s, c) => s + Math.abs(c.price), 0)
                      const ccTotalGP = ccTotalPrice - ccTotalCost
                      const ccOverallMarkup = safeDivide(ccTotalGP, ccTotalPrice, 0)
                      return (
                        <>
                          {customCategoryData.map((d) => {
                            const grossProfit = d.price - d.cost
                            const costShare = safeDivide(Math.abs(d.cost), ccTotalAbsCost, 0)
                            const priceShare = safeDivide(Math.abs(d.price), ccTotalAbsPrice, 0)
                            return (
                              <Tr key={`custom-${d.category}`}>
                                <Td><Badge $color={d.color} />{d.label}</Td>
                                <Td>{formatCurrency(d.cost)}</Td>
                                <Td>{formatCurrency(d.price)}</Td>
                                <GrossProfitCell $positive={grossProfit >= 0}>
                                  {formatCurrency(grossProfit)}
                                </GrossProfitCell>
                                <MarkupCell $rate={d.markup}>{formatPercent(d.markup)}</MarkupCell>
                                <Td>{formatPercent(costShare)}</Td>
                                <Td>{formatPercent(priceShare)}</Td>
                                <Td>{formatPercent(d.crossMultiplication)}</Td>
                              </Tr>
                            )
                          })}
                          <TrTotal>
                            <Td>合計</Td>
                            <Td>{formatCurrency(ccTotalCost)}</Td>
                            <Td>{formatCurrency(ccTotalPrice)}</Td>
                            <Td>{formatCurrency(ccTotalGP)}</Td>
                            <Td>{formatPercent(ccOverallMarkup)}</Td>
                            <Td>{formatPercent(1)}</Td>
                            <Td>{formatPercent(1)}</Td>
                            <Td>{formatPercent(customCategoryData.reduce((s, c) => s + c.crossMultiplication, 0))}</Td>
                          </TrTotal>
                        </>
                      )
                    })()}
                  </tbody>
                </Table>
              </TableWrapper>
            </Section>
          )}

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
                      <Th>取引先</Th>
                      <Th>コード</Th>
                      <Th>カスタムカテゴリ</Th>
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
                          粗利額{sortIcon('grossProfit')}
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
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSupplierData.map((s) => {
                      const supplierGP = s.price - s.cost
                      const supplierPriceShare = safeDivide(Math.abs(s.price), totalSupplierAbsPrice, 0)
                      const supplierCrossMult = safeDivide(s.price - s.cost, totalSupplierPrice, 0)
                      const assignedCategory = appState.settings.supplierCategoryMap[s.supplierCode] as
                        | CustomCategory
                        | undefined
                      return (
                        <Tr key={s.supplierCode}>
                          <Td>
                            {s.supplierName}
                            {assignedCategory && (
                              <CustomCategoryBadge>{assignedCategory}</CustomCategoryBadge>
                            )}
                          </Td>
                          <Td>{s.supplierCode}</Td>
                          <Td style={{ textAlign: 'center' }}>
                            <CategorySelect
                              value={assignedCategory ?? ''}
                              onChange={(e) =>
                                handleCustomCategoryChange(
                                  s.supplierCode,
                                  e.target.value as CustomCategory,
                                )
                              }
                            >
                              <option value="">--</option>
                              {CUSTOM_CATEGORIES.map((cc) => (
                                <option key={cc} value={cc}>
                                  {cc}
                                </option>
                              ))}
                            </CategorySelect>
                          </Td>
                          <Td>{formatCurrency(s.cost)}</Td>
                          <Td>{formatCurrency(s.price)}</Td>
                          <GrossProfitCell $positive={supplierGP >= 0}>
                            {formatCurrency(supplierGP)}
                          </GrossProfitCell>
                          <MarkupCell $rate={s.markupRate}>{formatPercent(s.markupRate)}</MarkupCell>
                          <Td>{formatPercent(supplierPriceShare)}</Td>
                          <Td>{formatPercent(supplierCrossMult)}</Td>
                        </Tr>
                      )
                    })}
                    <TrTotal>
                      <Td>合計（{filteredSupplierData.length}件）</Td>
                      <Td></Td>
                      <Td></Td>
                      <Td>{formatCurrency(totalSupplierCost)}</Td>
                      <Td>{formatCurrency(totalSupplierPrice)}</Td>
                      <Td>{formatCurrency(totalSupplierPrice - totalSupplierCost)}</Td>
                      <Td>
                        {formatPercent(safeDivide(totalSupplierPrice - totalSupplierCost, totalSupplierPrice, 0))}
                      </Td>
                      <Td>{formatPercent(1)}</Td>
                      <Td>
                        {formatPercent(safeDivide(totalSupplierPrice - totalSupplierCost, totalSupplierPrice, 0))}
                      </Td>
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

          <Section>
            <SectionTitle>店舗間カテゴリ比較</SectionTitle>
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <Th>カテゴリ</Th>
                    {selectedResults.map((sr) => (
                      <Th key={`${sr.storeId}-cost`} colSpan={1}>{sr.storeId} 原価</Th>
                    ))}
                    {selectedResults.map((sr) => (
                      <Th key={`${sr.storeId}-price`} colSpan={1}>{sr.storeId} 売価</Th>
                    ))}
                    {selectedResults.map((sr) => (
                      <Th key={`${sr.storeId}-markup`} colSpan={1}>{sr.storeId} 値入率</Th>
                    ))}
                    {selectedResults.map((sr) => (
                      <Th key={`${sr.storeId}-cross`} colSpan={1}>{sr.storeId} 相乗積</Th>
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
                        const markup = pair
                          ? safeDivide(pair.price - pair.cost, pair.price, 0)
                          : 0
                        return (
                          <Td key={`${sr.storeId}-markup`}>
                            {pair ? formatPercent(markup) : '-'}
                          </Td>
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
                            <Td key={`${sr.storeId}-cost`}>
                              {st ? formatCurrency(st.cost) : '-'}
                            </Td>
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
                          const storeTotalPrice = Array.from(sr.supplierTotals.values())
                            .reduce((sum, s) => sum + s.price, 0)
                          const crossMult = safeDivide(st.price - st.cost, storeTotalPrice, 0)
                          return (
                            <Td key={`${sr.storeId}-cross`}>
                              {formatPercent(crossMult)}
                            </Td>
                          )
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
    </MainContent>
  )
}
