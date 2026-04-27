/**
 * QueryProfilePanel — display formatters
 *
 * 検証対象:
 * - formatDuration: ms を視認性重視の複数スケール文字列に整形
 * - truncateSql: 複数行 SQL を 1 行に潰し、長すぎれば '...' で打ち切る
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { formatDuration, truncateSql } from '../QueryProfilePanel'

describe('formatDuration', () => {
  it('null は ... 表示', () => {
    expect(formatDuration(null)).toBe('...')
  })

  it('1ms 未満は <1ms', () => {
    expect(formatDuration(0.5)).toBe('<1ms')
    expect(formatDuration(0)).toBe('<1ms')
  })

  it('1-999ms は "Nms"（四捨五入）', () => {
    expect(formatDuration(1)).toBe('1ms')
    expect(formatDuration(123)).toBe('123ms')
    expect(formatDuration(123.4)).toBe('123ms')
    expect(formatDuration(123.6)).toBe('124ms')
    expect(formatDuration(999)).toBe('999ms')
  })

  it('1000ms 以上は秒表示（小数第2位）', () => {
    expect(formatDuration(1000)).toBe('1.00s')
    expect(formatDuration(1234)).toBe('1.23s')
    expect(formatDuration(12345)).toBe('12.35s')
  })
})

describe('truncateSql', () => {
  it('short SQL はそのまま', () => {
    expect(truncateSql('SELECT 1')).toBe('SELECT 1')
  })

  it('複数行 SQL を 1 行に潰す', () => {
    const multi = 'SELECT\n  *\nFROM\n  tbl'
    expect(truncateSql(multi)).toBe('SELECT * FROM tbl')
  })

  it('末尾と先頭の空白をトリム', () => {
    expect(truncateSql('  SELECT 1  ')).toBe('SELECT 1')
  })

  it('maxLen=80 デフォルトで超えると ... が付く', () => {
    const long = 'SELECT ' + 'a'.repeat(100)
    const result = truncateSql(long)
    expect(result).toMatch(/\.\.\.$/)
    expect(result.length).toBe(83) // 80 + '...'
  })

  it('maxLen を指定できる', () => {
    const long = 'x'.repeat(50)
    expect(truncateSql(long, 10)).toBe('xxxxxxxxxx...')
  })

  it('maxLen 以下ならそのまま', () => {
    expect(truncateSql('short', 10)).toBe('short')
  })

  it('複数スペースも 1 個に正規化', () => {
    expect(truncateSql('SELECT    *    FROM   tbl')).toBe('SELECT * FROM tbl')
  })
})
