/**
 * queryRunner のユーティリティ関数テスト
 *
 * Arrow テーブル変換（queryToObjects/queryScalar）は DuckDB-WASM 実環境が必要なため、
 * ここでは純粋関数の buildWhereClause / storeIdFilter のみをテストする。
 */
import { describe, it, expect } from 'vitest'
import { buildWhereClause, storeIdFilter } from '../queryRunner'

describe('buildWhereClause', () => {
  it('null をフィルタして有効な条件のみ AND 結合する', () => {
    const result = buildWhereClause([
      "date_key BETWEEN '2026-01-01' AND '2026-01-31'",
      null,
      'is_prev_year = FALSE',
      null,
    ])
    expect(result).toBe(
      "WHERE date_key BETWEEN '2026-01-01' AND '2026-01-31' AND is_prev_year = FALSE",
    )
  })

  it('全て null の場合は空文字列を返す', () => {
    expect(buildWhereClause([null, null])).toBe('')
  })

  it('空配列の場合は空文字列を返す', () => {
    expect(buildWhereClause([])).toBe('')
  })

  it('条件が1つの場合は AND なしで返す', () => {
    const result = buildWhereClause(["store_id = '1'"])
    expect(result).toBe("WHERE store_id = '1'")
  })

  it('3つ以上の条件を AND で結合する', () => {
    const result = buildWhereClause([
      "date_key >= '2026-01-01'",
      'is_prev_year = TRUE',
      "store_id IN ('1', '2')",
    ])
    expect(result).toBe(
      "WHERE date_key >= '2026-01-01' AND is_prev_year = TRUE AND store_id IN ('1', '2')",
    )
  })
})

describe('storeIdFilter', () => {
  it('storeIds が空配列の場合は null を返す', () => {
    expect(storeIdFilter([])).toBeNull()
  })

  it('storeIds が undefined の場合は null を返す', () => {
    expect(storeIdFilter(undefined)).toBeNull()
  })

  it('単一の storeId で IN 条件を生成する', () => {
    expect(storeIdFilter(['1'])).toBe("store_id IN ('1')")
  })

  it('複数の storeIds で IN 条件を生成する', () => {
    expect(storeIdFilter(['1', '2', '3'])).toBe("store_id IN ('1', '2', '3')")
  })

  it('シングルクォートを含む storeId はバリデーションで拒否される', () => {
    expect(() => storeIdFilter(["O'Brien"])).toThrow('Invalid store ID')
  })
})
