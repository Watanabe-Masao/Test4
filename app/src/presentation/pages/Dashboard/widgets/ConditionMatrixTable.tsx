/**
 * コンディションマトリクステーブル
 *
 * DuckDB から取得した3期間（当期・前年・前週）のメトリクスを
 * 自店/他店比較のクロス集計マトリクスとして表示する。
 *
 * 表の下に DuckDBDateRangePicker を配置し、動的に期間を変更可能。
 */
import { useMemo, memo } from 'react'
import styled from 'styled-components'
import { palette } from '@/presentation/theme/tokens'
import { formatPercent } from '@/domain/calculations/utils'
import {
  useDuckDBConditionMatrix,
  buildConditionMatrix,
  type MatrixCell,
  type MatrixRowData,
  type ConditionMatrixResult,
} from '@/application/hooks/duckdb/useConditionMatrix'
import { DuckDBDateRangePicker } from '@/presentation/components/charts/DuckDBDateRangePicker'
import { useDuckDBDateRange } from '@/presentation/components/charts/useDuckDBDateRange'
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

const MTh = styled.th<{ $group?: boolean }>`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  ${({ $group, theme }) =>
    $group &&
    `
    border-bottom: 1px solid ${theme.colors.border};
    font-weight: 700;
    font-size: 11px;
  `}
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

const PickerWrapper = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
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

// ─── Helpers ────────────────────────────────────────────

function ratioColor(ratio: number | null): string | undefined {
  if (ratio == null) return undefined
  if (ratio >= 1.02) return palette.positive
  if (ratio >= 0.98) return undefined
  return palette.negative
}

function formatRatio(cell: MatrixCell): string {
  if (cell.ratio == null) return '-'
  return formatPercent(cell.ratio, 1)
}

/** マトリクス列定義 */
interface ColumnDef {
  readonly key: keyof Omit<MatrixRowData, 'label'>
  readonly label: string
}

const COLUMNS: readonly ColumnDef[] = [
  { key: 'customers', label: '客数' },
  { key: 'sales', label: '売上' },
  { key: 'txValue', label: '客単価' },
  { key: 'discountRate', label: '売変率' },
  { key: 'costInclusionRate', label: '原価算入率' },
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

// ─── Component ──────────────────────────────────────────

interface Props {
  readonly ctx: WidgetContext
}

export const ConditionMatrixTable = memo(function ConditionMatrixTable({ ctx }: Props) {
  const {
    duckConn,
    duckDataVersion,
    duckLoadedMonthCount,
    selectedStoreIds,
    year,
    month,
    daysInMonth,
  } = ctx

  // マトリクス専用の日付範囲（ウィジェット内で独立管理）
  const [matrixDateRange, setMatrixDateRange] = useDuckDBDateRange(year, month, daysInMonth)

  // DuckDB からデータ取得
  const {
    data: rawRows,
    isLoading,
    error,
  } = useDuckDBConditionMatrix(duckConn, duckDataVersion, matrixDateRange, selectedStoreIds)

  // 選択中の店舗ID（単一店舗選択時のみ自店/他店比較を有効化）
  const selectedStoreId = useMemo(() => {
    if (selectedStoreIds.size === 1) {
      return [...selectedStoreIds][0]
    }
    return undefined
  }, [selectedStoreIds])

  // マトリクス構築
  const matrix: ConditionMatrixResult | null = useMemo(() => {
    if (!rawRows || rawRows.length === 0) return null
    return buildConditionMatrix(rawRows, selectedStoreId)
  }, [rawRows, selectedStoreId])

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
              {/* 自店比較 */}
              {renderMatrixRow(matrix.ownYoY)}
              {renderMatrixRow(matrix.ownWoW)}

              {/* 他店比較（複数店舗 + 単一選択時のみ） */}
              {matrix.crossYoY && renderMatrixRow(matrix.crossYoY, true)}
              {matrix.crossWoW && renderMatrixRow(matrix.crossWoW)}

              {/* 構成比変化 */}
              {matrix.ownCompositionChange && renderMatrixRow(matrix.ownCompositionChange, true)}
            </tbody>
          </MTable>
        </TableWrapper>
      )}

      {!isLoading && !error && !matrix && <LoadingMsg>データがありません</LoadingMsg>}

      <PickerWrapper>
        <DuckDBDateRangePicker
          value={matrixDateRange}
          onChange={setMatrixDateRange}
          year={year}
          month={month}
          daysInMonth={daysInMonth}
          loadedMonthCount={duckLoadedMonthCount}
        />
      </PickerWrapper>
    </Section>
  )
})
