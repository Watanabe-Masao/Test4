/**
 * DuckDB カテゴリベンチマークチャート
 *
 * 指数加重ランキングによるカテゴリ評価:
 * - 各カテゴリの店舗内順位からスコア s(r) = e^{-k(r-1)} を算出
 * - Index = (S / N) × 100 で正規化（100 = 全店舗トップ）
 * - 部門/ライン/クラスで切り替え可能
 * - 横棒グラフでスコアを可視化
 */
import { useState, useMemo, memo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  useDuckDBCategoryBenchmark,
  buildCategoryBenchmarkScores,
  type CategoryBenchmarkScore,
} from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter } from './chartTheme'
import { useI18n } from '@/application/hooks/useI18n'
import { EmptyState, ChartSkeleton } from '@/presentation/components/common'
import { palette } from '@/presentation/theme/tokens'

// ── styled-components ──

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const Subtitle = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-top: 2px;
`

const LevelSelector = styled.div`
  display: flex;
  gap: 4px;
`

const LevelButton = styled.button<{ $active: boolean }>`
  padding: 2px 10px;
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
  white-space: nowrap;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
`

const SummaryCard = styled.div<{ $variant: 'top' | 'low' }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ $variant, theme }) =>
    $variant === 'top'
      ? theme.mode === 'dark'
        ? 'rgba(34,197,94,0.12)'
        : 'rgba(34,197,94,0.06)'
      : theme.mode === 'dark'
        ? 'rgba(239,68,68,0.12)'
        : 'rgba(239,68,68,0.06)'};
  border-left: 3px solid ${({ $variant }) => ($variant === 'top' ? '#22c55e' : '#ef4444')};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.6rem;
`

const SummaryLabel = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text2};
`

const SummaryValue = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
`

// ── Types ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

type CategoryLevel = 'department' | 'line' | 'klass'

const LEVEL_LABELS: Record<CategoryLevel, string> = {
  department: '部門',
  line: 'ライン',
  klass: 'クラス',
}

// ── Color helpers ──

function indexColor(index: number): string {
  if (index >= 70) return palette.positive
  if (index >= 40) return palette.caution
  return palette.negative
}

// ── Custom tooltip ──

interface TooltipPayloadItem {
  readonly payload: CategoryBenchmarkScore
  readonly value: number
}

interface BenchmarkTooltipProps {
  readonly active?: boolean
  readonly payload?: readonly TooltipPayloadItem[]
  readonly ct: ReturnType<typeof useChartTheme>
  readonly fmt: (v: number) => string
}

function BenchmarkTooltip({ active, payload, ct, fmt }: BenchmarkTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0].payload

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
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {item.name} ({item.code})
      </div>
      <div>Index: {item.index.toFixed(1)}</div>
      <div>売上合計: {fmt(item.totalSales)}</div>
      <div>店舗数: {item.storeCount}</div>
    </div>
  )
}

// ── Component ──

export const DuckDBCategoryBenchmarkChart = memo(function DuckDBCategoryBenchmarkChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  const [level, setLevel] = useState<CategoryLevel>('department')

  const {
    data: rawRows,
    error,
    isLoading,
  } = useDuckDBCategoryBenchmark(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
  )

  const scores = useMemo(() => (rawRows ? buildCategoryBenchmarkScores(rawRows) : []), [rawRows])

  const chartHeight = Math.max(200, scores.length * 28 + 40)

  // サマリー: 最高・最低カテゴリ
  const topCategory = scores.length > 0 ? scores[0] : null
  const bottomCategory = scores.length > 1 ? scores[scores.length - 1] : null

  if (error) {
    return (
      <Wrapper aria-label="カテゴリベンチマーク（DuckDB）">
        <Title>カテゴリベンチマーク（DuckDB）</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (isLoading && !rawRows) {
    return <ChartSkeleton />
  }

  if (!duckConn || duckDataVersion === 0 || scores.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  return (
    <Wrapper aria-label="カテゴリベンチマーク（DuckDB）">
      <HeaderRow>
        <div>
          <Title>カテゴリベンチマーク（DuckDB）</Title>
          <Subtitle>指数加重ランキング Index = (S/N)×100 | s(r)=e^(-k(r-1))</Subtitle>
        </div>
        <LevelSelector>
          {(Object.keys(LEVEL_LABELS) as CategoryLevel[]).map((l) => (
            <LevelButton key={l} $active={level === l} onClick={() => setLevel(l)}>
              {LEVEL_LABELS[l]}
            </LevelButton>
          ))}
        </LevelSelector>
      </HeaderRow>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={scores}
          layout="vertical"
          margin={{ top: 4, right: 40, left: 80, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={(v: number) => `${v}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            width={75}
          />
          <Tooltip content={<BenchmarkTooltip ct={ct} fmt={fmt} />} />
          <Bar dataKey="index" name="Index" radius={[0, 4, 4, 0]}>
            {scores.map((s) => (
              <Cell key={s.code} fill={indexColor(s.index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <SummaryGrid>
        {topCategory && (
          <SummaryCard $variant="top">
            <SummaryLabel>最高評価: {topCategory.name}</SummaryLabel>
            <SummaryValue>
              Index {topCategory.index.toFixed(1)} | {fmt(topCategory.totalSales)}
            </SummaryValue>
          </SummaryCard>
        )}
        {bottomCategory && (
          <SummaryCard $variant="low">
            <SummaryLabel>最低評価: {bottomCategory.name}</SummaryLabel>
            <SummaryValue>
              Index {bottomCategory.index.toFixed(1)} | {fmt(bottomCategory.totalSales)}
            </SummaryValue>
          </SummaryCard>
        )}
      </SummaryGrid>
    </Wrapper>
  )
})
