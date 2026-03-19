/**
 * カテゴリ×時間帯分析チャート
 *
 * カテゴリ別時間帯集約クエリを使い、カテゴリ（行）×時間帯（列）の
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
import { useDuckDBCategoryHourly } from '@/application/hooks/useDuckDBQuery'
import { buildCategoryHeatmapData } from './CategoryHourlyChartLogic'
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
        ? buildCategoryHeatmapData(hourlyRows, HOUR_MIN)
        : { categories: [], maxAmount: 0, globalPeakHour: HOUR_MIN },
    [hourlyRows],
  )

  if (error) {
    return (
      <Wrapper aria-label="カテゴリ×時間帯分析">
        <Title>カテゴリ×時間帯分析</Title>
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
    <Wrapper aria-label="カテゴリ×時間帯分析">
      <Title>カテゴリ×時間帯分析</Title>
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
