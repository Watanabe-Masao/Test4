import { describe, it, expect } from 'vitest'
import { calculateDiff, summarizeDiff } from './diffCalculator'
import type { DiffResult } from './diffCalculator'
import { createEmptyImportedData } from '@/domain/models'
import type { ImportedData } from '@/domain/models'

function makeData(overrides: Partial<ImportedData> = {}): ImportedData {
  return { ...createEmptyImportedData(), ...overrides }
}

// ─── calculateDiff ──────────────────────────────────────

describe('calculateDiff', () => {
  it('既存が空の場合は全て autoApproved', () => {
    const existing = makeData()
    const incoming = makeData({
      sales: { '1': { 1: { sales: 50000 } } },
    })

    const result = calculateDiff(existing, incoming, new Set(['sales']))

    expect(result.needsConfirmation).toBe(false)
    expect(result.autoApproved).toContain('sales')
  })

  it('既存と新規が同一の場合は差分なし', () => {
    const data = makeData({
      sales: { '1': { 1: { sales: 50000 } } },
    })

    const result = calculateDiff(data, data, new Set(['sales']))

    expect(result.needsConfirmation).toBe(false)
    // 既存データがある場合は autoApproved にはならない（変更なしの差分がないため diffs にも入らない）
    expect(result.diffs.length).toBe(0)
  })

  it('既存にない日の新規データは挿入として検出', () => {
    const existing = makeData({
      sales: { '1': { 1: { sales: 50000 } } },
    })
    const incoming = makeData({
      sales: {
        '1': {
          1: { sales: 50000 },
          2: { sales: 60000 },
        },
      },
    })

    const result = calculateDiff(existing, incoming, new Set(['sales']))

    expect(result.needsConfirmation).toBe(false)
    const salesDiff = result.diffs.find((d) => d.dataType === 'sales')
    expect(salesDiff?.inserts.length).toBeGreaterThan(0)
    expect(salesDiff?.modifications.length).toBe(0)
    expect(salesDiff?.removals.length).toBe(0)
  })

  it('既存の値が変更された場合は modification として検出', () => {
    const existing = makeData({
      sales: { '1': { 1: { sales: 50000 } } },
    })
    const incoming = makeData({
      sales: { '1': { 1: { sales: 60000 } } },
    })

    const result = calculateDiff(existing, incoming, new Set(['sales']))

    expect(result.needsConfirmation).toBe(true)
    const salesDiff = result.diffs.find((d) => d.dataType === 'sales')
    expect(salesDiff?.modifications.length).toBeGreaterThan(0)
    expect(salesDiff?.modifications[0].oldValue).toBe(50000)
    expect(salesDiff?.modifications[0].newValue).toBe(60000)
  })

  it('既存にある日が新規にない場合は removal として検出', () => {
    const existing = makeData({
      sales: {
        '1': {
          1: { sales: 50000 },
          2: { sales: 60000 },
        },
      },
    })
    const incoming = makeData({
      sales: { '1': { 1: { sales: 50000 } } },
    })

    const result = calculateDiff(existing, incoming, new Set(['sales']))

    expect(result.needsConfirmation).toBe(true)
    const salesDiff = result.diffs.find((d) => d.dataType === 'sales')
    expect(salesDiff?.removals.length).toBeGreaterThan(0)
  })

  it('既存にある店舗が新規にない場合は removal として検出', () => {
    const existing = makeData({
      sales: {
        '1': { 1: { sales: 50000 } },
        '2': { 1: { sales: 40000 } },
      },
    })
    const incoming = makeData({
      sales: { '1': { 1: { sales: 50000 } } },
    })

    const result = calculateDiff(existing, incoming, new Set(['sales']))

    expect(result.needsConfirmation).toBe(true)
    const salesDiff = result.diffs.find((d) => d.dataType === 'sales')
    const store2Removals = salesDiff?.removals.filter((r) => r.storeId === '2')
    expect(store2Removals!.length).toBeGreaterThan(0)
  })

  it('インポートされていないデータ種別はスキップされる', () => {
    const existing = makeData({
      sales: { '1': { 1: { sales: 50000 } } },
      discount: { '1': { 1: { sales: 50000, discount: 3000 } } },
    })
    const incoming = makeData({
      sales: { '1': { 1: { sales: 60000 } } },
      discount: { '1': { 1: { sales: 60000, discount: 5000 } } },
    })

    // sales のみインポートされた扱い
    const result = calculateDiff(existing, incoming, new Set(['sales']))

    // sales の差分のみ検出
    expect(result.diffs.some((d) => d.dataType === 'sales')).toBe(true)
    expect(result.diffs.some((d) => d.dataType === 'discount')).toBe(false)
  })

  it('仕入データの差分検出（ネスト構造）', () => {
    const existing = makeData({
      purchase: {
        '1': {
          1: {
            suppliers: {
              '0000001': { name: '取引先A', cost: 10000, price: 13000 },
            },
            total: { cost: 10000, price: 13000 },
          },
        },
      },
    })
    const incoming = makeData({
      purchase: {
        '1': {
          1: {
            suppliers: {
              '0000001': { name: '取引先A', cost: 12000, price: 15000 },
            },
            total: { cost: 12000, price: 15000 },
          },
        },
      },
    })

    const result = calculateDiff(existing, incoming, new Set(['purchase']))

    expect(result.needsConfirmation).toBe(true)
    const purchaseDiff = result.diffs.find((d) => d.dataType === 'purchase')
    expect(purchaseDiff?.modifications.length).toBeGreaterThan(0)
  })

  it('浮動小数点の微小差は同値とみなす', () => {
    const existing = makeData({
      flowers: { '1': { 1: { price: 10000, cost: 8000.0001 } } },
    })
    const incoming = makeData({
      flowers: { '1': { 1: { price: 10000, cost: 8000.0002 } } },
    })

    const result = calculateDiff(existing, incoming, new Set(['flowers']))

    // 0.001未満の差は同値
    expect(result.needsConfirmation).toBe(false)
  })

  it('複数データ種別の同時チェック', () => {
    const existing = makeData({
      sales: { '1': { 1: { sales: 50000 } } },
      discount: { '1': { 1: { sales: 50000, discount: 3000 } } },
    })
    const incoming = makeData({
      sales: { '1': { 1: { sales: 60000 } } },
      discount: { '1': { 1: { sales: 60000, discount: 5000 } } },
    })

    const result = calculateDiff(
      existing,
      incoming,
      new Set(['sales', 'discount']),
    )

    expect(result.needsConfirmation).toBe(true)
    expect(result.diffs.length).toBe(2)
  })

  it('新規店舗の追加は挿入として検出', () => {
    const existing = makeData({
      sales: { '1': { 1: { sales: 50000 } } },
    })
    const incoming = makeData({
      sales: {
        '1': { 1: { sales: 50000 } },
        '2': { 1: { sales: 40000 } },
      },
    })

    const result = calculateDiff(existing, incoming, new Set(['sales']))

    expect(result.needsConfirmation).toBe(false)
    const salesDiff = result.diffs.find((d) => d.dataType === 'sales')
    const store2Inserts = salesDiff?.inserts.filter((i) => i.storeId === '2')
    expect(store2Inserts!.length).toBeGreaterThan(0)
  })

  it('挿入のみの種別は autoApproved に含まれる', () => {
    const existing = makeData({
      sales: { '1': { 1: { sales: 50000 } } },
    })
    const incoming = makeData({
      sales: {
        '1': {
          1: { sales: 50000 },
          2: { sales: 60000 },
        },
      },
    })

    const result = calculateDiff(existing, incoming, new Set(['sales']))

    expect(result.autoApproved).toContain('sales')
  })

  it('変更ありの種別は autoApproved に含まれない', () => {
    const existing = makeData({
      sales: { '1': { 1: { sales: 50000 } } },
    })
    const incoming = makeData({
      sales: { '1': { 1: { sales: 60000 } } },
    })

    const result = calculateDiff(existing, incoming, new Set(['sales']))

    expect(result.autoApproved).not.toContain('sales')
  })

  it('店名が既存・新規の stores から解決される', () => {
    const existing = makeData({
      stores: new Map([['1', { id: '1', code: '0001', name: '店舗A' }]]),
      sales: { '1': { 1: { sales: 50000 } } },
    })
    const incoming = makeData({
      stores: new Map([['1', { id: '1', code: '0001', name: '店舗A' }]]),
      sales: { '1': { 1: { sales: 60000 } } },
    })

    const result = calculateDiff(existing, incoming, new Set(['sales']))
    const mod = result.diffs[0]?.modifications[0]

    expect(mod?.storeName).toBe('店舗A')
  })
})

// ─── summarizeDiff ──────────────────────────────────────

describe('summarizeDiff', () => {
  it('変更なしは「変更なし」を返す', () => {
    const result: DiffResult = { diffs: [], needsConfirmation: false, autoApproved: [] }
    expect(summarizeDiff(result)).toBe('変更なし')
  })

  it('挿入のみの場合', () => {
    const result: DiffResult = {
      diffs: [{
        dataType: 'sales',
        dataTypeName: '売上',
        inserts: [{ storeId: '1', storeName: 'A', day: 1, fieldPath: 'sales', oldValue: null, newValue: 50000 }],
        modifications: [],
        removals: [],
      }],
      needsConfirmation: false,
      autoApproved: ['sales'],
    }
    expect(summarizeDiff(result)).toBe('新規 1件')
  })

  it('全種類の変更がある場合', () => {
    const result: DiffResult = {
      diffs: [{
        dataType: 'sales',
        dataTypeName: '売上',
        inserts: [{ storeId: '1', storeName: 'A', day: 1, fieldPath: 'sales', oldValue: null, newValue: 50000 }],
        modifications: [{ storeId: '1', storeName: 'A', day: 2, fieldPath: 'sales', oldValue: 50000, newValue: 60000 }],
        removals: [{ storeId: '1', storeName: 'A', day: 3, fieldPath: 'sales', oldValue: 70000, newValue: null }],
      }],
      needsConfirmation: true,
      autoApproved: [],
    }
    const summary = summarizeDiff(result)
    expect(summary).toContain('新規 1件')
    expect(summary).toContain('変更 1件')
    expect(summary).toContain('削除 1件')
  })
})
