/**
 * DailyRecordRow → DailyRecord / PrevYearDailyEntry 変換ユーティリティ
 *
 * DuckDB クエリ結果（DailyRecordRow）を既存チャートが受け取る形式に変換する。
 * Phase 3.2 の段階移行用。Phase 5 で StoreResult.daily 廃止後は不要になる。
 */
import type { DailyRecord, DiscountEntry } from '@/domain/models'
import type { PrevYearDailyEntry } from './usePrevYearData'
import type { BudgetChartDataPoint } from './useBudgetChartData'
import type { DailyRecordRow } from '@/infrastructure/duckdb/queries/dailyRecords'

/** 売変種別マッピング（DailyRecordRow → DiscountEntry 変換用） */
const DISCOUNT_MAP: ReadonlyArray<{
  field: 'discount71' | 'discount72' | 'discount73' | 'discount74'
  type: '71' | '72' | '73' | '74'
  label: string
}> = [
  { field: 'discount71', type: '71', label: '政策売変' },
  { field: 'discount72', type: '72', label: 'レジ値引' },
  { field: 'discount73', type: '73', label: '廃棄売変' },
  { field: 'discount74', type: '74', label: '試食売変' },
]

/**
 * DailyRecordRow[] → Map<number, DailyRecord>
 *
 * DuckDB 日別明細を既存チャート用の Map 形式に変換する。
 * 複数店舗のデータが含まれる場合、同一日のデータは合算される。
 */
export function toDailyRecordMap(
  rows: readonly DailyRecordRow[],
): ReadonlyMap<number, DailyRecord> {
  const map = new Map<number, DailyRecord>()
  for (const row of rows) {
    const existing = map.get(row.day)
    if (existing) {
      // 複数店舗の場合は合算（aggregated クエリを使うのが推奨だが安全策）
      map.set(row.day, mergeDailyRecord(existing, row))
    } else {
      map.set(row.day, rowToDailyRecord(row))
    }
  }
  return map
}

/**
 * DailyRecordRow[] → Map<number, PrevYearDailyEntry>
 *
 * 前年 DuckDB データを既存チャート用の前年 Map 形式に変換する。
 */
export function toPrevYearDailyMap(
  rows: readonly DailyRecordRow[],
): ReadonlyMap<number, PrevYearDailyEntry> {
  const map = new Map<number, PrevYearDailyEntry>()
  for (const row of rows) {
    const existing = map.get(row.day)
    if (existing) {
      map.set(row.day, {
        sales: existing.sales + row.sales,
        discount: existing.discount + row.discountAbsolute,
        customers: (existing.customers ?? 0) + row.customers,
      })
    } else {
      map.set(row.day, {
        sales: row.sales,
        discount: row.discountAbsolute,
        customers: row.customers,
      })
    }
  }
  return map
}

/**
 * DailyRecordRow[] → BudgetChartDataPoint[]
 *
 * DuckDB 日別明細（予算付き）から累計チャートデータを構築する。
 */
export function toBudgetChartData(
  rows: readonly DailyRecordRow[],
  prevYearRows: readonly DailyRecordRow[],
  daysInMonth: number,
): readonly BudgetChartDataPoint[] {
  // 日別集約（複数店舗合算）
  const dailySales = new Map<number, number>()
  const dailyBudget = new Map<number, number>()
  for (const row of rows) {
    dailySales.set(row.day, (dailySales.get(row.day) ?? 0) + row.sales)
    dailyBudget.set(row.day, (dailyBudget.get(row.day) ?? 0) + row.budgetAmount)
  }

  // 前年日別集約
  const prevDailySales = new Map<number, number>()
  for (const row of prevYearRows) {
    prevDailySales.set(row.day, (prevDailySales.get(row.day) ?? 0) + row.sales)
  }

  const result: BudgetChartDataPoint[] = []
  let actualCum = 0
  let budgetCum = 0
  let prevYearCum = 0
  const hasPrevYear = prevYearRows.length > 0

  for (let day = 1; day <= daysInMonth; day++) {
    actualCum += dailySales.get(day) ?? 0
    budgetCum += dailyBudget.get(day) ?? 0
    if (hasPrevYear) {
      prevYearCum += prevDailySales.get(day) ?? 0
    }
    result.push({
      day,
      actualCum,
      budgetCum,
      prevYearCum: hasPrevYear ? prevYearCum : null,
    })
  }

  return result
}

// ── Internal helpers ──

function rowToDailyRecord(row: DailyRecordRow): DailyRecord {
  return {
    day: row.day,
    sales: row.sales,
    coreSales: row.coreSales,
    grossSales: row.grossSales,
    purchase: { cost: row.purchaseCost, price: row.purchasePrice },
    deliverySales: {
      cost: row.flowersCost + row.directProduceCost,
      price: row.flowersPrice + row.directProducePrice,
    },
    interStoreIn: { cost: row.interStoreInCost, price: row.interStoreInPrice },
    interStoreOut: { cost: row.interStoreOutCost, price: row.interStoreOutPrice },
    interDepartmentIn: { cost: row.interDeptInCost, price: row.interDeptInPrice },
    interDepartmentOut: { cost: row.interDeptOutCost, price: row.interDeptOutPrice },
    flowers: { cost: row.flowersCost, price: row.flowersPrice },
    directProduce: { cost: row.directProduceCost, price: row.directProducePrice },
    consumable: { cost: row.consumableCost, items: [] },
    customers: row.customers,
    discountAmount: row.discountAmount,
    discountAbsolute: row.discountAbsolute,
    discountEntries: buildDiscountEntries(row),
    supplierBreakdown: new Map(),
    transferBreakdown: {
      interStoreIn: [],
      interStoreOut: [],
      interDepartmentIn: [],
      interDepartmentOut: [],
    },
  }
}

function buildDiscountEntries(row: DailyRecordRow): readonly DiscountEntry[] {
  return DISCOUNT_MAP.filter((d) => row[d.field] !== 0).map((d) => ({
    type: d.type,
    label: d.label,
    amount: Math.abs(row[d.field]),
  }))
}

function mergeDailyRecord(a: DailyRecord, row: DailyRecordRow): DailyRecord {
  return {
    day: a.day,
    sales: a.sales + row.sales,
    coreSales: a.coreSales + row.coreSales,
    grossSales: a.grossSales + row.grossSales,
    purchase: {
      cost: a.purchase.cost + row.purchaseCost,
      price: a.purchase.price + row.purchasePrice,
    },
    deliverySales: {
      cost: a.deliverySales.cost + row.flowersCost + row.directProduceCost,
      price: a.deliverySales.price + row.flowersPrice + row.directProducePrice,
    },
    interStoreIn: {
      cost: a.interStoreIn.cost + row.interStoreInCost,
      price: a.interStoreIn.price + row.interStoreInPrice,
    },
    interStoreOut: {
      cost: a.interStoreOut.cost + row.interStoreOutCost,
      price: a.interStoreOut.price + row.interStoreOutPrice,
    },
    interDepartmentIn: {
      cost: a.interDepartmentIn.cost + row.interDeptInCost,
      price: a.interDepartmentIn.price + row.interDeptInPrice,
    },
    interDepartmentOut: {
      cost: a.interDepartmentOut.cost + row.interDeptOutCost,
      price: a.interDepartmentOut.price + row.interDeptOutPrice,
    },
    flowers: {
      cost: a.flowers.cost + row.flowersCost,
      price: a.flowers.price + row.flowersPrice,
    },
    directProduce: {
      cost: a.directProduce.cost + row.directProduceCost,
      price: a.directProduce.price + row.directProducePrice,
    },
    consumable: { cost: a.consumable.cost + row.consumableCost, items: [] },
    customers: (a.customers ?? 0) + row.customers,
    discountAmount: a.discountAmount + row.discountAmount,
    discountAbsolute: a.discountAbsolute + row.discountAbsolute,
    discountEntries: a.discountEntries, // 合算時はフラット化不可 → 元のまま
    supplierBreakdown: new Map(),
    transferBreakdown: {
      interStoreIn: [],
      interStoreOut: [],
      interDepartmentIn: [],
      interDepartmentOut: [],
    },
  }
}
