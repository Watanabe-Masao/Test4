/**
 * カテゴリPI値・偏差値分析
 *
 * PI値（金額PI / 点数PI）と偏差値を算出して横棒チャートで表示する。
 * データは親の Screen Plan hook (usePerformanceIndexPlan) から props で受け取る。
 *
 * @guard H4 component に acquisition logic 禁止
 */
import { useState, useMemo, useCallback, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import type { PrevYearScope } from '@/domain/models/calendar'
import type { PairedQueryOutput } from '@/application/queries/PairedQueryContract'
import type { LevelAggregationOutput } from '@/application/queries/cts/LevelAggregationHandler'
import {
  buildCategoryRows,
  buildPerformanceChartOption,
  type ViewType,
} from './CategoryPerformanceChart.builders'
import { ChartSkeleton } from '@/presentation/components/common/feedback'
import { ChartCard } from '@/presentation/components/charts/ChartCard'
import {
  ToggleRow,
  ViewToggle,
  ViewBtn,
  Sep,
  EmptyMsg,
} from '@/features/category/ui/charts/CategoryPerformanceChart.styles'

export type LevelType = 'department' | 'line' | 'klass'

const VIEW_LABELS: Record<ViewType, string> = {
  piRank: '金額PI値',
  piQtyRank: '点数PI値',
  deviation: '偏差値',
}

const LEVEL_LABELS: Record<LevelType, string> = {
  department: '部門',
  line: 'ライン',
  klass: 'クラス',
}

/** ドリルダウン情報 */
export interface CategoryDrillDownInfo {
  readonly code: string
  readonly name: string
  readonly level: LevelType
}

interface Props {
  categoryData: PairedQueryOutput<LevelAggregationOutput> | null
  isLoading: boolean
  prevYearScope?: PrevYearScope
  totalCustomers: number
  level: LevelType
  onLevelChange: (level: LevelType) => void
  /** カテゴリダブルクリック時のドリルダウンコールバック */
  onDrillDown?: (info: CategoryDrillDownInfo) => void
  /** ドリルダウンのパンくず（表示用） */
  breadcrumbs?: readonly { readonly label: string; readonly onClick: () => void }[]
}

export const CategoryPerformanceChart = memo(function CategoryPerformanceChart({
  categoryData,
  isLoading,
  prevYearScope,
  totalCustomers,
  level,
  onLevelChange,
  onDrillDown,
  breadcrumbs,
}: Props) {
  const prevTotalCustomers = prevYearScope?.totalCustomers ?? 0
  const theme = useTheme() as AppTheme
  const [view, setView] = useState<ViewType>('piRank')

  const curRecords = categoryData?.current.records ?? null
  const prevRecords = categoryData?.comparison?.records ?? null

  const categoryRows = useMemo(
    () =>
      curRecords
        ? buildCategoryRows(curRecords, prevRecords, totalCustomers, prevTotalCustomers)
        : [],
    [curRecords, prevRecords, totalCustomers, prevTotalCustomers],
  )

  const names = categoryRows.map((r) => r.name)

  // ダブルクリックでドリルダウン（klass レベルでは不可）
  const canDrillDown = level !== 'klass' && onDrillDown != null
  const handleDblClick = useCallback(
    (params: Record<string, unknown>) => {
      if (!canDrillDown || !onDrillDown) return
      const dataIndex = params.dataIndex as number | undefined
      if (dataIndex == null) return
      const row = categoryRows[dataIndex]
      if (!row) return
      onDrillDown({ code: row.code, name: row.name, level })
    },
    [canDrillDown, onDrillDown, categoryRows, level],
  )

  const chartHeight = Math.max(300, categoryRows.length * 28 + 40)

  const titleMap: Record<ViewType, string> = {
    piRank: `金額PI値ランキング（${LEVEL_LABELS[level]}別 / PI = 売上÷客数×1000）`,
    piQtyRank: `点数PI値ランキング（${LEVEL_LABELS[level]}別 / PI = 点数÷客数×1000）`,
    deviation: `カテゴリ偏差値分析（${LEVEL_LABELS[level]}別 / 基準=50）`,
  }

  const option = useMemo(
    () => buildPerformanceChartOption(categoryRows, names, view, theme),
    [categoryRows, names, view, theme],
  )

  // Loading state
  if (isLoading) {
    return (
      <ChartCard title="カテゴリPI値・偏差値分析" ariaLabel="カテゴリ実績チャート">
        <ChartSkeleton height="360px" />
      </ChartCard>
    )
  }

  if (!curRecords || curRecords.length === 0) {
    return (
      <ChartCard title="カテゴリPI値・偏差値分析" ariaLabel="カテゴリ実績チャート">
        <EmptyMsg>分類別時間帯売上データがありません</EmptyMsg>
      </ChartCard>
    )
  }

  if (totalCustomers <= 0) {
    return (
      <ChartCard title="カテゴリPI値・偏差値分析" ariaLabel="カテゴリ実績チャート">
        <EmptyMsg>客数データがありません（PI値の算出に客数が必要です）</EmptyMsg>
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title={titleMap[view]}
      ariaLabel="カテゴリ実績チャート"
      toolbar={
        <ToggleRow>
          <ViewToggle>
            {(Object.keys(VIEW_LABELS) as ViewType[]).map((v) => (
              <ViewBtn key={v} $active={view === v} onClick={() => setView(v)}>
                {VIEW_LABELS[v]}
              </ViewBtn>
            ))}
          </ViewToggle>
          <Sep>|</Sep>
          <ViewToggle>
            {(Object.keys(LEVEL_LABELS) as LevelType[]).map((l) => (
              <ViewBtn key={l} $active={level === l} onClick={() => onLevelChange(l)}>
                {LEVEL_LABELS[l]}
              </ViewBtn>
            ))}
          </ViewToggle>
        </ToggleRow>
      }
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: theme.typography.fontSize.micro,
            color: theme.colors.text3,
            marginBottom: 4,
          }}
        >
          {breadcrumbs.map((bc, i) => (
            <span key={i}>
              {i > 0 && <span style={{ margin: '0 2px' }}> &gt; </span>}
              <button
                onClick={bc.onClick}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.colors.palette.primary,
                  cursor: 'pointer',
                  padding: '0 2px',
                  fontSize: 'inherit',
                  textDecoration: 'underline',
                }}
              >
                {bc.label}
              </button>
            </span>
          ))}
        </div>
      )}
      {canDrillDown && (
        <div
          style={{
            fontSize: theme.typography.fontSize.micro,
            color: theme.colors.text4,
            textAlign: 'right',
            marginBottom: 2,
          }}
        >
          ダブルクリックでドリルダウン
        </div>
      )}
      <EChart
        option={option as EChartsOption}
        height={chartHeight}
        onDblClick={canDrillDown ? handleDblClick : undefined}
        ariaLabel="カテゴリ実績チャート"
      />
    </ChartCard>
  )
})
