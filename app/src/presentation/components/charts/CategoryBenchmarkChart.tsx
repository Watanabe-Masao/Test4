/**
 * DuckDB カテゴリベンチマーク — 商品力分析ダッシュボード
 *
 * 構成比実数値ベースの総合カテゴリ評価:
 * 1. 総合指数 (Index): 平均構成比を 0-100 に正規化
 * 2. バラツキ: 構成比の変動係数 (CV)
 * 3. カバー率: 実販売店舗数 / 全店舗数
 * 4. 安定度: 1 - CV/2
 * 5. 商品力マップ: Index × バラツキの4タイプ分類
 *
 * 表示ビュー:
 * - チャート: 横棒グラフ（Index順）
 * - テーブル: 全指標一覧
 * - マップ: 商品力4象限マップ
 * - トレンド: 上位カテゴリの推移
 *
 * 箱ひげ図は CategoryBoxPlotChart に分離。
 */
import { useState, useMemo, memo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  useDuckDBCategoryBenchmark,
  useDuckDBCategoryBenchmarkTrend,
  useDuckDBCategoryHierarchy,
  buildCategoryBenchmarkScores,
  buildCategoryTrendData,
  buildCategoryBenchmarkScoresByDate,
  type CategoryBenchmarkScore,
  type BenchmarkMetric,
  type ProductType,
} from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter, toPct } from './chartTheme'
import { useI18n } from '@/application/hooks/useI18n'
import { EmptyState, ChartSkeleton } from '@/presentation/components/common'
import { palette } from '@/presentation/theme/tokens'
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
  DataTable,
  Th,
  Td,
  TypeBadge,
  MapSection,
  MapLegend,
  LegendItem,
  MapQuadrantLabel,
  SummaryRow,
  KpiCard,
  KpiLabel,
  KpiValue,
  KpiSub,
  FilterSelect,
} from './CategoryBenchmarkChart.styles'

// ── Types ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

type CategoryLevel = 'department' | 'line' | 'klass'
type ViewMode = 'chart' | 'table' | 'map' | 'trend'

const LEVEL_LABELS: Record<CategoryLevel, string> = {
  department: '部門',
  line: 'ライン',
  klass: 'クラス',
}

const VIEW_LABELS: Record<ViewMode, string> = {
  chart: 'チャート',
  table: 'テーブル',
  map: 'マップ',
  trend: 'トレンド',
}

type AnalysisAxis = 'store' | 'date'

const ANALYSIS_AXIS_LABELS: Record<AnalysisAxis, string> = {
  store: '店舗別',
  date: '期間別',
}

const BENCHMARK_METRIC_LABELS: Record<BenchmarkMetric, string> = {
  share: '構成比',
  salesPi: '金額PI値',
  quantityPi: '数量PI値',
}

const TYPE_LABELS: Record<ProductType, string> = {
  flagship: '主力',
  regional: '地域特化',
  standard: '普通',
  unstable: '不安定',
}

const TYPE_COLORS: Record<ProductType, string> = {
  flagship: '#22c55e',
  regional: '#3b82f6',
  standard: '#9ca3af',
  unstable: '#ef4444',
}

// ── Color helpers ──

function indexColor(index: number): string {
  if (index >= 70) return palette.positive
  if (index >= 40) return palette.caution
  return palette.negative
}

// ── Chart Tooltip ──

interface ChartTooltipPayload {
  readonly payload: CategoryBenchmarkScore
  readonly value: number
}

interface ChartTooltipProps {
  readonly active?: boolean
  readonly payload?: readonly ChartTooltipPayload[]
  readonly ct: ReturnType<typeof useChartTheme>
  readonly fmt: (v: number) => string
}

function BenchmarkChartTooltip({ active, payload, ct, fmt }: ChartTooltipProps) {
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
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {item.name} ({item.code})
      </div>
      <div>Index: {item.index.toFixed(1)}</div>
      <div>
        {item.metric === 'share'
          ? '平均構成比'
          : item.metric === 'salesPi'
            ? '金額PI値'
            : '数量PI値'}
        : {item.metric === 'share' ? toPct(item.avgShare, 1) : item.avgShare.toFixed(1)}
      </div>
      <div>バラツキ(CV): {item.variance.toFixed(2)}</div>
      <div>安定度: {toPct(item.stability, 0)}</div>
      <div>
        カバー率: {item.activeStoreCount}/{item.storeCount} ({toPct(item.dominance, 0)})
      </div>
      <div>売上: {fmt(item.totalSales)}</div>
      <div>
        タイプ: <TypeBadge $type={item.productType}>{TYPE_LABELS[item.productType]}</TypeBadge>
      </div>
    </div>
  )
}

// ── Scatter Tooltip ──

interface ScatterTooltipPayload {
  readonly payload: CategoryBenchmarkScore & { x: number; y: number }
}

interface ScatterTooltipProps {
  readonly active?: boolean
  readonly payload?: readonly ScatterTooltipPayload[]
  readonly ct: ReturnType<typeof useChartTheme>
  readonly fmt: (v: number) => string
}

function MapTooltip({ active, payload, ct, fmt }: ScatterTooltipProps) {
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
      <div style={{ fontWeight: 600 }}>{item.name}</div>
      <div>Index: {item.index.toFixed(1)}</div>
      <div>バラツキ: {item.variance.toFixed(3)}</div>
      <div>売上: {fmt(item.totalSales)}</div>
      <div>
        <TypeBadge $type={item.productType}>{TYPE_LABELS[item.productType]}</TypeBadge>
      </div>
    </div>
  )
}

// ── Sub-views ──

function ChartView({
  scores,
  ct,
  fmt,
}: {
  scores: readonly CategoryBenchmarkScore[]
  ct: ReturnType<typeof useChartTheme>
  fmt: (v: number) => string
}) {
  const chartHeight = Math.max(200, scores.length * 28 + 40)

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={scores} layout="vertical" margin={{ top: 4, right: 40, left: 80, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
          stroke={ct.grid}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
          stroke={ct.grid}
          width={75}
        />
        <Tooltip content={<BenchmarkChartTooltip ct={ct} fmt={fmt} />} />
        <Bar dataKey="index" name="Index" radius={[0, 4, 4, 0]}>
          {scores.map((s) => (
            <Cell key={s.code} fill={indexColor(s.index)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function TableView({
  scores,
  fmt,
  metricLabel,
  isDateAxis,
}: {
  scores: readonly CategoryBenchmarkScore[]
  fmt: (v: number) => string
  metricLabel: string
  isDateAxis?: boolean
}) {
  const isPi = scores.length > 0 && scores[0].metric !== 'share'

  return (
    <div style={{ overflowX: 'auto' }}>
      <DataTable>
        <thead>
          <tr>
            <Th>カテゴリ</Th>
            <Th>Index</Th>
            <Th>{metricLabel}</Th>
            <Th>バラツキ(CV)</Th>
            <Th>安定度</Th>
            <Th>{isDateAxis ? '日数' : 'カバー率'}</Th>
            <Th>売上合計</Th>
            <Th>タイプ</Th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s) => (
            <tr key={s.code}>
              <Td $align="left">{s.name}</Td>
              <Td $color={indexColor(s.index)} $bold>
                {s.index.toFixed(1)}
              </Td>
              <Td>{isPi ? s.avgShare.toFixed(1) : toPct(s.avgShare, 1)}</Td>
              <Td>{s.variance.toFixed(2)}</Td>
              <Td>{toPct(s.stability, 0)}</Td>
              <Td>{isDateAxis ? `${s.storeCount}日` : `${s.activeStoreCount}/${s.storeCount}`}</Td>
              <Td>{fmt(s.totalSales)}</Td>
              <Td>
                <TypeBadge $type={s.productType}>{TYPE_LABELS[s.productType]}</TypeBadge>
              </Td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  )
}

function MapView({
  scores,
  ct,
  fmt,
}: {
  scores: readonly CategoryBenchmarkScore[]
  ct: ReturnType<typeof useChartTheme>
  fmt: (v: number) => string
}) {
  const scatterData = scores.map((s) => ({
    ...s,
    x: s.index,
    y: s.stability * 100,
  }))

  return (
    <MapSection>
      <div style={{ position: 'relative' }}>
        <MapQuadrantLabel style={{ top: 4, left: 90 }}>普通</MapQuadrantLabel>
        <MapQuadrantLabel style={{ top: 4, right: 30 }}>主力</MapQuadrantLabel>
        <MapQuadrantLabel style={{ bottom: 30, left: 90 }}>不安定</MapQuadrantLabel>
        <MapQuadrantLabel style={{ bottom: 30, right: 30 }}>地域特化</MapQuadrantLabel>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.3} />
            <XAxis
              type="number"
              dataKey="x"
              name="Index"
              domain={[0, 100]}
              tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
              stroke={ct.grid}
              label={{
                value: 'Index (構成比)',
                position: 'bottom',
                offset: -5,
                fontSize: 10,
                fill: ct.textMuted,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="安定度"
              domain={[0, 100]}
              tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
              stroke={ct.grid}
              label={{
                value: '安定度 (%)',
                angle: -90,
                position: 'insideLeft',
                offset: 5,
                fontSize: 10,
                fill: ct.textMuted,
              }}
            />
            <ZAxis type="number" dataKey="totalSales" range={[40, 400]} name="売上" />
            <Tooltip content={<MapTooltip ct={ct} fmt={fmt} />} />
            <Scatter data={scatterData}>
              {scatterData.map((s) => (
                <Cell key={s.code} fill={TYPE_COLORS[s.productType]} fillOpacity={0.8} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <MapLegend>
        <LegendItem $color={TYPE_COLORS.flagship}>主力（高Index・高安定度）</LegendItem>
        <LegendItem $color={TYPE_COLORS.regional}>地域特化（高Index・低安定度）</LegendItem>
        <LegendItem $color={TYPE_COLORS.standard}>普通（低Index・高安定度）</LegendItem>
        <LegendItem $color={TYPE_COLORS.unstable}>不安定（低Index・低安定度）</LegendItem>
      </MapLegend>
    </MapSection>
  )
}

// ── 色パレット（トレンド用） ──

const TREND_COLORS = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
  '#ec4899', // pink
  '#64748b', // slate
]

function TrendView({
  trendData,
  topCodes,
  scores,
  ct,
}: {
  trendData: ReturnType<typeof buildCategoryTrendData>
  topCodes: readonly string[]
  scores: readonly CategoryBenchmarkScore[]
  ct: ReturnType<typeof useChartTheme>
}) {
  // カテゴリコード → 名前のマップ
  const nameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of scores) map.set(s.code, s.name)
    return map
  }, [scores])

  // date → { dateKey, code1: score, code2: score, ... } のピボットデータ
  const chartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, string | number>>()
    for (const p of trendData) {
      let entry = dateMap.get(p.dateKey)
      if (!entry) {
        entry = { dateKey: p.dateKey }
        dateMap.set(p.dateKey, entry)
      }
      entry[p.code] = p.compositeScore
    }
    const arr = Array.from(dateMap.values())
    arr.sort((a, b) => String(a.dateKey).localeCompare(String(b.dateKey)))
    return arr
  }, [trendData])

  if (chartData.length === 0) {
    return <EmptyState>トレンドデータがありません</EmptyState>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.3} />
          <XAxis
            dataKey="dateKey"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            label={{
              value: 'Index × 安定度',
              angle: -90,
              position: 'insideLeft',
              offset: 5,
              fontSize: 10,
              fill: ct.textMuted,
            }}
          />
          <Tooltip
            contentStyle={{
              background: ct.bg2,
              border: `1px solid ${ct.grid}`,
              borderRadius: 8,
              fontSize: ct.fontSize.sm,
              fontFamily: ct.fontFamily,
            }}
            labelFormatter={(v) => String(v)}
            formatter={(value, name) => [
              Number(value).toFixed(2),
              nameMap.get(String(name)) ?? String(name),
            ]}
          />
          <Legend
            formatter={(value) => nameMap.get(String(value)) ?? String(value)}
            wrapperStyle={{ fontSize: '0.6rem' }}
          />
          {topCodes.map((code, i) => (
            <Line
              key={code}
              type="monotone"
              dataKey={code}
              stroke={TREND_COLORS[i % TREND_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Component ──

export const CategoryBenchmarkChart = memo(function CategoryBenchmarkChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()
  const [level, setLevel] = useState<CategoryLevel>('department')
  const [view, setView] = useState<ViewMode>('chart')
  const [minStores, setMinStores] = useState(2)
  const [analysisAxis, setAnalysisAxis] = useState<AnalysisAxis>('store')
  const [benchmarkMetric, setBenchmarkMetric] = useState<BenchmarkMetric>('share')
  const [parentDeptCode, setParentDeptCode] = useState<string>('')
  const [parentLineCode, setParentLineCode] = useState<string>('')

  // 単一店舗選択時は店舗別比較が無意味なため、期間別を強制する
  const isSingleStore = selectedStoreIds.size === 1
  const effectiveAxis: AnalysisAxis = isSingleStore ? 'date' : analysisAxis

  // 階層フィルタ用: 部門一覧
  const { data: deptList } = useDuckDBCategoryHierarchy(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'department',
  )

  // 階層フィルタ用: ライン一覧（選択部門でフィルタ）
  const { data: lineList } = useDuckDBCategoryHierarchy(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'line',
    parentDeptCode || undefined,
  )

  const {
    data: rawRows,
    error,
    isLoading,
  } = useDuckDBCategoryBenchmark(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
    parentDeptCode || undefined,
    parentLineCode || undefined,
  )

  // トレンドデータ取得（トレンドビュー用）
  const { data: trendRows } = useDuckDBCategoryBenchmarkTrend(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
    parentDeptCode || undefined,
    parentLineCode || undefined,
  )

  const totalStoreCount = selectedStoreIds.size

  // 店舗別スコア
  const storeScores = useMemo(
    () =>
      rawRows
        ? buildCategoryBenchmarkScores(rawRows, minStores, totalStoreCount, benchmarkMetric)
        : [],
    [rawRows, minStores, totalStoreCount, benchmarkMetric],
  )

  // 期間別スコア（日別データポイント）
  const dateScores = useMemo(
    () =>
      trendRows && rawRows
        ? buildCategoryBenchmarkScoresByDate(trendRows, rawRows, minStores, totalStoreCount)
        : [],
    [trendRows, rawRows, minStores, totalStoreCount],
  )

  // 分析軸に応じたスコアを選択
  const scores = effectiveAxis === 'store' ? storeScores : dateScores

  // トレンド表示用: 上位10カテゴリのコード
  const topCodes = useMemo(() => scores.slice(0, 10).map((s) => s.code), [scores])

  const trendData = useMemo(
    () => (trendRows ? buildCategoryTrendData(trendRows, topCodes, totalStoreCount) : []),
    [trendRows, topCodes, totalStoreCount],
  )

  // KPIサマリー
  const kpis = useMemo(() => {
    if (scores.length === 0) return null
    const sorted = [...scores].sort((a, b) => b.index - a.index)
    const top = sorted[0]
    const bottom = sorted[sorted.length - 1]
    const flagshipCount = scores.filter((s) => s.productType === 'flagship').length
    const unstableCount = scores.filter((s) => s.productType === 'unstable').length
    const avgIndex = scores.reduce((s, v) => s + v.index, 0) / scores.length
    return { top, bottom, flagshipCount, unstableCount, avgIndex }
  }, [scores])

  if (error) {
    return (
      <Wrapper aria-label="カテゴリベンチマーク（DuckDB）">
        <Title>カテゴリベンチマーク（DuckDB）</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (isLoading && !rawRows) {
    return <ChartSkeleton />
  }

  if (!duckConn || duckDataVersion === 0 || scores.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  return (
    <Wrapper aria-label="カテゴリベンチマーク（DuckDB）">
      <HeaderRow>
        <div>
          <Title>カテゴリベンチマーク（DuckDB）</Title>
          <Subtitle>
            {effectiveAxis === 'date'
              ? '期間別分析 | 日別構成比の変動 × バラツキ(CV) × カバー率'
              : benchmarkMetric === 'share'
                ? '構成比ベース商品力分析 | 平均構成比 × バラツキ(CV) × カバー率'
                : `${BENCHMARK_METRIC_LABELS[benchmarkMetric]}ベース商品力分析 | PI値 = 値÷客数×1000`}
          </Subtitle>
        </div>
        <Controls>
          <ControlGroup>
            <ControlLabel>階層</ControlLabel>
            <ButtonGroup>
              {(Object.keys(LEVEL_LABELS) as CategoryLevel[]).map((l) => (
                <ToggleBtn
                  key={l}
                  $active={level === l}
                  onClick={() => {
                    setLevel(l)
                    if (l === 'department') {
                      setParentDeptCode('')
                      setParentLineCode('')
                    } else if (l === 'line') {
                      setParentLineCode('')
                    }
                  }}
                >
                  {LEVEL_LABELS[l]}
                </ToggleBtn>
              ))}
            </ButtonGroup>
          </ControlGroup>
          {/* 階層フィルタ: ライン/クラス表示時に親カテゴリを絞り込み */}
          {level !== 'department' && deptList && deptList.length > 0 && (
            <ControlGroup>
              <ControlLabel>部門</ControlLabel>
              <FilterSelect
                value={parentDeptCode}
                onChange={(e) => {
                  setParentDeptCode(e.target.value)
                  setParentLineCode('')
                }}
              >
                <option value="">全部門</option>
                {deptList.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </FilterSelect>
            </ControlGroup>
          )}
          {level === 'klass' && lineList && lineList.length > 0 && (
            <ControlGroup>
              <ControlLabel>ライン</ControlLabel>
              <FilterSelect
                value={parentLineCode}
                onChange={(e) => setParentLineCode(e.target.value)}
              >
                <option value="">全ライン</option>
                {lineList.map((l) => (
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
                  $active={effectiveAxis === a}
                  onClick={() => setAnalysisAxis(a)}
                  disabled={a === 'store' && isSingleStore}
                  title={
                    a === 'store' && isSingleStore
                      ? '店舗別比較には複数店舗の選択が必要です'
                      : undefined
                  }
                >
                  {ANALYSIS_AXIS_LABELS[a]}
                </ToggleBtn>
              ))}
            </ButtonGroup>
          </ControlGroup>
          <ControlGroup $hidden={effectiveAxis !== 'store'}>
            <ControlLabel>指標</ControlLabel>
            <ButtonGroup>
              {(Object.keys(BENCHMARK_METRIC_LABELS) as BenchmarkMetric[]).map((m) => (
                <ToggleBtn
                  key={m}
                  $active={benchmarkMetric === m}
                  onClick={() => setBenchmarkMetric(m)}
                >
                  {BENCHMARK_METRIC_LABELS[m]}
                </ToggleBtn>
              ))}
            </ButtonGroup>
          </ControlGroup>
          <ControlGroup>
            <ControlLabel>表示</ControlLabel>
            <ButtonGroup>
              {(Object.keys(VIEW_LABELS) as ViewMode[]).map((v) => (
                <ToggleBtn key={v} $active={view === v} onClick={() => setView(v)}>
                  {VIEW_LABELS[v]}
                </ToggleBtn>
              ))}
            </ButtonGroup>
          </ControlGroup>
          <ControlGroup $hidden={effectiveAxis !== 'store'}>
            <ControlLabel>最低店舗数</ControlLabel>
            <ButtonGroup>
              {[1, 2, 3].map((n) => (
                <ToggleBtn key={n} $active={minStores === n} onClick={() => setMinStores(n)}>
                  {n === 1 ? '全て' : `${n}店以上`}
                </ToggleBtn>
              ))}
            </ButtonGroup>
          </ControlGroup>
        </Controls>
      </HeaderRow>

      {/* KPI サマリー */}
      {kpis && (
        <SummaryRow>
          <KpiCard $accent={palette.positive}>
            <KpiLabel>最高評価</KpiLabel>
            <KpiValue>{kpis.top.name}</KpiValue>
            <KpiSub>Index {kpis.top.index.toFixed(1)}</KpiSub>
          </KpiCard>
          <KpiCard $accent={palette.negative}>
            <KpiLabel>最低評価</KpiLabel>
            <KpiValue>{kpis.bottom.name}</KpiValue>
            <KpiSub>Index {kpis.bottom.index.toFixed(1)}</KpiSub>
          </KpiCard>
          <KpiCard $accent="#6366f1">
            <KpiLabel>平均Index</KpiLabel>
            <KpiValue>{kpis.avgIndex.toFixed(1)}</KpiValue>
            <KpiSub>{scores.length}カテゴリ</KpiSub>
          </KpiCard>
          <KpiCard $accent="#22c55e">
            <KpiLabel>主力カテゴリ</KpiLabel>
            <KpiValue>{kpis.flagshipCount}</KpiValue>
            <KpiSub>不安定: {kpis.unstableCount}</KpiSub>
          </KpiCard>
        </SummaryRow>
      )}

      {/* メインビュー */}
      <div style={{ marginTop: 16 }}>
        {view === 'chart' && <ChartView scores={scores} ct={ct} fmt={fmt} />}
        {view === 'table' && (
          <TableView
            scores={scores}
            fmt={fmt}
            metricLabel={
              effectiveAxis === 'date' ? '日別構成比' : BENCHMARK_METRIC_LABELS[benchmarkMetric]
            }
            isDateAxis={effectiveAxis === 'date'}
          />
        )}
        {view === 'map' && <MapView scores={scores} ct={ct} fmt={fmt} />}
        {view === 'trend' && (
          <TrendView trendData={trendData} topCodes={topCodes} scores={scores} ct={ct} />
        )}
      </div>
    </Wrapper>
  )
})
