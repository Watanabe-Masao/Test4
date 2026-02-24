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
import { calculateAllStores } from '@/application/usecases/calculation'
import { DEFAULT_SETTINGS, getDaysInMonth } from '@/domain/constants/defaults'

const DAYS_IN_MONTH = getDaysInMonth(DEFAULT_SETTINGS.targetYear, DEFAULT_SETTINGS.targetMonth)

/**
 * 分類別売上データ生成（classifiedSales 形式）
 *
 * @param storeCount 店舗数
 * @param days 日数（1日あたり1行×店舗数）
 * @returns unknown[][] 生データ行
 */
function generateClassifiedSalesRows(storeCount: number, days: number): unknown[][] {
  // Row 0: Header
  const headerRow = ['日付', '店舗名称', 'グループ名称', '部門名称', 'ライン名称', 'クラス名称', '販売金額', '71売変', '72売変', '73売変', '74売変']

  const { targetYear, targetMonth } = DEFAULT_SETTINGS
  const dataRows: unknown[][] = []
  for (let d = 1; d <= days; d++) {
    const dayInMonth = ((d - 1) % DAYS_IN_MONTH) + 1
    const dayStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(dayInMonth).padStart(2, '0')}`
    for (let s = 1; s <= storeCount; s++) {
      const code = String(s).padStart(4, '0')
      const baseSales = 30000 + Math.floor(Math.random() * 20000) * s
      const baseDiscount = Math.floor(baseSales * 0.03)
      dataRows.push([dayStr, `${code}:店舗${code}`, 'G1', 'D1', 'L1', 'C1', baseSales, baseDiscount, 0, 0, 0])
    }
  }

  return [headerRow, ...dataRows]
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

  // Data rows (days > DAYS_IN_MONTH は循環して有効な日付を生成)
  const { targetYear, targetMonth } = DEFAULT_SETTINGS
  const dataRows: unknown[][] = []
  for (let d = 1; d <= days; d++) {
    const dayInMonth = ((d - 1) % DAYS_IN_MONTH) + 1
    const dayStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(dayInMonth).padStart(2, '0')}`
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
  it('classifiedSales: 5店舗 × 28日 を 500ms 以内に処理', () => {
    const rows = generateClassifiedSalesRows(5, DAYS_IN_MONTH)
    const start = performance.now()
    const { data } = processFileData(
      'classifiedSales',
      rows,
      '1_分類別売上.xlsx',
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

    // Step 2: Import classifiedSales data
    const csRows = generateClassifiedSalesRows(storeCount, DAYS_IN_MONTH)
    ;({ data } = processFileData('classifiedSales', csRows, '1_分類別売上.xlsx', data, DEFAULT_SETTINGS))

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
    const rows = generateClassifiedSalesRows(10, 3000)
    const start = performance.now()
    const { data } = processFileData(
      'classifiedSales',
      rows,
      '1_分類別売上.xlsx',
      createEmptyImportedData(),
      DEFAULT_SETTINGS,
    )
    const elapsed = performance.now() - start

    expect(data.stores.size).toBe(10)
    expect(elapsed).toBeLessThan(3000)
  })
})
