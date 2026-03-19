/**
 * 店舗×時間帯比較チャート (ECharts)
 *
 * パイプライン:
 *   DuckDB Hook → StoreHourlyChartLogic.ts → ECharts option → EChart
 */
import { useState, useMemo, memo, useCallback } from 'react'
import { useTheme } from 'styled-components'
import { HOUR_MIN, HOUR_MAX } from './HeatmapChart.helpers'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import type { AppTheme } from '@/presentation/theme/theme'
import { useDuckDBStoreAggregation } from '@/application/hooks/useDuckDBQuery'
import { useCurrencyFormatter, toPct } from './chartTheme'
import {
  buildStoreHourlyData,
  SIMILARITY_HIGH,
  type StoreInfo,
  type StoreHourlyMode,
} from './StoreHourlyChartLogic'
import { useI18n } from '@/application/hooks/useI18n'
import { Modal } from '@/presentation/components/common'
import { SegmentedControl } from '@/presentation/components/common'
import { ChartCard } from './ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from './ChartState'
import { EChart, type EChartsOption } from './EChart'
import { yenYAxis, standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { valueYAxis } from './builders'
import { chartFontSize } from '@/presentation/theme/tokens'
import {
  SummaryGrid,
  StoreCard,
  StoreName,
  PeakInfo,
  ModalSimilarityList,
  ModalSimilarityRow,
  ModalPairLabel,
  ModalSimValue,
  ModalStoreDetail,
  ModalSectionTitle,
} from './StoreHourlyChart.styles'

const MODE_OPTIONS: readonly { value: StoreHourlyMode; label: string }[] = [
  { value: 'amount', label: '金額' },
  { value: 'ratio', label: '構成比' },
]

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly stores: ReadonlyMap<string, { name: string }>
}

function buildOption(
  chartData: readonly { hour: string; [k: string]: string | number }[],
  storeInfos: readonly StoreInfo[],
  mode: StoreHourlyMode,
  theme: AppTheme,
): EChartsOption {
  const hours = chartData.map((d) => d.hour)
  return {
    grid: standardGrid(),
    tooltip: standardTooltip(theme),
    legend: { ...standardLegend(theme), type: 'scroll' },
    xAxis: {
      type: 'category',
      data: hours,
      axisLabel: {
        color: theme.colors.text3,
        fontSize: chartFontSize.axis,
        fontFamily: theme.typography.fontFamily.mono,
      },
      axisLine: { lineStyle: { color: theme.colors.border } },
    },
    yAxis:
      mode === 'ratio'
        ? valueYAxis(theme, { formatter: (v: number) => `${v}%` })
        : yenYAxis(theme),
    series: storeInfos.map((store) => ({
      name: store.name,
      type: 'bar' as const,
      data: chartData.map((d) => (d[`store_${store.storeId}`] as number) ?? 0),
      itemStyle: { color: store.color, opacity: 0.8 },
      stack: mode === 'ratio' ? 'ratio' : undefined,
    })),
  }
}

export const StoreHourlyChart = memo(function StoreHourlyChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
  stores,
}: Props) {
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()
  const [mode, setMode] = useState<StoreHourlyMode>('amount')
  const [selectedStoreInfo, setSelectedStoreInfo] = useState<StoreInfo | null>(null)

  const handleCloseModal = useCallback(() => setSelectedStoreInfo(null), [])

  const {
    data: storeRows,
    error,
    isLoading,
  } = useDuckDBStoreAggregation(duckConn, duckDataVersion, currentDateRange, selectedStoreIds)

  const { chartData, storeInfos, similarities } = useMemo(
    () =>
      storeRows
        ? buildStoreHourlyData(storeRows, stores, mode, HOUR_MIN, HOUR_MAX)
        : { chartData: [], storeInfos: [], similarities: [] },
    [storeRows, stores, mode],
  )

  const option = useMemo(
    () => buildOption(chartData, storeInfos, mode, theme),
    [chartData, storeInfos, mode, theme],
  )

  if (error) {
    return (
      <ChartCard title="店舗×時間帯比較">
        <ChartError message={`${messages.errors.dataFetchFailed}: ${error}`} />
      </ChartCard>
    )
  }
  if (isLoading && !storeRows) {
    return (
      <ChartCard title="店舗×時間帯比較">
        <ChartLoading />
      </ChartCard>
    )
  }
  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return (
      <ChartCard title="店舗×時間帯比較">
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  const toolbar = (
    <SegmentedControl
      options={MODE_OPTIONS}
      value={mode}
      onChange={setMode}
      ariaLabel="表示モード"
    />
  )

  return (
    <ChartCard
      title="店舗×時間帯比較"
      subtitle="店舗別の時間帯売上パターン | ピーク・コアタイム・類似度分析"
      toolbar={toolbar}
    >
      <EChart option={option} height={300} ariaLabel="店舗×時間帯比較チャート" />

      <SummaryGrid>
        {storeInfos.map((store) => (
          <StoreCard
            key={store.storeId}
            $borderColor={store.color}
            onClick={() => setSelectedStoreInfo(store)}
            title="クリックで類似度分析を表示"
          >
            <StoreName>{store.name}</StoreName>
            <PeakInfo>
              ピーク: {store.peakHour}時 ({fmt(store.peakAmount)})
            </PeakInfo>
            <PeakInfo>
              コアタイム: {store.coreTimeStart}〜{store.coreTimeEnd}時
            </PeakInfo>
            <PeakInfo>折り返し: {store.turnoverHour}時</PeakInfo>
          </StoreCard>
        ))}
      </SummaryGrid>

      {selectedStoreInfo && (
        <Modal title={`${selectedStoreInfo.name} — 時間帯分析`} onClose={handleCloseModal}>
          <ModalStoreDetail>
            <div>
              <strong>ピーク時間帯:</strong> {selectedStoreInfo.peakHour}時（
              {fmt(selectedStoreInfo.peakAmount)}）
            </div>
            <div>
              <strong>コアタイム:</strong> {selectedStoreInfo.coreTimeStart}〜
              {selectedStoreInfo.coreTimeEnd}時
            </div>
            <div>
              <strong>折り返し:</strong> {selectedStoreInfo.turnoverHour}時
            </div>
          </ModalStoreDetail>

          {similarities.length > 0 && (
            <>
              <ModalSectionTitle>店舗間パターン類似度（コサイン類似度）</ModalSectionTitle>
              <ModalSimilarityList>
                {similarities
                  .filter(
                    (p) =>
                      p.storeA === selectedStoreInfo.name || p.storeB === selectedStoreInfo.name,
                  )
                  .map((pair) => (
                    <ModalSimilarityRow
                      key={`${pair.storeA}-${pair.storeB}`}
                      $high={pair.similarity >= SIMILARITY_HIGH}
                    >
                      <ModalPairLabel>
                        {pair.storeA === selectedStoreInfo.name ? pair.storeB : pair.storeA}
                      </ModalPairLabel>
                      <ModalSimValue $high={pair.similarity >= SIMILARITY_HIGH}>
                        {toPct(pair.similarity)}
                        {pair.similarity >= SIMILARITY_HIGH && ' (高相似度)'}
                      </ModalSimValue>
                    </ModalSimilarityRow>
                  ))}
              </ModalSimilarityList>
            </>
          )}
        </Modal>
      )}
    </ChartCard>
  )
})
