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
import type { StoreResult } from '@/domain/models'
import type { CategoryType } from '@/domain/models'
import styled from 'styled-components'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'
import { useChartTheme, toManYen, toComma } from '@/presentation/components/charts/chartTheme'

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
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

const TrTotal = styled.tr`
  background: ${({ theme }) => theme.colors.bg2};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
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

const PieToggle = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-left: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
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

const ChartWrapper = styled.div`
  width: 100%;
  height: 320px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
`

const ChartTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding-left: ${({ theme }) => theme.spacing[4]};
`

const CATEGORY_COLORS: Record<string, string> = {
  market: '#f59e0b', lfc: '#3b82f6', saladClub: '#22c55e', processed: '#a855f7',
  directDelivery: '#06b6d4', flowers: '#ec4899', directProduce: '#84cc16',
  consumables: '#ea580c', interStore: '#f43f5e', interDepartment: '#8b5cf6', other: '#64748b',
}

const CUSTOM_CATEGORY_COLORS: Record<string, string> = {
  '市場仕入': '#f59e0b',
  'LFC': '#3b82f6',
  'サラダ': '#22c55e',
  '加工品': '#a855f7',
  '消耗品': '#ea580c',
  '直伝': '#06b6d4',
  'その他': '#64748b',
}

type ComparisonMode = 'total' | 'comparison'
type PieMode = 'cost' | 'price'

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

/** 原価構成比 / 売価構成比 切替パイチャート */
function CompositionPieChart({
  categoryTotals,
}: {
  categoryTotals: ReadonlyMap<CategoryType, { cost: number; price: number }>
}) {
  const ct = useChartTheme()
  const [mode, setMode] = useState<PieMode>('cost')

  const total = CATEGORY_ORDER.reduce((sum, cat) => {
    const pair = categoryTotals.get(cat)
    if (!pair) return sum
    return sum + Math.abs(mode === 'cost' ? pair.cost : pair.price)
  }, 0)

  const data = CATEGORY_ORDER
    .filter((cat) => {
      const pair = categoryTotals.get(cat)
      return pair && (mode === 'cost' ? pair.cost : pair.price) !== 0
    })
    .map((cat) => {
      const pair = categoryTotals.get(cat)!
      const value = Math.abs(mode === 'cost' ? pair.cost : pair.price)
      return {
        name: CATEGORY_LABELS[cat],
        value,
        share: safeDivide(value, total, 0),
        color: CATEGORY_COLORS[cat] ?? '#64748b',
      }
    })

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
      <PieTitle>カテゴリ別 構成比</PieTitle>
      <PieToggle>
        <Chip $active={mode === 'cost'} onClick={() => setMode('cost')}>
          原価構成比
        </Chip>
        <Chip $active={mode === 'price'} onClick={() => setMode('price')}>
          売価構成比
        </Chip>
      </PieToggle>
      <ResponsiveContainer width="100%" height="80%">
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
              formatCurrency(value as number),
              mode === 'cost' ? '原価' : '売価',
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

/** カスタムカテゴリ集計データ生成 */
function buildCustomCategoryData(
  result: StoreResult,
  supplierCategoryMap: Readonly<Record<string, CustomCategory>>,
) {
  const aggregated = new Map<CustomCategory, { cost: number; price: number }>()

  for (const [, st] of result.supplierTotals) {
    const customCat = supplierCategoryMap[st.supplierCode]
    if (!customCat) continue
    const existing = aggregated.get(customCat) ?? { cost: 0, price: 0 }
    aggregated.set(customCat, {
      cost: existing.cost + st.cost,
      price: existing.price + st.price,
    })
  }

  const totalPrice = Array.from(aggregated.values()).reduce(
    (sum, v) => sum + Math.abs(v.price), 0,
  )

  return CUSTOM_CATEGORIES
    .filter((cc) => aggregated.has(cc))
    .map((cc) => {
      const pair = aggregated.get(cc)!
      const markupRate = safeDivide(pair.price - pair.cost, pair.price, 0)
      const priceShare = safeDivide(Math.abs(pair.price), totalPrice, 0)
      const crossMultiplication = priceShare * markupRate
      return {
        category: cc,
        label: cc,
        cost: pair.cost,
        price: pair.price,
        markup: markupRate,
        priceShare,
        crossMultiplication,
        color: CUSTOM_CATEGORY_COLORS[cc] ?? '#64748b',
      }
    })
}

/** 店舗間カテゴリ比較バーチャート */
function StoreComparisonCategoryBarChart({
  selectedResults,
  storeNames,
}: {
  selectedResults: StoreResult[]
  storeNames: Map<string, string>
}) {
  const ct = useChartTheme()
  const STORE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

  const data = CATEGORY_ORDER
    .filter((cat) => selectedResults.some((sr) => sr.categoryTotals.has(cat)))
    .map((cat) => {
      const entry: Record<string, string | number> = { name: CATEGORY_LABELS[cat] }
      selectedResults.forEach((sr) => {
        const name = storeNames.get(sr.storeId) ?? sr.storeId
        const pair = sr.categoryTotals.get(cat)
        entry[name] = pair ? Math.abs(pair.price) : 0
      })
      return entry
    })

  return (
    <ChartWrapper>
      <ChartTitle>店舗間 カテゴリ別売価比較</ChartTitle>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="name"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={toManYen}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: ct.bg2,
              border: `1px solid ${ct.grid}`,
              borderRadius: 8,
              fontSize: ct.fontSize.sm,
              fontFamily: ct.fontFamily,
              color: ct.text,
            }}
            formatter={(value: number | undefined, name: string | undefined) => [toComma(value ?? 0), name ?? '']}
          />
          <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
          {selectedResults.map((sr, i) => {
            const name = storeNames.get(sr.storeId) ?? sr.storeId
            return (
              <Bar
                key={sr.storeId}
                dataKey={name}
                fill={STORE_COLORS[i % STORE_COLORS.length]}
                fillOpacity={0.8}
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
            )
          })}
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

/** 店舗間値入率レーダーチャート */
function StoreComparisonMarkupRadarChart({
  selectedResults,
  storeNames,
}: {
  selectedResults: StoreResult[]
  storeNames: Map<string, string>
}) {
  const ct = useChartTheme()
  const STORE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

  const radarData = CATEGORY_ORDER
    .filter((cat) => selectedResults.some((sr) => sr.categoryTotals.has(cat)))
    .map((cat) => {
      const entry: Record<string, string | number> = { subject: CATEGORY_LABELS[cat] }
      selectedResults.forEach((sr) => {
        const name = storeNames.get(sr.storeId) ?? sr.storeId
        const pair = sr.categoryTotals.get(cat)
        const markup = pair ? safeDivide(pair.price - pair.cost, pair.price, 0) * 100 : 0
        entry[name] = markup
      })
      return entry
    })

  return (
    <ChartWrapper>
      <ChartTitle>店舗間 カテゴリ別値入率レーダー</ChartTitle>
      <ResponsiveContainer width="100%" height="85%">
        <RadarChart data={radarData} margin={{ top: 4, right: 30, left: 30, bottom: 4 }}>
          <PolarGrid stroke={ct.grid} strokeOpacity={0.4} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
          />
          <PolarRadiusAxis
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            tickFormatter={(v) => `${v}%`}
          />
          {selectedResults.map((sr, i) => {
            const name = storeNames.get(sr.storeId) ?? sr.storeId
            return (
              <Radar
                key={sr.storeId}
                name={name}
                dataKey={name}
                stroke={STORE_COLORS[i % STORE_COLORS.length]}
                fill={STORE_COLORS[i % STORE_COLORS.length]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            )
          })}
          <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
          <Tooltip
            contentStyle={{
              background: ct.bg2,
              border: `1px solid ${ct.grid}`,
              borderRadius: 8,
              fontSize: ct.fontSize.sm,
              fontFamily: ct.fontFamily,
              color: ct.text,
            }}
            formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, '']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

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

  const totalSupplierPrice = supplierData.reduce((sum, s) => sum + Math.abs(s.price), 0)

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

      {/* パイチャート（相乗積 + 構成比切替） */}
      {!showComparison && (
        <ChartGrid>
          <CrossMultiplicationPieChart categoryTotals={r.categoryTotals} />
          <CompositionPieChart categoryTotals={r.categoryTotals} />
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

          {/* カスタムカテゴリ集計 */}
          {customCategoryData.length > 0 && (
            <Section>
              <SectionTitle>カスタムカテゴリ別集計</SectionTitle>
              <TableWrapper>
                <Table>
                  <thead>
                    <tr>
                      <Th>カスタムカテゴリ</Th>
                      <Th>原価</Th>
                      <Th>売価</Th>
                      <Th>値入率</Th>
                      <Th>売価構成比</Th>
                      <Th>相乗積</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {customCategoryData.map((d) => {
                      return (
                        <Tr key={d.category}>
                          <Td><Badge $color={d.color} />{d.label}</Td>
                          <Td>{formatCurrency(d.cost)}</Td>
                          <Td>{formatCurrency(d.price)}</Td>
                          <Td>{formatPercent(d.markup)}</Td>
                          <Td>{formatPercent(d.priceShare)}</Td>
                          <Td>{formatPercent(d.crossMultiplication)}</Td>
                        </Tr>
                      )
                    })}
                    <TrTotal>
                      <Td>合計</Td>
                      <Td>{formatCurrency(customCategoryData.reduce((s, d) => s + d.cost, 0))}</Td>
                      <Td>{formatCurrency(customCategoryData.reduce((s, d) => s + d.price, 0))}</Td>
                      <Td>
                        {formatPercent(
                          safeDivide(
                            customCategoryData.reduce((s, d) => s + d.price, 0) -
                              customCategoryData.reduce((s, d) => s + d.cost, 0),
                            customCategoryData.reduce((s, d) => s + d.price, 0),
                            0,
                          ),
                        )}
                      </Td>
                      <Td>-</Td>
                      <Td>{formatPercent(customCategoryData.reduce((s, d) => s + d.crossMultiplication, 0))}</Td>
                    </TrTotal>
                  </tbody>
                </Table>
              </TableWrapper>
            </Section>
          )}

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
