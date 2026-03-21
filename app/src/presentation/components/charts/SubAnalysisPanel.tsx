/**
 * SubAnalysisPanel — 右軸モード連動サブ分析パネル
 *
 * 日別売上チャートの右軸選択に応じて、適切な分析パネルを動的にレンダリングする。
 * 全パネルは DuckDB をデータソースとし、DailyRecord Map には依存しない。
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

export interface SubAnalysisPanelProps {
  readonly mode: RightAxisMode
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly weatherDaily?: readonly DailyWeatherSummary[]
}

const PANEL_LABELS: Record<RightAxisMode, string> = {
  quantity: '部門×曜日ヒートマップ',
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
  switch (props.mode) {
    case 'customers':
      return (
        <FactorDecompositionPanel
          duckConn={props.duckConn}
          duckDataVersion={props.duckDataVersion}
          currentDateRange={props.currentDateRange}
          selectedStoreIds={props.selectedStoreIds}
          prevYearScope={props.prevYearScope}
        />
      )
    case 'discount':
      return (
        <DiscountAnalysisPanel
          duckConn={props.duckConn}
          duckDataVersion={props.duckDataVersion}
          currentDateRange={props.currentDateRange}
          selectedStoreIds={props.selectedStoreIds}
          prevYearScope={props.prevYearScope}
        />
      )
    case 'temperature':
      return (
        <WeatherAnalysisPanel
          duckConn={props.duckConn}
          duckDataVersion={props.duckDataVersion}
          currentDateRange={props.currentDateRange}
          selectedStoreIds={props.selectedStoreIds}
          weatherDaily={props.weatherDaily}
        />
      )
    case 'quantity':
      return (
        <CategoryHeatmapPanel
          duckConn={props.duckConn}
          duckDataVersion={props.duckDataVersion}
          currentDateRange={props.currentDateRange}
          selectedStoreIds={props.selectedStoreIds}
          prevYearScope={props.prevYearScope}
        />
      )
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
  animation: ${slideDown} 0.3s cubic-bezier(0.2, 0.9, 0.3, 1) both;
`

const PanelHeader = styled.div`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text2};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const PanelContent = styled.div`
  animation: ${slideDown} 0.25s cubic-bezier(0.2, 0.9, 0.3, 1) both;
`
