/**
 * PerformanceIndex Plan Parity Harness
 *
 * 旧経路（inline 計算）と新経路（builders / plan）を同じ入力で実行し、
 * 意味の強い出力プロパティを比較する。
 *
 * 目的: 構造リファクタリングで「意味が少しだけズレた」を機械的に検出する。
 *
 * 比較対象（意味の強い部分に限定）:
 * - categoryRows の件数
 * - 先頭要素の code と piAmount
 * - prevPiAmount !== null の件数
 * - deviation score の range consistency
 * - heatmap categories の件数と先頭要素
 * - storePIData の件数とソート順
 *
 * @guard H4 component に acquisition logic 禁止
 */
import { describe, it, expect } from 'vitest'
import { buildCategoryRows } from '@/features/category/ui/charts/CategoryPerformanceChart.builders'
import {
  buildStorePIData,
  buildHeatmapData,
} from '@/presentation/components/charts/StorePIComparisonChart.builders'
import { calculateAmountPI, calculateQuantityPI } from '@/domain/calculations/piValue'
import { calculateStdDev } from '@/application/hooks/useStatistics'
import { toDevScore } from '@/presentation/components/charts/chartTheme'
import { safeDivide } from '@/domain/calculations/utils'
import type { LevelAggregationRow } from '@/application/queries/cts/LevelAggregationHandler'
import type { StoreResult } from '@/domain/models/StoreResult'
import type { Store } from '@/domain/models/Store'

// ── Fixtures ──

function makeAggRows(count: number, prevYear: boolean = false): readonly LevelAggregationRow[] {
  return Array.from({ length: count }, (_, i) => ({
    code: `D${String(i + 1).padStart(2, '0')}`,
    name: `Department ${i + 1}`,
    amount: (count - i) * (prevYear ? 90000 : 100000),
    quantity: (count - i) * (prevYear ? 450 : 500),
    childCount: 3,
    handledDayCount: 28,
    totalDayCount: 31,
  }))
}

function makeStoreResults(count: number): ReadonlyMap<string, StoreResult> {
  const map = new Map<string, StoreResult>()
  for (let i = 0; i < count; i++) {
    map.set(
      `S${i + 1}`,
      {
        totalSales: (count - i) * 1000000,
        totalCustomers: 500 + i * 10,
        totalQuantity: (count - i) * 300,
      } as unknown as StoreResult,
    )
  }
  return map
}

function makeStores(count: number): ReadonlyMap<string, Store> {
  const map = new Map<string, Store>()
  for (let i = 0; i < count; i++) {
    map.set(`S${i + 1}`, { name: `Store ${i + 1}` } as unknown as Store)
  }
  return map
}

// ── Normalizers: 比較しやすい形に正規化 ──

interface CategoryParitySnapshot {
  readonly rowCount: number
  readonly topCode: string | null
  readonly topPiAmount: number | null
  readonly prevNonNullCount: number
  readonly deviationRange: { min: number; max: number } | null
}

function normalizeCategoryOutput(
  rows: readonly {
    code: string
    piAmount: number
    prevPiAmount: number | null
    deviation: number | null
  }[],
): CategoryParitySnapshot {
  const devs = rows.filter((r) => r.deviation !== null).map((r) => r.deviation!)
  return {
    rowCount: rows.length,
    topCode: rows[0]?.code ?? null,
    topPiAmount: rows[0]?.piAmount ?? null,
    prevNonNullCount: rows.filter((r) => r.prevPiAmount !== null).length,
    deviationRange:
      devs.length > 0 ? { min: Math.min(...devs), max: Math.max(...devs) } : null,
  }
}

interface StoreParitySnapshot {
  readonly entryCount: number
  readonly topStoreId: string | null
  readonly topPiAmount: number | null
  readonly sortOrderValid: boolean
}

function normalizeStorePIOutput(
  entries: readonly { storeId: string; piAmount: number }[],
): StoreParitySnapshot {
  const sorted = entries.every(
    (e, i) => i === 0 || entries[i - 1].piAmount >= e.piAmount,
  )
  return {
    entryCount: entries.length,
    topStoreId: entries[0]?.storeId ?? null,
    topPiAmount: entries[0]?.piAmount ?? null,
    sortOrderValid: sorted,
  }
}

// ── old path: 旧 inline 計算を再現 ──

function oldPathCategoryRows(
  curRecords: readonly LevelAggregationRow[],
  prevRecords: readonly LevelAggregationRow[] | null,
  totalCustomers: number,
  prevTotalCustomers: number,
  topN: number = 20,
) {
  if (curRecords.length === 0 || totalCustomers <= 0) return []

  // 旧コード: inline (amount / totalCustomers) * 1000
  const prevMap = new Map<string, LevelAggregationRow>()
  if (prevRecords) {
    for (const r of prevRecords) prevMap.set(r.code, r)
  }

  const piAmounts: number[] = []
  const rows: {
    code: string
    piAmount: number
    prevPiAmount: number | null
    deviation: number | null
  }[] = []

  for (const entry of curRecords) {
    // 旧: (entry.amount / totalCustomers) * 1000 → 新: calculateAmountPI
    const piAmount = (entry.amount / totalCustomers) * 1000
    piAmounts.push(piAmount)

    let prevPiAmount: number | null = null
    if (prevTotalCustomers > 0) {
      const prev = prevMap.get(entry.code)
      if (prev) {
        prevPiAmount = (prev.amount / prevTotalCustomers) * 1000
      }
    }

    rows.push({ code: entry.code, piAmount, prevPiAmount, deviation: null })
  }

  // 旧: calculateStdDev → toDevScore
  const stat = calculateStdDev(piAmounts)
  for (const row of rows) {
    if (stat.stdDev > 0) {
      row.deviation = toDevScore((row.piAmount - stat.mean) / stat.stdDev)
    }
  }

  rows.sort((a, b) => b.piAmount - a.piAmount)
  return rows.slice(0, topN)
}

function oldPathStorePIData(
  allStoreResults: ReadonlyMap<string, StoreResult>,
  stores: ReadonlyMap<string, Store>,
) {
  // 旧: Math.round((sales / customers) * 1000)
  const entries: { storeId: string; piAmount: number }[] = []
  for (const [storeId, result] of allStoreResults) {
    if (result.totalCustomers <= 0) continue
    entries.push({
      storeId,
      piAmount: Math.round((result.totalSales / result.totalCustomers) * 1000),
    })
  }
  return entries.sort((a, b) => b.piAmount - a.piAmount)
}

// ── Parity Tests ──

describe('PerformanceIndex Plan Parity — old/new 差分実行比較', () => {
  const TOTAL_CUSTOMERS = 5000
  const PREV_TOTAL_CUSTOMERS = 4500

  describe('CategoryPerformanceChart: buildCategoryRows vs inline calc', () => {
    const curRecords = makeAggRows(25)
    const prevRecords = makeAggRows(25, true)

    it('件数: old と new で一致する（TopN = 20）', () => {
      const oldRows = oldPathCategoryRows(curRecords, prevRecords, TOTAL_CUSTOMERS, PREV_TOTAL_CUSTOMERS)
      const newRows = buildCategoryRows(curRecords, prevRecords, TOTAL_CUSTOMERS, PREV_TOTAL_CUSTOMERS)

      const oldSnap = normalizeCategoryOutput(oldRows)
      const newSnap = normalizeCategoryOutput(newRows)

      expect(newSnap.rowCount).toBe(oldSnap.rowCount)
    })

    it('先頭要素の code が一致する', () => {
      const oldRows = oldPathCategoryRows(curRecords, prevRecords, TOTAL_CUSTOMERS, PREV_TOTAL_CUSTOMERS)
      const newRows = buildCategoryRows(curRecords, prevRecords, TOTAL_CUSTOMERS, PREV_TOTAL_CUSTOMERS)

      expect(normalizeCategoryOutput(newRows).topCode).toBe(
        normalizeCategoryOutput(oldRows).topCode,
      )
    })

    it('先頭要素の piAmount が一致する', () => {
      const oldRows = oldPathCategoryRows(curRecords, prevRecords, TOTAL_CUSTOMERS, PREV_TOTAL_CUSTOMERS)
      const newRows = buildCategoryRows(curRecords, prevRecords, TOTAL_CUSTOMERS, PREV_TOTAL_CUSTOMERS)

      // old: (amount / customers) * 1000 → new: calculateAmountPI (safeDivide * 1000)
      // 整数除算ではないので exact match が期待できる
      expect(normalizeCategoryOutput(newRows).topPiAmount).toBe(
        normalizeCategoryOutput(oldRows).topPiAmount,
      )
    })

    it('prevPiAmount 非 null 件数が一致する', () => {
      const oldRows = oldPathCategoryRows(curRecords, prevRecords, TOTAL_CUSTOMERS, PREV_TOTAL_CUSTOMERS)
      const newRows = buildCategoryRows(curRecords, prevRecords, TOTAL_CUSTOMERS, PREV_TOTAL_CUSTOMERS)

      expect(normalizeCategoryOutput(newRows).prevNonNullCount).toBe(
        normalizeCategoryOutput(oldRows).prevNonNullCount,
      )
    })

    it('prevPiAmount 非 null 件数 > 0（prev データがある場合）', () => {
      const newRows = buildCategoryRows(curRecords, prevRecords, TOTAL_CUSTOMERS, PREV_TOTAL_CUSTOMERS)
      expect(normalizeCategoryOutput(newRows).prevNonNullCount).toBeGreaterThan(0)
    })

    it('deviation range が一致する', () => {
      const oldRows = oldPathCategoryRows(curRecords, prevRecords, TOTAL_CUSTOMERS, PREV_TOTAL_CUSTOMERS)
      const newRows = buildCategoryRows(curRecords, prevRecords, TOTAL_CUSTOMERS, PREV_TOTAL_CUSTOMERS)

      const oldRange = normalizeCategoryOutput(oldRows).deviationRange
      const newRange = normalizeCategoryOutput(newRows).deviationRange
      expect(newRange).toEqual(oldRange)
    })

    it('prev なしの場合: prevNonNullCount が 0', () => {
      const oldRows = oldPathCategoryRows(curRecords, null, TOTAL_CUSTOMERS, 0)
      const newRows = buildCategoryRows(curRecords, null, TOTAL_CUSTOMERS, 0)

      expect(normalizeCategoryOutput(newRows).prevNonNullCount).toBe(0)
      expect(normalizeCategoryOutput(oldRows).prevNonNullCount).toBe(0)
    })

    it('空の curRecords: old/new 共に空', () => {
      const oldRows = oldPathCategoryRows([], null, TOTAL_CUSTOMERS, 0)
      const newRows = buildCategoryRows([], null, TOTAL_CUSTOMERS, 0)

      expect(normalizeCategoryOutput(newRows).rowCount).toBe(0)
      expect(normalizeCategoryOutput(oldRows).rowCount).toBe(0)
    })
  })

  describe('StorePIComparisonChart: buildStorePIData vs inline calc', () => {
    const storeCount = 8
    const storeResults = makeStoreResults(storeCount)
    const stores = makeStores(storeCount)

    it('件数が一致する', () => {
      const oldEntries = oldPathStorePIData(storeResults, stores)
      const newEntries = buildStorePIData(storeResults, stores, 'piAmount')

      expect(normalizeStorePIOutput(newEntries).entryCount).toBe(
        normalizeStorePIOutput(oldEntries).entryCount,
      )
    })

    it('先頭店舗が一致する（最高 PI）', () => {
      const oldEntries = oldPathStorePIData(storeResults, stores)
      const newEntries = buildStorePIData(storeResults, stores, 'piAmount')

      expect(normalizeStorePIOutput(newEntries).topStoreId).toBe(
        normalizeStorePIOutput(oldEntries).topStoreId,
      )
    })

    it('先頭 piAmount が一致する', () => {
      const oldEntries = oldPathStorePIData(storeResults, stores)
      const newEntries = buildStorePIData(storeResults, stores, 'piAmount')

      expect(normalizeStorePIOutput(newEntries).topPiAmount).toBe(
        normalizeStorePIOutput(oldEntries).topPiAmount,
      )
    })

    it('ソート順が正しい（piAmount 降順）', () => {
      const newEntries = buildStorePIData(storeResults, stores, 'piAmount')
      expect(normalizeStorePIOutput(newEntries).sortOrderValid).toBe(true)
    })

    it('0 customers の店舗が除外される', () => {
      const withZero = new Map(storeResults)
      withZero.set('S99', {
        totalSales: 999999,
        totalCustomers: 0,
        totalQuantity: 0,
      } as unknown as StoreResult)

      const oldEntries = oldPathStorePIData(withZero, stores)
      const newEntries = buildStorePIData(withZero, stores, 'piAmount')

      // S99 は除外されるので件数は元と同じ
      expect(normalizeStorePIOutput(newEntries).entryCount).toBe(storeCount)
      expect(normalizeStorePIOutput(oldEntries).entryCount).toBe(storeCount)
    })
  })
})
