/**
 * SubAnalysisPanel — 右軸モード連動サブ分析パネル
 *
 * 日別売上チャートの右軸選択に応じて、適切な分析パネルを動的にレンダリングする。
 * 全パネルは DuckDB をデータソースとし、DailyRecord Map には依存しない。
 *
 * ChartCard variant="section" を使用し、親カードとデザインを統一。
 * DuckQueryContext: DuckDB 接続 + フィルタ条件の共通型。
 */
import { memo } from 'react'
import styled, { keyframes } from 'styled-components'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { DailyRecord, DailyWeatherSummary, DiscountEntry } from '@/domain/models/record'
import type { RightAxisMode } from './DailySalesChartBodyLogic'
import { ChartCard } from './ChartCard'
import { FactorDecompositionPanel } from './FactorDecompositionPanel'
import { DiscountAnalysisPanel } from './DiscountAnalysisPanel'
import { WeatherAnalysisPanel } from './WeatherAnalysisPanel'
import { CategoryHeatmapPanel } from './CategoryHeatmapPanel'

/** DuckDB クエリに必要な共通コンテキスト */
export interface DuckQueryContext {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
}

export interface SubAnalysisPanelProps extends DuckQueryContext {
  readonly mode: RightAxisMode
  readonly weatherDaily?: readonly DailyWeatherSummary[]
  // 売変パネル用（DiscountTrendChart が DailyRecord を使用 — 将来 DuckDB 化で廃止予定）
  readonly daily?: ReadonlyMap<number, DailyRecord>
  readonly daysInMonth?: number
  readonly year?: number
  readonly month?: number
  readonly discountEntries?: readonly DiscountEntry[]
  readonly totalGrossSales?: number
  readonly prevYearDaily?: ReadonlyMap<
    string,
    { sales: number; discount: number; discountEntries?: Record<string, number> }
  >
}

const PANEL_CONFIG: Record<RightAxisMode, { title: string; subtitle: string }> = {
  quantity: {
    title: 'カテゴリ別売上推移',
    subtitle: '部門/ライン別の日次トレンド',
  },
  customers: {
    title: '売上差 要因分解',
    subtitle: 'シャープリー値による売上変動の因数分解',
  },
  discount: {
    title: '売変分析',
    subtitle: '日別の売変推移と前年比較',
  },
  temperature: {
    title: '天気-売上 相関分析',
    subtitle: '気象条件と売上・客数の相関',
  },
}

export const SubAnalysisPanel = memo(function SubAnalysisPanel(props: SubAnalysisPanelProps) {
  const config = PANEL_CONFIG[props.mode]

  return (
    <PanelSlot key={props.mode}>
      <ChartCard title={config.title} subtitle={config.subtitle} variant="section">
        {renderPanel(props)}
      </ChartCard>
    </PanelSlot>
  )
})

function renderPanel(props: SubAnalysisPanelProps) {
  const ctx: DuckQueryContext = {
    queryExecutor: props.queryExecutor,
    currentDateRange: props.currentDateRange,
    selectedStoreIds: props.selectedStoreIds,
    prevYearScope: props.prevYearScope,
  }

  switch (props.mode) {
    case 'customers':
      return <FactorDecompositionPanel ctx={ctx} />
    case 'discount':
      return (
        <DiscountAnalysisPanel
          ctx={ctx}
          daily={props.daily ?? new Map()}
          daysInMonth={props.daysInMonth ?? 31}
          year={props.year ?? new Date().getFullYear()}
          month={props.month ?? new Date().getMonth() + 1}
          discountEntries={props.discountEntries}
          totalGrossSales={props.totalGrossSales}
          prevYearDaily={props.prevYearDaily}
        />
      )
    case 'temperature':
      return <WeatherAnalysisPanel ctx={ctx} weatherDaily={props.weatherDaily} />
    case 'quantity':
      return <CategoryHeatmapPanel ctx={ctx} />
  }
}

// ── Styles ──

const slideDown = keyframes`
  0% {
    opacity: 0;
    transform: translateY(-8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`

/** ChartCard のアニメーションスロット */
const PanelSlot = styled.div`
  margin-top: ${({ theme }) => theme.spacing[3]};
  animation: ${slideDown} 0.3s cubic-bezier(0.2, 0.9, 0.3, 1) both;
`
