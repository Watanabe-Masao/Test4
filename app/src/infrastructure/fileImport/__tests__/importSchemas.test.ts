/**
 * importSchemas.ts — boundary validation schema tests
 */
import { describe, it, expect } from 'vitest'
import { validateRawRows, ImportSchemaError, STRUCTURAL_RULES } from '../importSchemas'

describe('STRUCTURAL_RULES', () => {
  it('exposes minRows/minCols/label for every known DataType', () => {
    const entries = Object.entries(STRUCTURAL_RULES)
    expect(entries.length).toBeGreaterThan(0)
    for (const [, rule] of entries) {
      expect(typeof rule.minRows).toBe('number')
      expect(typeof rule.minCols).toBe('number')
      expect(typeof rule.label).toBe('string')
      expect(rule.label.length).toBeGreaterThan(0)
    }
  })
})

describe('ImportSchemaError', () => {
  it('captures dataType and filename as readonly fields', () => {
    const err = new ImportSchemaError('msg', 'purchase', 'a.csv')
    expect(err.name).toBe('ImportSchemaError')
    expect(err.message).toBe('msg')
    expect(err.dataType).toBe('purchase')
    expect(err.filename).toBe('a.csv')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('validateRawRows', () => {
  it('throws when row count is below minRows', () => {
    const rule = STRUCTURAL_RULES.purchase
    const rows: unknown[][] = [Array(rule.minCols).fill('x')]
    expect(() => validateRawRows('purchase', rows, 'bad.csv')).toThrow(ImportSchemaError)
  })

  it('throws when col count is below minCols', () => {
    const rule = STRUCTURAL_RULES.purchase
    const rows: unknown[][] = Array.from({ length: rule.minRows }, () => ['only'])
    expect(() => validateRawRows('purchase', rows, 'bad.csv')).toThrow(/列数が不足/)
  })

  it('throws when data rows are all empty', () => {
    const rule = STRUCTURAL_RULES.purchase
    const header = Array(rule.minCols).fill('h')
    const empty = Array(rule.minCols).fill('')
    const rows: unknown[][] = [header]
    for (let i = 1; i < rule.minRows; i++) rows.push(empty)
    expect(() => validateRawRows('purchase', rows, 'bad.csv')).toThrow(/データ行が含まれていません/)
  })

  it('passes when all constraints are satisfied', () => {
    const rule = STRUCTURAL_RULES.purchase
    const header = Array(rule.minCols).fill('h')
    const data = Array(rule.minCols).fill('v')
    const rows: unknown[][] = [header]
    for (let i = 1; i < rule.minRows; i++) rows.push(data)
    // extra data row
    rows.push(data)
    expect(() => validateRawRows('purchase', rows, 'ok.csv')).not.toThrow()
  })

  it('error carries the provided filename and dataType', () => {
    try {
      validateRawRows('purchase', [[]], 'x.csv')
      expect.fail('should throw')
    } catch (e) {
      expect(e).toBeInstanceOf(ImportSchemaError)
      const err = e as ImportSchemaError
      expect(err.filename).toBe('x.csv')
      expect(err.dataType).toBe('purchase')
    }
  })
})
