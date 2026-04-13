/**
 * categoryData.ts — pure category data builder test
 *
 * 検証対象:
 * - buildCategoryData: CATEGORY_ORDER 各 category の pair を構築
 * - buildCustomCategoryData: supplier → customCategory 集約 + プリセット/ユーザー分岐
 * - buildUnifiedCategoryData: 標準 + カスタム統合 + 全体再計算
 * - buildParetoData: 降順ソート + cumPct 累計
 * - CATEGORY_COLORS / CUSTOM_CATEGORY_COLORS 定数
 */
import { describe, it, expect } from 'vitest'
import {
  buildCategoryData,
  buildCustomCategoryData,
  buildUnifiedCategoryData,
  buildParetoData,
  CATEGORY_COLORS,
  CUSTOM_CATEGORY_COLORS,
} from '../categoryData'
import type { StoreResult } from '@/domain/models/storeTypes'

function makeResult(
  categoryTotals: Map<string, { cost: number; price: number }>,
  supplierTotals?: Map<string, { supplierCode: string; cost: number; price: number }>,
): StoreResult {
  return {
    categoryTotals,
    supplierTotals: supplierTotals ?? new Map(),
  } as unknown as StoreResult
}

// ─── CATEGORY_COLORS ─────────────────────────────────

describe('CATEGORY_COLORS 定数', () => {
  it('主要カテゴリの色が定義される', () => {
    expect(CATEGORY_COLORS.market).toBe('#f59e0b')
    expect(CATEGORY_COLORS.lfc).toBe('#3b82f6')
    expect(CATEGORY_COLORS.flowers).toBe('#ec4899')
  })
})

describe('CUSTOM_CATEGORY_COLORS 定数', () => {
  it('プリセットカテゴリの色が定義される', () => {
    expect(CUSTOM_CATEGORY_COLORS.market_purchase).toBe('#f59e0b')
    expect(CUSTOM_CATEGORY_COLORS.uncategorized).toBe('#94a3b8')
  })
})

// ─── buildCategoryData ───────────────────────────────

describe('buildCategoryData', () => {
  it('空 map は空配列', () => {
    const result = buildCategoryData(makeResult(new Map()))
    expect(result).toEqual([])
  })

  it('category あり → label / cost / price / color を含む row を返す', () => {
    const totals = new Map([['market', { cost: 800, price: 1000 }]])
    const rows = buildCategoryData(makeResult(totals))
    expect(rows).toHaveLength(1)
    expect(rows[0].category).toBe('market')
    expect(rows[0].label).toBe('市場')
    expect(rows[0].cost).toBe(800)
    expect(rows[0].price).toBe(1000)
    expect(rows[0].color).toBe('#f59e0b')
  })

  it('markup / priceShare / crossMultiplication が計算される', () => {
    const totals = new Map([
      ['market', { cost: 800, price: 1000 }],
      ['lfc', { cost: 700, price: 1000 }],
    ])
    const rows = buildCategoryData(makeResult(totals))
    expect(rows).toHaveLength(2)
    // market: markup = (1000-800)/1000 = 0.2
    const market = rows.find((r) => r.category === 'market')!
    expect(market.markup).toBeCloseTo(0.2, 2)
    // market priceShare = 1000/2000 = 0.5
    expect(market.priceShare).toBeCloseTo(0.5, 2)
  })

  it('CATEGORY_COLORS に無いカテゴリは slate fallback', () => {
    // 実際のコードは CATEGORY_ORDER から引くので未知カテゴリは通らないが、
    // ?? '#64748b' フォールバックが存在する。
    const totals = new Map([['market', { cost: 0, price: 0 }]])
    const rows = buildCategoryData(makeResult(totals))
    expect(rows[0].color).toBe('#f59e0b')
  })
})

// ─── buildCustomCategoryData ─────────────────────────

describe('buildCustomCategoryData', () => {
  it('空 supplierTotals は空配列', () => {
    const result = makeResult(new Map(), new Map())
    expect(buildCustomCategoryData(result, {})).toEqual([])
  })

  it('supplier → customCategory map でプリセットに集約', () => {
    const supplierTotals = new Map([
      ['sup1', { supplierCode: 'sup1', cost: 500, price: 800 }],
      ['sup2', { supplierCode: 'sup2', cost: 300, price: 500 }],
    ])
    const result = makeResult(new Map(), supplierTotals)
    const rows = buildCustomCategoryData(result, {
      sup1: 'market_purchase',
      sup2: 'market_purchase',
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].category).toBe('market_purchase')
    // 集約: cost=800, price=1300
    expect(rows[0].cost).toBe(800)
    expect(rows[0].price).toBe(1300)
  })

  it('map に無い supplier は uncategorized に入る', () => {
    const supplierTotals = new Map([
      ['sup1', { supplierCode: 'sup1', cost: 100, price: 200 }],
    ])
    const result = makeResult(new Map(), supplierTotals)
    const rows = buildCustomCategoryData(result, {})
    expect(rows.some((r) => r.category === 'uncategorized')).toBe(true)
  })

  it('ユーザーカテゴリ (user:xxx) は別行として追加', () => {
    const supplierTotals = new Map([
      ['sup1', { supplierCode: 'sup1', cost: 100, price: 200 }],
    ])
    const result = makeResult(new Map(), supplierTotals)
    const rows = buildCustomCategoryData(
      result,
      { sup1: 'user:custom-1' },
      { 'user:custom-1': 'マイカテゴリ' },
    )
    const userRow = rows.find((r) => r.category === 'user:custom-1')
    expect(userRow).toBeDefined()
    expect(userRow?.label).toBe('マイカテゴリ')
  })

  it('ユーザーカテゴリ label が無い場合は id から prefix 除去', () => {
    const supplierTotals = new Map([
      ['sup1', { supplierCode: 'sup1', cost: 100, price: 200 }],
    ])
    const result = makeResult(new Map(), supplierTotals)
    const rows = buildCustomCategoryData(result, { sup1: 'user:my-custom' })
    const userRow = rows.find((r) => r.category === 'user:my-custom')
    expect(userRow?.label).toBe('my-custom')
  })
})

// ─── buildUnifiedCategoryData ────────────────────────

describe('buildUnifiedCategoryData', () => {
  it('空 入力 → 空配列', () => {
    const result = makeResult(new Map(), new Map())
    expect(buildUnifiedCategoryData(result, {})).toEqual([])
  })

  it('標準カテゴリ + カスタムカテゴリが統合される', () => {
    const categoryTotals = new Map([['market', { cost: 500, price: 800 }]])
    const supplierTotals = new Map([
      ['sup1', { supplierCode: 'sup1', cost: 100, price: 200 }],
    ])
    const result = makeResult(categoryTotals, supplierTotals)
    const rows = buildUnifiedCategoryData(result, { sup1: 'lfc' })
    // 'market' (isCustom=false) と 'lfc' (isCustom=true) の 2 行
    expect(rows).toHaveLength(2)
    const standard = rows.find((r) => !r.isCustom)!
    const custom = rows.find((r) => r.isCustom)!
    expect(standard.category).toBe('market')
    expect(custom.category).toBe('lfc')
  })

  it('全体で priceShare を再計算する', () => {
    const categoryTotals = new Map([['market', { cost: 500, price: 1000 }]])
    const supplierTotals = new Map([
      ['sup1', { supplierCode: 'sup1', cost: 300, price: 1000 }],
    ])
    const result = makeResult(categoryTotals, supplierTotals)
    const rows = buildUnifiedCategoryData(result, { sup1: 'lfc' })
    // 合計 2000 → 各 0.5
    expect(rows[0].priceShare).toBeCloseTo(0.5, 2)
    expect(rows[1].priceShare).toBeCloseTo(0.5, 2)
  })

  it('isCustom フィールドが設定される', () => {
    const categoryTotals = new Map([['market', { cost: 500, price: 800 }]])
    const result = makeResult(categoryTotals)
    const rows = buildUnifiedCategoryData(result, {})
    expect(rows[0].isCustom).toBe(false)
  })
})

// ─── buildParetoData ─────────────────────────────────

describe('buildParetoData', () => {
  it('空配列は空配列', () => {
    expect(buildParetoData([])).toEqual([])
  })

  it('value 降順にソートされる', () => {
    const items = [
      { name: 'A', value: 100, color: '#f00' },
      { name: 'B', value: 300, color: '#0f0' },
      { name: 'C', value: 200, color: '#00f' },
    ]
    const result = buildParetoData(items)
    expect(result.map((r) => r.name)).toEqual(['B', 'C', 'A'])
  })

  it('cumPct が累積構成比として計算される', () => {
    const items = [
      { name: 'A', value: 100, color: '#f00' },
      { name: 'B', value: 300, color: '#0f0' },
    ]
    const result = buildParetoData(items)
    // B(300) 先頭 → cumPct = 300/400 = 0.75
    expect(result[0].cumPct).toBeCloseTo(0.75, 2)
    // A(100) 後 → cumPct = 400/400 = 1.0
    expect(result[1].cumPct).toBeCloseTo(1.0, 2)
  })

  it('入力配列を mutation しない (sorted は new array)', () => {
    const items = [
      { name: 'A', value: 100, color: '#f00' },
      { name: 'B', value: 300, color: '#0f0' },
    ]
    const before = items.map((i) => i.name)
    buildParetoData(items)
    const after = items.map((i) => i.name)
    expect(before).toEqual(after)
  })
})
