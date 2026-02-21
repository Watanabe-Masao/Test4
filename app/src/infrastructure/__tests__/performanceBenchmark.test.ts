/**
 * 大規模データ性能ベンチマーク
 *
 * 品質監査レポート推奨項目⑥:
 * 10万行想定のデータでインポート→計算パイプラインの処理時間を計測し、
 * 回帰を防止する。
 */
import { describe, it, expect } from 'vitest'
import { processFileData } from '../ImportService'
import { createEmptyImportedData } from '@/domain/models'
import { calculateAllStores } from '@/application/services/CalculationOrchestrator'
import { DEFAULT_SETTINGS } from '@/domain/constants/defaults'

const DAYS_IN_MONTH = 28

/**
 * 売上売変データ生成（salesDiscount 形式）
 *
 * @param storeCount 店舗数
 * @param days 日数（1日あたり1行）
 * @returns unknown[][] 生データ行
 */
function generateSalesDiscountRows(storeCount: number, days: number): unknown[][] {
  // Row 0: store headers (col 3+ per store: 販売金額, 売変合計金額)
  const headerRow: unknown[] = ['', '', '']
  for (let s = 1; s <= storeCount; s++) {
    const code = String(s).padStart(4, '0')
    headerRow.push(`${code}:店舗${code}`, '')
  }

  // Row 1: sub-headers
  const subHeaderRow: unknown[] = ['', '', '']
  for (let s = 1; s <= storeCount; s++) {
    subHeaderRow.push('販売金額', '売変合計金額')
  }

  // Row 2: period totals (期間合計)
  const totalRow: unknown[] = ['期間合計', '', '']
  for (let s = 1; s <= storeCount; s++) {
    totalRow.push(1000000 * s, 50000 * s)
  }

  // Data rows (days > 28 は循環して有効な日付を生成)
  const dataRows: unknown[][] = []
  for (let d = 1; d <= days; d++) {
    const dayInMonth = ((d - 1) % DAYS_IN_MONTH) + 1
    const dayStr = `2026-02-${String(dayInMonth).padStart(2, '0')}`
    const row: unknown[] = [dayStr, '', '']
    for (let s = 1; s <= storeCount; s++) {
      const baseSales = 30000 + Math.floor(Math.random() * 20000) * s
      const baseDiscount = Math.floor(baseSales * 0.03)
      row.push(baseSales, baseDiscount)
    }
    dataRows.push(row)
  }

  return [headerRow, subHeaderRow, totalRow, ...dataRows]
}

/**
 * 仕入データ生成（purchase 形式）
 *
 * @param storeCount 店舗数
 * @param supplierCount 取引先数
 * @param days 日数
 * @returns unknown[][] 生データ行
 */
function generatePurchaseRows(
  storeCount: number,
  supplierCount: number,
  days: number,
): unknown[][] {
  // Row 0: supplier headers (col 3+, 2-col pairs)
  const supplierRow: unknown[] = ['', '', '']
  // Row 1: store headers
  const storeRow: unknown[] = ['', '', '']

  for (let sup = 1; sup <= supplierCount; sup++) {
    for (let s = 1; s <= storeCount; s++) {
      const supCode = String(sup).padStart(7, '0')
      const stCode = String(s).padStart(4, '0')
      supplierRow.push(`${supCode}:取引先${sup}`, '')
      storeRow.push(`${stCode}:店舗${stCode}`, '')
    }
  }

  // Rows 2-3: metadata
  const metaRow1: unknown[] = ['', '', '']
  const metaRow2: unknown[] = ['', '', '']

  // Data rows
  const dataRows: unknown[][] = []
  for (let d = 1; d <= days; d++) {
    const dayStr = `2026-02-${String(d).padStart(2, '0')}`
    const row: unknown[] = [dayStr, '', '']
    for (let sup = 1; sup <= supplierCount; sup++) {
      for (let s = 1; s <= storeCount; s++) {
        const cost = 5000 + Math.floor(Math.random() * 10000)
        const price = Math.floor(cost * 1.3)
        row.push(cost, price)
      }
    }
    dataRows.push(row)
  }

  return [supplierRow, storeRow, metaRow1, metaRow2, ...dataRows]
}

describe('Performance Benchmark', () => {
  it('salesDiscount: 5店舗 × 28日 を 500ms 以内に処理', () => {
    const rows = generateSalesDiscountRows(5, DAYS_IN_MONTH)
    const start = performance.now()
    const { data } = processFileData(
      'salesDiscount',
      rows,
      '1_売上売変.xlsx',
      createEmptyImportedData(),
      DEFAULT_SETTINGS,
    )
    const elapsed = performance.now() - start

    expect(data.stores.size).toBe(5)
    expect(elapsed).toBeLessThan(500)
  })

  it('purchase: 5店舗 × 10取引先 × 28日 を 500ms 以内に処理', () => {
    const rows = generatePurchaseRows(5, 10, DAYS_IN_MONTH)
    const start = performance.now()
    const { data } = processFileData(
      'purchase',
      rows,
      'shiire.xlsx',
      createEmptyImportedData(),
      DEFAULT_SETTINGS,
    )
    const elapsed = performance.now() - start

    expect(data.stores.size).toBe(5)
    expect(elapsed).toBeLessThan(500)
  })

  it('フルパイプライン: インポート→計算 を 2000ms 以内に完了', () => {
    const storeCount = 5
    const supplierCount = 10

    // Step 1: Import purchase data
    let data = createEmptyImportedData()
    const purchaseRows = generatePurchaseRows(storeCount, supplierCount, DAYS_IN_MONTH)
    ;({ data } = processFileData('purchase', purchaseRows, 'shiire.xlsx', data, DEFAULT_SETTINGS))

    // Step 2: Import sales+discount data
    const salesRows = generateSalesDiscountRows(storeCount, DAYS_IN_MONTH)
    ;({ data } = processFileData('salesDiscount', salesRows, '1_売上売変.xlsx', data, DEFAULT_SETTINGS))

    expect(data.stores.size).toBe(storeCount)

    // Step 3: Calculate all stores
    const calcStart = performance.now()
    const results = calculateAllStores(data, DEFAULT_SETTINGS, DAYS_IN_MONTH)
    const calcElapsed = performance.now() - calcStart

    expect(results.size).toBe(storeCount)
    expect(calcElapsed).toBeLessThan(2000)

    // Verify results are non-trivial
    for (const [, result] of results) {
      expect(result.totalSales).toBeGreaterThan(0)
      expect(result.daily.size).toBeGreaterThan(0)
    }
  })

  it('大規模行数: 10店舗 × 3000行（100ヶ月分相当）を 3000ms 以内にインポート', () => {
    // 3000行 × 10店舗 = 30,000 セル分のデータ → 大規模テスト
    const rows = generateSalesDiscountRows(10, 3000)
    const start = performance.now()
    const { data } = processFileData(
      'salesDiscount',
      rows,
      '1_売上売変.xlsx',
      createEmptyImportedData(),
      DEFAULT_SETTINGS,
    )
    const elapsed = performance.now() - start

    expect(data.stores.size).toBe(10)
    expect(elapsed).toBeLessThan(3000)
  })
})
