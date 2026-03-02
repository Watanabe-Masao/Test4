/**
 * DuckDB 時間帯×曜日ヒートマップ
 *
 * DuckDB の HourDowMatrix クエリを使い、時間帯（行）× 曜日（列）の
 * 売上日平均をヒートマップで表示する。セル色は売上額に比例し、
 * Z-score が 2 を超えるセルには赤枠の異常マーカーを付与する。
 *
 * 表示項目:
 * - 時間帯×曜日の売上日平均ヒートマップ
 * - Z-score 異常検出マーカー（|z| > 2）
 */
import { useState, useMemo, memo } from 'react'
import styled, { useTheme } from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import type { AppTheme } from '@/presentation/theme/theme'
import {
  useDuckDBHourDowMatrix,
  useDuckDBLevelAggregation,
  type HourDowMatrixRow,
} from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter, toPct } from './chartTheme'
import { palette } from '@/presentation/theme/tokens'
import { useI18n } from '@/application/hooks/useI18n'
import { EmptyState, ChartSkeleton } from '@/presentation/components/common'

// ── Styled Components ──

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const Subtitle = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const GridContainer = styled.div`
  overflow-x: auto;
`

const HeatmapTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.6rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const HeaderCell = styled.th`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  text-align: center;
  font-size: 0.6rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const RowHeader = styled.td`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  text-align: right;
  font-size: 0.6rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text3};
  white-space: nowrap;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
`

const DataCell = styled.td<{ $bgColor: string; $isAnomaly: boolean; $textColor: string }>`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  text-align: center;
  font-size: 0.55rem;
  color: ${({ $textColor }) => $textColor};
  background: ${({ $bgColor }) => $bgColor};
  border: ${({ $isAnomaly, theme }) =>
    $isAnomaly ? `2px solid ${theme.colors.palette.dangerDark}` : '1px solid transparent'};
  border-radius: ${({ theme }) => theme.radii.sm};
  transition: all 0.15s;
  min-width: 60px;

  &:hover {
    opacity: 0.85;
    transform: scale(1.02);
  }
`

const SummaryRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
  font-size: 0.6rem;
`

const SummaryItem = styled.div`
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const SummaryLabel = styled.span`
  color: ${({ theme }) => theme.colors.text4};
  margin-right: ${({ theme }) => theme.spacing[1]};
`

const LegendBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.text4};
`

const GradientBar = styled.div<{ $from: string; $to: string }>`
  width: 100px;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(to right, ${({ $from }) => $from}, ${({ $to }) => $to});
`

const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`

const ControlRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`

const TabGroup = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

const Tab = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text3)};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    opacity: 0.85;
  }
`

const HierarchyRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`

const HierarchySelect = styled.select`
  font-size: 0.65rem;
  padding: 2px 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text2};
  cursor: pointer;
`

/** 前年比用セル: 緑(+) / 赤(-) のグラデーション */
const DiffDataCell = styled.td<{ $ratio: number; $hasData: boolean; $textColor: string }>`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  text-align: center;
  font-size: 0.55rem;
  color: ${({ $textColor }) => $textColor};
  background: ${({ $ratio, $hasData }) => {
    if (!$hasData) return 'transparent'
    if ($ratio === 0) return 'rgba(100,100,100,0.1)'
    const absR = Math.min(Math.abs($ratio), 0.5) / 0.5
    if ($ratio > 0) return `rgba(34,197,94,${0.2 + absR * 0.7})`
    return `rgba(239,68,68,${0.2 + absR * 0.7})`
  }};
  border-radius: ${({ theme }) => theme.radii.sm};
  transition: all 0.15s;
  min-width: 60px;
  &:hover {
    opacity: 0.85;
    transform: scale(1.02);
  }
`

// ── Types ──

type HeatmapMode = 'amount' | 'yoyDiff'

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

interface CellData {
  readonly hour: number
  readonly dow: number
  readonly dailyAvg: number
  readonly zScore: number
  readonly isAnomaly: boolean
}

interface HeatmapData {
  readonly cells: ReadonlyMap<string, CellData>
  readonly maxValue: number
  readonly anomalyCount: number
  readonly peakHour: number
  readonly peakDow: number
  readonly peakValue: number
}

// ── Constants ──

const HOUR_MIN = 6
const HOUR_MAX = 22

/** 曜日ラベル (JS Date.getDay(): 0=日, 1=月, ..., 6=土) */
const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

/** 表示順: 月(1)〜日(0) */
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

const Z_SCORE_THRESHOLD = 2.0

// ── Helpers ──

function cellKey(hour: number, dow: number): string {
  return `${hour}-${dow}`
}

/** 行データからヒートマップデータを構築する */
function buildHeatmapData(rows: readonly HourDowMatrixRow[]): HeatmapData {
  // 日平均値を算出
  const dailyAvgs: { hour: number; dow: number; avg: number }[] = []
  for (const row of rows) {
    if (row.hour < HOUR_MIN || row.hour > HOUR_MAX) continue
    const avg = row.dayCount > 0 ? row.amount / row.dayCount : 0
    dailyAvgs.push({ hour: row.hour, dow: row.dow, avg })
  }

  if (dailyAvgs.length === 0) {
    return {
      cells: new Map(),
      maxValue: 0,
      anomalyCount: 0,
      peakHour: HOUR_MIN,
      peakDow: 1,
      peakValue: 0,
    }
  }

  // Z-score 計算: 全セルの平均・標準偏差を求める
  const values = dailyAvgs.map((d) => d.avg)
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  const stdDev = Math.sqrt(variance)

  const cells = new Map<string, CellData>()
  let maxValue = 0
  let anomalyCount = 0
  let peakHour = HOUR_MIN
  let peakDow = 1
  let peakValue = 0

  for (const { hour, dow, avg } of dailyAvgs) {
    const zScore = stdDev > 0 ? (avg - mean) / stdDev : 0
    const isAnomaly = Math.abs(zScore) >= Z_SCORE_THRESHOLD

    cells.set(cellKey(hour, dow), {
      hour,
      dow,
      dailyAvg: Math.round(avg),
      zScore: Math.round(zScore * 100) / 100,
      isAnomaly,
    })

    if (avg > maxValue) maxValue = avg
    if (isAnomaly) anomalyCount++
    if (avg > peakValue) {
      peakHour = hour
      peakDow = dow
      peakValue = avg
    }
  }

  return {
    cells,
    maxValue: Math.round(maxValue),
    anomalyCount,
    peakHour,
    peakDow,
    peakValue: Math.round(peakValue),
  }
}

/** 0-1 の割合からヒートマップ色を生成 */
function interpolateColor(ratio: number, bgColor: string, primaryColor: string): string {
  // bgColor / primaryColor は hex 想定
  const parsedBg = hexToRgb(bgColor)
  const parsedPrimary = hexToRgb(primaryColor)
  if (!parsedBg || !parsedPrimary) return bgColor

  const r = Math.round(parsedBg.r + (parsedPrimary.r - parsedBg.r) * ratio)
  const g = Math.round(parsedBg.g + (parsedPrimary.g - parsedBg.g) * ratio)
  const b = Math.round(parsedBg.b + (parsedPrimary.b - parsedBg.b) * ratio)
  return `rgb(${r}, ${g}, ${b})`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!match) return null
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  }
}

/** 前年の同日付範囲を構築する */
function buildPrevYearRange(range: DateRange): DateRange {
  return {
    from: { year: range.from.year - 1, month: range.from.month, day: range.from.day },
    to: { year: range.to.year - 1, month: range.to.month, day: range.to.day },
  }
}

/** 当年・前年のマトリクスから前年比差分率マップを構築 */
function buildDiffMap(
  currentRows: readonly HourDowMatrixRow[],
  prevRows: readonly HourDowMatrixRow[],
): Map<string, number> {
  const curMap = new Map<string, number>()
  const prevMap = new Map<string, number>()
  for (const r of currentRows) {
    if (r.hour < HOUR_MIN || r.hour > HOUR_MAX) continue
    const avg = r.dayCount > 0 ? r.amount / r.dayCount : 0
    curMap.set(cellKey(r.hour, r.dow), avg)
  }
  for (const r of prevRows) {
    if (r.hour < HOUR_MIN || r.hour > HOUR_MAX) continue
    const avg = r.dayCount > 0 ? r.amount / r.dayCount : 0
    prevMap.set(cellKey(r.hour, r.dow), avg)
  }
  const diffMap = new Map<string, number>()
  const allKeys = new Set([...curMap.keys(), ...prevMap.keys()])
  for (const key of allKeys) {
    const cur = curMap.get(key) ?? 0
    const prev = prevMap.get(key) ?? 0
    const ratio = prev > 0 ? (cur - prev) / prev : cur > 0 ? 1 : 0
    diffMap.set(key, ratio)
  }
  return diffMap
}

// ── Component ──

export const DuckDBHeatmapChart = memo(function DuckDBHeatmapChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
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

  const prevYearRange = useMemo(() => buildPrevYearRange(currentDateRange), [currentDateRange])

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
      <Wrapper aria-label="時間帯×曜日ヒートマップ（DuckDB）">
        <Title>時間帯×曜日ヒートマップ（DuckDB）</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </Wrapper>
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
    <Wrapper aria-label="時間帯×曜日ヒートマップ（DuckDB）">
      <ControlRow>
        <div>
          <Title>時間帯×曜日ヒートマップ（DuckDB）</Title>
          <Subtitle>
            {isAmountMode
              ? `セル色 = 売上額（日平均） | 赤枠 = 異常検出 (Z > ${Z_SCORE_THRESHOLD})`
              : 'セル色 = 前年比増減率（緑:増 / 赤:減）'}
          </Subtitle>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {hasPrevData && (
            <TabGroup>
              <Tab $active={isAmountMode} onClick={() => setHeatmapMode('amount')}>
                売上金額
              </Tab>
              <Tab $active={!isAmountMode} onClick={() => setHeatmapMode('yoyDiff')}>
                前年比増減
              </Tab>
            </TabGroup>
          )}
        </div>
      </ControlRow>

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
    </Wrapper>
  )
})
