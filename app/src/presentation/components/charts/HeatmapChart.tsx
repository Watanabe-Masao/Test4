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
import { useState, useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import {
  useDuckDBHourDowMatrix,
  useDuckDBLevelAggregation,
} from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter, toPct } from './chartTheme'
import { palette } from '@/presentation/theme/tokens'
import { useI18n } from '@/application/hooks/useI18n'
import { EmptyState, ChartSkeleton } from '@/presentation/components/common'
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
  duckConn,
  duckDataVersion,
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

  const hierarchy = useMemo(
    () => ({
      deptCode: deptCode || undefined,
      lineCode: lineCode || undefined,
      klassCode: klassCode || undefined,
    }),
    [deptCode, lineCode, klassCode],
  )

  const prevYearRange = prevYearScope?.dateRange

  // 当年 時間帯×曜日マトリクス
  const {
    data: matrixRows,
    isLoading,
    error,
  } = useDuckDBHourDowMatrix(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    hierarchy,
  )

  // 前年 時間帯×曜日マトリクス（前年比モード用）
  const { data: prevMatrixRows } = useDuckDBHourDowMatrix(
    duckConn,
    duckDataVersion,
    prevYearRange,
    selectedStoreIds,
    hierarchy,
    true, // isPrevYear
  )

  // 階層ドロップダウン
  const { data: departments } = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'department',
    undefined,
    false,
  )
  const { data: lines } = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'line',
    deptCode ? { deptCode } : undefined,
    false,
  )
  const { data: klasses } = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'klass',
    deptCode || lineCode
      ? { deptCode: deptCode || undefined, lineCode: lineCode || undefined }
      : undefined,
    false,
  )

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
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </ChartCard>
    )
  }

  if (isLoading && !matrixRows) {
    return <ChartSkeleton />
  }

  if (!duckConn || duckDataVersion === 0 || !heatmapData || heatmapData.cells.size === 0) {
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
