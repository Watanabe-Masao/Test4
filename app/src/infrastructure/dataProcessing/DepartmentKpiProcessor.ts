import { safeNumber } from '@/domain/calculations/utils'
import type { DepartmentKpiData, DepartmentKpiRecord } from '@/domain/models'

/**
 * 部門別KPI CSVを処理する
 *
 * 想定レイアウト:
 *   行0: ヘッダー（部門, 粗利率予算, 粗利率実績, 予算差異, 値入, 売変, 売上予算, 売上実績, 差異, 達成率, 機首在庫, 期末在庫, 最終粗利着地, 最終売上着地）
 *   行1+: データ行
 *
 * ※ ヘッダーが2行ある場合（グループヘッダー＋サブヘッダー）にも対応
 *    先頭セルが数値（部門コード）でない行はスキップ
 */
export function processDepartmentKpi(
  rows: readonly unknown[][],
): DepartmentKpiData {
  if (rows.length < 2) return { records: [] }

  const records: DepartmentKpiRecord[] = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] as unknown[]
    if (r.length < 2) continue

    // 先頭セルが数値（部門コード）の行のみデータ行として処理
    const codeRaw = String(r[0] ?? '').trim()
    if (!/^\d+$/.test(codeRaw)) continue

    const deptCode = codeRaw
    // 部門名: 2列目が文字列なら名称、数値なら名称なし
    let nameCol = 1
    let deptName = ''
    const secondCell = String(r[1] ?? '').trim()
    if (secondCell && !/^-?\d/.test(secondCell)) {
      deptName = secondCell
      nameCol = 2
    }

    const col = (offset: number) => safeNumber(r[nameCol + offset])
    // パーセント値は小数に変換（例: 22.20 → 0.2220）
    const pct = (offset: number) => {
      const v = col(offset)
      return Math.abs(v) > 1 ? v / 100 : v
    }

    records.push({
      deptCode,
      deptName,
      gpRateBudget: pct(0),
      gpRateActual: pct(1),
      gpRateVariance: col(2), // pt差異はそのまま
      markupRate: pct(3),
      discountRate: pct(4),
      salesBudget: col(5),
      salesActual: col(6),
      salesVariance: col(7),
      salesAchievement: pct(8),
      openingInventory: col(9),
      closingInventory: col(10),
      gpRateLanding: pct(11),
      salesLanding: col(12),
    })
  }

  return { records }
}

/**
 * 部門別KPIデータをマージする（後勝ち）
 */
export function mergeDepartmentKpiData(
  existing: DepartmentKpiData,
  incoming: DepartmentKpiData,
): DepartmentKpiData {
  const map = new Map<string, DepartmentKpiRecord>()
  for (const rec of existing.records) map.set(rec.deptCode, rec)
  for (const rec of incoming.records) map.set(rec.deptCode, rec)
  return { records: [...map.values()] }
}
