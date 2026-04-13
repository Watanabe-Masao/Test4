/**
 * dateParser.ts — comprehensive date parser test
 *
 * 検証対象:
 * - parseDate: 各種フォーマット (Date, Excel serial, 和暦, ISO, slash, dot, MM/DD)
 * - parseDateComponents: year/month/day 分解
 * - monthKey: {year}-{month} 形式
 * - cleanDateValue: ISO 形式 (YYYY-MM-DD) に正規化
 * - detectYearMonth: rows から最初の有効日付を見つけて year/month 返す
 */
import { describe, it, expect } from 'vitest'
import {
  parseDate,
  parseDateComponents,
  monthKey,
  cleanDateValue,
  detectYearMonth,
} from '../dateParser'

// ─── parseDate ──────────────────────────

describe('parseDate', () => {
  it('null / undefined → null', () => {
    expect(parseDate(null)).toBeNull()
    expect(parseDate(undefined)).toBeNull()
  })

  it('Date object はそのまま返す', () => {
    const d = new Date(2026, 3, 15)
    expect(parseDate(d)).toBe(d)
  })

  it('無効な Date → null', () => {
    expect(parseDate(new Date('invalid'))).toBeNull()
  })

  it('Excel シリアル値 (数値)', () => {
    // 46022 = 2026-01-01 (approximately)
    const d = parseDate(45658) // 2025-01-01
    expect(d).not.toBeNull()
    expect(d?.getFullYear()).toBe(2025)
  })

  it('数値範囲外 (<1 or >2958465) → null', () => {
    expect(parseDate(0)).toBeNull()
    expect(parseDate(9999999)).toBeNull()
  })

  it('空文字列 → null', () => {
    expect(parseDate('')).toBeNull()
    expect(parseDate('  ')).toBeNull()
  })

  it("'2026年4月15日' (日本語形式)", () => {
    const d = parseDate('2026年4月15日')
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(3)
    expect(d?.getDate()).toBe(15)
  })

  it("'2026年4月15日(土)' (曜日付き)", () => {
    const d = parseDate('2026年4月15日(土)')
    expect(d?.getDate()).toBe(15)
  })

  it("'令和8年2月15日' (和暦漢字)", () => {
    // 令和 = 2018 + n, 8 → 2026
    const d = parseDate('令和8年2月15日')
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(1)
  })

  it("'R8.2.15' (和暦ドット)", () => {
    const d = parseDate('R8.2.15')
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(1)
  })

  it("'2026-04-15' (ISO)", () => {
    const d = parseDate('2026-04-15')
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(3)
    expect(d?.getDate()).toBe(15)
  })

  it("'2026/4/15' (slash)", () => {
    const d = parseDate('2026/4/15')
    expect(d?.getMonth()).toBe(3)
  })

  it("'26/04/15' (短縮年, 00-49 → 2000+)", () => {
    const d = parseDate('26/04/15')
    expect(d?.getFullYear()).toBe(2026)
  })

  it("'96/04/15' (短縮年, 50-99 → 1900+)", () => {
    const d = parseDate('96/04/15')
    expect(d?.getFullYear()).toBe(1996)
  })

  it("'2026.4.15' (dot)", () => {
    const d = parseDate('2026.4.15')
    expect(d?.getFullYear()).toBe(2026)
  })

  it("'26.4.15' (短縮年ドット)", () => {
    const d = parseDate('26.4.15')
    expect(d?.getFullYear()).toBe(2026)
  })

  it("'2/15' + contextYear=2026 → 2026/2/15", () => {
    const d = parseDate('2/15', 2026)
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(1)
  })

  it("'2/15' + contextYear 無し → 現在年を使用", () => {
    const d = parseDate('2/15')
    expect(d?.getFullYear()).toBe(new Date().getFullYear())
  })

  it('無効な月 (13月) → null', () => {
    expect(parseDate('2026/13/01')).toBeNull()
  })

  it('無効な日 (32日) → null', () => {
    expect(parseDate('2026/04/32')).toBeNull()
  })

  it('2月30日 (存在しない) → null', () => {
    expect(parseDate('2026/02/30')).toBeNull()
  })

  it('2月29日 (閏年 2024) → 有効', () => {
    const d = parseDate('2024/02/29')
    expect(d).not.toBeNull()
  })

  it('2月29日 (非閏年 2026) → null', () => {
    expect(parseDate('2026/02/29')).toBeNull()
  })

  it('完全に無関係な文字列 → null', () => {
    expect(parseDate('hello world')).toBeNull()
    expect(parseDate('abc')).toBeNull()
  })
})

// ─── parseDateComponents ────────────────

describe('parseDateComponents', () => {
  it('valid date → {year, month, day}', () => {
    const result = parseDateComponents('2026-04-15')
    expect(result).toEqual({ year: 2026, month: 4, day: 15 })
  })

  it('invalid → null', () => {
    expect(parseDateComponents('invalid')).toBeNull()
    expect(parseDateComponents(null)).toBeNull()
  })
})

// ─── monthKey ────────────────────────────

describe('monthKey', () => {
  it('{year}-{month} 形式', () => {
    expect(monthKey(2026, 4)).toBe('2026-4')
    expect(monthKey(2026, 12)).toBe('2026-12')
  })

  it('month は zero pad しない', () => {
    expect(monthKey(2026, 1)).toBe('2026-1')
  })
})

// ─── cleanDateValue ──────────────────────

describe('cleanDateValue', () => {
  it('valid date → YYYY-MM-DD (zero pad)', () => {
    expect(cleanDateValue('2026/4/5')).toBe('2026-04-05')
  })

  it('和暦 → ISO 形式', () => {
    expect(cleanDateValue('令和8年2月15日')).toBe('2026-02-15')
  })

  it('無効な値 → 元値の文字列', () => {
    expect(cleanDateValue('hello')).toBe('hello')
  })

  it('null → 空文字列', () => {
    expect(cleanDateValue(null)).toBe('')
  })

  it('undefined → 空文字列', () => {
    expect(cleanDateValue(undefined)).toBe('')
  })

  it('数値 → 変換された ISO 形式', () => {
    const result = cleanDateValue(45658)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

// ─── detectYearMonth ────────────────────

describe('detectYearMonth', () => {
  it('空 rows → null', () => {
    expect(detectYearMonth([])).toBeNull()
  })

  it('有効な日付が無い → null', () => {
    expect(detectYearMonth([[], [], ['invalid']])).toBeNull()
  })

  it('最初の有効な日付の year/month を返す', () => {
    const rows = [['header'], ['subheader'], ['2026-04-15']]
    expect(detectYearMonth(rows)).toEqual({ year: 2026, month: 4 })
  })

  it('dateColIndex 指定', () => {
    const rows = [
      ['header', 'x', 'y'],
      ['sub', 'x', 'y'],
      ['ignored', '2026-04-15', 'other'],
    ]
    expect(detectYearMonth(rows, 1)).toEqual({ year: 2026, month: 4 })
  })

  it('dataStartRow 指定', () => {
    const rows = [
      ['H1'],
      ['H2'],
      ['H3'],
      ['H4'],
      ['2026-06-15'],
    ]
    expect(detectYearMonth(rows, 0, 4)).toEqual({ year: 2026, month: 6 })
  })

  it('dataColIndex が範囲外 → スキップして次の行', () => {
    const rows = [[], ['single-col-only'], ['ignore', '2026-05-20']]
    expect(detectYearMonth(rows, 1, 0)).toEqual({ year: 2026, month: 5 })
  })
})
