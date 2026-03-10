/**
 * DuckDB カテゴリ別日次売上推移チャート
 *
 * DuckDB のカテゴリ別日次トレンドクエリを使い、上位Nカテゴリの
 * 日次売上推移をマルチライン折れ線グラフで表示する。
 *
 * 表示項目:
 * - カテゴリ別日次売上の折れ線（上位N）
 * - 階層レベル切替（部門/ライン/クラス）
 * - TopN件数切替（5/8/10）
 * - 曜日プリセットフィルタ
 * - 階層ドリルダウン（部門→ライン→クラス）
 * - カテゴリ除外/選択
 */
import { useMemo, useState, useCallback, memo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import type { LegendPayload } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  useDuckDBCategoryDailyTrend,
  type CategoryDailyTrendRow,
} from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter, toAxisYen } from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
import { DowPresetSelector } from './DowPresetSelector'
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
  SummaryRow,
  SummaryItem,
  ErrorMsg,
  BreadcrumbBar,
  BreadcrumbItem,
  BreadcrumbSep,
  ExcludeInfo,
  ResetLink,
} from './CategoryTrendChart.styles'

// ── Constants ──

/** カテゴリ区別用の色配列（最大10色） */
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

const TOP_N_OPTIONS = [5, 8, 10] as const

// ── Types ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

interface ChartDataPoint {
  readonly date: string
  readonly [categoryKey: string]: string | number | null
}

interface CategoryInfo {
  readonly code: string
  readonly name: string
  readonly totalAmount: number
}

/** 階層ドリルダウン状態 */
interface DrillState {
  readonly deptCode?: string
  readonly deptName?: string
  readonly lineCode?: string
  readonly lineName?: string
}

// ── Data transformation ──

function buildChartData(
  rows: readonly CategoryDailyTrendRow[],
  excludedCodes: ReadonlySet<string>,
): {
  chartData: ChartDataPoint[]
  categories: CategoryInfo[]
} {
  // Collect unique categories with total amounts
  const categoryTotals = new Map<string, { name: string; total: number }>()
  for (const row of rows) {
    const existing = categoryTotals.get(row.code) ?? { name: row.name, total: 0 }
    existing.total += row.amount
    categoryTotals.set(row.code, existing)
  }

  // Sort categories by total amount descending
  const categories: CategoryInfo[] = [...categoryTotals.entries()]
    .map(([code, info]) => ({
      code,
      name: info.name,
      totalAmount: Math.round(info.total),
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)

  // Build chart data: one row per date, exclude excluded codes
  const dateMap = new Map<string, Record<string, number>>()
  for (const row of rows) {
    if (excludedCodes.has(row.code)) continue
    const dateKey = row.dateKey.slice(5) // MM-DD
    const existing = dateMap.get(dateKey) ?? {}
    existing[row.code] = (existing[row.code] ?? 0) + Math.round(row.amount)
    dateMap.set(dateKey, existing)
  }

  const sortedDates = [...dateMap.keys()].sort()
  const chartData: ChartDataPoint[] = sortedDates.map((date) => ({
    date,
    ...dateMap.get(date)!,
  }))

  return { chartData, categories }
}

// ── Component ──

export const CategoryTrendChart = memo(function CategoryTrendChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  const [level, setLevel] = useState<HierarchyLevel>('department')
  const [topN, setTopN] = useState<number>(8)
  const [selectedDows, setSelectedDows] = useState<number[]>([])
  const [drill, setDrill] = useState<DrillState>({})
  const [excludedCodes, setExcludedCodes] = useState<Set<string>>(new Set())

  const handleDowChange = useCallback((dows: number[]) => setSelectedDows(dows), [])

  const handleLevelChange = useCallback((newLevel: HierarchyLevel) => {
    setLevel(newLevel)
    setDrill({})
    setExcludedCodes(new Set())
  }, [])

  const handleTopNChange = useCallback((n: number) => {
    setTopN(n)
  }, [])

  /** Legend クリックでカテゴリ除外/復帰 */
  const handleLegendClick = useCallback((e: LegendPayload) => {
    if (e.dataKey == null) return
    const key = String(e.dataKey)
    setExcludedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  /** ドリルダウン: カテゴリをクリックして下位レベルに移動 */
  const handleDrill = useCallback(
    (code: string, name: string) => {
      if (level === 'department') {
        setDrill({ deptCode: code, deptName: name })
        setLevel('line')
        setExcludedCodes(new Set())
      } else if (level === 'line') {
        setDrill((prev) => ({ ...prev, lineCode: code, lineName: name }))
        setLevel('klass')
        setExcludedCodes(new Set())
      }
    },
    [level],
  )

  /** パンくず: 特定レベルに戻る */
  const handleBreadcrumbClick = useCallback((targetLevel: 'root' | 'department') => {
    if (targetLevel === 'root') {
      setDrill({})
      setLevel('department')
    } else {
      setDrill((prev) => ({ deptCode: prev.deptCode, deptName: prev.deptName }))
      setLevel('line')
    }
    setExcludedCodes(new Set())
  }, [])

  // hierarchy パラメータ構築
  const hierarchy = useMemo(
    () =>
      drill.deptCode || drill.lineCode
        ? { deptCode: drill.deptCode, lineCode: drill.lineCode }
        : undefined,
    [drill.deptCode, drill.lineCode],
  )

  const dowParam = useMemo(
    () => (selectedDows.length > 0 ? selectedDows : undefined),
    [selectedDows],
  )

  const {
    data: trendRows,
    error,
    isLoading,
  } = useDuckDBCategoryDailyTrend(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
    hierarchy,
    topN,
    dowParam,
  )

  const { chartData, categories } = useMemo(
    () =>
      trendRows ? buildChartData(trendRows, excludedCodes) : { chartData: [], categories: [] },
    [trendRows, excludedCodes],
  )

  // 表示するカテゴリ（除外済みを除く）
  const visibleCategories = useMemo(
    () => categories.filter((c) => !excludedCodes.has(c.code)),
    [categories, excludedCodes],
  )

  if (error) {
    return (
      <Wrapper aria-label="カテゴリ別売上推移（DuckDB）">
        <Title>カテゴリ別売上推移（DuckDB）</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (isLoading && !trendRows) {
    return <ChartSkeleton />
  }

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  // パンくず
  const hasDrill = drill.deptCode != null
  const canDrill = level !== 'klass'

  // Find top category (highest total)
  const topCategory = visibleCategories[0]

  return (
    <Wrapper aria-label="カテゴリ別売上推移（DuckDB）">
      <Title>カテゴリ別売上推移（DuckDB）</Title>
      <Subtitle>
        上位{topN}カテゴリの日次売上トレンド | 月跨ぎ対応
        {selectedDows.length > 0 && ' | 曜日フィルタ適用中'}
      </Subtitle>

      {hasDrill && (
        <BreadcrumbBar>
          <BreadcrumbItem $active={false} onClick={() => handleBreadcrumbClick('root')}>
            全体
          </BreadcrumbItem>
          <BreadcrumbSep>▸</BreadcrumbSep>
          {drill.deptCode && (
            <>
              <BreadcrumbItem
                $active={level === 'line' && !drill.lineCode}
                onClick={() => handleBreadcrumbClick('department')}
              >
                {drill.deptName ?? drill.deptCode}
              </BreadcrumbItem>
              {drill.lineCode && (
                <>
                  <BreadcrumbSep>▸</BreadcrumbSep>
                  <BreadcrumbItem $active onClick={() => {}}>
                    {drill.lineName ?? drill.lineCode}
                  </BreadcrumbItem>
                </>
              )}
            </>
          )}
        </BreadcrumbBar>
      )}

      <ControlRow>
        {!hasDrill && (
          <ChipGroup>
            <ChipLabel>階層:</ChipLabel>
            {(Object.keys(LEVEL_LABELS) as HierarchyLevel[]).map((l) => (
              <Chip key={l} $active={level === l} onClick={() => handleLevelChange(l)}>
                {LEVEL_LABELS[l]}
              </Chip>
            ))}
          </ChipGroup>
        )}

        <ChipGroup>
          <ChipLabel>上位:</ChipLabel>
          {TOP_N_OPTIONS.map((n) => (
            <Chip key={n} $active={topN === n} onClick={() => handleTopNChange(n)}>
              {n}件
            </Chip>
          ))}
        </ChipGroup>

        <DowPresetSelector selectedDows={selectedDows} onChange={handleDowChange} />
      </ControlRow>

      {excludedCodes.size > 0 && (
        <ExcludeInfo>
          {excludedCodes.size}件除外中 —{' '}
          <ResetLink onClick={() => setExcludedCodes(new Set())}>除外リセット</ResetLink>
        </ExcludeInfo>
      )}

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
          />
          <YAxis
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={toAxisYen}
          />
          <Tooltip
            content={createChartTooltip({
              ct,
              formatter: (value: unknown, name: string) => {
                if (value == null) return ['-', null]
                const cat = categories.find((c) => c.code === name)
                const label = cat ? cat.name : name
                return [fmt(value as number), label]
              },
              labelFormatter: (label: unknown) => `日付: ${String(label)}`,
            })}
          />
          <Legend
            wrapperStyle={{ fontSize: '0.6rem', cursor: 'pointer' }}
            onClick={handleLegendClick}
            formatter={(value: string) => {
              const cat = categories.find((c) => c.code === value)
              const name = cat ? cat.name : value
              const isExcluded = excludedCodes.has(value)
              return (
                <span
                  style={{
                    textDecoration: isExcluded ? 'line-through' : 'none',
                    opacity: isExcluded ? 0.4 : 1,
                  }}
                >
                  {name}
                </span>
              )
            }}
          />

          {categories.map((cat, i) => {
            if (excludedCodes.has(cat.code)) return null
            return (
              <Line
                key={cat.code}
                dataKey={cat.code}
                name={cat.code}
                stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                strokeWidth={i === 0 ? 2.5 : 1.5}
                dot={{
                  r: i === 0 ? 3 : 1.5,
                  fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                  cursor: canDrill ? 'pointer' : 'default',
                }}
                connectNulls
                activeDot={
                  canDrill
                    ? {
                        r: 5,
                        cursor: 'pointer',
                        onClick: () => handleDrill(cat.code, cat.name),
                      }
                    : undefined
                }
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>

      <SummaryRow>
        {topCategory && (
          <SummaryItem>
            最大: {topCategory.name} ({fmt(topCategory.totalAmount)})
          </SummaryItem>
        )}
        <SummaryItem>対象日数: {chartData.length}日</SummaryItem>
        <SummaryItem>
          カテゴリ数: {visibleCategories.length}/{categories.length}
        </SummaryItem>
        {canDrill && <SummaryItem>ドリルダウン: チャート上のカテゴリをクリック</SummaryItem>}
      </SummaryRow>
    </Wrapper>
  )
})
