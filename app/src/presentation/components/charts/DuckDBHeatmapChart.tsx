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
import { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import type { AppTheme } from '@/presentation/theme/theme'
import {
  useDuckDBHourDowMatrix,
  type HourDowMatrixRow,
} from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter } from './chartTheme'

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
  border: ${({ $isAnomaly }) => ($isAnomaly ? '2px solid #ef4444' : '1px solid transparent')};
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

// ── Types ──

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
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
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
function interpolateColor(
  ratio: number,
  bgColor: string,
  primaryColor: string,
): string {
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

// ── Component ──

export function DuckDBHeatmapChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const theme = useTheme() as AppTheme

  // 時間帯×曜日マトリクス
  const { data: matrixRows } = useDuckDBHourDowMatrix(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
  )

  const heatmapData = useMemo(
    () => (matrixRows ? buildHeatmapData(matrixRows) : null),
    [matrixRows],
  )

  if (!duckConn || duckDataVersion === 0 || !heatmapData || heatmapData.cells.size === 0) {
    return null
  }

  const bgBase = ct.isDark ? '#1e1e2e' : '#f8fafc'
  const primaryHex = '#6366f1'

  const hours: number[] = []
  for (let h = HOUR_MIN; h <= HOUR_MAX; h++) {
    hours.push(h)
  }

  return (
    <Wrapper>
      <Title>時間帯×曜日ヒートマップ（DuckDB）</Title>
      <Subtitle>
        セル色 = 売上額（日平均） | 赤枠 = 異常検出 (Z &gt; {Z_SCORE_THRESHOLD})
      </Subtitle>

      <GridContainer>
        <HeatmapTable>
          <thead>
            <tr>
              <HeaderCell />
              {DOW_ORDER.map((dow) => (
                <HeaderCell key={dow}>
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
                  const cell = heatmapData.cells.get(cellKey(hour, dow))
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
                  const ratio = heatmapData.maxValue > 0
                    ? cell.dailyAvg / heatmapData.maxValue
                    : 0
                  const bgColor = interpolateColor(ratio, bgBase, primaryHex)

                  // テキスト色: ratio が高い場合は白テキスト
                  const textColor = ratio > 0.5
                    ? (ct.isDark ? theme.colors.text : '#ffffff')
                    : ct.textMuted

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
        <span>低</span>
        <GradientBar $from={bgBase} $to={primaryHex} />
        <span>高</span>
        {heatmapData.anomalyCount > 0 && (
          <span style={{ marginLeft: '12px', color: '#ef4444' }}>
            異常セル: {heatmapData.anomalyCount}件
          </span>
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
    </Wrapper>
  )
}
