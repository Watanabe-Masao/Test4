/**
 * CV時系列分析チャート
 *
 * 需要の安定性を3つのビューで可視化:
 * 1. CV折れ線グラフ — カテゴリ別CVの日別推移（PI重ね表示可）
 * 2. 売上×CV二軸グラフ — 売上高とCVを同一チャートで比較
 * 3. SKU×時間CVヒートマップ — カテゴリ×日付のCV値をセル色で表示
 *
 * PI↑CV↓=定番化 / PI↑CV↑=プロモ / PI↓CV↑=需要崩れ を判定。
 */
import { useState, useMemo, memo, useCallback } from 'react'
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  useDuckDBCategoryBenchmark,
  useDuckDBCategoryBenchmarkTrend,
  buildCategoryBenchmarkScores,
  buildCategoryTrendData,
  type CategoryTrendPoint,
} from '@/application/hooks/useDuckDBQuery'
import { useChartTheme } from './chartTheme'
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

const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`

const StatusTable = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  margin-top: ${({ theme }) => theme.spacing[3]};
  justify-content: center;
`

const StatusBadge = styled.span<{ $color: string }>`
  font-size: 0.6rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: ${({ $color }) => `${$color}18`};
  color: ${({ $color }) => $color};
  font-weight: 600;
`

const HeatmapGrid = styled.div`
  overflow-x: auto;
  margin-top: ${({ theme }) => theme.spacing[2]};
`

const HeatmapTable = styled.table`
  border-collapse: collapse;
  width: 100%;
  font-size: 0.55rem;
`

const HeatmapTh = styled.th`
  padding: 3px 6px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  text-align: center;
  white-space: nowrap;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const HeatmapRowHeader = styled.td`
  padding: 3px 8px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text2};
  white-space: nowrap;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
`

const HeatmapCell = styled.td<{ $bg: string; $textColor: string }>`
  padding: 2px 4px;
  text-align: center;
  background: ${({ $bg }) => $bg};
  color: ${({ $textColor }) => $textColor};
  font-size: 0.5rem;
  min-width: 32px;
`

// ── 定数 ──

const CATEGORY_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#06b6d4',
]

type HierarchyLevel = 'department' | 'line' | 'klass'

const HIERARCHY_LABELS: Record<HierarchyLevel, string> = {
  department: '部門',
  line: 'ライン',
  klass: 'クラス',
}

type ViewMode = 'cvLine' | 'salesCv' | 'heatmap'

const VIEW_LABELS: Record<ViewMode, string> = {
  cvLine: 'CV折れ線',
  salesCv: '売上×CV',
  heatmap: 'CVヒートマップ',
}

type OverlayMode = 'cv' | 'pi' | 'both'

const OVERLAY_LABELS: Record<OverlayMode, string> = {
  cv: 'CVのみ',
  pi: 'PIのみ',
  both: 'CV + PI',
}

/** PI/CV の変化方向から状態を判定 */
type TrendStatus = 'stabilizing' | 'promotion' | 'degrading' | 'stable' | 'unknown'

interface StatusInfo {
  readonly label: string
  readonly color: string
  readonly description: string
}

const STATUS_MAP: Record<TrendStatus, StatusInfo> = {
  stabilizing: { label: '定番化', color: '#22c55e', description: 'PI↑ CV↓' },
  promotion: { label: 'プロモーション', color: '#f59e0b', description: 'PI↑ CV↑' },
  degrading: { label: '需要崩れ', color: '#ef4444', description: 'PI↓ CV↑' },
  stable: { label: '安定', color: '#6366f1', description: 'PI→ CV→' },
  unknown: { label: '不明', color: '#9ca3af', description: 'データ不足' },
}

function detectTrendStatus(points: readonly CategoryTrendPoint[]): TrendStatus {
  if (points.length < 3) return 'unknown'

  const mid = Math.floor(points.length / 2)
  const firstHalf = points.slice(0, mid)
  const secondHalf = points.slice(mid)

  const avgPi1 = firstHalf.reduce((s, p) => s + p.avgShare, 0) / firstHalf.length
  const avgPi2 = secondHalf.reduce((s, p) => s + p.avgShare, 0) / secondHalf.length
  const avgCv1 = firstHalf.reduce((s, p) => s + p.cv, 0) / firstHalf.length
  const avgCv2 = secondHalf.reduce((s, p) => s + p.cv, 0) / secondHalf.length

  const piThreshold = 0.05
  const cvThreshold = 0.05

  const piUp = avgPi2 > avgPi1 * (1 + piThreshold)
  const piDown = avgPi2 < avgPi1 * (1 - piThreshold)
  const cvUp = avgCv2 > avgCv1 * (1 + cvThreshold)
  const cvDown = avgCv2 < avgCv1 * (1 - cvThreshold)

  if (piUp && cvDown) return 'stabilizing'
  if (piUp && cvUp) return 'promotion'
  if (piDown && cvUp) return 'degrading'
  return 'stable'
}

/** CV値 → ヒートマップ色 (青=低CV=安定、赤=高CV=不安定) */
function cvToColor(cv: number, maxCv: number): { bg: string; text: string } {
  const ratio = Math.min(cv / Math.max(maxCv, 0.01), 1)
  if (ratio < 0.25) return { bg: 'rgba(34,197,94,0.25)', text: '#166534' }
  if (ratio < 0.5) return { bg: 'rgba(250,204,21,0.25)', text: '#854d0e' }
  if (ratio < 0.75) return { bg: 'rgba(249,115,22,0.3)', text: '#9a3412' }
  return { bg: 'rgba(239,68,68,0.3)', text: '#991b1b' }
}

function formatDateKey(v: string): string {
  if (v.length === 8) return `${v.slice(4, 6)}/${v.slice(6)}`
  return v
}

// ── Tooltip (CV折れ線) ──

interface ChartTooltipProps {
  active?: boolean
  payload?: readonly { dataKey: string; value: number; color: string; name: string }[]
  label?: string
  ct: ReturnType<typeof useChartTheme>
  overlay: OverlayMode
}

function CvLineTooltipContent({ active, payload, label, ct, overlay }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

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
        maxWidth: 280,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      {payload.map((entry) => {
        const isCv = entry.dataKey.startsWith('cv_')
        const isPi = entry.dataKey.startsWith('pi_')
        const suffix = isCv ? ' (CV)' : isPi ? ' (PI)' : ''
        if (overlay === 'cv' && isPi) return null
        if (overlay === 'pi' && isCv) return null
        return (
          <div key={entry.dataKey} style={{ color: entry.color, fontSize: '0.6rem' }}>
            {entry.name}
            {suffix}: {entry.value.toFixed(3)}
          </div>
        )
      })}
    </div>
  )
}

// ── Tooltip (売上×CV) ──

interface SalesCvTooltipProps {
  active?: boolean
  payload?: readonly { dataKey: string; value: number; color: string; name: string }[]
  label?: string
  ct: ReturnType<typeof useChartTheme>
}

function SalesCvTooltipContent({ active, payload, label, ct }: SalesCvTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

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
        maxWidth: 300,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      {payload.map((entry) => {
        const isSales = entry.dataKey.startsWith('sales_')
        const isCv = entry.dataKey.startsWith('cv_')
        return (
          <div key={entry.dataKey} style={{ color: entry.color, fontSize: '0.6rem' }}>
            {entry.name}
            {isSales
              ? `: ${formatCurrency(entry.value)}`
              : isCv
                ? `: ${entry.value.toFixed(3)}`
                : `: ${entry.value}`}
          </div>
        )
      })}
    </div>
  )
}

// ── メインコンポーネント ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

export const DuckDBCvTimeSeriesChart = memo(function DuckDBCvTimeSeriesChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const [level, setLevel] = useState<HierarchyLevel>('department')
  const [viewMode, setViewMode] = useState<ViewMode>('cvLine')
  const [overlay, setOverlay] = useState<OverlayMode>('both')
  const [topN, setTopN] = useState(5)

  const benchmarkResult = useDuckDBCategoryBenchmark(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
  )

  const trendResult = useDuckDBCategoryBenchmarkTrend(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
  )

  const storeCount = selectedStoreIds.size || 0

  // 上位カテゴリを選定
  const topCodes = useMemo(() => {
    if (!benchmarkResult.data || benchmarkResult.data.length === 0) return []
    const scores = buildCategoryBenchmarkScores(benchmarkResult.data, 1, storeCount, 'salesPi')
    return scores.slice(0, topN).map((s) => s.code)
  }, [benchmarkResult.data, storeCount, topN])

  // トレンドデータ構築
  const trendPoints = useMemo(() => {
    if (!trendResult.data || trendResult.data.length === 0 || topCodes.length === 0) return []
    return buildCategoryTrendData(trendResult.data, topCodes, storeCount)
  }, [trendResult.data, topCodes, storeCount])

  // カテゴリ名マップ
  const categoryNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of trendPoints) {
      if (!map.has(p.code)) map.set(p.code, p.name)
    }
    return map
  }, [trendPoints])

  // 日別×カテゴリの売上合計（売上×CVビュー用）
  const salesByDateCode = useMemo(() => {
    if (!trendResult.data) return new Map<string, number>()
    const topSet = new Set(topCodes)
    const map = new Map<string, number>()
    for (const row of trendResult.data) {
      if (!topSet.has(row.code)) continue
      const key = `${row.dateKey}|${row.code}`
      map.set(key, (map.get(key) ?? 0) + row.totalSales)
    }
    return map
  }, [trendResult.data, topCodes])

  // CV折れ線チャート用データ: dateKey → { cv_code1, pi_code1, ... }
  const cvLineData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number | string>>()
    for (const p of trendPoints) {
      let entry = dateMap.get(p.dateKey)
      if (!entry) {
        entry = { dateKey: p.dateKey }
        dateMap.set(p.dateKey, entry)
      }
      entry[`cv_${p.code}`] = p.cv
      entry[`pi_${p.code}`] = p.avgShare
    }
    return [...dateMap.values()].sort((a, b) =>
      (a.dateKey as string).localeCompare(b.dateKey as string),
    )
  }, [trendPoints])

  // 売上×CVチャート用データ: dateKey → { sales_code1, cv_code1, ... }
  const salesCvData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number | string>>()
    for (const p of trendPoints) {
      let entry = dateMap.get(p.dateKey)
      if (!entry) {
        entry = { dateKey: p.dateKey }
        dateMap.set(p.dateKey, entry)
      }
      entry[`cv_${p.code}`] = p.cv
      const salesKey = `${p.dateKey}|${p.code}`
      entry[`sales_${p.code}`] = salesByDateCode.get(salesKey) ?? 0
    }
    return [...dateMap.values()].sort((a, b) =>
      (a.dateKey as string).localeCompare(b.dateKey as string),
    )
  }, [trendPoints, salesByDateCode])

  // ヒートマップ用データ: { dateKeys, codes, cvMatrix[code][dateKey] }
  const heatmapData = useMemo(() => {
    const dateSet = new Set<string>()
    const cvMap = new Map<string, Map<string, number>>()
    for (const p of trendPoints) {
      dateSet.add(p.dateKey)
      let codeMap = cvMap.get(p.code)
      if (!codeMap) {
        codeMap = new Map()
        cvMap.set(p.code, codeMap)
      }
      codeMap.set(p.dateKey, p.cv)
    }
    const dateKeys = [...dateSet].sort()
    // 全CV値の最大値（色スケール用）
    let maxCv = 0
    for (const codeMap of cvMap.values()) {
      for (const cv of codeMap.values()) {
        if (cv > maxCv) maxCv = cv
      }
    }
    return { dateKeys, cvMap, maxCv }
  }, [trendPoints])

  // カテゴリごとの状態判定
  const categoryStatuses = useMemo(() => {
    const statuses = new Map<string, TrendStatus>()
    for (const code of topCodes) {
      const points = trendPoints.filter((p) => p.code === code)
      statuses.set(code, detectTrendStatus(points))
    }
    return statuses
  }, [topCodes, trendPoints])

  const handleLevel = useCallback((l: HierarchyLevel) => setLevel(l), [])
  const handleViewMode = useCallback((m: ViewMode) => setViewMode(m), [])
  const handleOverlay = useCallback((m: OverlayMode) => setOverlay(m), [])
  const handleTopN = useCallback((n: number) => setTopN(n), [])

  const isLoading = benchmarkResult.isLoading || trendResult.isLoading

  if (isLoading) {
    return (
      <Wrapper>
        <Title>CV時系列分析</Title>
        <ChartSkeleton height="280px" />
      </Wrapper>
    )
  }

  if (benchmarkResult.error || trendResult.error) {
    return (
      <Wrapper>
        <Title>CV時系列分析</Title>
        <ErrorMsg>データの取得に失敗しました</ErrorMsg>
      </Wrapper>
    )
  }

  if (cvLineData.length === 0) {
    return (
      <Wrapper>
        <Title>CV時系列分析</Title>
        <ErrorMsg>データがありません</ErrorMsg>
      </Wrapper>
    )
  }

  const showCv = overlay === 'cv' || overlay === 'both'
  const showPi = overlay === 'pi' || overlay === 'both'

  const subtitleText =
    viewMode === 'cvLine'
      ? `カテゴリ別 CV(変動係数)${showPi ? ' + PI値' : ''}の日別推移`
      : viewMode === 'salesCv'
        ? 'カテゴリ別 売上高 × CV(変動係数)の日別推移'
        : 'カテゴリ × 日付のCV値ヒートマップ'

  return (
    <Wrapper>
      <HeaderRow>
        <div>
          <Title>CV時系列分析</Title>
          <Subtitle>
            {subtitleText} / {HIERARCHY_LABELS[level]}別 / 上位{topN}
          </Subtitle>
        </div>
        <Controls>
          <ControlGroup>
            <ControlLabel>ビュー</ControlLabel>
            <ButtonGroup>
              {(Object.keys(VIEW_LABELS) as ViewMode[]).map((m) => (
                <ToggleBtn key={m} $active={viewMode === m} onClick={() => handleViewMode(m)}>
                  {VIEW_LABELS[m]}
                </ToggleBtn>
              ))}
            </ButtonGroup>
          </ControlGroup>
          {viewMode === 'cvLine' && (
            <ControlGroup>
              <ControlLabel>表示</ControlLabel>
              <ButtonGroup>
                {(Object.keys(OVERLAY_LABELS) as OverlayMode[]).map((m) => (
                  <ToggleBtn key={m} $active={overlay === m} onClick={() => handleOverlay(m)}>
                    {OVERLAY_LABELS[m]}
                  </ToggleBtn>
                ))}
              </ButtonGroup>
            </ControlGroup>
          )}
          <ControlGroup>
            <ControlLabel>上位N</ControlLabel>
            <ButtonGroup>
              {[3, 5, 10].map((n) => (
                <ToggleBtn key={n} $active={topN === n} onClick={() => handleTopN(n)}>
                  {n}
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

      {/* ── ビュー1: CV折れ線グラフ ── */}
      {viewMode === 'cvLine' && (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={cvLineData} margin={{ top: 8, right: 50, left: 10, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.3} />
            <XAxis
              dataKey="dateKey"
              tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
              stroke={ct.grid}
              tickFormatter={formatDateKey}
            />
            {showCv && (
              <YAxis
                yAxisId="cv"
                tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
                stroke={ct.grid}
                domain={[0, 'auto']}
                label={{
                  value: 'CV',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 5,
                  fontSize: 10,
                  fill: ct.textMuted,
                }}
              />
            )}
            {showPi && (
              <YAxis
                yAxisId="pi"
                orientation="right"
                tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
                stroke={ct.grid}
                domain={[0, 'auto']}
                label={{
                  value: 'PI',
                  angle: 90,
                  position: 'insideRight',
                  offset: 5,
                  fontSize: 10,
                  fill: ct.textMuted,
                }}
              />
            )}
            <Tooltip content={<CvLineTooltipContent ct={ct} overlay={overlay} />} />
            <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: '0.6rem' }} />
            {showCv &&
              topCodes.map((code, i) => (
                <Line
                  key={`cv_${code}`}
                  yAxisId="cv"
                  type="monotone"
                  dataKey={`cv_${code}`}
                  name={categoryNames.get(code) ?? code}
                  stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            {showPi &&
              topCodes.map((code, i) => (
                <Line
                  key={`pi_${code}`}
                  yAxisId="pi"
                  type="monotone"
                  dataKey={`pi_${code}`}
                  name={`${categoryNames.get(code) ?? code} (PI)`}
                  stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
                  connectNulls
                />
              ))}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* ── ビュー2: 売上×CV二軸グラフ ── */}
      {viewMode === 'salesCv' && (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={salesCvData} margin={{ top: 8, right: 50, left: 10, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.3} />
            <XAxis
              dataKey="dateKey"
              tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
              stroke={ct.grid}
              tickFormatter={formatDateKey}
            />
            <YAxis
              yAxisId="sales"
              tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
              stroke={ct.grid}
              tickFormatter={(v: number) => formatCurrency(v)}
              label={{
                value: '売上',
                angle: -90,
                position: 'insideLeft',
                offset: 5,
                fontSize: 10,
                fill: ct.textMuted,
              }}
            />
            <YAxis
              yAxisId="cv"
              orientation="right"
              tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
              stroke={ct.grid}
              domain={[0, 'auto']}
              label={{
                value: 'CV',
                angle: 90,
                position: 'insideRight',
                offset: 5,
                fontSize: 10,
                fill: ct.textMuted,
              }}
            />
            <Tooltip content={<SalesCvTooltipContent ct={ct} />} />
            <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: '0.6rem' }} />
            {topCodes.map((code, i) => (
              <Bar
                key={`sales_${code}`}
                yAxisId="sales"
                dataKey={`sales_${code}`}
                name={`${categoryNames.get(code) ?? code} (売上)`}
                fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                fillOpacity={0.3}
                stackId="sales"
              />
            ))}
            {topCodes.map((code, i) => (
              <Line
                key={`cv_${code}`}
                yAxisId="cv"
                type="monotone"
                dataKey={`cv_${code}`}
                name={`${categoryNames.get(code) ?? code} (CV)`}
                stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* ── ビュー3: SKU×時間CVヒートマップ ── */}
      {viewMode === 'heatmap' && (
        <HeatmapGrid>
          <HeatmapTable>
            <thead>
              <tr>
                <HeatmapTh style={{ textAlign: 'left' }}>カテゴリ</HeatmapTh>
                {heatmapData.dateKeys.map((dk) => (
                  <HeatmapTh key={dk}>{formatDateKey(dk)}</HeatmapTh>
                ))}
              </tr>
            </thead>
            <tbody>
              {topCodes.map((code) => {
                const codeMap = heatmapData.cvMap.get(code)
                return (
                  <tr key={code}>
                    <HeatmapRowHeader title={categoryNames.get(code) ?? code}>
                      {categoryNames.get(code) ?? code}
                    </HeatmapRowHeader>
                    {heatmapData.dateKeys.map((dk) => {
                      const cv = codeMap?.get(dk)
                      if (cv == null) {
                        return (
                          <HeatmapCell key={dk} $bg="transparent" $textColor={ct.textMuted}>
                            -
                          </HeatmapCell>
                        )
                      }
                      const { bg, text } = cvToColor(cv, heatmapData.maxCv)
                      return (
                        <HeatmapCell key={dk} $bg={bg} $textColor={text}>
                          {cv.toFixed(2)}
                        </HeatmapCell>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </HeatmapTable>
        </HeatmapGrid>
      )}

      {/* 状態判定テーブル */}
      <StatusTable>
        {topCodes.map((code, i) => {
          const status = categoryStatuses.get(code) ?? 'unknown'
          const info = STATUS_MAP[status]
          return (
            <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: '0.6rem', color: ct.text }}>
                {categoryNames.get(code) ?? code}
              </span>
              <StatusBadge $color={info.color}>
                {info.label} ({info.description})
              </StatusBadge>
            </div>
          )
        })}
      </StatusTable>
    </Wrapper>
  )
})
