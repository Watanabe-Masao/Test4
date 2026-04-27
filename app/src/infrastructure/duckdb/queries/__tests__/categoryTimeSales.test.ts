/**
 * categoryTimeSales — ctsWhereClause / tsWhereClause tests
 *
 * SQL WHERE 句構築の純粋関数。DuckDB 接続は不要。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { ctsWhereClause, tsWhereClause } from '../categoryTimeSales'

describe('ctsWhereClause', () => {
  const base = {
    dateFrom: '2026-03-01',
    dateTo: '2026-03-31',
  }

  it('WHERE キーワードを含む', () => {
    const sql = ctsWhereClause(base, 'cts')
    expect(sql.startsWith('WHERE')).toBe(true)
  })

  it('日付範囲条件を含む', () => {
    const sql = ctsWhereClause(base, 'cts')
    expect(sql).toContain('2026-03-01')
    expect(sql).toContain('2026-03-31')
  })

  it('alias を条件に含む', () => {
    const sql = ctsWhereClause(base, 'cts')
    expect(sql).toContain('cts.date_key')
  })

  it('is_prev_year=FALSE がデフォルト', () => {
    const sql = ctsWhereClause(base, 'cts')
    expect(sql).toContain('is_prev_year')
    expect(sql.toUpperCase()).toContain('FALSE')
  })

  it('isPrevYear=true を反映', () => {
    const sql = ctsWhereClause({ ...base, isPrevYear: true }, 'cts')
    expect(sql).toContain('is_prev_year')
    expect(sql.toUpperCase()).toContain('TRUE')
  })

  it('storeIds あれば IN 句を含む', () => {
    const sql = ctsWhereClause({ ...base, storeIds: ['s1', 's2'] }, 'cts')
    expect(sql).toContain('store_id')
    expect(sql).toContain("'s1'")
    expect(sql).toContain("'s2'")
  })

  it('storeIds 空配列または undefined で IN 句なし', () => {
    const sqlEmpty = ctsWhereClause({ ...base, storeIds: [] }, 'cts')
    const sqlUndef = ctsWhereClause(base, 'cts')
    expect(sqlEmpty).not.toMatch(/store_id IN/)
    expect(sqlUndef).not.toMatch(/store_id IN/)
  })

  it('deptCode を条件に含む', () => {
    const sql = ctsWhereClause({ ...base, deptCode: '100' }, 'cts')
    expect(sql).toContain('dept_code')
    expect(sql).toContain("'100'")
  })

  it('lineCode / klassCode も追加される', () => {
    const sql = ctsWhereClause({ ...base, lineCode: 'L1', klassCode: 'K1' }, 'cts')
    expect(sql).toContain('line_code')
    expect(sql).toContain("'L1'")
    expect(sql).toContain('klass_code')
    expect(sql).toContain("'K1'")
  })

  it('dow 配列があれば IN 句追加', () => {
    const sql = ctsWhereClause({ ...base, dow: [0, 6] }, 'cts')
    expect(sql).toContain('dow')
    expect(sql).toMatch(/IN/)
  })

  it('dow=undefined や空配列では IN 句を含まない', () => {
    const sqlEmpty = ctsWhereClause({ ...base, dow: [] }, 'cts')
    const sqlUndef = ctsWhereClause(base, 'cts')
    expect(sqlEmpty).not.toMatch(/dow IN/)
    expect(sqlUndef).not.toMatch(/dow IN/)
  })

  it('条件は AND で結合', () => {
    const sql = ctsWhereClause({ ...base, storeIds: ['s1'], deptCode: '100' }, 'cts')
    expect(sql).toContain('AND')
  })
})

describe('tsWhereClause', () => {
  it('alias=ts で構築', () => {
    const sql = tsWhereClause({ dateFrom: '2026-03-01', dateTo: '2026-03-31' })
    expect(sql).toContain('ts.date_key')
  })

  it('dow 条件は含めない（time_slots に dow が無いため）', () => {
    const sql = tsWhereClause({
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
      dow: [0, 6],
    })
    // tsWhereClause は buildCtsConditions のみ呼ぶ（dow push しない）
    expect(sql).not.toMatch(/dow IN/)
  })

  it('storeIds を含められる', () => {
    const sql = tsWhereClause({
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
      storeIds: ['s1'],
    })
    expect(sql).toContain("'s1'")
    expect(sql).toContain('ts.store_id')
  })
})
