/**
 * queryRunner のユーティリティ関数テスト
 *
 * Arrow テーブル変換（queryToObjects/queryScalar）は DuckDB-WASM 実環境が必要なため、
 * storeIdFilter のみテストする。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { storeIdFilter } from '../queryRunner'

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
