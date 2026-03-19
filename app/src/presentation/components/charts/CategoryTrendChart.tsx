/**
 * カテゴリ別日次売上推移チャート
 *
 * カテゴリ別日次トレンドクエリを使い、上位Nカテゴリの
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
import { useDuckDBCategoryDailyTrend } from '@/application/hooks/useDuckDBQuery'
import { buildCategoryTrendData } from './CategoryTrendChartLogic'
import { useChartTheme, useCurrencyFormatter, toAxisYen } from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
import { DowPresetSelector } from './DowPresetSelector'
import { palette } from '@/presentation/theme/tokens'
import { useI18n } from '@/application/hooks/useI18n'
import { SegmentedControl } from '@/presentation/components/common'
import { ChartCard } from './ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from './ChartState'
import {
  ControlRow,
  ChipGroup,
  ChipLabel,
  SummaryRow,
  SummaryItem,
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

const TOP_N_OPTIONS = [5, 8, 10] as const

const LEVEL_SEGMENT_OPTIONS: readonly { value: HierarchyLevel; label: string }[] = [
  { value: 'department', label: '部門' },
  { value: 'line', label: 'ライン' },
  { value: 'klass', label: 'クラス' },
]

const TOP_N_SEGMENT_OPTIONS: readonly { value: string; label: string }[] = TOP_N_OPTIONS.map(
  (n) => ({ value: String(n), label: `${n}件` }),
)

// ── Types ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

/** 階層ドリルダウン状態 */
interface DrillState {
  readonly deptCode?: string
  readonly deptName?: string
  readonly lineCode?: string
  readonly lineName?: string
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
      trendRows
        ? buildCategoryTrendData(trendRows, excludedCodes)
        : { chartData: [], categories: [] },
    [trendRows, excludedCodes],
  )

  // 表示するカテゴリ（除外済みを除く）
  const visibleCategories = useMemo(
    () => categories.filter((c) => !excludedCodes.has(c.code)),
    [categories, excludedCodes],
  )

  if (error) {
    return (
      <ChartCard title="カテゴリ別売上推移">
        <ChartError message={`${messages.errors.dataFetchFailed}: ${error}`} />
      </ChartCard>
    )
  }

  if (isLoading && !trendRows) {
    return (
      <ChartCard title="カテゴリ別売上推移">
        <ChartLoading />
      </ChartCard>
    )
  }

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return (
      <ChartCard title="カテゴリ別売上推移">
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  // パンくず
  const hasDrill = drill.deptCode != null
  const canDrill = level !== 'klass'

  // Find top category (highest total)
  const topCategory = visibleCategories[0]

  const subtitle = `上位${topN}カテゴリの日次売上トレンド | 月跨ぎ対応${selectedDows.length > 0 ? ' | 曜日フィルタ適用中' : ''}`

  return (
    <ChartCard title="カテゴリ別売上推移" subtitle={subtitle}>
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
            <SegmentedControl
              options={LEVEL_SEGMENT_OPTIONS}
              value={level}
              onChange={handleLevelChange}
              ariaLabel="階層レベル"
            />
          </ChipGroup>
        )}

        <ChipGroup>
          <ChipLabel>上位:</ChipLabel>
          <SegmentedControl
            options={TOP_N_SEGMENT_OPTIONS}
            value={String(topN)}
            onChange={(v) => handleTopNChange(Number(v))}
            ariaLabel="表示件数"
          />
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
    </ChartCard>
  )
})
