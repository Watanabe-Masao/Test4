/**
 * DeptTrendChart — 純粋ロジック層
 *
 * DuckDB の DeptKpiMonthlyTrendRow[] を受け取り、部門別月次トレンドデータに変換する。
 * React 非依存。副作用なし。
 *
 * 責務:
 *   - 部門別×月別のクロス集計
 *   - 粗利率・売上の月次チャートデータ構築
 */
import type { DeptKpiMonthlyTrendRow } from '@/application/hooks/useDuckDBQuery'

// ─── Types ──────────────────────────────────────────

export interface DeptTrendChartPoint {
  readonly label: string
  readonly [deptKey: string]: string | number | null
}

export interface DeptTrendResult {
  readonly chartData: readonly DeptTrendChartPoint[]
  readonly deptNames: ReadonlyMap<string, string>
}

// ─── Logic ──────────────────────────────────────────

/** DeptKpiMonthlyTrendRow[] → 部門別月次チャートデータ */
export function buildDeptTrendData(
  rows: readonly DeptKpiMonthlyTrendRow[],
  selectedDept: string | null,
): DeptTrendResult {
  const deptNames = new Map<string, string>()
  const monthMap = new Map<string, Record<string, number | null>>()

  for (const row of rows) {
    deptNames.set(row.deptCode, row.deptName)
    const key = `${row.year}/${String(row.month).padStart(2, '0')}`
    const existing = monthMap.get(key) ?? {}

    if (!selectedDept || selectedDept === row.deptCode) {
      existing[`gpRate_${row.deptCode}`] = Math.round(row.gpRateActual * 10000) / 100
      existing[`sales_${row.deptCode}`] = Math.round(row.salesActual)
    }

    monthMap.set(key, existing)
  }

  const sortedKeys = [...monthMap.keys()].sort()
  const chartData: DeptTrendChartPoint[] = sortedKeys.map((label) => ({
    label,
    ...monthMap.get(label)!,
  }))

  return { chartData, deptNames }
}
