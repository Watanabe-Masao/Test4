/**
 * 部門別時間帯パターンチャート (ECharts) — 統合ビュー
 *
 * 第1軸: 部門別積み上げ面グラフ（売上金額）
 * 第2軸: 点数 / 累積構成比 / 気温 / 降水量 の切替オーバーレイ
 *
 * データ取得・状態管理は useDeptHourlyChartData に分離。
 * 本コンポーネントは描画のみ。
 */
import React from 'react'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { TOP_N_OPTIONS } from './DeptHourlyChartLogic'
import { SegmentedControl } from '@/presentation/components/common/layout'
import { ChartCard } from './ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from './ChartState'
import { EChart } from './EChart'
import { useDeptHourlyChartData } from './useDeptHourlyChartData'
import {
  TopNSelector,
  TopNSelect,
  ChipContainer,
  DeptChip,
  ColorDot,
  SummaryRow,
  SummaryItem,
  SummaryLabel,
  InsightBar,
  InsightItem,
  InsightTitle,
  BreadcrumbRow,
  BreadcrumbLink,
  BreadcrumbSep,
  BreadcrumbCurrent,
  BackRow,
  BackLink,
  DrillIcon,
} from './DeptHourlyChart.styles'

export type RightOverlayMode = 'quantity' | 'cumRatio' | 'temperature' | 'precipitation'

/** 第2軸オーバーレイ用データ（時間帯ごとの値） */
export interface HourlyOverlayData {
  readonly hour: number
  readonly quantity?: number
  readonly temperature?: number
  readonly precipitation?: number
}

const VIEW_OPTIONS: readonly { value: 'stacked' | 'separate'; label: string }[] = [
  { value: 'stacked', label: '積み上げ' },
  { value: 'separate', label: '独立' },
]

const LEVEL_OPTIONS: readonly { value: 'department' | 'line' | 'klass'; label: string }[] = [
  { value: 'department', label: '部門' },
  { value: 'line', label: 'ライン' },
  { value: 'klass', label: 'クラス' },
]

const RIGHT_OVERLAY_OPTIONS: readonly { value: RightOverlayMode; label: string }[] = [
  { value: 'quantity', label: '点数' },
  { value: 'cumRatio', label: '累積構成比' },
  { value: 'temperature', label: '気温' },
  { value: 'precipitation', label: '降水量' },
]

const LEVEL_LABELS: Record<string, string> = {
  department: '部門',
  line: 'ライン',
  klass: 'クラス',
}

interface Props {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly weatherOverlay?: readonly HourlyOverlayData[]
}

export const DeptHourlyChart = React.memo(function DeptHourlyChart(props: Props) {
  const d = useDeptHourlyChartData(props)

  const chartTitle = '部門別時間帯パターン'

  if (d.error) {
    return (
      <ChartCard title={chartTitle}>
        <ChartError message={`${d.errorMessage}: ${d.error}`} />
      </ChartCard>
    )
  }
  if (d.isLoading && !d.categoryHourlyRows) {
    return (
      <ChartCard title={chartTitle}>
        <ChartLoading />
      </ChartCard>
    )
  }
  if (!d.queryExecutor || d.chartData.length === 0) {
    return (
      <ChartCard title={chartTitle}>
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  const levelLabel = LEVEL_LABELS[d.drill.level]
  const subtitle = `上位${d.topN}${levelLabel}の時間帯別売上 | ${d.viewMode === 'stacked' ? '積み上げ面グラフ' : '独立面グラフ'}`

  const breadcrumb =
    d.drill.level !== 'department' ? (
      <BreadcrumbRow>
        <BreadcrumbLink onClick={() => d.setDrill({ level: 'department' })}>全部門</BreadcrumbLink>
        {d.drill.deptName && (
          <>
            <BreadcrumbSep>›</BreadcrumbSep>
            {d.drill.level === 'line' ? (
              <BreadcrumbCurrent>{d.drill.deptName}</BreadcrumbCurrent>
            ) : (
              <BreadcrumbLink
                onClick={() =>
                  d.setDrill({
                    level: 'line',
                    deptCode: d.drill.deptCode,
                    deptName: d.drill.deptName,
                  })
                }
              >
                {d.drill.deptName}
              </BreadcrumbLink>
            )}
          </>
        )}
        {d.drill.lineName && (
          <>
            <BreadcrumbSep>›</BreadcrumbSep>
            <BreadcrumbCurrent>{d.drill.lineName}</BreadcrumbCurrent>
          </>
        )}
      </BreadcrumbRow>
    ) : null

  const toolbar = (
    <>
      <SegmentedControl
        options={LEVEL_OPTIONS}
        value={d.drill.level}
        onChange={d.handleLevelChange}
        ariaLabel="階層レベル"
      />
      <SegmentedControl
        options={VIEW_OPTIONS}
        value={d.viewMode}
        onChange={d.setViewMode}
        ariaLabel="表示モード"
      />
      <TopNSelector>
        <span>上位</span>
        <TopNSelect value={d.topN} onChange={d.handleTopNChange}>
          {TOP_N_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
              {levelLabel}
            </option>
          ))}
        </TopNSelect>
      </TopNSelector>
      <SegmentedControl
        options={RIGHT_OVERLAY_OPTIONS}
        value={d.rightMode}
        onChange={d.setRightMode}
        ariaLabel="第2軸"
      />
    </>
  )

  const canDrillDown = d.drill.level !== 'klass'

  return (
    <ChartCard title={chartTitle} subtitle={subtitle} toolbar={toolbar}>
      {breadcrumb}

      <ChipContainer>
        {d.departments.map((dept) => (
          <DeptChip
            key={dept.code}
            $color={dept.color}
            $active={d.activeDepts.size === 0 || d.activeDepts.has(dept.code)}
            onClick={() => d.handleChipClick(dept.code)}
            onDoubleClick={canDrillDown ? () => d.handleDrillDown(dept.code, dept.name) : undefined}
            title={canDrillDown ? 'ダブルクリックでドリルダウン' : undefined}
          >
            <ColorDot $color={dept.color} />
            {dept.name}
            {canDrillDown && <DrillIcon>▸</DrillIcon>}
          </DeptChip>
        ))}
      </ChipContainer>

      {d.drill.level !== 'department' && (
        <BackRow>
          <BackLink onClick={d.handleDrillUp}>
            ← {d.drill.level === 'klass' ? 'ライン' : '部門'}に戻る
          </BackLink>
        </BackRow>
      )}

      <EChart option={d.option} height={300} ariaLabel="部門別時間帯パターンチャート" />

      <SummaryRow>
        {d.departments.slice(0, 5).map((dept) => (
          <SummaryItem key={dept.code}>
            <SummaryLabel>{dept.name}:</SummaryLabel>
            {d.fmt(dept.totalAmount)}
          </SummaryItem>
        ))}
      </SummaryRow>

      {d.cannibalization.length > 0 && (
        <InsightBar>
          <InsightTitle>時間帯カニバリゼーション検出（相関分析）</InsightTitle>
          {d.cannibalization.map((c, i) => (
            <InsightItem key={i}>
              {c.deptA} x {c.deptB}: 相関r={c.r.toFixed(2)}（負の相関 → 同時間帯で競合の可能性）
            </InsightItem>
          ))}
        </InsightBar>
      )}
    </ChartCard>
  )
})
