/**
 * PI-CV-SKU マップ（バブルチャート）
 *
 * 横軸: 平均PI値（販売効率）
 * 縦軸: CV（店舗間バラツキ）
 * バブルサイズ: 売上金額 / 販売点数 / なし（選択可能）
 *
 * 販売効率 x 店舗ばらつき x 売上規模 を同時に可視化。
 * DuckDB カテゴリベンチマークデータを利用。
 */
import { useState, useMemo, memo } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  useDuckDBCategoryBenchmark,
  buildCategoryBenchmarkScores,
  type CategoryBenchmarkScore,
  type ProductType,
} from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter } from './chartTheme'
import { ChartSkeleton } from '@/presentation/components/common'
import { formatCurrency } from '@/domain/formatting'
import {
  ChartPanel,
  ChartHeaderRow,
  ChartPanelTitle,
  ChartPanelSubtitle,
  ControlStrip,
  ControlItem,
  ControlItemLabel,
  ControlBtnGroup,
  ToggleBtn,
  ChartErrorMsg,
  HIERARCHY_LABELS,
  type HierarchyLevel,
} from './DuckDBChartParts'

// ── chart-specific styled-components ──

const LegendRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  margin-top: ${({ theme }) => theme.spacing[2]};
  justify-content: center;
`

const LegendItem = styled.span<{ $color: string }>`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
  display: flex;
  align-items: center;
  gap: 4px;

  &::before {
    content: '';
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
  }
`

const QuadrantLabel = styled.div`
  position: absolute;
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.text4};
  opacity: 0.6;
  font-weight: 600;
  pointer-events: none;
`

// ── 定数 ──

const TYPE_COLORS: Record<ProductType, string> = {
  flagship: '#22c55e',
  regional: '#3b82f6',
  standard: '#9ca3af',
  unstable: '#f97316',
}

type PiMetric = 'salesPi' | 'quantityPi'

const PI_METRIC_LABELS: Record<PiMetric, string> = {
  salesPi: '金額PI',
  quantityPi: '数量PI',
}

type BubbleSizeMetric = 'sales' | 'quantity' | 'none'

const BUBBLE_SIZE_LABELS: Record<BubbleSizeMetric, string> = {
  sales: '販売金額',
  quantity: '販売点数',
  none: 'なし',
}

// ── Tooltip ──

interface ScatterDataPoint extends CategoryBenchmarkScore {
  readonly x: number
  readonly y: number
  readonly bubbleValue: number
}

interface BubbleTooltipPayload {
  readonly payload: ScatterDataPoint
}

function BubbleTooltip({
  active,
  payload,
  ct,
  fmt,
  piLabel,
  bubbleLabel,
}: {
  active?: boolean
  payload?: readonly BubbleTooltipPayload[]
  ct: ReturnType<typeof useChartTheme>
  fmt: (v: number) => string
  piLabel: string
  bubbleLabel: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0].payload

  return (
    <div
      style={{
        background: ct.bg2,
        border: `1px solid ${ct.grid}`,
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: ct.fontSize.sm,
        fontFamily: ct.fontFamily,
        color: ct.text,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{item.name}</div>
      <div>
        {piLabel}: {item.avgShare.toFixed(1)}
      </div>
      <div>CV (バラツキ): {item.variance.toFixed(3)}</div>
      <div>売上: {fmt(item.totalSales)}</div>
      {bubbleLabel !== 'なし' && (
        <div>
          {bubbleLabel}: {formatCurrency(item.bubbleValue)}
        </div>
      )}
      <div>
        店舗: {item.activeStoreCount}/{item.storeCount}
      </div>
    </div>
  )
}

// ── ユーティリティ ──

function computeMedian(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

// ── メインコンポーネント ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

export const DuckDBPiCvBubbleChart = memo(function DuckDBPiCvBubbleChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const [piMetric, setPiMetric] = useState<PiMetric>('salesPi')
  const [bubbleSize, setBubbleSize] = useState<BubbleSizeMetric>('sales')
  const [level, setLevel] = useState<HierarchyLevel>('department')

  const benchmarkResult = useDuckDBCategoryBenchmark(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
  )

  const storeCount = selectedStoreIds.size || 0

  const scores = useMemo(() => {
    if (!benchmarkResult.data || benchmarkResult.data.length === 0) return []
    return buildCategoryBenchmarkScores(benchmarkResult.data, 1, storeCount, piMetric)
  }, [benchmarkResult.data, storeCount, piMetric])

  const scatterData: readonly ScatterDataPoint[] = useMemo(() => {
    return scores.map((s) => ({
      ...s,
      x: s.avgShare,
      y: s.variance,
      bubbleValue:
        bubbleSize === 'sales' ? s.totalSales : bubbleSize === 'quantity' ? s.scoreSum : 1,
    }))
  }, [scores, bubbleSize])

  const medians = useMemo(() => {
    if (scatterData.length === 0) return { piMedian: 0, cvMedian: 0 }
    return {
      piMedian: computeMedian(scatterData.map((d) => d.x)),
      cvMedian: computeMedian(scatterData.map((d) => d.y)),
    }
  }, [scatterData])

  const piLabel = PI_METRIC_LABELS[piMetric]
  const bubbleLabel = BUBBLE_SIZE_LABELS[bubbleSize]

  if (benchmarkResult.isLoading) {
    return (
      <ChartPanel>
        <ChartPanelTitle>PI-CV マップ</ChartPanelTitle>
        <ChartSkeleton height="280px" />
      </ChartPanel>
    )
  }

  if (benchmarkResult.error) {
    return (
      <ChartPanel>
        <ChartPanelTitle>PI-CV マップ</ChartPanelTitle>
        <ChartErrorMsg>データの取得に失敗しました</ChartErrorMsg>
      </ChartPanel>
    )
  }

  if (scatterData.length === 0) {
    return (
      <ChartPanel>
        <ChartPanelTitle>PI-CV マップ</ChartPanelTitle>
        <ChartErrorMsg>データがありません</ChartErrorMsg>
      </ChartPanel>
    )
  }

  let maxPi = 0
  let maxCv = 0
  for (const d of scatterData) {
    if (d.x > maxPi) maxPi = d.x
    if (d.y > maxCv) maxCv = d.y
  }
  maxPi *= 1.15
  maxCv *= 1.15

  const zRange: [number, number] = bubbleSize === 'none' ? [80, 80] : [40, 500]

  return (
    <ChartPanel>
      <ChartHeaderRow>
        <div>
          <ChartPanelTitle>PI-CV マップ</ChartPanelTitle>
          <ChartPanelSubtitle>
            販売効率({piLabel}) x 店舗ばらつき(CV)
            {bubbleSize !== 'none' && ` x ${bubbleLabel}`} / {HIERARCHY_LABELS[level]}別 /{' '}
            {scores.length}カテゴリ
          </ChartPanelSubtitle>
        </div>
        <ControlStrip>
          <ControlItem>
            <ControlItemLabel>PI指標</ControlItemLabel>
            <ControlBtnGroup>
              {(Object.keys(PI_METRIC_LABELS) as PiMetric[]).map((m) => (
                <ToggleBtn key={m} $active={piMetric === m} onClick={() => setPiMetric(m)}>
                  {PI_METRIC_LABELS[m]}
                </ToggleBtn>
              ))}
            </ControlBtnGroup>
          </ControlItem>
          <ControlItem>
            <ControlItemLabel>バブルサイズ</ControlItemLabel>
            <ControlBtnGroup>
              {(Object.keys(BUBBLE_SIZE_LABELS) as BubbleSizeMetric[]).map((m) => (
                <ToggleBtn key={m} $active={bubbleSize === m} onClick={() => setBubbleSize(m)}>
                  {BUBBLE_SIZE_LABELS[m]}
                </ToggleBtn>
              ))}
            </ControlBtnGroup>
          </ControlItem>
          <ControlItem>
            <ControlItemLabel>階層</ControlItemLabel>
            <ControlBtnGroup>
              {(Object.keys(HIERARCHY_LABELS) as HierarchyLevel[]).map((l) => (
                <ToggleBtn key={l} $active={level === l} onClick={() => setLevel(l)}>
                  {HIERARCHY_LABELS[l]}
                </ToggleBtn>
              ))}
            </ControlBtnGroup>
          </ControlItem>
        </ControlStrip>
      </ChartHeaderRow>

      <div style={{ position: 'relative' }}>
        <QuadrantLabel style={{ top: 8, left: 90 }}>低PI・高CV</QuadrantLabel>
        <QuadrantLabel style={{ top: 8, right: 30 }}>高PI・高CV</QuadrantLabel>
        <QuadrantLabel style={{ bottom: 30, left: 90 }}>低PI・低CV</QuadrantLabel>
        <QuadrantLabel style={{ bottom: 30, right: 30 }}>高PI・低CV</QuadrantLabel>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.3} />
            <XAxis
              type="number"
              dataKey="x"
              name={piLabel}
              domain={[0, maxPi]}
              tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
              stroke={ct.grid}
              label={{
                value: `${piLabel} (平均)`,
                position: 'bottom',
                offset: 0,
                fontSize: 10,
                fill: ct.textMuted,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="CV"
              domain={[0, maxCv]}
              tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
              stroke={ct.grid}
              label={{
                value: 'CV (変動係数)',
                angle: -90,
                position: 'insideLeft',
                offset: 5,
                fontSize: 10,
                fill: ct.textMuted,
              }}
            />
            <ZAxis type="number" dataKey="bubbleValue" range={zRange} name={bubbleLabel} />
            <Tooltip
              content={
                <BubbleTooltip ct={ct} fmt={fmt} piLabel={piLabel} bubbleLabel={bubbleLabel} />
              }
              cursor={{ strokeDasharray: '3 3' }}
            />
            <ReferenceLine
              x={medians.piMedian}
              stroke={ct.textMuted}
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={medians.cvMedian}
              stroke={ct.textMuted}
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            <Scatter data={scatterData as ScatterDataPoint[]}>
              {scatterData.map((s) => (
                <Cell key={s.code} fill={TYPE_COLORS[s.productType]} fillOpacity={0.75} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <LegendRow>
        <LegendItem $color={TYPE_COLORS.flagship}>高PI・低CV (主力)</LegendItem>
        <LegendItem $color={TYPE_COLORS.regional}>高PI・高CV (地域特化)</LegendItem>
        <LegendItem $color={TYPE_COLORS.standard}>低PI・低CV (定番)</LegendItem>
        <LegendItem $color={TYPE_COLORS.unstable}>低PI・高CV (不安定)</LegendItem>
      </LegendRow>
    </ChartPanel>
  )
})
