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
import { useState, useMemo, memo, useCallback } from 'react'
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
import { formatCurrency } from '@/domain/calculations/utils'

// ── styled-components ──

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const Subtitle = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-top: 2px;
`

const Controls = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: stretch;
  flex-wrap: wrap;
`

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ControlLabel = styled.span`
  font-size: 0.5rem;
  color: ${({ theme }) => theme.colors.text4};
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`

const ToggleBtn = styled.button<{ $active: boolean }>`
  padding: 2px 10px;
  font-size: 0.6rem;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.2)'
        : 'rgba(99,102,241,0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

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

const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
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

/** バブルサイズに使う指標 */
type BubbleSizeMetric = 'sales' | 'quantity' | 'none'

const BUBBLE_SIZE_LABELS: Record<BubbleSizeMetric, string> = {
  sales: '販売金額',
  quantity: '販売点数',
  none: 'なし',
}

type HierarchyLevel = 'department' | 'line' | 'klass'

const HIERARCHY_LABELS: Record<HierarchyLevel, string> = {
  department: '部門',
  line: 'ライン',
  klass: 'クラス',
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

// ── メインコンポーネント ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly totalCustomers?: number
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
        bubbleSize === 'sales'
          ? s.totalSales
          : bubbleSize === 'quantity'
            ? s.scoreSum
            : 1,
    }))
  }, [scores, bubbleSize])

  // 中央値を算出（参照線用）
  const medians = useMemo(() => {
    if (scatterData.length === 0) return { piMedian: 0, cvMedian: 0 }
    const sortedPi = [...scatterData].sort((a, b) => a.x - b.x)
    const sortedCv = [...scatterData].sort((a, b) => a.y - b.y)
    const mid = Math.floor(sortedPi.length / 2)
    return {
      piMedian:
        sortedPi.length % 2 === 0
          ? (sortedPi[mid - 1].x + sortedPi[mid].x) / 2
          : sortedPi[mid].x,
      cvMedian:
        sortedCv.length % 2 === 0
          ? (sortedCv[mid - 1].y + sortedCv[mid].y) / 2
          : sortedCv[mid].y,
    }
  }, [scatterData])

  const handlePiMetric = useCallback((m: PiMetric) => setPiMetric(m), [])
  const handleBubbleSize = useCallback((m: BubbleSizeMetric) => setBubbleSize(m), [])
  const handleLevel = useCallback((l: HierarchyLevel) => setLevel(l), [])

  const piLabel = PI_METRIC_LABELS[piMetric]
  const bubbleLabel = BUBBLE_SIZE_LABELS[bubbleSize]

  if (benchmarkResult.isLoading) {
    return (
      <Wrapper>
        <Title>PI-CV マップ</Title>
        <ChartSkeleton height="280px" />
      </Wrapper>
    )
  }

  if (benchmarkResult.error) {
    return (
      <Wrapper>
        <Title>PI-CV マップ</Title>
        <ErrorMsg>データの取得に失敗しました</ErrorMsg>
      </Wrapper>
    )
  }

  if (scatterData.length === 0) {
    return (
      <Wrapper>
        <Title>PI-CV マップ</Title>
        <ErrorMsg>データがありません</ErrorMsg>
      </Wrapper>
    )
  }

  const maxPi = Math.max(...scatterData.map((d) => d.x)) * 1.15
  const maxCv = Math.max(...scatterData.map((d) => d.y)) * 1.15

  // バブルサイズ: none の場合は全ドット同サイズ
  const zRange: [number, number] = bubbleSize === 'none' ? [80, 80] : [40, 500]

  return (
    <Wrapper>
      <HeaderRow>
        <div>
          <Title>PI-CV マップ</Title>
          <Subtitle>
            販売効率({piLabel}) x 店舗ばらつき(CV)
            {bubbleSize !== 'none' && ` x ${bubbleLabel}`} / {HIERARCHY_LABELS[level]}別 /{' '}
            {scores.length}カテゴリ
          </Subtitle>
        </div>
        <Controls>
          <ControlGroup>
            <ControlLabel>PI指標</ControlLabel>
            <ButtonGroup>
              {(Object.keys(PI_METRIC_LABELS) as PiMetric[]).map((m) => (
                <ToggleBtn key={m} $active={piMetric === m} onClick={() => handlePiMetric(m)}>
                  {PI_METRIC_LABELS[m]}
                </ToggleBtn>
              ))}
            </ButtonGroup>
          </ControlGroup>
          <ControlGroup>
            <ControlLabel>バブルサイズ</ControlLabel>
            <ButtonGroup>
              {(Object.keys(BUBBLE_SIZE_LABELS) as BubbleSizeMetric[]).map((m) => (
                <ToggleBtn key={m} $active={bubbleSize === m} onClick={() => handleBubbleSize(m)}>
                  {BUBBLE_SIZE_LABELS[m]}
                </ToggleBtn>
              ))}
            </ButtonGroup>
          </ControlGroup>
          <ControlGroup>
            <ControlLabel>階層</ControlLabel>
            <ButtonGroup>
              {(Object.keys(HIERARCHY_LABELS) as HierarchyLevel[]).map((l) => (
                <ToggleBtn key={l} $active={level === l} onClick={() => handleLevel(l)}>
                  {HIERARCHY_LABELS[l]}
                </ToggleBtn>
              ))}
            </ButtonGroup>
          </ControlGroup>
        </Controls>
      </HeaderRow>

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
    </Wrapper>
  )
})
