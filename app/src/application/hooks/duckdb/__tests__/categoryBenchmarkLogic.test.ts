/**
 * categoryBenchmarkLogic.ts — pure function test
 *
 * 検証対象:
 * - classifyProductType: highIndex × lowVariance の 4 クロス分類
 * - buildCategoryBenchmarkScores:
 *   - 空 rows → 空配列
 *   - minStores 閾値で filter
 *   - metric='share' / 'salesPi' / 'quantityPi' 分岐
 *   - totalStoreCount>0 で販売 0 店舗を 0 埋め
 *   - index*stability で降順ソート
 *   - dominance / stability 計算
 */
import { describe, it, expect } from 'vitest'
import {
  classifyProductType,
  buildCategoryBenchmarkScores,
} from '../categoryBenchmarkLogic'
import type { CategoryBenchmarkRow } from '@/infrastructure/duckdb/queries/advancedAnalytics'

function makeRow(
  code: string,
  storeId: string,
  totalSales: number,
  share: number,
  storeCount: number = 3,
  storeCustomers: number = 100,
  totalQuantity: number = 0,
): CategoryBenchmarkRow {
  return {
    code,
    name: `Cat${code}`,
    storeId,
    totalSales,
    totalQuantity,
    storeCustomers,
    share,
    salesRank: 1,
    storeCount,
  }
}

// ─── classifyProductType ─────────────────────────────

describe('classifyProductType', () => {
  it("highIndex (>=50) && lowVariance (<0.5) → 'flagship'", () => {
    expect(classifyProductType(60, 0.3)).toBe('flagship')
  })

  it("highIndex && !lowVariance → 'regional'", () => {
    expect(classifyProductType(60, 0.7)).toBe('regional')
  })

  it("!highIndex && lowVariance → 'standard'", () => {
    expect(classifyProductType(30, 0.3)).toBe('standard')
  })

  it("!highIndex && !lowVariance → 'unstable'", () => {
    expect(classifyProductType(30, 0.7)).toBe('unstable')
  })

  it('boundary: index=50 + cv=0.5 (cv=0.5 は !lowVariance)', () => {
    // cv < 0.5 なので cv=0.5 は !lowVariance → regional
    expect(classifyProductType(50, 0.5)).toBe('regional')
  })
})

// ─── buildCategoryBenchmarkScores ────────────────────

describe('buildCategoryBenchmarkScores', () => {
  it('空 rows → 空配列', () => {
    expect(buildCategoryBenchmarkScores([])).toEqual([])
  })

  it('基本: share メトリック + 単一カテゴリ', () => {
    const rows = [
      makeRow('A', 's1', 100, 0.1, 3),
      makeRow('A', 's2', 200, 0.2, 3),
      makeRow('A', 's3', 300, 0.3, 3),
    ]
    const result = buildCategoryBenchmarkScores(rows, 1, 0, 'share')
    expect(result).toHaveLength(1)
    expect(result[0].code).toBe('A')
    expect(result[0].totalSales).toBe(600)
    expect(result[0].activeStoreCount).toBe(3)
    // avgMetric = (0.1+0.2+0.3)/3 = 0.2
    expect(result[0].avgShare).toBeCloseTo(0.2, 2)
  })

  it('minStores=3: activeStoreCount<3 のカテゴリは除外', () => {
    const rows = [
      makeRow('A', 's1', 100, 0.1, 1), // storeCount=1 → 除外
      makeRow('B', 's1', 100, 0.1, 3),
      makeRow('B', 's2', 200, 0.2, 3),
      makeRow('B', 's3', 300, 0.3, 3),
    ]
    const result = buildCategoryBenchmarkScores(rows, 3, 0, 'share')
    expect(result).toHaveLength(1)
    expect(result[0].code).toBe('B')
  })

  it('totalStoreCount>0 + 実販売 2 店舗: 残り店舗を 0 として扱う', () => {
    // 3 店舗中 2 店舗のみ販売、totalStoreCount=3 で 1 店舗分 0 埋め
    const rows = [
      makeRow('A', 's1', 100, 0.3, 2),
      makeRow('A', 's2', 200, 0.4, 2),
    ]
    const result = buildCategoryBenchmarkScores(rows, 1, 3, 'share')
    // storeCount = max(totalStoreCount=3, sqlStoreCount=2) = 3
    expect(result[0].storeCount).toBe(3)
    expect(result[0].activeStoreCount).toBe(2)
    // dominance = 2/3
    expect(result[0].dominance).toBeCloseTo(2 / 3, 2)
  })

  it('単一カテゴリ: index=100 (maxAvgMetric と一致)', () => {
    const rows = [
      makeRow('A', 's1', 100, 0.1, 2),
      makeRow('A', 's2', 200, 0.2, 2),
    ]
    const result = buildCategoryBenchmarkScores(rows, 1, 0, 'share')
    expect(result[0].index).toBe(100)
  })

  it('複数カテゴリ: 低 avgShare は低 index', () => {
    const rows = [
      makeRow('A', 's1', 500, 0.5, 2),
      makeRow('A', 's2', 500, 0.5, 2),
      makeRow('B', 's1', 50, 0.05, 2),
      makeRow('B', 's2', 50, 0.05, 2),
    ]
    const result = buildCategoryBenchmarkScores(rows, 1, 0, 'share')
    const catA = result.find((r) => r.code === 'A')!
    const catB = result.find((r) => r.code === 'B')!
    expect(catA.index).toBe(100)
    expect(catB.index).toBeCloseTo(10, 0)
  })

  it('index*stability 降順ソート', () => {
    const rows = [
      makeRow('A', 's1', 100, 0.3, 2),
      makeRow('A', 's2', 100, 0.3, 2),
      makeRow('B', 's1', 100, 0.5, 2),
      makeRow('B', 's2', 100, 0.5, 2),
    ]
    const result = buildCategoryBenchmarkScores(rows, 1, 0, 'share')
    // B は avg share 高いので B が先
    expect(result[0].code).toBe('B')
  })

  it('productType が各結果に設定される', () => {
    const rows = [
      makeRow('A', 's1', 100, 0.1, 2),
      makeRow('A', 's2', 200, 0.1, 2),
    ]
    const result = buildCategoryBenchmarkScores(rows, 1, 0, 'share')
    expect(result[0].productType).toMatch(/flagship|regional|standard|unstable/)
  })

  it('metric=share: metric フィールドが返る', () => {
    const rows = [makeRow('A', 's1', 100, 0.1, 2), makeRow('A', 's2', 200, 0.1, 2)]
    const result = buildCategoryBenchmarkScores(rows, 1, 0, 'share')
    expect(result[0].metric).toBe('share')
  })

  it("metric='salesPi': PI 値ベースで計算", () => {
    const rows = [
      makeRow('A', 's1', 10000, 0.1, 2, 100, 0),
      makeRow('A', 's2', 20000, 0.1, 2, 200, 0),
    ]
    const result = buildCategoryBenchmarkScores(rows, 1, 0, 'salesPi')
    expect(result[0].metric).toBe('salesPi')
    // avgMetric は salesPi ベース。100 の客で 10000 円 → 100000
    expect(result[0].avgShare).toBeGreaterThan(0)
  })
})
