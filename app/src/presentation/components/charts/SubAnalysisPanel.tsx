/**
 * SubAnalysisPanel — 右軸モード連動サブ分析パネル
 *
 * 日別売上チャートの右軸選択に応じて、適切な分析パネルを動的にレンダリングする。
 * 全パネルは DuckDB をデータソースとし、DailyRecord Map には依存しない。
 *
 * DuckQueryContext: DuckDB 接続 + フィルタ条件の共通型。
 * 全パネルがこの型を props として受け取ることでバケツリレーを解消。
 */
import { memo } from 'react'
import styled, { keyframes } from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { DailyWeatherSummary } from '@/domain/models/record'
import type { RightAxisMode } from './DailySalesChartBodyLogic'
import { FactorDecompositionPanel } from './FactorDecompositionPanel'
import { DiscountAnalysisPanel } from './DiscountAnalysisPanel'
import { WeatherAnalysisPanel } from './WeatherAnalysisPanel'
import { CategoryHeatmapPanel } from './CategoryHeatmapPanel'

/** DuckDB クエリに必要な共通コンテキスト */
export interface DuckQueryContext {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
}

export interface SubAnalysisPanelProps extends DuckQueryContext {
  readonly mode: RightAxisMode
  readonly weatherDaily?: readonly DailyWeatherSummary[]
}

const PANEL_LABELS: Record<RightAxisMode, string> = {
  quantity: 'カテゴリ別売上推移',
  customers: '売上差 要因分解',
  discount: '売変分析',
  temperature: '天気-売上 相関分析',
}

export const SubAnalysisPanel = memo(function SubAnalysisPanel(props: SubAnalysisPanelProps) {
  return (
    <PanelWrapper>
      <PanelHeader>{PANEL_LABELS[props.mode]}</PanelHeader>
      <PanelContent key={props.mode}>{renderPanel(props)}</PanelContent>
    </PanelWrapper>
  )
})

function renderPanel(props: SubAnalysisPanelProps) {
  const ctx: DuckQueryContext = {
    duckConn: props.duckConn,
    duckDataVersion: props.duckDataVersion,
    currentDateRange: props.currentDateRange,
    selectedStoreIds: props.selectedStoreIds,
    prevYearScope: props.prevYearScope,
  }

  switch (props.mode) {
    case 'customers':
      return <FactorDecompositionPanel ctx={ctx} />
    case 'discount':
      return <DiscountAnalysisPanel ctx={ctx} />
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
    max-height: 0;
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    max-height: 600px;
  }
`

const PanelWrapper = styled.div`
  margin-top: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  animation: ${slideDown} 0.3s cubic-bezier(0.2, 0.9, 0.3, 1) both;
  transition: box-shadow ${({ theme }) => theme.transitions.fast}
    ${({ theme }) => theme.transitions.ease};

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`

const PanelHeader = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

const PanelContent = styled.div`
  animation: ${slideDown} 0.25s cubic-bezier(0.2, 0.9, 0.3, 1) both;
`
