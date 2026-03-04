/**
 * dateParser — 追加テスト
 *
 * 既存の dateParser.test.ts でカバーされていない関数・ブランチを対象とする:
 * - parseDate: 和暦ドット形式・短縮年・MM/DD形式・Dateオブジェクト・不正日付
 * - parseDateComponents
 * - monthKey
 * - cleanDateValue
 * - detectYearMonth
 */
import { describe, it, expect } from 'vitest'
import {
  parseDate,
  parseDateComponents,
  monthKey,
  cleanDateValue,
  detectYearMonth,
} from './dateParser'

// ── parseDate — 未カバーのフォーマット ─────────────────────────────

describe('parseDate (additional formats)', () => {
  it('和暦漢字形式: 令和8年2月15日', () => {
    const date = parseDate('令和8年2月15日')
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2026) // 2018 + 8
    expect(date!.getMonth()).toBe(1)
    expect(date!.getDate()).toBe(15)
  })

  it('和暦ドット形式: R8.2.15', () => {
    const date = parseDate('R8.2.15')
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2026)
    expect(date!.getMonth()).toBe(1)
    expect(date!.getDate()).toBe(15)
  })

  it('和暦ドット形式: R6.1.1', () => {
    const date = parseDate('R6.1.1')
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2024)
    expect(date!.getMonth()).toBe(0)
    expect(date!.getDate()).toBe(1)
  })

  it('短縮年スラッシュ形式: 26/02/15 → 2026年', () => {
    const date = parseDate('26/02/15')
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2026)
    expect(date!.getDate()).toBe(15)
  })

  it('短縮年スラッシュ形式: 99/12/31 → 1999年', () => {
    const date = parseDate('99/12/31')
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(1999)
  })

  it('ドット形式: 2026.02.15', () => {
    const date = parseDate('2026.02.15')
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2026)
    expect(date!.getDate()).toBe(15)
  })

  it('短縮年ドット形式: 26.02.15 → 2026年', () => {
    const date = parseDate('26.02.15')
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2026)
  })

  it('短縮年ドット形式: 50.01.01 → 1950年', () => {
    const date = parseDate('50.01.01')
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(1950)
  })

  it('MM/DD形式 with contextYear: 2/15 → 2026-02-15', () => {
    const date = parseDate('2/15', 2026)
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2026)
    expect(date!.getMonth()).toBe(1)
    expect(date!.getDate()).toBe(15)
  })

  it('MM/DD形式 without contextYear: 現在年を使う', () => {
    const currentYear = new Date().getFullYear()
    const date = parseDate('3/10')
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(currentYear)
    expect(date!.getMonth()).toBe(2)
    expect(date!.getDate()).toBe(10)
  })

  it('Date オブジェクト: そのまま返す', () => {
    const d = new Date(2026, 1, 15) // 2026-02-15
    const result = parseDate(d)
    expect(result).toBe(d)
  })

  it('Date オブジェクト: NaN は null', () => {
    const invalid = new Date('invalid')
    expect(parseDate(invalid)).toBeNull()
  })

  it('Excelシリアル値上限付近: 2958465', () => {
    // 2958465 = 9999-12-31 (有効範囲の上限)
    const date = parseDate(2958465)
    expect(date).not.toBeNull()
  })

  it('Excelシリアル値 0 は null', () => {
    expect(parseDate(0)).toBeNull()
  })

  it('Excelシリアル値 2958466 は null (範囲外)', () => {
    expect(parseDate(2958466)).toBeNull()
  })

  it('不正な日付: 2026-02-30 は null', () => {
    expect(parseDate('2026-02-30')).toBeNull()
  })

  it('不正な日付: 2026-13-01 は null (月が範囲外)', () => {
    expect(parseDate('2026-13-01')).toBeNull()
  })

  it('日本語曜日付き: 2026年2月15日(土)', () => {
    const date = parseDate('2026年2月15日(土)')
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2026)
    expect(date!.getDate()).toBe(15)
  })
})

// ── parseDateComponents ─────────────────────────────────────────

describe('parseDateComponents', () => {
  it('有効な日付から年月日コンポーネントを返す', () => {
    const result = parseDateComponents('2026-02-15')
    expect(result).toEqual({ year: 2026, month: 2, day: 15 })
  })

  it('無効な値は null', () => {
    expect(parseDateComponents('not-a-date')).toBeNull()
  })

  it('null は null', () => {
    expect(parseDateComponents(null)).toBeNull()
  })

  it('contextYear を MM/DD 形式に適用する', () => {
    const result = parseDateComponents('3/25', 2025)
    expect(result).toEqual({ year: 2025, month: 3, day: 25 })
  })

  it('Excelシリアル値のコンポーネントを返す', () => {
    // 45337 = 2024-02-15
    const result = parseDateComponents(45337)
    expect(result).not.toBeNull()
    expect(result!.year).toBe(2024)
    expect(result!.month).toBe(2)
    expect(result!.day).toBe(15)
  })
})

// ── monthKey ─────────────────────────────────────────────────────

describe('monthKey', () => {
  it('年月キーを "YYYY-M" 形式で返す', () => {
    expect(monthKey(2026, 2)).toBe('2026-2')
  })

  it('1月は "YYYY-1" 形式', () => {
    expect(monthKey(2025, 1)).toBe('2025-1')
  })

  it('12月は "YYYY-12" 形式', () => {
    expect(monthKey(2024, 12)).toBe('2024-12')
  })
})

// ── cleanDateValue ────────────────────────────────────────────────

describe('cleanDateValue', () => {
  it('ISO 形式をそのまま返す', () => {
    expect(cleanDateValue('2026-02-15')).toBe('2026-02-15')
  })

  it('スラッシュ形式を ISO に正規化する', () => {
    expect(cleanDateValue('2026/2/5')).toBe('2026-02-05')
  })

  it('日本語形式を ISO に正規化する', () => {
    expect(cleanDateValue('2026年2月15日')).toBe('2026-02-15')
  })

  it('和暦形式を ISO に正規化する', () => {
    expect(cleanDateValue('令和8年2月15日')).toBe('2026-02-15')
  })

  it('Excel シリアル値を ISO に正規化する', () => {
    // 45337 = 2024-02-15
    const result = cleanDateValue(45337)
    expect(result).toMatch(/^2024-02-15$/)
  })

  it('パース不能な値は文字列として返す', () => {
    expect(cleanDateValue('invalid-date')).toBe('invalid-date')
  })

  it('null は空文字を返す', () => {
    expect(cleanDateValue(null)).toBe('')
  })

  it('undefined は空文字を返す', () => {
    expect(cleanDateValue(undefined)).toBe('')
  })

  it('月日が1桁のときゼロパディングする', () => {
    expect(cleanDateValue('2026-1-5')).toBe('2026-01-05')
  })
})

// ── detectYearMonth ───────────────────────────────────────────────

describe('detectYearMonth', () => {
  it('デフォルトは 2 行目からスキャンし年月を返す', () => {
    const rows = [['ヘッダー1'], ['ヘッダー2'], ['2026-02-15', 'データ']]
    const result = detectYearMonth(rows)
    expect(result).toEqual({ year: 2026, month: 2 })
  })

  it('全行に有効な日付がない場合は null', () => {
    const rows = [['ヘッダー'], [''], ['テキスト', 'データ']]
    expect(detectYearMonth(rows)).toBeNull()
  })

  it('空の rows は null', () => {
    expect(detectYearMonth([])).toBeNull()
  })

  it('dataStartRow が rows.length 以上のとき null', () => {
    const rows = [['2026-02-15']]
    // dataStartRow=2 だと rows.length=1 でスキャンしない
    expect(detectYearMonth(rows, 0, 2)).toBeNull()
  })

  it('dateColIndex を指定して別の列から日付を取得する', () => {
    const rows = [
      ['ヘッダー1', 'ヘッダー2'],
      ['ヘッダー1', 'ヘッダー2'],
      ['無効', '2026-03-01'],
    ]
    const result = detectYearMonth(rows, 1, 2)
    expect(result).toEqual({ year: 2026, month: 3 })
  })

  it('行に列が足りない場合はスキップして次の行を検索する', () => {
    const rows = [
      ['ヘッダー1', 'ヘッダー2'],
      ['ヘッダー1', 'ヘッダー2'],
      [], // 列なし
      ['2026-04-10'],
    ]
    const result = detectYearMonth(rows, 0, 2)
    expect(result).toEqual({ year: 2026, month: 4 })
  })

  it('dataStartRow=0 で先頭行から検索する', () => {
    const rows = [['2025-12-25', 'データ']]
    const result = detectYearMonth(rows, 0, 0)
    expect(result).toEqual({ year: 2025, month: 12 })
  })

  it('スラッシュ形式の日付も検出できる', () => {
    const rows = [['ヘッダー'], ['ヘッダー2'], ['2026/3/15', 'データ']]
    const result = detectYearMonth(rows)
    expect(result).toEqual({ year: 2026, month: 3 })
  })

  it('日本語形式の日付も検出できる', () => {
    const rows = [['ヘッダー'], ['ヘッダー2'], ['2026年1月10日', 'データ']]
    const result = detectYearMonth(rows)
    expect(result).toEqual({ year: 2026, month: 1 })
  })
})
