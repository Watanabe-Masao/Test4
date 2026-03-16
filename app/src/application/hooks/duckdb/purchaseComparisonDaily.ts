/**
 * 仕入比較 — 日別データ・ピボット構築（純粋関数）
 *
 * purchaseComparisonBuilders.ts から分割。
 * 日別データとカテゴリ×日別ピボットテーブルの構築を担う。
 */
import type {
  CategoryComparisonRow,
  PurchaseDailyData,
  PurchaseDailyPivotData,
  PurchaseDailyPivotColumn,
  PurchaseDailyPivotCell,
  PurchaseDailyPivotRow,
} from '@/domain/models/PurchaseComparison'
import type {
  PurchaseDailySupplierRow,
  CategoryDailyRow,
  PurchaseDailyRow,
  SalesDailyRow,
} from '@/infrastructure/duckdb/queries/purchaseComparison'
import type { CustomCategoryId } from '@/domain/constants/customCategories'
import { UNCATEGORIZED_CATEGORY_ID } from '@/domain/constants/customCategories'
import { SPECIAL_SALES_CATEGORY_MAP, TRANSFERS_CATEGORY_MAP } from './purchaseComparisonKpi'

export function buildDailyData(
  curDaily: readonly PurchaseDailyRow[],
  prevDaily: readonly PurchaseDailyRow[],
  curSalesDaily: readonly SalesDailyRow[],
  prevSalesDaily: readonly SalesDailyRow[],
): PurchaseDailyData {
  const curSalesDayMap = new Map(curSalesDaily.map((r) => [r.day, r.totalSales]))
  const prevSalesDayMap = new Map(prevSalesDaily.map((r) => [r.day, r.totalSales]))
  return {
    current: curDaily.map((r) => ({
      day: r.day,
      cost: r.totalCost,
      price: r.totalPrice,
      markup: r.totalPrice - r.totalCost,
      sales: curSalesDayMap.get(r.day) ?? 0,
    })),
    prev: prevDaily.map((r) => ({
      day: r.day,
      cost: r.totalCost,
      price: r.totalPrice,
      markup: r.totalPrice - r.totalCost,
      sales: prevSalesDayMap.get(r.day) ?? 0,
    })),
  }
}

// ── カテゴリ別日別ピボット構築 ──

/** 内部用: 当期/前期の集計マップ型 */
interface DayCellAccum {
  cost: number
  price: number
  prevCost: number
  prevPrice: number
}

export function buildDailyPivot(
  curDailyBySupplier: readonly PurchaseDailySupplierRow[],
  prevDailyBySupplier: readonly PurchaseDailySupplierRow[],
  curSpecialDaily: readonly CategoryDailyRow[],
  prevSpecialDaily: readonly CategoryDailyRow[],
  curTransfersDaily: readonly CategoryDailyRow[],
  prevTransfersDaily: readonly CategoryDailyRow[],
  byCategory: readonly CategoryComparisonRow[],
  supplierCategoryMap: Readonly<Partial<Record<string, CustomCategoryId>>>,
  curYear: number,
  curMonth: number,
  dowOffset = 0,
): PurchaseDailyPivotData {
  // 列定義: byCategory の順序（原価降順）を使う
  const columns: PurchaseDailyPivotColumn[] = byCategory.map((cat) => ({
    key: cat.categoryId,
    label: cat.category,
    color: cat.color,
  }))
  const columnKeys = columns.map((c) => c.key)

  const emptyCell = (): DayCellAccum => ({ cost: 0, price: 0, prevCost: 0, prevPrice: 0 })

  // 前期日付を当期日付にアラインする（同曜日オフセット対応）
  const daysInCurMonth = new Date(curYear, curMonth, 0).getDate()
  const alignPrevDay = (prevDay: number): number => {
    if (dowOffset === 0) return prevDay
    const d = prevDay - dowOffset
    return d >= 1 ? d : d + daysInCurMonth
  }

  // 日別にグループ化
  const dayMap = new Map<number, Map<string, DayCellAccum>>()

  const ensureDay = (day: number): Map<string, DayCellAccum> => {
    if (!dayMap.has(day)) {
      const cells = new Map<string, DayCellAccum>()
      for (const k of columnKeys) cells.set(k, emptyCell())
      dayMap.set(day, cells)
    }
    return dayMap.get(day)!
  }

  const addCur = (cells: Map<string, DayCellAccum>, catId: string, cost: number, price: number) => {
    const e = cells.get(catId) ?? emptyCell()
    cells.set(catId, { ...e, cost: e.cost + cost, price: e.price + price })
  }

  const addPrev = (
    cells: Map<string, DayCellAccum>,
    catId: string,
    cost: number,
    price: number,
  ) => {
    const e = cells.get(catId) ?? emptyCell()
    cells.set(catId, { ...e, prevCost: e.prevCost + cost, prevPrice: e.prevPrice + price })
  }

  // ── 当期データ ──
  for (const row of curDailyBySupplier) {
    const catId = supplierCategoryMap[row.supplierCode] ?? UNCATEGORIZED_CATEGORY_ID
    addCur(ensureDay(row.day), catId, row.totalCost, row.totalPrice)
  }
  for (const row of curSpecialDaily) {
    const catId = SPECIAL_SALES_CATEGORY_MAP[row.categoryKey]
    if (catId) addCur(ensureDay(row.day), catId, row.totalCost, row.totalPrice)
  }
  for (const row of curTransfersDaily) {
    const catId = TRANSFERS_CATEGORY_MAP[row.categoryKey]
    if (!catId) continue
    if (row.categoryKey !== 'interStoreIn' && row.categoryKey !== 'interDeptIn') continue
    addCur(ensureDay(row.day), catId, row.totalCost, row.totalPrice)
  }

  // ── 前期データ（dowOffset で日付をアラインして当期日と対応させる）──
  for (const row of prevDailyBySupplier) {
    const catId = supplierCategoryMap[row.supplierCode] ?? UNCATEGORIZED_CATEGORY_ID
    addPrev(ensureDay(alignPrevDay(row.day)), catId, row.totalCost, row.totalPrice)
  }
  for (const row of prevSpecialDaily) {
    const catId = SPECIAL_SALES_CATEGORY_MAP[row.categoryKey]
    if (catId) addPrev(ensureDay(alignPrevDay(row.day)), catId, row.totalCost, row.totalPrice)
  }
  for (const row of prevTransfersDaily) {
    const catId = TRANSFERS_CATEGORY_MAP[row.categoryKey]
    if (!catId) continue
    if (row.categoryKey !== 'interStoreIn' && row.categoryKey !== 'interDeptIn') continue
    addPrev(ensureDay(alignPrevDay(row.day)), catId, row.totalCost, row.totalPrice)
  }

  // 列合計
  const totalsByCol: Record<string, PurchaseDailyPivotCell> = {}
  for (const k of columnKeys) totalsByCol[k] = { cost: 0, price: 0, prevCost: 0, prevPrice: 0 }
  let grandCost = 0
  let grandPrice = 0
  let prevGrandCost = 0
  let prevGrandPrice = 0

  // 行構築（日付順）
  const sortedDays = Array.from(dayMap.keys()).sort((a, b) => a - b)
  const rows: PurchaseDailyPivotRow[] = []

  for (const day of sortedDays) {
    const cellMap = dayMap.get(day)!
    const cells: Record<string, PurchaseDailyPivotCell> = {}
    let rowCost = 0
    let rowPrice = 0
    let rowPrevCost = 0
    let rowPrevPrice = 0
    const dow = new Date(curYear, curMonth - 1, day).getDay()

    for (const k of columnKeys) {
      const c = cellMap.get(k) ?? emptyCell()
      cells[k] = { cost: c.cost, price: c.price, prevCost: c.prevCost, prevPrice: c.prevPrice }
      totalsByCol[k] = {
        cost: totalsByCol[k].cost + c.cost,
        price: totalsByCol[k].price + c.price,
        prevCost: totalsByCol[k].prevCost + c.prevCost,
        prevPrice: totalsByCol[k].prevPrice + c.prevPrice,
      }
      rowCost += c.cost
      rowPrice += c.price
      rowPrevCost += c.prevCost
      rowPrevPrice += c.prevPrice
    }
    grandCost += rowCost
    grandPrice += rowPrice
    prevGrandCost += rowPrevCost
    prevGrandPrice += rowPrevPrice

    rows.push({
      day,
      dayOfWeek: dow,
      cells,
      totalCost: rowCost,
      totalPrice: rowPrice,
      prevTotalCost: rowPrevCost,
      prevTotalPrice: rowPrevPrice,
    })
  }

  return {
    columns,
    rows,
    totals: {
      byColumn: totalsByCol,
      grandCost,
      grandPrice,
      prevGrandCost,
      prevGrandPrice,
    },
  }
}
