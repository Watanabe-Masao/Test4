import { useState } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { Chip, ChipGroup } from '@/presentation/components/common'
import { useCalculation, useStoreSelection } from '@/application/hooks'
import { useAppState, useAppDispatch } from '@/application/context'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { safeDivide } from '@/domain/calculations/utils'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/constants/categories'
import type { CustomCategory } from '@/domain/models'
import { CUSTOM_CATEGORIES } from '@/domain/models'
import type { StoreResult } from '@/domain/models'
import type { CategoryType } from '@/domain/models'
import styled from 'styled-components'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useChartTheme } from '@/presentation/components/charts/chartTheme'

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`

const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const TableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const Th = styled.th`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  &:first-child { text-align: left; }
`

const Td = styled.td`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  &:first-child { text-align: left; font-weight: ${({ theme }) => theme.typography.fontWeight.semibold}; }
`

const Tr = styled.tr`
  &:hover { background: ${({ theme }) => theme.colors.bg4}; }
`

const Badge = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: ${({ theme }) => theme.spacing[3]};
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.text3};
`

const ToggleBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const ToggleLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const PieWrapper = styled.div`
  width: 100%;
  height: 360px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
`

const PieTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  padding-left: ${({ theme }) => theme.spacing[4]};
`

const CategorySelect = styled.select`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const CustomCategoryBadge = styled.span`
  display: inline-block;
  padding: ${({ theme }) => theme.spacing[0]} ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg4};
  color: ${({ theme }) => theme.colors.text2};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  margin-left: ${({ theme }) => theme.spacing[2]};
`

const CATEGORY_COLORS: Record<string, string> = {
  market: '#f59e0b', lfc: '#3b82f6', saladClub: '#22c55e', processed: '#a855f7',
  directDelivery: '#06b6d4', flowers: '#ec4899', directProduce: '#84cc16',
  consumables: '#ea580c', interStore: '#f43f5e', interDepartment: '#8b5cf6', other: '#64748b',
}

type ComparisonMode = 'total' | 'comparison'

/** 相乗積パイチャート */
function CrossMultiplicationPieChart({
  categoryTotals,
}: {
  categoryTotals: ReadonlyMap<CategoryType, { cost: number; price: number }>
}) {
  const ct = useChartTheme()

  const totalPrice = CATEGORY_ORDER.reduce((sum, cat) => {
    const pair = categoryTotals.get(cat)
    return sum + (pair ? Math.abs(pair.price) : 0)
  }, 0)

  const data = CATEGORY_ORDER
    .filter((cat) => {
      const pair = categoryTotals.get(cat)
      return pair && pair.price !== 0
    })
    .map((cat) => {
      const pair = categoryTotals.get(cat)!
      const priceShare = safeDivide(Math.abs(pair.price), totalPrice, 0)
      const markupRate = safeDivide(pair.price - pair.cost, pair.price, 0)
      const crossMult = priceShare * markupRate
      return {
        name: CATEGORY_LABELS[cat],
        value: Math.abs(crossMult),
        color: CATEGORY_COLORS[cat] ?? '#64748b',
      }
    })
    .filter((d) => d.value > 0)

  if (data.length === 0) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props
    const pct = Number(percent)
    if (pct < 0.03) return null
    const RADIAN = Math.PI / 180
    const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 1.25
    const x = Number(cx) + radius * Math.cos(-Number(midAngle) * RADIAN)
    const y = Number(cy) + radius * Math.sin(-Number(midAngle) * RADIAN)
    return (
      <text
        x={x}
        y={y}
        fill={ct.textSecondary}
        textAnchor={x > Number(cx) ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={ct.fontSize.xs}
        fontFamily={ct.fontFamily}
      >
        {String(name)} {(pct * 100).toFixed(1)}%
      </text>
    )
  }

  return (
    <PieWrapper>
      <PieTitle>カテゴリ別 相乗積構成</PieTitle>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="48%"
            outerRadius="70%"
            innerRadius="40%"
            dataKey="value"
            label={renderLabel}
            strokeWidth={2}
            stroke={ct.bg3}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: ct.bg2,
              border: `1px solid ${ct.grid}`,
              borderRadius: 8,
              fontSize: ct.fontSize.sm,
              fontFamily: ct.fontFamily,
              color: ct.text,
            }}
            formatter={(value) => [
              `${((value as number) * 100).toFixed(2)}%`,
              '相乗積',
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </PieWrapper>
  )
}

/** カテゴリ別データ生成ヘルパー */
function buildCategoryData(result: StoreResult) {
  const totalPrice = CATEGORY_ORDER.reduce((sum, cat) => {
    const pair = result.categoryTotals.get(cat)
    return sum + (pair ? Math.abs(pair.price) : 0)
  }, 0)

  return CATEGORY_ORDER
    .filter((cat) => result.categoryTotals.has(cat))
    .map((cat) => {
      const pair = result.categoryTotals.get(cat)!
      const markupRate = safeDivide(pair.price - pair.cost, pair.price, 0)
      const priceShare = safeDivide(Math.abs(pair.price), totalPrice, 0)
      const crossMultiplication = priceShare * markupRate
      return {
        category: cat,
        label: CATEGORY_LABELS[cat],
        cost: pair.cost,
        price: pair.price,
        markup: markupRate,
        priceShare,
        crossMultiplication,
        color: CATEGORY_COLORS[cat] ?? '#64748b',
      }
    })
}

export function CategoryPage() {
  const { isCalculated } = useCalculation()
  const { currentResult, selectedResults, storeName } = useStoreSelection()
  const appState = useAppState()
  const dispatch = useAppDispatch()
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('total')

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

  const totalSupplierPrice = supplierData.reduce((sum, s) => sum + Math.abs(s.price), 0)

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

      {/* 相乗積パイチャート */}
      {!showComparison && (
        <ChartGrid>
          <CrossMultiplicationPieChart categoryTotals={r.categoryTotals} />
        </ChartGrid>
      )}

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
                  {categoryData.map((d) => {
                    const totalCost = categoryData.reduce((s, c) => s + Math.abs(c.cost), 0)
                    const costShare = safeDivide(Math.abs(d.cost), totalCost, 0)
                    return (
                      <Tr key={d.category}>
                        <Td><Badge $color={d.color} />{d.label}</Td>
                        <Td>{formatCurrency(d.cost)}</Td>
                        <Td>{formatCurrency(d.price)}</Td>
                        <Td>{formatPercent(d.markup)}</Td>
                        <Td>{formatPercent(costShare)}</Td>
                        <Td>{formatPercent(d.priceShare)}</Td>
                        <Td>{formatPercent(d.crossMultiplication)}</Td>
                      </Tr>
                    )
                  })}
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
                      const supplierPriceShare = safeDivide(Math.abs(s.price), totalSupplierPrice, 0)
                      const supplierCrossMult = supplierPriceShare * s.markupRate
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
                            .reduce((sum, s) => sum + Math.abs(s.price), 0)
                          const priceShare = safeDivide(Math.abs(st.price), storeTotalPrice, 0)
                          const crossMult = priceShare * st.markupRate
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
