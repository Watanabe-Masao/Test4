/**
 * 時間帯×曜日ヒートマップ
 *
 * HourDowMatrix クエリを使い、時間帯（行）× 曜日（列）の
 * 売上日平均をヒートマップで表示する。セル色は売上額に比例し、
 * Z-score が 2 を超えるセルには赤枠の異常マーカーを付与する。
 *
 * 表示項目:
 * - 時間帯×曜日の売上日平均ヒートマップ
 * - Z-score 異常検出マーカー（|z| > 2）
 */
/**
 * @migration P5: useQueryWithHandler 経由に移行済み（旧: useDuckDBHourDowMatrix + useDuckDBLevelAggregation 直接 import）
 */
import { useState, useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { dateRangeToKeys } from '@/domain/models/calendar'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  hourDowMatrixHandler,
  type HourDowMatrixInput,
} from '@/application/queries/cts/HourDowMatrixHandler'
import {
  levelAggregationHandler,
  type LevelAggregationInput,
} from '@/application/queries/cts/LevelAggregationHandler'
import { useChartTheme, useCurrencyFormatter, toPct } from './chartTheme'
import { palette } from '@/presentation/theme/tokens'
import { useI18n } from '@/application/hooks/useI18n'
import { ChartSkeleton } from '@/presentation/components/common/feedback'
import { EmptyState } from '@/presentation/components/common/layout'
import { CHART_GUIDES } from './chartGuides'
import { ChartCard } from './ChartCard'
import {
  GridContainer,
  HeatmapTable,
  HeaderCell,
  RowHeader,
  DataCell,
  SummaryRow,
  SummaryItem,
  SummaryLabel,
  LegendBar,
  GradientBar,
  ErrorMsg,
  TabGroup,
  Tab,
  HierarchyRow,
  HierarchySelect,
  DiffDataCell,
} from './HeatmapChart.styles'
import {
  type HeatmapMode,
  type Props,
  HOUR_MIN,
  HOUR_MAX,
  DOW_LABELS,
  DOW_ORDER,
  Z_SCORE_THRESHOLD,
  cellKey,
  buildHeatmapData,
  interpolateColor,
  buildDiffMap,
} from './HeatmapChart.helpers'

// ── Component ──

export const HeatmapChart = memo(function HeatmapChart({
  queryExecutor,
  currentDateRange,
  selectedStoreIds,
  prevYearScope,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()
  const theme = useTheme() as AppTheme
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('amount')
  const [deptCode, setDeptCode] = useState('')
  const [lineCode, setLineCode] = useState('')
  const [klassCode, setKlassCode] = useState('')

  const prevYearRange = prevYearScope?.dateRange

  // 当年 時間帯×曜日マトリクス
  const matrixInput = useMemo<HourDowMatrixInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
      deptCode: deptCode || undefined,
      lineCode: lineCode || undefined,
      klassCode: klassCode || undefined,
    }
  }, [currentDateRange, selectedStoreIds, deptCode, lineCode, klassCode])

  const {
    data: matrixOutput,
    isLoading,
    error,
  } = useQueryWithHandler(queryExecutor, hourDowMatrixHandler, matrixInput)
  const matrixRows = matrixOutput?.records ?? null

  // 前年 時間帯×曜日マトリクス（前年比モード用）
  const prevMatrixInput = useMemo<HourDowMatrixInput | null>(() => {
    if (!prevYearRange) return null
    const { fromKey, toKey } = dateRangeToKeys(prevYearRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
      deptCode: deptCode || undefined,
      lineCode: lineCode || undefined,
      klassCode: klassCode || undefined,
      isPrevYear: true,
    }
  }, [prevYearRange, selectedStoreIds, deptCode, lineCode, klassCode])

  const { data: prevMatrixOutput } = useQueryWithHandler(
    queryExecutor,
    hourDowMatrixHandler,
    prevMatrixInput,
  )
  const prevMatrixRows = prevMatrixOutput?.records ?? null

  // 階層ドロップダウン
  const deptInput = useMemo<LevelAggregationInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
      level: 'department' as const,
    }
  }, [currentDateRange, selectedStoreIds])

  const { data: deptOutput } = useQueryWithHandler(
    queryExecutor,
    levelAggregationHandler,
    deptInput,
  )
  const departments = deptOutput?.records ?? null

  const lineInput = useMemo<LevelAggregationInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
      level: 'line' as const,
      deptCode: deptCode || undefined,
    }
  }, [currentDateRange, selectedStoreIds, deptCode])

  const { data: lineOutput } = useQueryWithHandler(
    queryExecutor,
    levelAggregationHandler,
    lineInput,
  )
  const lines = lineOutput?.records ?? null

  const klassInput = useMemo<LevelAggregationInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
      level: 'klass' as const,
      deptCode: deptCode || undefined,
      lineCode: lineCode || undefined,
    }
  }, [currentDateRange, selectedStoreIds, deptCode, lineCode])

  const { data: klassOutput } = useQueryWithHandler(
    queryExecutor,
    levelAggregationHandler,
    klassInput,
  )
  const klasses = klassOutput?.records ?? null

  const heatmapData = useMemo(
    () => (matrixRows ? buildHeatmapData(matrixRows) : null),
    [matrixRows],
  )

  const diffMap = useMemo(
    () => (matrixRows && prevMatrixRows ? buildDiffMap(matrixRows, prevMatrixRows) : null),
    [matrixRows, prevMatrixRows],
  )

  const hasPrevData = (prevMatrixRows?.length ?? 0) > 0

  const wrappedSetDept = (code: string) => {
    setDeptCode(code)
    setLineCode('')
    setKlassCode('')
  }
  const wrappedSetLine = (code: string) => {
    setLineCode(code)
    setKlassCode('')
  }

  if (error) {
    return (
      <ChartCard title="時間帯×曜日ヒートマップ" ariaLabel="時間帯×曜日ヒートマップ">
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error?.message}
        </ErrorMsg>
      </ChartCard>
    )
  }

  if (isLoading && !matrixRows) {
    return <ChartSkeleton />
  }

  if (!queryExecutor || !heatmapData || heatmapData.cells.size === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  const bgBase = ct.isDark ? '#1e1e2e' : '#f8fafc'
  const primaryHex = palette.primary

  const hours: number[] = []
  for (let h = HOUR_MIN; h <= HOUR_MAX; h++) hours.push(h)

  const isAmountMode = heatmapMode === 'amount'

  return (
    <ChartCard
      title="時間帯×曜日ヒートマップ"
      subtitle={
        isAmountMode
          ? `セル色 = 売上額（日平均） | 赤枠 = 異常検出 (Z > ${Z_SCORE_THRESHOLD})`
          : 'セル色 = 前年比増減率（緑:増 / 赤:減）'
      }
      guide={CHART_GUIDES['heatmap-hour-dow']}
      ariaLabel="時間帯×曜日ヒートマップ"
      toolbar={
        hasPrevData ? (
          <TabGroup>
            <Tab $active={isAmountMode} onClick={() => setHeatmapMode('amount')}>
              売上金額
            </Tab>
            <Tab $active={!isAmountMode} onClick={() => setHeatmapMode('yoyDiff')}>
              比較期増減
            </Tab>
          </TabGroup>
        ) : undefined
      }
    >
      <GridContainer>
        <HeatmapTable aria-label="時間帯×曜日ヒートマップ">
          <thead>
            <tr>
              <HeaderCell scope="col" />
              {DOW_ORDER.map((dow) => (
                <HeaderCell key={dow} scope="col">
                  {DOW_LABELS[dow]}
                </HeaderCell>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour) => (
              <tr key={hour}>
                <RowHeader>{hour}時</RowHeader>
                {DOW_ORDER.map((dow) => {
                  const key = cellKey(hour, dow)

                  if (!isAmountMode && diffMap) {
                    const ratio = diffMap.get(key)
                    if (ratio == null) {
                      return (
                        <DiffDataCell
                          key={dow}
                          $ratio={0}
                          $hasData={false}
                          $textColor={ct.textMuted}
                        >
                          -
                        </DiffDataCell>
                      )
                    }
                    const textColor = Math.abs(ratio) > 0.15 ? palette.white : ct.textMuted
                    return (
                      <DiffDataCell
                        key={dow}
                        $ratio={ratio}
                        $hasData
                        $textColor={textColor}
                        title={`${hour}時 ${DOW_LABELS[dow]} | ${ratio >= 0 ? '+' : ''}${toPct(ratio)}`}
                      >
                        {ratio >= 0 ? '+' : ''}
                        {toPct(ratio)}
                      </DiffDataCell>
                    )
                  }

                  const cell = heatmapData.cells.get(key)
                  if (!cell) {
                    return (
                      <DataCell
                        key={dow}
                        $bgColor={bgBase}
                        $isAnomaly={false}
                        $textColor={ct.textMuted}
                      >
                        -
                      </DataCell>
                    )
                  }
                  const ratio = heatmapData.maxValue > 0 ? cell.dailyAvg / heatmapData.maxValue : 0
                  const bgColor = interpolateColor(ratio, bgBase, primaryHex)
                  const textColor =
                    ratio > 0.5 ? (ct.isDark ? theme.colors.text : palette.white) : ct.textMuted
                  return (
                    <DataCell
                      key={dow}
                      $bgColor={bgColor}
                      $isAnomaly={cell.isAnomaly}
                      $textColor={textColor}
                      title={`${hour}時 ${DOW_LABELS[dow]} | ${fmt(cell.dailyAvg)} | z=${cell.zScore}`}
                    >
                      {fmt(cell.dailyAvg)}
                    </DataCell>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </HeatmapTable>
      </GridContainer>

      <LegendBar>
        {isAmountMode ? (
          <>
            <span>低</span>
            <GradientBar $from={bgBase} $to={primaryHex} />
            <span>高</span>
            {heatmapData.anomalyCount > 0 && (
              <span style={{ marginLeft: '12px', color: theme.colors.palette.dangerDark }}>
                異常セル: {heatmapData.anomalyCount}件
              </span>
            )}
          </>
        ) : (
          <>
            <span>減少</span>
            <GradientBar $from={`${palette.dangerDark}cc`} $to={`${palette.successDark}cc`} />
            <span>増加</span>
          </>
        )}
      </LegendBar>

      <SummaryRow>
        <SummaryItem>
          <SummaryLabel>ピーク:</SummaryLabel>
          {DOW_LABELS[heatmapData.peakDow]} {heatmapData.peakHour}時
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>日平均売上:</SummaryLabel>
          {fmt(heatmapData.peakValue)}
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>異常検出:</SummaryLabel>
          {heatmapData.anomalyCount}件
        </SummaryItem>
      </SummaryRow>

      {/* ── Hierarchy filter ── */}
      {((departments?.length ?? 0) > 1 ||
        (lines?.length ?? 0) > 1 ||
        (klasses?.length ?? 0) > 1) && (
        <HierarchyRow>
          {(departments?.length ?? 0) > 1 && (
            <HierarchySelect value={deptCode} onChange={(e) => wrappedSetDept(e.target.value)}>
              <option value="">全部門</option>
              {departments?.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </HierarchySelect>
          )}
          {deptCode && (lines?.length ?? 0) > 1 && (
            <HierarchySelect value={lineCode} onChange={(e) => wrappedSetLine(e.target.value)}>
              <option value="">全ライン</option>
              {lines?.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </HierarchySelect>
          )}
          {lineCode && (klasses?.length ?? 0) > 1 && (
            <HierarchySelect value={klassCode} onChange={(e) => setKlassCode(e.target.value)}>
              <option value="">全クラス</option>
              {klasses?.map((k) => (
                <option key={k.code} value={k.code}>
                  {k.name}
                </option>
              ))}
            </HierarchySelect>
          )}
        </HierarchyRow>
      )}
    </ChartCard>
  )
})
