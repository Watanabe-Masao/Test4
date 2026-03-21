/**
 * CategoryHeatmapPanel — 点数選択時の部門×曜日ヒートマップ
 *
 * DuckDB から部門（またはライン/クラス）×曜日の売上・点数を集約し、
 * ヒートマップテーブルで表示する。売上/点数の切替トグル付き。
 */
import { useState, useMemo, memo } from 'react'
import styled, { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { useDuckDBCategoryDowMatrix } from '@/application/hooks/useDuckDBQuery'
import { useCurrencyFormatter } from './chartTheme'
import { interpolateColor } from './HeatmapChart.helpers'
import { ChartSkeleton } from '@/presentation/components/common/feedback'
import type { DuckQueryContext } from './SubAnalysisPanel'

type MetricMode = 'amount' | 'quantity'
type HierarchyLevel = 'department' | 'line' | 'klass'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0] // 月〜日

interface Props {
  readonly ctx: DuckQueryContext
}

export const CategoryHeatmapPanel = memo(function CategoryHeatmapPanel({ ctx }: Props) {
  const { duckConn, duckDataVersion, currentDateRange, selectedStoreIds } = ctx
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const [metric, setMetric] = useState<MetricMode>('amount')
  const [level, setLevel] = useState<HierarchyLevel>('department')

  // カテゴリ×曜日マトリクス
  const { data: matrixRows, isLoading } = useDuckDBCategoryDowMatrix(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
  )

  // データ整形
  const { categories, cellMap, maxVal } = useMemo(() => {
    if (!matrixRows || matrixRows.length === 0) {
      return { categories: [], cellMap: new Map<string, number>(), maxVal: 0 }
    }

    // カテゴリ別の合計を算出してソート
    const catTotals = new Map<string, { name: string; total: number }>()
    for (const row of matrixRows) {
      const existing = catTotals.get(row.code) ?? { name: row.name || row.code, total: 0 }
      existing.total += metric === 'amount' ? row.amount : row.quantity
      catTotals.set(row.code, existing)
    }

    const sorted = [...catTotals.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 12) // 上位12カテゴリ
    const catCodes = new Set(sorted.map(([code]) => code))

    // セルマップ構築
    const cells = new Map<string, number>()
    let max = 0
    for (const row of matrixRows) {
      if (!catCodes.has(row.code)) continue
      const val =
        metric === 'amount'
          ? row.dayCount > 0
            ? row.amount / row.dayCount
            : 0
          : row.dayCount > 0
            ? row.quantity / row.dayCount
            : 0
      cells.set(`${row.code}-${row.dow}`, val)
      if (val > max) max = val
    }

    return {
      categories: sorted.map(([code, v]) => ({ code, name: v.name })),
      cellMap: cells,
      maxVal: max,
    }
  }, [matrixRows, metric])

  if (isLoading) return <ChartSkeleton height="200px" />

  if (categories.length === 0) {
    return <NoData>データがありません</NoData>
  }

  return (
    <div>
      {/* ツールバー */}
      <ToolbarRow>
        <ToggleGroup>
          <ToggleBtn $active={metric === 'amount'} onClick={() => setMetric('amount')}>
            売上
          </ToggleBtn>
          <ToggleBtn $active={metric === 'quantity'} onClick={() => setMetric('quantity')}>
            点数
          </ToggleBtn>
        </ToggleGroup>
        <ToggleGroup>
          <ToggleBtn $active={level === 'department'} onClick={() => setLevel('department')}>
            部門
          </ToggleBtn>
          <ToggleBtn $active={level === 'line'} onClick={() => setLevel('line')}>
            ライン
          </ToggleBtn>
        </ToggleGroup>
      </ToolbarRow>

      {/* ヒートマップテーブル */}
      <HeatmapTable>
        <thead>
          <tr>
            <HeaderCell />
            {DOW_ORDER.map((dow) => (
              <HeaderCell key={dow}>{DOW_LABELS[dow]}</HeaderCell>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map(({ code, name }) => (
            <tr key={code}>
              <RowHeader title={name}>{name}</RowHeader>
              {DOW_ORDER.map((dow) => {
                const val = cellMap.get(`${code}-${dow}`) ?? 0
                const ratio = maxVal > 0 ? val / maxVal : 0
                const bg = theme.mode === 'dark' ? 'rgba(15,23,42,1)' : 'rgba(255,255,255,1)'
                const primary = theme.mode === 'dark' ? '#38bdf8' : '#3b82f6'
                const bgColor = interpolateColor(ratio, bg, primary)
                return (
                  <DataCell
                    key={dow}
                    style={{ background: bgColor }}
                    title={`${name} ${DOW_LABELS[dow]}: ${metric === 'amount' ? fmt(val) : Math.round(val)}`}
                  >
                    {metric === 'amount' ? fmt(val) : Math.round(val)}
                  </DataCell>
                )
              })}
            </tr>
          ))}
        </tbody>
      </HeatmapTable>

      {/* 凡例 */}
      <LegendRow>
        <LegendLabel>低</LegendLabel>
        <GradientBar $isDark={theme.mode === 'dark'} />
        <LegendLabel>高</LegendLabel>
      </LegendRow>
    </div>
  )
})

// ── Styles ──

const NoData = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.text4};
  padding: ${({ theme }) => theme.spacing[4]};
  font-size: 0.75rem;
`

const ToolbarRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`

const ToggleGroup = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: 6px;
  padding: 2px;
`

const ToggleBtn = styled.button<{ $active: boolean }>`
  padding: 3px 10px;
  border-radius: 4px;
  border: none;
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text3)};
  font-size: 0.65rem;
  cursor: pointer;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  transition: all 0.15s;
  &:hover {
    opacity: 0.85;
  }
`

const HeatmapTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.6rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const HeaderCell = styled.th`
  padding: 4px 6px;
  text-align: center;
  font-size: 0.6rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const RowHeader = styled.td`
  padding: 4px 6px;
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text2};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const DataCell = styled.td`
  padding: 4px 6px;
  text-align: right;
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.text};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  transition: background 0.2s;
`

const LegendRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: ${({ theme }) => theme.spacing[2]};
  justify-content: flex-end;
`

const LegendLabel = styled.span`
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.text4};
`

const GradientBar = styled.div<{ $isDark: boolean }>`
  width: 80px;
  height: 8px;
  border-radius: 4px;
  background: ${({ $isDark }) =>
    $isDark
      ? 'linear-gradient(to right, rgba(56,189,248,0.1), rgba(56,189,248,0.9))'
      : 'linear-gradient(to right, rgba(59,130,246,0.05), rgba(59,130,246,0.85))'};
`
