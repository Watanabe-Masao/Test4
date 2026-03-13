/**
 * カテゴリ偏りランキングカード (L1: 判断)
 *
 * カテゴリ別の原価/売価を横棒ランキングで表示し、
 * 偏りの判断文を自動生成する。
 *
 * 表示項目:
 * - カテゴリ別金額（横棒グラフ、降順）
 * - 一言要約（上位 N 分類で X% を占める）
 * - 原価/売価切替タブ
 * - 合計金額
 */
import { useState, useMemo, memo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { useChartTheme, useCurrencyFormatter, toPct, toAxisYen } from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
import type { CostPricePair, CategoryType } from '@/domain/models'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/constants/categories'
import { palette } from '@/presentation/theme/tokens'
import {
  Wrapper,
  HeaderRow,
  Title,
  TabGroup,
  Tab,
  Subtitle,
  SummaryRow,
  SummaryItem,
} from './CategoryRankingCard.styles'

interface Props {
  categoryTotals: ReadonlyMap<CategoryType, CostPricePair>
  mode?: 'cost' | 'price'
}

interface RankItem {
  readonly name: string
  readonly value: number
  readonly share: number
}

interface RankData {
  readonly items: RankItem[]
  readonly total: number
  readonly topNShare: number
  readonly topNCount: number
}

function buildRankData(
  categoryTotals: ReadonlyMap<CategoryType, CostPricePair>,
  mode: 'cost' | 'price',
): RankData {
  const raw = CATEGORY_ORDER.map((cat) => {
    const pair = categoryTotals.get(cat) ?? { cost: 0, price: 0 }
    const value = Math.abs(mode === 'cost' ? pair.cost : pair.price)
    return { name: CATEGORY_LABELS[cat], value }
  })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const total = raw.reduce((sum, d) => sum + d.value, 0)
  const items: RankItem[] = raw.map((d) => ({
    ...d,
    share: total > 0 ? d.value / total : 0,
  }))

  // Calculate top-N share (N = min(3, items with share > 5%))
  const topNCount = Math.min(3, items.filter((d) => d.share >= 0.05).length || 1)
  const topNShare = items.slice(0, topNCount).reduce((sum, d) => sum + d.share, 0)

  return { items, total, topNShare, topNCount }
}

export const CategoryRankingCard = memo(function CategoryRankingCard({
  categoryTotals,
  mode: initialMode = 'cost',
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const [mode, setMode] = useState<'cost' | 'price'>(initialMode)

  const { items, total, topNShare, topNCount } = useMemo(
    () => buildRankData(categoryTotals, mode),
    [categoryTotals, mode],
  )

  if (items.length === 0) return null

  const subtitle = `上位${topNCount}分類で${mode === 'cost' ? '原価' : '売価'}の${toPct(topNShare, 0)}を占めています`

  return (
    <Wrapper aria-label="カテゴリ偏り">
      <HeaderRow>
        <Title>カテゴリ偏り</Title>
        <TabGroup>
          <Tab $active={mode === 'cost'} onClick={() => setMode('cost')}>
            原価
          </Tab>
          <Tab $active={mode === 'price'} onClick={() => setMode('price')}>
            売価
          </Tab>
        </TabGroup>
      </HeaderRow>
      <Subtitle>{subtitle}</Subtitle>

      <ResponsiveContainer width="100%" height={Math.max(200, items.length * 32 + 40)}>
        <BarChart
          data={items}
          layout="vertical"
          margin={{ top: 4, right: 60, left: 10, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.3} horizontal />
          <XAxis
            type="number"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={toAxisYen}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={70}
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
          />
          <Tooltip
            content={createChartTooltip({
              ct,
              formatter: (value: unknown) => [value != null ? fmt(Number(value)) : '-', null],
            })}
          />
          <Bar dataKey="value" name={mode === 'cost' ? '原価' : '売価'} barSize={20}>
            {items.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={palette.primary}
                fillOpacity={i < topNCount ? 1 : 0.45}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <SummaryRow>
        <SummaryItem>合計: {fmt(total)}</SummaryItem>
        <SummaryItem>分類数: {items.length}</SummaryItem>
      </SummaryRow>
    </Wrapper>
  )
})
