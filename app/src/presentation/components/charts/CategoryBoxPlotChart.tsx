/**
 * カテゴリ箱ひげ図 — 独立ウィジェット
 *
 * カテゴリベンチマークから分離された箱ひげ図ビュー。
 * 店舗別 / 期間別の分布を箱ひげ図で表示し、
 * ドリルダウンで店舗別・日別の内訳を確認できる。
 */
import { useState, useMemo, memo } from 'react'
import type {
  CategoryBenchmarkRow,
  CategoryBenchmarkTrendRow,
} from '@/application/hooks/useDuckDBQuery'
import {
  buildStoreBreakdown,
  buildDateBreakdown,
  type BoxPlotStats,
} from '@/application/hooks/useDuckDBQuery'
import { EmptyState, ChartSkeleton } from '@/presentation/components/common'
import {
  Wrapper,
  HeaderRow,
  Title,
  Subtitle,
  Controls,
  ControlGroup,
  ControlLabel,
  ButtonGroup,
  ToggleBtn,
  ErrorMsg,
  MapLegend,
  LegendItem,
  FilterSelect,
} from './CategoryBoxPlotChart.styles'
import {
  useCategoryBoxPlotChartVm,
  LEVEL_LABELS,
  BOX_METRIC_LABELS,
  ANALYSIS_AXIS_LABELS,
  type Props,
  type CategoryLevel,
  type BoxMetric,
  type AnalysisAxis,
  type ChartTheme,
} from './CategoryBoxPlotChart.vm'
import { StoreBreakdownChart, DateBreakdownChart } from './CategoryBoxPlotBreakdownCharts'

// ── BoxPlotView ──

function BoxPlotView({
  boxData,
  ct,
  fmt,
  metricLabel,
  rawRows,
  trendRows,
  boxMetric,
  boxAxis,
  storeNameMap,
}: {
  boxData: readonly BoxPlotStats[]
  ct: ChartTheme
  fmt: (v: number) => string
  metricLabel: string
  rawRows: readonly CategoryBenchmarkRow[] | null
  trendRows: readonly CategoryBenchmarkTrendRow[] | null
  boxMetric: 'sales' | 'quantity'
  boxAxis: AnalysisAxis
  storeNameMap: ReadonlyMap<string, string>
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  const storeBreakdown = useMemo(() => {
    if (boxAxis !== 'store' || !selectedCode || !rawRows) return null
    return buildStoreBreakdown(rawRows, selectedCode, boxMetric)
  }, [selectedCode, rawRows, boxMetric, boxAxis])

  const dateBreakdown = useMemo(() => {
    if (boxAxis !== 'date' || !selectedCode || !trendRows) return null
    return buildDateBreakdown(trendRows, selectedCode)
  }, [selectedCode, trendRows, boxAxis])

  const selectedName = useMemo(
    () => boxData.find((d) => d.code === selectedCode)?.name ?? '',
    [boxData, selectedCode],
  )

  const handleRowClick = (code: string) => {
    setSelectedCode((prev) => (prev === code ? null : code))
  }

  const marginLeft = 90
  const marginRight = 40
  const marginTop = 10
  const marginBottom = 30
  const rowHeight = 36
  const chartHeight = Math.max(200, boxData.length * rowHeight + marginTop + marginBottom)

  const xMax = useMemo(() => {
    if (boxData.length === 0) return 100
    const m = Math.max(...boxData.map((d) => d.max))
    const mag = Math.pow(10, Math.floor(Math.log10(m)))
    return Math.ceil(m / mag) * mag * 1.05
  }, [boxData])

  if (boxData.length === 0) {
    return <EmptyState>箱ひげ図データがありません</EmptyState>
  }

  const hovered = hoveredIdx !== null ? boxData[hoveredIdx] : null

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <svg width="100%" height={chartHeight} viewBox={`0 0 800 ${chartHeight}`}>
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const xPx = marginLeft + frac * (800 - marginLeft - marginRight)
            const val = frac * xMax
            return (
              <g key={frac}>
                <line
                  x1={xPx}
                  y1={marginTop}
                  x2={xPx}
                  y2={chartHeight - marginBottom}
                  stroke={ct.grid}
                  strokeOpacity={0.3}
                  strokeDasharray="3 3"
                />
                <text
                  x={xPx}
                  y={chartHeight - marginBottom + 16}
                  textAnchor="middle"
                  fill={ct.textMuted}
                  fontSize={10}
                >
                  {val >= 1000000
                    ? `${(val / 1000000).toFixed(1)}M`
                    : val >= 1000
                      ? `${(val / 1000).toFixed(0)}K`
                      : String(Math.round(val))}
                </text>
              </g>
            )
          })}
          {boxData.map((d, i) => {
            const plotW = 800 - marginLeft - marginRight
            const yCenter = marginTop + i * rowHeight + rowHeight / 2
            const barH = rowHeight * 0.55
            const scale = xMax > 0 ? plotW / xMax : 0

            const xMinPx = marginLeft + d.min * scale
            const xQ1Px = marginLeft + d.q1 * scale
            const xMedianPx = marginLeft + d.median * scale
            const xMeanPx = marginLeft + d.mean * scale
            const xQ3Px = marginLeft + d.q3 * scale
            const xMaxPx = marginLeft + d.max * scale
            const whiskerH = barH * 0.5

            const isSelected = selectedCode === d.code

            return (
              <g
                key={d.code}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => handleRowClick(d.code)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={0}
                  y={marginTop + i * rowHeight}
                  width={800}
                  height={rowHeight}
                  fill={
                    isSelected
                      ? ct.bg2 === '#fff'
                        ? 'rgba(99,102,241,0.08)'
                        : 'rgba(99,102,241,0.15)'
                      : hoveredIdx === i
                        ? ct.bg2 === '#fff'
                          ? '#f3f4f6'
                          : 'rgba(255,255,255,0.05)'
                        : 'transparent'
                  }
                />
                <text
                  x={marginLeft - 6}
                  y={yCenter + 4}
                  textAnchor="end"
                  fill={isSelected ? '#6366f1' : ct.textMuted}
                  fontSize={10}
                  fontWeight={isSelected ? 700 : 400}
                >
                  {d.name.length > 10 ? d.name.slice(0, 10) + '…' : d.name}
                </text>
                {/* Left whisker */}
                <line
                  x1={xMinPx}
                  y1={yCenter}
                  x2={xQ1Px}
                  y2={yCenter}
                  stroke="#6366f1"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                />
                <line
                  x1={xMinPx}
                  y1={yCenter - whiskerH / 2}
                  x2={xMinPx}
                  y2={yCenter + whiskerH / 2}
                  stroke="#6366f1"
                  strokeWidth={2}
                />
                {/* IQR box */}
                <rect
                  x={xQ1Px}
                  y={yCenter - barH / 2}
                  width={Math.max(xQ3Px - xQ1Px, 1)}
                  height={barH}
                  fill="#6366f1"
                  fillOpacity={0.6}
                  stroke="#6366f1"
                  strokeWidth={1}
                  rx={2}
                />
                {/* Median line */}
                <line
                  x1={xMedianPx}
                  y1={yCenter - barH / 2}
                  x2={xMedianPx}
                  y2={yCenter + barH / 2}
                  stroke="#fff"
                  strokeWidth={2}
                />
                {/* Right whisker */}
                <line
                  x1={xQ3Px}
                  y1={yCenter}
                  x2={xMaxPx}
                  y2={yCenter}
                  stroke="#6366f1"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                />
                <line
                  x1={xMaxPx}
                  y1={yCenter - whiskerH / 2}
                  x2={xMaxPx}
                  y2={yCenter + whiskerH / 2}
                  stroke="#6366f1"
                  strokeWidth={2}
                />
                {/* Mean marker */}
                <line
                  x1={xMeanPx - 3}
                  y1={yCenter - 3}
                  x2={xMeanPx + 3}
                  y2={yCenter + 3}
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                />
                <line
                  x1={xMeanPx - 3}
                  y1={yCenter + 3}
                  x2={xMeanPx + 3}
                  y2={yCenter - 3}
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                />
              </g>
            )
          })}
        </svg>
        {hovered && hoveredIdx !== null && (
          <div
            style={{
              position: 'absolute',
              top: marginTop + hoveredIdx * rowHeight - 10,
              right: marginRight,
              background: ct.bg2,
              border: `1px solid ${ct.grid}`,
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: ct.fontSize.sm,
              fontFamily: ct.fontFamily,
              color: ct.text,
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {hovered.name} ({hovered.code})
            </div>
            <div style={{ fontSize: '0.6rem', color: ct.textMuted, marginBottom: 2 }}>
              {metricLabel}
            </div>
            <div>最大値: {fmt(hovered.max)}</div>
            <div>Q3 (75%): {fmt(hovered.q3)}</div>
            <div>中央値: {fmt(hovered.median)}</div>
            <div>Q1 (25%): {fmt(hovered.q1)}</div>
            <div>最小値: {fmt(hovered.min)}</div>
            <div>平均値: {fmt(hovered.mean)}</div>
            <div>
              {boxAxis === 'store' ? '店舗数' : '日数'}: {hovered.count}
            </div>
          </div>
        )}
      </div>
      <MapLegend>
        <LegendItem $color="#6366f1">Q1-Q3 (四分位範囲)</LegendItem>
        <span
          style={{
            fontSize: '0.6rem',
            color: ct.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 12,
              height: 2,
              background: '#fff',
              border: '1px solid #6366f1',
            }}
          />
          中央値
        </span>
        <span
          style={{
            fontSize: '0.6rem',
            color: ct.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{ color: '#f59e0b', fontWeight: 700 }}>×</span>
          平均値
        </span>
      </MapLegend>
      {selectedCode && boxAxis === 'store' && storeBreakdown && storeBreakdown.length > 0 && (
        <StoreBreakdownChart
          items={storeBreakdown}
          storeNameMap={storeNameMap}
          ct={ct}
          fmt={fmt}
          categoryName={selectedName}
          onClose={() => setSelectedCode(null)}
        />
      )}
      {selectedCode && boxAxis === 'date' && dateBreakdown && dateBreakdown.length > 0 && (
        <DateBreakdownChart
          items={dateBreakdown}
          ct={ct}
          fmt={fmt}
          categoryName={selectedName}
          onClose={() => setSelectedCode(null)}
        />
      )}
    </div>
  )
}

// ── Main Component ──

export const CategoryBoxPlotChart = memo(function CategoryBoxPlotChart(props: Props) {
  const vm = useCategoryBoxPlotChartVm(props)

  if (vm.error) {
    return (
      <Wrapper aria-label="カテゴリ箱ひげ図">
        <Title>カテゴリ箱ひげ図</Title>
        <ErrorMsg>
          {vm.messages.errors.dataFetchFailed}: {vm.error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (vm.isLoading && !vm.rawRows) {
    return <ChartSkeleton />
  }

  if (!props.duckConn || props.duckDataVersion === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  return (
    <Wrapper aria-label="カテゴリ箱ひげ図">
      <HeaderRow>
        <div>
          <Title>カテゴリ箱ひげ図</Title>
          <Subtitle>{vm.subtitle}</Subtitle>
        </div>
        <Controls>
          <ControlGroup>
            <ControlLabel>階層</ControlLabel>
            <ButtonGroup>
              {(Object.keys(LEVEL_LABELS) as CategoryLevel[]).map((l) => (
                <ToggleBtn key={l} $active={vm.level === l} onClick={() => vm.handleLevelChange(l)}>
                  {LEVEL_LABELS[l]}
                </ToggleBtn>
              ))}
            </ButtonGroup>
          </ControlGroup>
          {vm.level !== 'department' && vm.deptList && vm.deptList.length > 0 && (
            <ControlGroup>
              <ControlLabel>部門</ControlLabel>
              <FilterSelect
                value={vm.parentDeptCode}
                onChange={(e) => vm.handleDeptChange(e.target.value)}
              >
                <option value="">全部門</option>
                {vm.deptList.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </FilterSelect>
            </ControlGroup>
          )}
          {vm.level === 'klass' && vm.lineList && vm.lineList.length > 0 && (
            <ControlGroup>
              <ControlLabel>ライン</ControlLabel>
              <FilterSelect
                value={vm.parentLineCode}
                onChange={(e) => vm.handleLineChange(e.target.value)}
              >
                <option value="">全ライン</option>
                {vm.lineList.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </FilterSelect>
            </ControlGroup>
          )}
          <ControlGroup>
            <ControlLabel>分析軸</ControlLabel>
            <ButtonGroup>
              {(Object.keys(ANALYSIS_AXIS_LABELS) as AnalysisAxis[]).map((a) => (
                <ToggleBtn
                  key={a}
                  $active={vm.effectiveAxis === a}
                  onClick={() => vm.setAnalysisAxis(a)}
                  disabled={a === 'store' && vm.isSingleStore}
                  title={
                    a === 'store' && vm.isSingleStore
                      ? '店舗別比較には複数店舗の選択が必要です'
                      : undefined
                  }
                >
                  {ANALYSIS_AXIS_LABELS[a]}
                </ToggleBtn>
              ))}
            </ButtonGroup>
          </ControlGroup>
          <ControlGroup $hidden={vm.effectiveAxis !== 'store'}>
            <ControlLabel>指標</ControlLabel>
            <ButtonGroup>
              {(Object.keys(BOX_METRIC_LABELS) as BoxMetric[]).map((m) => (
                <ToggleBtn key={m} $active={vm.boxMetric === m} onClick={() => vm.setBoxMetric(m)}>
                  {BOX_METRIC_LABELS[m]}
                </ToggleBtn>
              ))}
            </ButtonGroup>
          </ControlGroup>
          <ControlGroup $hidden={vm.effectiveAxis !== 'store'}>
            <ControlLabel>最低店舗数</ControlLabel>
            <ButtonGroup>
              {[1, 2, 3].map((n) => (
                <ToggleBtn key={n} $active={vm.minStores === n} onClick={() => vm.setMinStores(n)}>
                  {n === 1 ? '全て' : `${n}店以上`}
                </ToggleBtn>
              ))}
            </ButtonGroup>
          </ControlGroup>
        </Controls>
      </HeaderRow>

      <BoxPlotView
        boxData={vm.boxPlotData}
        ct={vm.ct}
        fmt={vm.fmt}
        metricLabel={vm.metricLabel}
        rawRows={vm.rawRows}
        trendRows={vm.trendRows}
        boxMetric={vm.boxMetric}
        boxAxis={vm.effectiveAxis}
        storeNameMap={vm.storeNameMap}
      />
    </Wrapper>
  )
})

export default CategoryBoxPlotChart
