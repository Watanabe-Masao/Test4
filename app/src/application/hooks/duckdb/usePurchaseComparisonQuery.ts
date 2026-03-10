/**
 * 仕入比較クエリフック
 *
 * 当期・比較期の purchase + special_sales + transfers テーブルを
 * 取引先別・カテゴリ別に集約し、前年比較データを構築する。
 * date_key BETWEEN で同曜日にも対応。
 *
 * カテゴリ集約は supplierCategoryMap（settings）を使って JS 側で行う。
 * 花・産直・店間・部門間は固定カテゴリとして別テーブルから取得する。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/CalendarDate'
import {
  queryPurchaseBySupplier,
  queryPurchaseTotal,
  queryPurchaseDaily,
  queryPurchaseDailyBySupplier,
  queryPurchaseByStore,
  querySalesDaily,
  querySpecialSalesDaily,
  querySpecialSalesTotal,
  queryTransfersDaily,
  queryTransfersTotal,
  querySalesTotal,
} from '@/infrastructure/duckdb/queries/purchaseComparison'
import type {
  PurchaseComparisonResult,
  SupplierComparisonRow,
  CategoryComparisonRow,
  StoreComparisonRow,
  PurchaseComparisonKpi,
  PurchaseDailyData,
  PurchaseDailyPivotData,
  PurchaseDailyPivotColumn,
  PurchaseDailyPivotCell,
  PurchaseDailyPivotRow,
} from '@/domain/models/PurchaseComparison'
import type {
  PurchaseDailySupplierRow,
  CategoryDailyRow,
} from '@/infrastructure/duckdb/queries/purchaseComparison'
import type { CustomCategoryId } from '@/domain/constants/customCategories'
import type { PresetCategoryId } from '@/domain/constants/customCategories'
import {
  UNCATEGORIZED_CATEGORY_ID,
  PRESET_CATEGORY_LABELS,
  isPresetCategory,
  isUserCategory,
} from '@/domain/constants/customCategories'
import { useAsyncQuery, storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'

// ── DateRange → date_key 変換 ──

export function toDateKey(d: { year: number; month: number; day: number }): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

// ── カテゴリラベル解決 ──

export function categoryLabel(
  catId: CustomCategoryId,
  userCategories: ReadonlyMap<string, string>,
): string {
  if (isPresetCategory(catId)) return PRESET_CATEGORY_LABELS[catId]
  return userCategories.get(catId) ?? catId.replace('user:', '')
}

// ── カテゴリ色解決 ──

const CUSTOM_CATEGORY_COLORS: Record<PresetCategoryId, string> = {
  market_purchase: '#f59e0b',
  lfc: '#3b82f6',
  salad: '#22c55e',
  processed: '#a855f7',
  consumables: '#ea580c',
  direct_delivery: '#06b6d4',
  flowers: '#ec4899',
  direct_produce: '#84cc16',
  inter_store: '#8b5cf6',
  inter_department: '#f97316',
  other: '#64748b',
  uncategorized: '#94a3b8',
}

const USER_CATEGORY_DEFAULT_COLOR = '#14b8a6'

export function categoryColor(catId: CustomCategoryId): string {
  if (isUserCategory(catId)) return USER_CATEGORY_DEFAULT_COLOR
  if (isPresetCategory(catId)) return CUSTOM_CATEGORY_COLORS[catId] ?? '#64748b'
  return '#64748b'
}

// ── 値入率算出 ──

export function markupRate(cost: number, price: number): number {
  return price > 0 ? 1 - cost / price : 0
}

// ── special_sales / transfers のキー → PresetCategoryId 変換 ──

const SPECIAL_SALES_CATEGORY_MAP: Record<string, PresetCategoryId> = {
  flowers: 'flowers',
  directProduce: 'direct_produce',
}

const TRANSFERS_CATEGORY_MAP: Record<string, PresetCategoryId> = {
  interStoreIn: 'inter_store',
  interStoreOut: 'inter_store',
  interDeptIn: 'inter_department',
  interDeptOut: 'inter_department',
}

// ── フック ──

export function usePurchaseComparisonQuery(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  period1: DateRange,
  period2: DateRange,
  storeIds: ReadonlySet<string>,
  supplierCategoryMap: Readonly<Partial<Record<string, CustomCategoryId>>>,
  userCategories: ReadonlyMap<string, string>,
  storeNames: ReadonlyMap<string, string>,
  dowOffset = 0,
): AsyncQueryResult<PurchaseComparisonResult> {
  const storeIdArr = useMemo(() => storeIdsToArray(storeIds), [storeIds])

  const curDateFrom = useMemo(() => toDateKey(period1.from), [period1.from])
  const curDateTo = useMemo(() => toDateKey(period1.to), [period1.to])
  const prevDateFrom = useMemo(() => toDateKey(period2.from), [period2.from])
  const prevDateTo = useMemo(() => toDateKey(period2.to), [period2.to])

  const queryFn = useMemo(() => {
    if (dataVersion === 0) return null

    return async (c: AsyncDuckDBConnection) => {
      // 並列: 当期/比較期の全データを取得
      const [
        curSuppliers,
        prevSuppliers,
        curTotal,
        prevTotal,
        curSalesTotal,
        prevSalesTotal,
        curDaily,
        prevDaily,
        curStores,
        prevStores,
        curSalesDaily,
        prevSalesDaily,
        curDailyBySupplier,
        curSpecialDaily,
        curTransfersDaily,
        prevDailyBySupplier,
        prevSpecialDaily,
        prevTransfersDaily,
        curSpecialTotal,
        prevSpecialTotal,
        curTransfersTotal,
        prevTransfersTotal,
      ] = await Promise.all([
        queryPurchaseBySupplier(c, curDateFrom, curDateTo, storeIdArr),
        queryPurchaseBySupplier(c, prevDateFrom, prevDateTo, storeIdArr),
        queryPurchaseTotal(c, curDateFrom, curDateTo, storeIdArr),
        queryPurchaseTotal(c, prevDateFrom, prevDateTo, storeIdArr),
        querySalesTotal(c, curDateFrom, curDateTo, storeIdArr, false),
        querySalesTotal(c, prevDateFrom, prevDateTo, storeIdArr, true),
        queryPurchaseDaily(c, curDateFrom, curDateTo, storeIdArr),
        queryPurchaseDaily(c, prevDateFrom, prevDateTo, storeIdArr),
        queryPurchaseByStore(c, curDateFrom, curDateTo, storeIdArr),
        queryPurchaseByStore(c, prevDateFrom, prevDateTo, storeIdArr),
        querySalesDaily(c, curDateFrom, curDateTo, storeIdArr, false),
        querySalesDaily(c, prevDateFrom, prevDateTo, storeIdArr, true),
        queryPurchaseDailyBySupplier(c, curDateFrom, curDateTo, storeIdArr),
        querySpecialSalesDaily(c, curDateFrom, curDateTo, storeIdArr),
        queryTransfersDaily(c, curDateFrom, curDateTo, storeIdArr),
        queryPurchaseDailyBySupplier(c, prevDateFrom, prevDateTo, storeIdArr),
        querySpecialSalesDaily(c, prevDateFrom, prevDateTo, storeIdArr),
        queryTransfersDaily(c, prevDateFrom, prevDateTo, storeIdArr),
        querySpecialSalesTotal(c, curDateFrom, curDateTo, storeIdArr),
        querySpecialSalesTotal(c, prevDateFrom, prevDateTo, storeIdArr),
        queryTransfersTotal(c, curDateFrom, curDateTo, storeIdArr),
        queryTransfersTotal(c, prevDateFrom, prevDateTo, storeIdArr),
      ])

      // ── 取引先別比較 ──
      const prevMap = new Map(prevSuppliers.map((r) => [r.supplierCode, r]))
      const allCodes = new Set([
        ...curSuppliers.map((r) => r.supplierCode),
        ...prevSuppliers.map((r) => r.supplierCode),
      ])

      const bySupplier: SupplierComparisonRow[] = []
      for (const code of allCodes) {
        const cur = curSuppliers.find((r) => r.supplierCode === code)
        const prev = prevMap.get(code)
        const cc = cur?.totalCost ?? 0
        const cp = cur?.totalPrice ?? 0
        const pc = prev?.totalCost ?? 0
        const pp = prev?.totalPrice ?? 0

        bySupplier.push({
          supplierCode: code,
          supplierName: cur?.supplierName ?? prev?.supplierName ?? '不明',
          currentCost: cc,
          currentPrice: cp,
          prevCost: pc,
          prevPrice: pp,
          costDiff: cc - pc,
          priceDiff: cp - pp,
          costChangeRate: pc > 0 ? (cc - pc) / pc : 0,
          currentCostShare: curTotal.totalCost > 0 ? cc / curTotal.totalCost : 0,
          prevCostShare: prevTotal.totalCost > 0 ? pc / prevTotal.totalCost : 0,
          costShareDiff:
            (curTotal.totalCost > 0 ? cc / curTotal.totalCost : 0) -
            (prevTotal.totalCost > 0 ? pc / prevTotal.totalCost : 0),
          currentMarkupRate: markupRate(cc, cp),
          prevMarkupRate: markupRate(pc, pp),
        })
      }
      bySupplier.sort((a, b) => b.currentCost - a.currentCost)

      // ── カテゴリ別集約（仕入取引先ベース） ──
      const catMap = new Map<
        string,
        {
          catId: CustomCategoryId
          curC: number
          curP: number
          prevC: number
          prevP: number
          suppliers: SupplierComparisonRow[]
        }
      >()

      for (const row of bySupplier) {
        const catId = supplierCategoryMap[row.supplierCode] ?? UNCATEGORIZED_CATEGORY_ID
        const label = categoryLabel(catId, userCategories)
        const existing = catMap.get(label) ?? {
          catId,
          curC: 0,
          curP: 0,
          prevC: 0,
          prevP: 0,
          suppliers: [],
        }
        catMap.set(label, {
          catId: existing.catId,
          curC: existing.curC + row.currentCost,
          curP: existing.curP + row.currentPrice,
          prevC: existing.prevC + row.prevCost,
          prevP: existing.prevP + row.prevPrice,
          suppliers: [...existing.suppliers, row],
        })
      }

      // ── special_sales / transfers をカテゴリに追加 ──
      const addExtraCategory = (
        key: string,
        catId: PresetCategoryId,
        curC: number,
        curP: number,
        prevC: number,
        prevP: number,
      ) => {
        if (curC === 0 && curP === 0 && prevC === 0 && prevP === 0) return
        const label = PRESET_CATEGORY_LABELS[catId]
        const existing = catMap.get(label)
        if (existing) {
          catMap.set(label, {
            ...existing,
            curC: existing.curC + curC,
            curP: existing.curP + curP,
            prevC: existing.prevC + prevC,
            prevP: existing.prevP + prevP,
          })
        } else {
          catMap.set(label, {
            catId,
            curC,
            curP,
            prevC,
            prevP,
            suppliers: [
              {
                supplierCode: `__${key}__`,
                supplierName: label,
                currentCost: curC,
                currentPrice: curP,
                prevCost: prevC,
                prevPrice: prevP,
                costDiff: curC - prevC,
                priceDiff: curP - prevP,
                costChangeRate: prevC > 0 ? (curC - prevC) / prevC : 0,
                currentCostShare: 0,
                prevCostShare: 0,
                costShareDiff: 0,
                currentMarkupRate: markupRate(curC, curP),
                prevMarkupRate: markupRate(prevC, prevP),
              },
            ],
          })
        }
      }

      // special_sales（花・産直）の合計をカテゴリに追加
      const curSpecialMap = new Map(curSpecialTotal.map((r) => [r.categoryKey, r]))
      const prevSpecialMap = new Map(prevSpecialTotal.map((r) => [r.categoryKey, r]))
      for (const key of new Set([
        ...curSpecialTotal.map((r) => r.categoryKey),
        ...prevSpecialTotal.map((r) => r.categoryKey),
      ])) {
        const catId = SPECIAL_SALES_CATEGORY_MAP[key]
        if (!catId) continue
        const cur = curSpecialMap.get(key)
        const prev = prevSpecialMap.get(key)
        addExtraCategory(
          key,
          catId,
          cur?.totalCost ?? 0,
          cur?.totalPrice ?? 0,
          prev?.totalCost ?? 0,
          prev?.totalPrice ?? 0,
        )
      }

      // transfers（店間・部門間）の合計をカテゴリに追加
      // In のみ仕入として集計（Out は出庫なので別扱い）
      const curTransMap = new Map(curTransfersTotal.map((r) => [r.categoryKey, r]))
      const prevTransMap = new Map(prevTransfersTotal.map((r) => [r.categoryKey, r]))
      for (const direction of ['interStoreIn', 'interDeptIn'] as const) {
        const catId = TRANSFERS_CATEGORY_MAP[direction]
        if (!catId) continue
        const cur = curTransMap.get(direction)
        const prev = prevTransMap.get(direction)
        addExtraCategory(
          direction,
          catId,
          cur?.totalCost ?? 0,
          cur?.totalPrice ?? 0,
          prev?.totalCost ?? 0,
          prev?.totalPrice ?? 0,
        )
      }

      // ── 全カテゴリの合計を再計算（special_sales/transfers 含む） ──
      let allCurCost = curTotal.totalCost
      let allCurPrice = curTotal.totalPrice
      let allPrevCost = prevTotal.totalCost
      let allPrevPrice = prevTotal.totalPrice
      for (const r of curSpecialTotal) {
        allCurCost += r.totalCost
        allCurPrice += r.totalPrice
      }
      for (const r of prevSpecialTotal) {
        allPrevCost += r.totalCost
        allPrevPrice += r.totalPrice
      }
      for (const r of curTransfersTotal) {
        if (r.categoryKey === 'interStoreIn' || r.categoryKey === 'interDeptIn') {
          allCurCost += r.totalCost
          allCurPrice += r.totalPrice
        }
      }
      for (const r of prevTransfersTotal) {
        if (r.categoryKey === 'interStoreIn' || r.categoryKey === 'interDeptIn') {
          allPrevCost += r.totalCost
          allPrevPrice += r.totalPrice
        }
      }

      // ── CategoryComparisonRow 構築 ──
      const byCategory: CategoryComparisonRow[] = []
      const categorySuppliers: Record<string, readonly SupplierComparisonRow[]> = {}
      for (const [cat, v] of catMap) {
        byCategory.push({
          categoryId: v.catId,
          category: cat,
          color: categoryColor(v.catId),
          currentCost: v.curC,
          currentPrice: v.curP,
          prevCost: v.prevC,
          prevPrice: v.prevP,
          costDiff: v.curC - v.prevC,
          priceDiff: v.curP - v.prevP,
          costChangeRate: v.prevC > 0 ? (v.curC - v.prevC) / v.prevC : 0,
          currentCostShare: allCurCost > 0 ? v.curC / allCurCost : 0,
          prevCostShare: allPrevCost > 0 ? v.prevC / allPrevCost : 0,
          costShareDiff:
            (allCurCost > 0 ? v.curC / allCurCost : 0) -
            (allPrevCost > 0 ? v.prevC / allPrevCost : 0),
          currentMarkupRate: markupRate(v.curC, v.curP),
          prevMarkupRate: markupRate(v.prevC, v.prevP),
          currentPriceShare: allCurPrice > 0 ? Math.abs(v.curP) / allCurPrice : 0,
          crossMultiplication: allCurPrice > 0 ? (v.curP - v.curC) / allCurPrice : 0,
        })
        categorySuppliers[v.catId] = v.suppliers
      }
      byCategory.sort((a, b) => b.currentCost - a.currentCost)

      // ── 日別データ（チャート用） ──
      const curSalesDayMap = new Map(curSalesDaily.map((r) => [r.day, r.totalSales]))
      const prevSalesDayMap = new Map(prevSalesDaily.map((r) => [r.day, r.totalSales]))

      const daily: PurchaseDailyData = {
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

      // ── 店舗別比較 ──
      const prevStoreMap = new Map(prevStores.map((r) => [r.storeId, r]))
      const allStoreIds = new Set([
        ...curStores.map((r) => r.storeId),
        ...prevStores.map((r) => r.storeId),
      ])
      const byStore: StoreComparisonRow[] = []
      for (const sid of allStoreIds) {
        const cur = curStores.find((r) => r.storeId === sid)
        const prev = prevStoreMap.get(sid)
        const cc = cur?.totalCost ?? 0
        const cp = cur?.totalPrice ?? 0
        const pc = prev?.totalCost ?? 0
        const pp = prev?.totalPrice ?? 0
        byStore.push({
          storeId: sid,
          storeName: storeNames.get(sid) ?? sid,
          currentCost: cc,
          currentPrice: cp,
          prevCost: pc,
          prevPrice: pp,
          costDiff: cc - pc,
          currentMarkupRate: markupRate(cc, cp),
          prevMarkupRate: markupRate(pc, pp),
        })
      }
      byStore.sort((a, b) => b.currentCost - a.currentCost)

      // ── KPI ──
      const kpi: PurchaseComparisonKpi = {
        currentTotalCost: allCurCost,
        prevTotalCost: allPrevCost,
        totalCostDiff: allCurCost - allPrevCost,
        totalCostChangeRate: allPrevCost > 0 ? (allCurCost - allPrevCost) / allPrevCost : 0,
        currentTotalPrice: allCurPrice,
        prevTotalPrice: allPrevPrice,
        totalPriceDiff: allCurPrice - allPrevPrice,
        currentMarkupRate: markupRate(allCurCost, allCurPrice),
        prevMarkupRate: markupRate(allPrevCost, allPrevPrice),
        markupRateDiff: markupRate(allCurCost, allCurPrice) - markupRate(allPrevCost, allPrevPrice),
        currentCostToSalesRatio: curSalesTotal > 0 ? allCurCost / curSalesTotal : 0,
        prevCostToSalesRatio: prevSalesTotal > 0 ? allPrevCost / prevSalesTotal : 0,
        currentSales: curSalesTotal,
        prevSales: prevSalesTotal,
      }

      // ── カテゴリ別日別ピボット ──
      const curYear = period1.from.year
      const curMonth = period1.from.month
      const dailyPivot = buildDailyPivot(
        curDailyBySupplier,
        prevDailyBySupplier,
        curSpecialDaily,
        prevSpecialDaily,
        curTransfersDaily,
        prevTransfersDaily,
        byCategory,
        supplierCategoryMap,
        curYear,
        curMonth,
        dowOffset,
      )

      return {
        kpi,
        bySupplier,
        byCategory,
        byStore,
        daily,
        dailyPivot,
        categorySuppliers,
        isReady: true,
      } satisfies PurchaseComparisonResult
    }
  }, [
    dataVersion,
    curDateFrom,
    curDateTo,
    prevDateFrom,
    prevDateTo,
    storeIdArr,
    supplierCategoryMap,
    userCategories,
    storeNames,
    period1.from.year,
    period1.from.month,
    dowOffset,
  ])

  return useAsyncQuery(conn, dataVersion, queryFn)
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
  // offset=1 の場合: prev day 2 → current day 1, prev day 1(翌月) → current day 末日
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
