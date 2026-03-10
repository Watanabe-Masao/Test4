/**
 * DuckDB カテゴリ×時間帯分析チャート
 *
 * DuckDB のカテゴリ別時間帯集約クエリを使い、カテゴリ（行）×時間帯（列）の
 * ヒートマップをHTML table で描画する。各カテゴリのピーク時間帯に星マーカーを表示。
 *
 * 表示項目:
 * - カテゴリ×時間帯のヒートマップ（セル色は金額比例）
 * - 階層レベル切替（部門/ライン/クラス）
 * - ピーク時間帯マーカー（★）
 */
import { useMemo, useState, useCallback, memo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import { HOUR_MIN, HOUR_MAX } from './HeatmapChart.helpers'
import { useDuckDBCategoryHourly, type CategoryHourlyRow } from '@/application/hooks/useDuckDBQuery'
import { useCurrencyFormatter, toPct } from './chartTheme'
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
  HeatmapTable,
  HeatmapTh,
  HeatmapCategoryTh,
  HeatmapCell,
  PeakMarker,
  SummaryRow,
  SummaryItem,
  ScrollContainer,
  ErrorMsg,
} from './CategoryHourlyChart.styles'

// ── Constants ──

const HOURS = Array.from({ length: HOUR_MAX - HOUR_MIN + 1 }, (_, i) => i + HOUR_MIN)

/** 上位表示カテゴリ数 */
const TOP_CATEGORIES = 10

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

interface CategoryHeatmapRow {
  readonly code: string
  readonly name: string
  readonly totalAmount: number
  readonly hourlyAmounts: ReadonlyMap<number, number>
  readonly peakHour: number
  readonly peakAmount: number
  readonly shareOfTotal: number
}

interface HeatmapData {
  readonly categories: CategoryHeatmapRow[]
  readonly maxAmount: number
  readonly globalPeakHour: number
}

// ── Data transformation ──

function buildHeatmapData(rows: readonly CategoryHourlyRow[]): HeatmapData {
  // Aggregate by category
  const catMap = new Map<
    string,
    { name: string; totalAmount: number; hourly: Map<number, number> }
  >()

  for (const row of rows) {
    const existing = catMap.get(row.code) ?? {
      name: row.name,
      totalAmount: 0,
      hourly: new Map<number, number>(),
    }
    existing.totalAmount += row.amount
    existing.hourly.set(row.hour, (existing.hourly.get(row.hour) ?? 0) + row.amount)
    catMap.set(row.code, existing)
  }

  // Sort by total amount, take top N
  const sorted = [...catMap.entries()]
    .map(([code, info]) => ({ code, ...info }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, TOP_CATEGORIES)

  const grandTotal = sorted.reduce((sum, cat) => sum + cat.totalAmount, 0)

  // Find global max for color scaling
  let maxAmount = 0
  const globalHourTotals = new Map<number, number>()

  for (const cat of sorted) {
    for (const [hour, amount] of cat.hourly) {
      if (amount > maxAmount) maxAmount = amount
      globalHourTotals.set(hour, (globalHourTotals.get(hour) ?? 0) + amount)
    }
  }

  // Global peak hour
  let globalPeakHour = HOUR_MIN
  let globalPeakVal = 0
  for (const [hour, total] of globalHourTotals) {
    if (total > globalPeakVal) {
      globalPeakVal = total
      globalPeakHour = hour
    }
  }

  const categories: CategoryHeatmapRow[] = sorted.map((cat) => {
    let peakHour = HOUR_MIN
    let peakAmount = 0
    for (const [hour, amount] of cat.hourly) {
      if (amount > peakAmount) {
        peakAmount = amount
        peakHour = hour
      }
    }

    return {
      code: cat.code,
      name: cat.name,
      totalAmount: Math.round(cat.totalAmount),
      hourlyAmounts: cat.hourly,
      peakHour,
      peakAmount: Math.round(peakAmount),
      shareOfTotal: grandTotal > 0 ? cat.totalAmount / grandTotal : 0,
    }
  })

  return { categories, maxAmount, globalPeakHour }
}

// ── Component ──

export const CategoryHourlyChart = memo(function CategoryHourlyChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  const [level, setLevel] = useState<HierarchyLevel>('department')

  const handleLevelChange = useCallback((newLevel: HierarchyLevel) => {
    setLevel(newLevel)
  }, [])

  const {
    data: hourlyRows,
    error,
    isLoading,
  } = useDuckDBCategoryHourly(duckConn, duckDataVersion, currentDateRange, selectedStoreIds, level)

  const heatmapData = useMemo(
    () =>
      hourlyRows
        ? buildHeatmapData(hourlyRows)
        : { categories: [], maxAmount: 0, globalPeakHour: HOUR_MIN },
    [hourlyRows],
  )

  if (error) {
    return (
      <Wrapper aria-label="カテゴリ×時間帯分析（DuckDB）">
        <Title>カテゴリ×時間帯分析（DuckDB）</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (isLoading && !hourlyRows) {
    return <ChartSkeleton />
  }

  if (!duckConn || duckDataVersion === 0 || heatmapData.categories.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  const { categories, maxAmount, globalPeakHour } = heatmapData

  return (
    <Wrapper aria-label="カテゴリ×時間帯分析（DuckDB）">
      <Title>カテゴリ×時間帯分析（DuckDB）</Title>
      <Subtitle>カテゴリ別の時間帯売上分布 | ★ = ピーク</Subtitle>

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

      <ScrollContainer>
        <HeatmapTable aria-label="カテゴリ×時間帯ヒートマップ">
          <thead>
            <tr>
              <HeatmapCategoryTh scope="col">カテゴリ</HeatmapCategoryTh>
              {HOURS.map((h) => (
                <HeatmapTh key={h} scope="col">
                  {h}
                </HeatmapTh>
              ))}
              <HeatmapTh scope="col">合計</HeatmapTh>
              <HeatmapTh scope="col">構成比</HeatmapTh>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.code}>
                <HeatmapCategoryTh title={cat.name}>{cat.name}</HeatmapCategoryTh>
                {HOURS.map((h) => {
                  const amount = cat.hourlyAmounts.get(h) ?? 0
                  const intensity = maxAmount > 0 ? amount / maxAmount : 0
                  const isPeak = h === cat.peakHour && amount > 0

                  return (
                    <HeatmapCell
                      key={h}
                      $intensity={intensity}
                      $isPeak={isPeak}
                      title={`${cat.name} ${h}時: ${fmt(Math.round(amount))}`}
                    >
                      {amount > 0 ? fmt(Math.round(amount)) : ''}
                      {isPeak && <PeakMarker>★</PeakMarker>}
                    </HeatmapCell>
                  )
                })}
                <HeatmapCell $intensity={0} $isPeak={false}>
                  {fmt(cat.totalAmount)}
                </HeatmapCell>
                <HeatmapCell $intensity={0} $isPeak={false}>
                  {toPct(cat.shareOfTotal)}
                </HeatmapCell>
              </tr>
            ))}
          </tbody>
        </HeatmapTable>
      </ScrollContainer>

      <SummaryRow>
        <SummaryItem>全体ピーク: {globalPeakHour}時</SummaryItem>
        <SummaryItem>表示カテゴリ: {categories.length}件</SummaryItem>
        {categories[0] && (
          <SummaryItem>
            最大: {categories[0].name} (ピーク {categories[0].peakHour}時)
          </SummaryItem>
        )}
      </SummaryRow>
    </Wrapper>
  )
})
