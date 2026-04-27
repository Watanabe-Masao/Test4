/**
 * queryParams バリデーションテスト
 *
 * SQL インジェクション防止のバリデーション関数をテストする。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { validateDateKey, validateStoreId, validateCode, validateYearMonth } from '../queryParams'

describe('validateDateKey', () => {
  it('正常な日付キーを受け入れる', () => {
    expect(validateDateKey('2024-01-15')).toBe('2024-01-15')
    expect(validateDateKey('2026-12-31')).toBe('2026-12-31')
    expect(validateDateKey('2000-01-01')).toBe('2000-01-01')
  })

  it('SQL インジェクション文字列を拒否する', () => {
    expect(() => validateDateKey("2024-01-01' OR '1'='1")).toThrow('Invalid date key')
  })

  it('不正な形式を拒否する', () => {
    expect(() => validateDateKey('2024/01/01')).toThrow('Invalid date key')
    expect(() => validateDateKey('Jan 1')).toThrow('Invalid date key')
    expect(() => validateDateKey('')).toThrow('Invalid date key')
    expect(() => validateDateKey('2024-1-1')).toThrow('Invalid date key')
    expect(() => validateDateKey('20240115')).toThrow('Invalid date key')
  })

  it('日付文字列以外を拒否する', () => {
    expect(() => validateDateKey('abc')).toThrow('Invalid date key')
    expect(() => validateDateKey('2024-13-01')).not.toThrow() // 形式は正しい（月の妥当性は別レイヤー）
    expect(() => validateDateKey("'; DROP TABLE --")).toThrow('Invalid date key')
  })
})

describe('validateStoreId', () => {
  it('正常な店舗 ID を受け入れる', () => {
    expect(validateStoreId('1')).toBe('1')
    expect(validateStoreId('001')).toBe('001')
    expect(validateStoreId('store-A')).toBe('store-A')
    expect(validateStoreId('店舗01')).toBe('店舗01')
  })

  it('シングルクォートを含む ID を拒否する', () => {
    expect(() => validateStoreId("O'Brien")).toThrow('Invalid store ID')
  })

  it('セミコロンを含む ID を拒否する', () => {
    expect(() => validateStoreId('1; DROP TABLE')).toThrow('Invalid store ID')
  })

  it('バックスラッシュを含む ID を拒否する', () => {
    expect(() => validateStoreId('store\\1')).toThrow('Invalid store ID')
  })

  it('ダブルダッシュ（SQL コメント）を含む ID を拒否する', () => {
    expect(() => validateStoreId('1--comment')).toThrow('Invalid store ID')
  })

  it('ダブルクォートを含む ID を拒否する', () => {
    expect(() => validateStoreId('store"1')).toThrow('Invalid store ID')
  })
})

describe('validateCode', () => {
  it('正常なコードを受け入れる', () => {
    expect(validateCode('01')).toBe('01')
    expect(validateCode('DEPT-A')).toBe('DEPT-A')
    expect(validateCode('部門01')).toBe('部門01')
  })

  it('SQL メタ文字を含むコードを拒否する', () => {
    expect(() => validateCode("code'")).toThrow('Invalid code')
    expect(() => validateCode('code;')).toThrow('Invalid code')
    expect(() => validateCode('code--')).toThrow('Invalid code')
  })
})

describe('validateYearMonth', () => {
  it('正常な年月を受け入れる', () => {
    expect(() => validateYearMonth(2024, 1)).not.toThrow()
    expect(() => validateYearMonth(2026, 12)).not.toThrow()
    expect(() => validateYearMonth(2000, 6)).not.toThrow()
  })

  it('不正な年を拒否する', () => {
    expect(() => validateYearMonth(1999, 1)).toThrow('Invalid year')
    expect(() => validateYearMonth(2101, 1)).toThrow('Invalid year')
    expect(() => validateYearMonth(NaN, 1)).toThrow('Invalid year')
    expect(() => validateYearMonth(2024.5, 1)).toThrow('Invalid year')
  })

  it('不正な月を拒否する', () => {
    expect(() => validateYearMonth(2024, 0)).toThrow('Invalid month')
    expect(() => validateYearMonth(2024, 13)).toThrow('Invalid month')
    expect(() => validateYearMonth(2024, NaN)).toThrow('Invalid month')
    expect(() => validateYearMonth(2024, 1.5)).toThrow('Invalid month')
  })
})
