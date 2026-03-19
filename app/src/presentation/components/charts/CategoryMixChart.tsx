/**
 * カテゴリ構成比推移チャート
 *
 * 週次カテゴリ構成比クエリを使い、カテゴリ別売上構成比の
 * 週次推移を積み上げ面グラフで表示する。
 *
 * 表示項目:
 * - 週次カテゴリ別売上構成比の積み上げ面グラフ
 * - 階層レベル切替（部門/ライン/クラス）
 * - 構成比シフトの大きいカテゴリのハイライト
 */
import { useMemo, useState, useCallback, memo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import { useDuckDBCategoryMixWeekly } from '@/application/hooks/useDuckDBQuery'
import { buildMixChartData, type CategoryMeta } from './CategoryMixChartLogic'
import { useChartTheme, toPct } from './chartTheme'
import { palette } from '@/presentation/theme/tokens'
import { useI18n } from '@/application/hooks/useI18n'
import { EmptyState, ChartSkeleton } from '@/presentation/components/common'
import {
  Wrapper,
  Title,
  Subtitle,
  ControlRow,
  ChipGroup,
  ChipLabel,
  Chip,
  SummaryGrid,
  ShiftCard,
  ShiftName,
  ShiftValue,
  ErrorMsg,
} from './CategoryMixChart.styles'

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

export const CategoryMixChart = memo(function CategoryMixChart({
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

  const {
    data: mixRows,
    error,
    isLoading,
  } = useDuckDBCategoryMixWeekly(
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
      <Wrapper aria-label="カテゴリ構成比推移">
        <Title>カテゴリ構成比推移</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (isLoading && !mixRows) {
    return <ChartSkeleton />
  }

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  return (
    <Wrapper aria-label="カテゴリ構成比推移">
      <Title>カテゴリ構成比推移</Title>
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
})
