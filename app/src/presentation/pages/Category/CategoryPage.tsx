import { useState, useMemo } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { Chip, ChipGroup } from '@/presentation/components/common'
import { useCalculation, useStoreSelection } from '@/application/hooks'
import { useAppState, useAppDispatch } from '@/application/context'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { safeDivide } from '@/domain/calculations/utils'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/constants/categories'
import type { CustomCategory } from '@/domain/models'
import { CUSTOM_CATEGORIES } from '@/domain/models'
import {
  ChartGrid, Section, SectionTitle, TableWrapper, Table, Th, Td, Tr, TrTotal,
  Badge, EmptyState, ToggleBar, ToggleLabel, CategorySelect, CustomCategoryBadge,
} from './CategoryPage.styles'
import { CrossMultiplicationChart, CompositionChart } from './CategoryCharts'
import {
  StoreComparisonCategoryBarChart,
  StoreComparisonMarkupRadarChart,
} from './CategoryComparisonCharts'
import type { ComparisonMode, CategoryChartItem } from './categoryData'
import { CATEGORY_COLORS, buildCategoryData, buildCustomCategoryData } from './categoryData'

export function CategoryPage() {
  const { isCalculated } = useCalculation()
  const { currentResult, selectedResults, storeName, stores } = useStoreSelection()
  const appState = useAppState()
  const dispatch = useAppDispatch()
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('total')

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

  // カテゴリ別データ
  const categoryData = buildCategoryData(r)

  // 取引先別データ
  const supplierData = Array.from(r.supplierTotals.values())
    .sort((a, b) => b.cost - a.cost)

  const totalSupplierPrice = supplierData.reduce((sum, s) => sum + s.price, 0)
  const totalSupplierAbsPrice = supplierData.reduce((sum, s) => sum + Math.abs(s.price), 0)

  // カスタムカテゴリ集計データ
  const customCategoryData = buildCustomCategoryData(r, appState.settings.supplierCategoryMap)

  const handleCustomCategoryChange = (supplierCode: string, newCategory: CustomCategory) => {
    const currentMap = appState.settings.supplierCategoryMap
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        supplierCategoryMap: { ...currentMap, [supplierCode]: newCategory },
      },
    })
  }

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

      {/* チャート（相乗積 + 構成比） */}
      {!showComparison && (() => {
        const allChartItems: CategoryChartItem[] = [
          ...categoryData.map((d) => ({ label: d.label, cost: d.cost, price: d.price, markup: d.markup, color: d.color })),
          ...customCategoryData.map((d) => ({ label: d.label, cost: d.cost, price: d.price, markup: d.markup, color: d.color })),
        ]
        return (
          <ChartGrid>
            <CrossMultiplicationChart items={allChartItems} />
            <CompositionChart items={allChartItems} />
          </ChartGrid>
        )
      })()}

      {/* ── 合計モード ── */}
      {!showComparison && (
        <>
          <Section>
            <SectionTitle>カテゴリ別集計</SectionTitle>
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <Th>カテゴリ</Th>
                    <Th>原価</Th>
                    <Th>売価</Th>
                    <Th>値入率</Th>
                    <Th>構成比（原価）</Th>
                    <Th>売価構成比</Th>
                    <Th>相乗積</Th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const allData = [...categoryData, ...customCategoryData]
                    const totalCost = allData.reduce((s, c) => s + Math.abs(c.cost), 0)
                    const totalAbsPrice = allData.reduce((s, c) => s + Math.abs(c.price), 0)
                    // 相乗積用: 実際の売価合計（Math.absなし）
                    const totalActualPrice = allData.reduce((s, c) => s + c.price, 0)
                    return (
                      <>
                        {categoryData.map((d) => {
                          const costShare = safeDivide(Math.abs(d.cost), totalCost, 0)
                          const priceShare = safeDivide(Math.abs(d.price), totalAbsPrice, 0)
                          const crossMult = safeDivide(d.price - d.cost, totalActualPrice, 0)
                          return (
                            <Tr key={d.category}>
                              <Td><Badge $color={d.color} />{d.label}</Td>
                              <Td>{formatCurrency(d.cost)}</Td>
                              <Td>{formatCurrency(d.price)}</Td>
                              <Td>{formatPercent(d.markup)}</Td>
                              <Td>{formatPercent(costShare)}</Td>
                              <Td>{formatPercent(priceShare)}</Td>
                              <Td>{formatPercent(crossMult)}</Td>
                            </Tr>
                          )
                        })}
                        {customCategoryData.map((d) => {
                          const costShare = safeDivide(Math.abs(d.cost), totalCost, 0)
                          const priceShare = safeDivide(Math.abs(d.price), totalAbsPrice, 0)
                          const crossMult = safeDivide(d.price - d.cost, totalActualPrice, 0)
                          return (
                            <Tr key={`custom-${d.category}`}>
                              <Td><Badge $color={d.color} />{d.label}</Td>
                              <Td>{formatCurrency(d.cost)}</Td>
                              <Td>{formatCurrency(d.price)}</Td>
                              <Td>{formatPercent(d.markup)}</Td>
                              <Td>{formatPercent(costShare)}</Td>
                              <Td>{formatPercent(priceShare)}</Td>
                              <Td>{formatPercent(crossMult)}</Td>
                            </Tr>
                          )
                        })}
                        <TrTotal>
                          <Td>合計</Td>
                          <Td>{formatCurrency(allData.reduce((s, c) => s + c.cost, 0))}</Td>
                          <Td>{formatCurrency(allData.reduce((s, c) => s + c.price, 0))}</Td>
                          <Td>
                            {formatPercent(
                              safeDivide(
                                allData.reduce((s, c) => s + c.price, 0) -
                                  allData.reduce((s, c) => s + c.cost, 0),
                                allData.reduce((s, c) => s + c.price, 0),
                                0,
                              ),
                            )}
                          </Td>
                          <Td>-</Td>
                          <Td>-</Td>
                          <Td>{formatPercent(allData.reduce((s, c) => s + c.crossMultiplication, 0))}</Td>
                        </TrTotal>
                      </>
                    )
                  })()}
                </tbody>
              </Table>
            </TableWrapper>
          </Section>

          {supplierData.length > 0 && (
            <Section>
              <SectionTitle>取引先別集計</SectionTitle>
              <TableWrapper>
                <Table>
                  <thead>
                    <tr>
                      <Th>取引先</Th>
                      <Th>コード</Th>
                      <Th>カスタムカテゴリ</Th>
                      <Th>原価</Th>
                      <Th>売価</Th>
                      <Th>値入率</Th>
                      <Th>売価構成比</Th>
                      <Th>相乗積</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierData.map((s) => {
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
                          <Td>{formatPercent(s.markupRate)}</Td>
                          <Td>{formatPercent(supplierPriceShare)}</Td>
                          <Td>{formatPercent(supplierCrossMult)}</Td>
                        </Tr>
                      )
                    })}
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
