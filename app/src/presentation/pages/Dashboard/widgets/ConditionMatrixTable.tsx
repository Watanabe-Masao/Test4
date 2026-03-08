/**
 * コンディションマトリクステーブル
 *
 * DuckDB から取得した5期間のメトリクスを
 * 前年比 / 前週比 / トレンド比率 / トレンド方向 のマトリクスとして表示する。
 *
 * 列: 売上 / 点数 / 客数 / 客単価 / 売変率 / 総仕入金額
 * スライダーで分析期間を変更可能。
 */
import { useMemo, memo } from 'react'
import styled from 'styled-components'
import { palette } from '@/presentation/theme/tokens'
import { formatPercent } from '@/domain/formatting'
import { dateRangeDays } from '@/domain/models'
import type { DateRange } from '@/domain/models'
import {
  useDuckDBConditionMatrix,
  buildConditionMatrix,
  type MatrixCell,
  type MatrixRowData,
  type TrendDirectionRow,
  type TrendDirection,
} from '@/application/hooks/duckdb/useConditionMatrix'
import { DayRangeSlider, useDayRange } from '@/presentation/components/charts'
import type { WidgetContext } from './types'

// ─── Styled Components ──────────────────────────────────

const Section = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding-top: ${({ theme }) => theme.spacing[6]};
`

const SectionTitle = styled.h5`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const TableWrapper = styled.div`
  overflow-x: auto;
`

const MTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

const MTh = styled.th`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  &:first-child {
    text-align: left;
  }
`

const MTd = styled.td<{ $color?: string; $bold?: boolean }>`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  font-size: 11px;
  ${({ $bold }) => $bold && 'font-weight: 700;'}
  &:first-child {
    text-align: left;
    font-family: inherit;
    font-weight: 600;
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
  }
`

const MTr = styled.tr<{ $separator?: boolean }>`
  ${({ $separator, theme }) =>
    $separator &&
    `
    border-top: 2px solid ${theme.colors.border};
  `}
`

const LoadingMsg = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  text-align: center;
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

const ErrorMsg = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  text-align: center;
  color: ${palette.danger};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

const WarningMsg = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[2]};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)'};
  border: 1px solid ${palette.caution};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.65rem;
  color: ${palette.caution};
`

const DirectionArrow = styled.span<{ $dir: TrendDirection }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $dir }) =>
    $dir === 'up' ? palette.positive : $dir === 'down' ? palette.negative : palette.slate};
`

// ─── Helpers ────────────────────────────────────────────

function ratioColor(ratio: number | null): string | undefined {
  if (ratio == null) return undefined
  if (ratio >= 1.02) return palette.positive
  if (ratio >= 0.98) return undefined
  return palette.negative
}

function formatRatio(c: MatrixCell): string {
  if (c.ratio == null) return '-'
  return formatPercent(c.ratio)
}

/** マトリクス列定義 */
interface ColumnDef {
  readonly key: keyof Omit<MatrixRowData, 'label'>
  readonly label: string
}

const COLUMNS: readonly ColumnDef[] = [
  { key: 'sales', label: '売上' },
  { key: 'quantity', label: '点数' },
  { key: 'customers', label: '客数' },
  { key: 'txValue', label: '客単価' },
  { key: 'discountRate', label: '売変率' },
  { key: 'totalCost', label: '総仕入' },
]

function renderMatrixRow(row: MatrixRowData, isSeparator = false) {
  return (
    <MTr key={row.label} $separator={isSeparator}>
      <MTd>{row.label}</MTd>
      {COLUMNS.map((col) => {
        const c = row[col.key]
        return (
          <MTd key={col.key} $color={ratioColor(c.ratio)}>
            {formatRatio(c)}
          </MTd>
        )
      })}
    </MTr>
  )
}

function directionArrow(dir: TrendDirection): string {
  if (dir === 'up') return '↑'
  if (dir === 'down') return '↓'
  return '→'
}

function renderDirectionRow(row: TrendDirectionRow) {
  return (
    <MTr key={row.label}>
      <MTd>{row.label}</MTd>
      {COLUMNS.map((col) => {
        const c = row[col.key as keyof Omit<TrendDirectionRow, 'label'>]
        return (
          <MTd key={col.key}>
            <DirectionArrow $dir={c.direction}>{directionArrow(c.direction)}</DirectionArrow>
          </MTd>
        )
      })}
    </MTr>
  )
}

// ─── Component ──────────────────────────────────────────

interface Props {
  readonly ctx: WidgetContext
}

export const ConditionMatrixTable = memo(function ConditionMatrixTable({ ctx }: Props) {
  const { duckConn, duckDataVersion, selectedStoreIds, year, month, daysInMonth } = ctx

  // スライダーによる日範囲選択（他のグラフと統一）
  const [dayStart, dayEnd, setDayRange] = useDayRange(daysInMonth)

  // 日番号から DateRange に変換
  const effectiveRange: DateRange = useMemo(
    () => ({
      from: { year, month, day: dayStart },
      to: { year, month, day: dayEnd },
    }),
    [year, month, dayStart, dayEnd],
  )

  // DuckDB からデータ取得
  const {
    data: rawRows,
    isLoading,
    error,
  } = useDuckDBConditionMatrix(duckConn, duckDataVersion, effectiveRange, selectedStoreIds)

  // マトリクス構築
  const totalDays = dateRangeDays(effectiveRange)
  const matrix = useMemo(() => {
    if (!rawRows || rawRows.length === 0) return null
    return buildConditionMatrix(rawRows, totalDays)
  }, [rawRows, totalDays])

  // 7日でない場合の警告判定
  const showDowWarning = matrix != null && matrix.trendHalfDays !== 7

  // DuckDB 未準備
  if (duckDataVersion === 0) return null

  return (
    <Section>
      <SectionTitle>コンディションマトリクス</SectionTitle>

      {isLoading && <LoadingMsg>読み込み中...</LoadingMsg>}
      {error && <ErrorMsg>データ取得エラー: {error}</ErrorMsg>}

      {matrix && (
        <TableWrapper>
          <MTable>
            <thead>
              <tr>
                <MTh />
                {COLUMNS.map((col) => (
                  <MTh key={col.key}>{col.label}</MTh>
                ))}
              </tr>
            </thead>
            <tbody>
              {renderMatrixRow(matrix.yoy)}
              {renderMatrixRow(matrix.wow)}
              {renderMatrixRow(matrix.trendRatio, true)}
              {renderDirectionRow(matrix.trendDirection)}
            </tbody>
          </MTable>

          {showDowWarning && (
            <WarningMsg>
              トレンド比較: 各半期間 {matrix.trendHalfDays}
              日間（7日でないため曜日バイアスの影響を受ける可能性があります）
            </WarningMsg>
          )}
        </TableWrapper>
      )}

      {!isLoading && !error && !matrix && <LoadingMsg>データがありません</LoadingMsg>}

      <DayRangeSlider
        min={1}
        max={daysInMonth}
        start={dayStart}
        end={dayEnd}
        onChange={setDayRange}
        elapsedDays={ctx.elapsedDays}
      />
    </Section>
  )
})
