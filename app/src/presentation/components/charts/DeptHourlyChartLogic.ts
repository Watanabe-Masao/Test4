/**
 * DeptHourlyChart — 純粋ロジック層
 *
 * DuckDB の CategoryHourlyRow[] を受け取り、部門別時間帯パターンデータに変換する。
 * React 非依存。副作用なし。
 *
 * 責務:
 *   - 上位N部門の抽出・ランキング
 *   - 時間帯×部門のマトリクス構築
 *   - 部門別時間帯パターンベクトル生成
 *   - ピアソン相関によるカニバリゼーション検出
 */
import type { CategoryHourlyRow } from '@/application/hooks/useDuckDBQuery'
import { topNByTotal } from '@/domain/calculations/rawAggregation'
import { STORE_COLORS } from './chartTheme'
import { palette } from '@/presentation/theme/tokens'
import { pearsonCorrelation } from '@/application/hooks/useStatistics'

// ─── Types ──────────────────────────────────────────

export interface DeptInfo {
  readonly code: string
  readonly name: string
  readonly totalAmount: number
  readonly color: string
}

export interface DeptHourlyDataPoint {
  readonly hour: string
  readonly hourNum: number
  readonly [deptKey: string]: string | number
}

export interface CannibalizationResult {
  readonly deptA: string
  readonly deptB: string
  readonly r: number
}

export interface DeptHourlyResult {
  readonly chartData: readonly DeptHourlyDataPoint[]
  readonly departments: readonly DeptInfo[]
  readonly hourlyPatterns: ReadonlyMap<string, number[]>
}

// ─── Constants ──────────────────────────────────────

export const TOP_N_OPTIONS = [3, 5, 7, 10] as const

/** 部門別カラーパレット（STORE_COLORS を拡張） */
export const DEPT_COLORS = [
  ...STORE_COLORS,
  palette.purple,
  palette.orange,
  palette.lime,
  palette.blue,
  palette.pink,
] as const

// ─── Logic ──────────────────────────────────────────

/** CategoryHourlyRow[] → 部門別時間帯チャートデータ */
export function buildDeptHourlyData(
  rows: readonly CategoryHourlyRow[],
  topN: number,
  activeDepts: ReadonlySet<string>,
  hourMin: number,
  hourMax: number,
): DeptHourlyResult {
  const { ranked, topKeys: topCodes } = topNByTotal(
    rows,
    (r) => r.code,
    (r) => r.amount,
    topN,
  )

  // 部門名マップ（nameは最初に出現したものを使用）
  const nameMap = new Map<string, string>()
  for (const row of rows) {
    if (!nameMap.has(row.code)) nameMap.set(row.code, row.name)
  }

  const departments: DeptInfo[] = ranked.map((r, i) => ({
    code: r.key,
    name: nameMap.get(r.key) || r.key,
    totalAmount: Math.round(r.total),
    color: DEPT_COLORS[i % DEPT_COLORS.length],
  }))

  const hourMap = new Map<number, Record<string, number>>()
  for (const row of rows) {
    if (!topCodes.has(row.code)) continue
    if (row.hour < hourMin || row.hour > hourMax) continue

    const existing = hourMap.get(row.hour) ?? {}
    const key = `dept_${row.code}`
    existing[key] = (existing[key] ?? 0) + row.amount
    hourMap.set(row.hour, existing)
  }

  const chartData: DeptHourlyDataPoint[] = []
  const hourlyPatterns = new Map<string, number[]>()
  for (const dept of departments) {
    hourlyPatterns.set(dept.code, [])
  }

  for (let h = hourMin; h <= hourMax; h++) {
    const hourData = hourMap.get(h) ?? {}
    const point: Record<string, string | number> = {
      hour: `${h}時`,
      hourNum: h,
    }

    for (const dept of departments) {
      const key = `dept_${dept.code}`
      const val = Math.round(hourData[key] ?? 0)
      hourlyPatterns.get(dept.code)!.push(val)

      if (activeDepts.size === 0 || activeDepts.has(dept.code)) {
        point[key] = val
      } else {
        point[key] = 0
      }
    }

    chartData.push(point as DeptHourlyDataPoint)
  }

  return { chartData, departments, hourlyPatterns }
}

/** 部門間のピアソン相関を計算し、カニバリゼーション（負の相関）を検出する */
export function detectCannibalization(
  departments: readonly DeptInfo[],
  hourlyPatterns: ReadonlyMap<string, number[]>,
): CannibalizationResult[] {
  if (departments.length < 2) return []

  const results: CannibalizationResult[] = []
  for (let i = 0; i < departments.length; i++) {
    const patternA = hourlyPatterns.get(departments[i].code)
    if (!patternA || patternA.length < 3) continue

    for (let j = i + 1; j < departments.length; j++) {
      const patternB = hourlyPatterns.get(departments[j].code)
      if (!patternB || patternB.length < 3) continue

      const { r } = pearsonCorrelation(patternA, patternB)
      if (r < -0.3) {
        results.push({
          deptA: departments[i].name,
          deptB: departments[j].name,
          r,
        })
      }
    }
  }

  return results.sort((a, b) => a.r - b.r)
}
