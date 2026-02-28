/**
 * DuckDB カテゴリ構成比推移チャート
 *
 * DuckDB の週次カテゴリ構成比クエリを使い、カテゴリ別売上構成比の
 * 週次推移を積み上げ面グラフで表示する。
 *
 * 表示項目:
 * - 週次カテゴリ別売上構成比の積み上げ面グラフ
 * - 階層レベル切替（部門/ライン/クラス）
 * - 構成比シフトの大きいカテゴリのハイライト
 */
import { useMemo, useState, useCallback } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  useDuckDBCategoryMixWeekly,
  type CategoryMixWeeklyRow,
} from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, toPct } from './chartTheme'
import { palette } from '@/presentation/theme/tokens'
import { useI18n } from '@/application/hooks/useI18n'

// ── styled-components ──

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const Subtitle = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const ControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`

const ChipGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
`

const ChipLabel = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-right: ${({ theme }) => theme.spacing[1]};
`

const Chip = styled.button<{ $active: boolean }>`
  padding: 2px 8px;
  font-size: 0.6rem;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.2)'
        : 'rgba(99,102,241,0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
`

const ShiftCard = styled.div<{ $positive: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ $positive, theme }) =>
    $positive
      ? theme.mode === 'dark'
        ? 'rgba(34,197,94,0.12)'
        : 'rgba(34,197,94,0.06)'
      : theme.mode === 'dark'
        ? 'rgba(239,68,68,0.12)'
        : 'rgba(239,68,68,0.06)'};
  border-left: 3px solid ${({ $positive }) => ($positive ? '#22c55e' : '#ef4444')};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.6rem;
`

const ShiftName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text2};
`

const ShiftValue = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
`

const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`

// ── Constants ──

/** カテゴリ区別用の色配列 */
const CATEGORY_COLORS = [
  palette.primary,
  palette.successDark,
  palette.warningDark,
  palette.dangerDark,
  palette.cyanDark,
  palette.pinkDark,
  palette.purpleDark,
  palette.orangeDark,
  palette.blueDark,
  palette.limeDark,
] as const

type HierarchyLevel = 'department' | 'line' | 'klass'

const LEVEL_LABELS: Record<HierarchyLevel, string> = {
  department: '部門',
  line: 'ライン',
  klass: 'クラス',
}

// ── Types ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

interface ChartDataPoint {
  readonly week: string
  readonly [categoryCode: string]: string | number
}

interface CategoryMeta {
  readonly code: string
  readonly name: string
  readonly avgShare: number
  readonly latestShift: number | null
}

interface MixChartData {
  readonly chartData: ChartDataPoint[]
  readonly categories: CategoryMeta[]
  readonly topGainer: CategoryMeta | null
  readonly topLoser: CategoryMeta | null
}

// ── Data transformation ──

function buildMixChartData(rows: readonly CategoryMixWeeklyRow[]): MixChartData {
  // Collect unique category codes in order of total share
  const categoryShareTotals = new Map<string, { name: string; shareSum: number; count: number }>()

  for (const row of rows) {
    const existing = categoryShareTotals.get(row.code) ?? {
      name: row.name,
      shareSum: 0,
      count: 0,
    }
    existing.shareSum += row.sharePct
    existing.count += 1
    categoryShareTotals.set(row.code, existing)
  }

  // Sorted by average share descending
  const sortedCats = [...categoryShareTotals.entries()]
    .map(([code, info]) => ({
      code,
      name: info.name,
      avgShare: info.count > 0 ? info.shareSum / info.count : 0,
    }))
    .sort((a, b) => b.avgShare - a.avgShare)

  // Build per-week data points
  const weekMap = new Map<string, Record<string, number>>()
  const weekOrder: string[] = []

  for (const row of rows) {
    const weekLabel = row.weekStart.slice(5) // MM-DD
    if (!weekMap.has(weekLabel)) {
      weekMap.set(weekLabel, {})
      weekOrder.push(weekLabel)
    }
    const weekData = weekMap.get(weekLabel)!
    weekData[row.code] = row.sharePct
  }

  const chartData: ChartDataPoint[] = weekOrder.map((week) => {
    const data = weekMap.get(week)!
    const point: Record<string, string | number> = { week }
    for (const cat of sortedCats) {
      point[cat.code] = data[cat.code] ?? 0
    }
    return point as ChartDataPoint
  })

  // Find latest week shifts for each category
  const latestShiftMap = new Map<string, number | null>()
  for (const row of rows) {
    const weekLabel = row.weekStart.slice(5)
    if (weekLabel === weekOrder[weekOrder.length - 1]) {
      latestShiftMap.set(row.code, row.shareShift)
    }
  }

  const categories: CategoryMeta[] = sortedCats.map((cat) => ({
    code: cat.code,
    name: cat.name,
    avgShare: cat.avgShare,
    latestShift: latestShiftMap.get(cat.code) ?? null,
  }))

  // Find top gainer and top loser
  const withShifts = categories.filter((c) => c.latestShift != null)
  const topGainer = withShifts.reduce<CategoryMeta | null>(
    (best, c) => (!best || (c.latestShift ?? 0) > (best.latestShift ?? 0) ? c : best),
    null,
  )
  const topLoser = withShifts.reduce<CategoryMeta | null>(
    (best, c) => (!best || (c.latestShift ?? 0) < (best.latestShift ?? 0) ? c : best),
    null,
  )

  return { chartData, categories, topGainer, topLoser }
}

// ── Tooltip formatter ──

interface TooltipPayloadItem {
  readonly name: string
  readonly value: number
  readonly color: string
}

interface CustomTooltipProps {
  readonly active?: boolean
  readonly label?: string
  readonly payload?: readonly TooltipPayloadItem[]
  readonly categories: readonly CategoryMeta[]
  readonly ct: ReturnType<typeof useChartTheme>
}

function MixTooltip({ active, label, payload, categories, ct }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div
      style={{
        background: ct.bg2,
        border: `1px solid ${ct.grid}`,
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: ct.fontSize.sm,
        fontFamily: ct.fontFamily,
        color: ct.text,
      }}
    >
      <div style={{ marginBottom: 4, fontWeight: 600 }}>週: {label}</div>
      {payload
        .filter((p) => p.value > 0)
        .sort((a, b) => b.value - a.value)
        .map((p) => {
          const cat = categories.find((c) => c.code === p.name)
          const catName = cat ? cat.name : p.name
          const shift = cat?.latestShift
          const shiftLabel =
            shift != null ? ` (${shift >= 0 ? '+' : ''}${toPct(shift / 100, 1)})` : ''
          return (
            <div key={p.name} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: p.color,
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              <span>
                {catName}: {toPct(p.value / 100, 1)}
                {shiftLabel}
              </span>
            </div>
          )
        })}
    </div>
  )
}

// ── Component ──

export function DuckDBCategoryMixChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const { messages } = useI18n()

  const [level, setLevel] = useState<HierarchyLevel>('department')

  const handleLevelChange = useCallback((newLevel: HierarchyLevel) => {
    setLevel(newLevel)
  }, [])

  const { data: mixRows, error } = useDuckDBCategoryMixWeekly(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
  )

  const { chartData, categories, topGainer, topLoser } = useMemo(
    () =>
      mixRows
        ? buildMixChartData(mixRows)
        : { chartData: [], categories: [], topGainer: null, topLoser: null },
    [mixRows],
  )

  if (error) {
    return (
      <Wrapper aria-label="カテゴリ構成比推移（DuckDB）">
        <Title>カテゴリ構成比推移（DuckDB）</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return null
  }

  return (
    <Wrapper aria-label="カテゴリ構成比推移（DuckDB）">
      <Title>カテゴリ構成比推移（DuckDB）</Title>
      <Subtitle>週次のカテゴリ別売上構成比 | マルチ月対応</Subtitle>

      <ControlRow>
        <ChipGroup>
          <ChipLabel>階層:</ChipLabel>
          {(Object.keys(LEVEL_LABELS) as HierarchyLevel[]).map((l) => (
            <Chip key={l} $active={level === l} onClick={() => handleLevelChange(l)}>
              {LEVEL_LABELS[l]}
            </Chip>
          ))}
        </ChipGroup>
      </ControlRow>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
          />
          <YAxis
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            domain={[0, 100]}
            tickFormatter={(v: number) => toPct(v / 100, 0)}
          />
          <Tooltip content={<MixTooltip categories={categories} ct={ct} />} />
          <Legend
            wrapperStyle={{ fontSize: '0.6rem' }}
            formatter={(value: string) => {
              const cat = categories.find((c) => c.code === value)
              return cat ? cat.name : value
            }}
          />

          {categories.map((cat, i) => (
            <Area
              key={cat.code}
              dataKey={cat.code}
              name={cat.code}
              stackId="mix"
              fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
              fillOpacity={0.7}
              stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
              strokeWidth={1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {(topGainer || topLoser) && (
        <SummaryGrid>
          {topGainer && topGainer.latestShift != null && topGainer.latestShift > 0 && (
            <ShiftCard $positive>
              <ShiftName>構成比上昇: {topGainer.name}</ShiftName>
              <ShiftValue>
                +{toPct(topGainer.latestShift / 100, 1)} (平均 {toPct(topGainer.avgShare / 100, 1)})
              </ShiftValue>
            </ShiftCard>
          )}
          {topLoser && topLoser.latestShift != null && topLoser.latestShift < 0 && (
            <ShiftCard $positive={false}>
              <ShiftName>構成比下降: {topLoser.name}</ShiftName>
              <ShiftValue>
                {toPct(topLoser.latestShift / 100, 1)} (平均 {toPct(topLoser.avgShare / 100, 1)})
              </ShiftValue>
            </ShiftCard>
          )}
        </SummaryGrid>
      )}
    </Wrapper>
  )
}
