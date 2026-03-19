/**
 * 店舗×時間帯比較チャート
 *
 * StoreAggregation クエリを使い、店舗ごとの時間帯別売上を
 * グループ棒グラフで比較表示する。金額 / 構成比モードの切替が可能。
 *
 * 表示項目:
 * - 店舗別の時間帯売上（グループ棒グラフ）
 * - 金額 / 構成比 切替
 * - 各店舗のピーク時間帯・コアタイム・折り返し時間
 * - 店舗間パターン類似度（コサイン類似度）
 */
import { useState, useMemo, memo, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { HOUR_MIN, HOUR_MAX } from './HeatmapChart.helpers'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import { useDuckDBStoreAggregation } from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter, toPct, toAxisYen } from './chartTheme'
import {
  buildStoreHourlyData,
  SIMILARITY_HIGH,
  type StoreInfo,
  type StoreHourlyMode,
} from './StoreHourlyChartLogic'
import { createChartTooltip } from './createChartTooltip'
import { useI18n } from '@/application/hooks/useI18n'
import { EmptyState, ChartSkeleton } from '@/presentation/components/common'
import { Modal } from '@/presentation/components/common'
import {
  Wrapper,
  Title,
  Subtitle,
  HeaderRow,
  ToggleGroup,
  ToggleButton,
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
  ErrorMsg,
} from './StoreHourlyChart.styles'

// ── Types ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly stores: ReadonlyMap<string, { name: string }>
}

// ── Component ──

export const StoreHourlyChart = memo(function StoreHourlyChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
  stores,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()
  const [mode, setMode] = useState<StoreHourlyMode>('amount')
  const [selectedStoreInfo, setSelectedStoreInfo] = useState<StoreInfo | null>(null)

  const handleStoreCardClick = useCallback((store: StoreInfo) => {
    setSelectedStoreInfo(store)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedStoreInfo(null)
  }, [])

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

  if (error) {
    return (
      <Wrapper aria-label="店舗×時間帯比較">
        <Title>店舗×時間帯比較</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (isLoading && !storeRows) {
    return <ChartSkeleton />
  }

  if (!duckConn || duckDataVersion === 0 || chartData.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  return (
    <Wrapper aria-label="店舗×時間帯比較">
      <HeaderRow>
        <div>
          <Title>店舗×時間帯比較</Title>
          <Subtitle>店舗別の時間帯売上パターン | ピーク・コアタイム・類似度分析</Subtitle>
        </div>
        <ToggleGroup role="tablist" aria-label="表示モード切替">
          <ToggleButton
            $active={mode === 'amount'}
            onClick={() => setMode('amount')}
            role="tab"
            aria-selected={mode === 'amount'}
          >
            金額
          </ToggleButton>
          <ToggleButton
            $active={mode === 'ratio'}
            onClick={() => setMode('ratio')}
            role="tab"
            aria-selected={mode === 'ratio'}
          >
            構成比
          </ToggleButton>
        </ToggleGroup>
      </HeaderRow>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
          />
          <YAxis
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={(v: number) => (mode === 'ratio' ? toPct(v / 100) : toAxisYen(v))}
          />
          <Tooltip
            content={createChartTooltip({
              ct,
              formatter: (value: unknown, name: string) => {
                const v = value as number | undefined
                return [v != null ? (mode === 'ratio' ? toPct(v / 100) : fmt(v)) : '-', name]
              },
            })}
          />
          <Legend wrapperStyle={{ fontSize: '0.6rem' }} />

          {storeInfos.map((store) => (
            <Bar
              key={`store_${store.storeId}`}
              dataKey={`store_${store.storeId}`}
              name={store.name}
              fill={store.color}
              opacity={0.8}
              stackId={mode === 'ratio' ? 'ratio' : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Store summary cards with analytics — click to open detail modal */}
      <SummaryGrid>
        {storeInfos.map((store) => (
          <StoreCard
            key={store.storeId}
            $borderColor={store.color}
            onClick={() => handleStoreCardClick(store)}
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

      {/* Store detail + similarity modal */}
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
                    (pair) =>
                      pair.storeA === selectedStoreInfo.name ||
                      pair.storeB === selectedStoreInfo.name,
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

              {similarities.filter(
                (p) => p.storeA !== selectedStoreInfo.name && p.storeB !== selectedStoreInfo.name,
              ).length > 0 && (
                <>
                  <ModalSectionTitle>その他の店舗ペア</ModalSectionTitle>
                  <ModalSimilarityList>
                    {similarities
                      .filter(
                        (p) =>
                          p.storeA !== selectedStoreInfo.name &&
                          p.storeB !== selectedStoreInfo.name,
                      )
                      .map((pair) => (
                        <ModalSimilarityRow
                          key={`${pair.storeA}-${pair.storeB}`}
                          $high={pair.similarity >= SIMILARITY_HIGH}
                        >
                          <ModalPairLabel>
                            {pair.storeA} × {pair.storeB}
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
            </>
          )}
        </Modal>
      )}
    </Wrapper>
  )
})
