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
import {
  Section,
  SectionTitle,
  TableWrapper,
  MTable,
  MTh,
  MTd,
  MTr,
  LoadingMsg,
  ErrorMsg,
  WarningMsg,
  DirectionArrow,
} from './ConditionMatrixTable.styles'

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
