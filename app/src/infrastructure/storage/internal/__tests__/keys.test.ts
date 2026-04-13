/**
 * keys.ts — storage キー生成関数の純粋テスト
 */
import { describe, it, expect } from 'vitest'
import { monthKey, summaryKey, importHistoryKey, STORE_DAY_FIELDS, DATA_TYPE_LABELS } from '../keys'

describe('monthKey', () => {
  it('returns zero-padded month for single digit', () => {
    expect(monthKey(2026, 1, 'purchase')).toBe('2026-01_purchase')
  })

  it('keeps two-digit month unchanged', () => {
    expect(monthKey(2026, 12, 'flowers')).toBe('2026-12_flowers')
  })

  it('supports classifiedSales data type', () => {
    expect(monthKey(2025, 6, 'classifiedSales')).toBe('2025-06_classifiedSales')
  })

  it('handles edge month 10 (boundary between 1 and 2 digits)', () => {
    expect(monthKey(2024, 10, 'interStoreIn')).toBe('2024-10_interStoreIn')
  })

  it('pads month 9 to 09', () => {
    expect(monthKey(2023, 9, 'directProduce')).toBe('2023-09_directProduce')
  })
})

describe('summaryKey', () => {
  it('generates summaryCache key for given year/month', () => {
    expect(summaryKey(2026, 3)).toBe('2026-03_summaryCache')
  })

  it('pads single digit month', () => {
    expect(summaryKey(2025, 1)).toBe('2025-01_summaryCache')
  })

  it('keeps two digit month', () => {
    expect(summaryKey(2025, 11)).toBe('2025-11_summaryCache')
  })
})

describe('importHistoryKey', () => {
  it('generates importHistory key', () => {
    expect(importHistoryKey(2026, 4)).toBe('2026-04_importHistory')
  })

  it('pads single digit month', () => {
    expect(importHistoryKey(2024, 2)).toBe('2024-02_importHistory')
  })

  it('handles December', () => {
    expect(importHistoryKey(2024, 12)).toBe('2024-12_importHistory')
  })
})

describe('STORE_DAY_FIELDS', () => {
  it('contains 6 entries (excluding classifiedSales)', () => {
    expect(STORE_DAY_FIELDS).toHaveLength(6)
  })

  it('maps purchase field to purchase type', () => {
    const entry = STORE_DAY_FIELDS.find((e) => e.field === 'purchase')
    expect(entry?.type).toBe('purchase')
  })

  it('does not include classifiedSales (handled separately)', () => {
    const hasCs = STORE_DAY_FIELDS.some((e) => e.field === 'classifiedSales')
    expect(hasCs).toBe(false)
  })

  it('includes inter-store and special types', () => {
    const types = STORE_DAY_FIELDS.map((e) => e.type)
    expect(types).toContain('interStoreIn')
    expect(types).toContain('interStoreOut')
    expect(types).toContain('flowers')
    expect(types).toContain('directProduce')
    expect(types).toContain('consumables')
  })

  it('each field name matches its type (1:1 mapping)', () => {
    for (const { field, type } of STORE_DAY_FIELDS) {
      expect(field).toBe(type)
    }
  })
})

describe('DATA_TYPE_LABELS', () => {
  it('has Japanese label for purchase', () => {
    expect(DATA_TYPE_LABELS.purchase).toBe('仕入')
  })

  it('has Japanese label for classifiedSales', () => {
    expect(DATA_TYPE_LABELS.classifiedSales).toBe('分類別売上')
  })

  it('has labels for all STORE_DAY_FIELDS entries', () => {
    for (const { type } of STORE_DAY_FIELDS) {
      expect(DATA_TYPE_LABELS[type]).toBeDefined()
    }
  })

  it('returns undefined for unknown data types (Partial record)', () => {
    // Partial<Record> — unknown key returns undefined
    const unknownLabel = DATA_TYPE_LABELS['summaryCache' as 'summaryCache']
    expect(unknownLabel).toBeUndefined()
  })
})
