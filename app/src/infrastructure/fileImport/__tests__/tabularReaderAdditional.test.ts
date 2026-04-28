/**
 * tabularReader — 追加テスト
 *
 * 既存テスト (tabularReader.test.ts) でカバーされていない関数を対象とする:
 * - parseCsvBuffer (ArrayBuffer → 2次元配列)
 * - parseXlsxBuffer (ArrayBuffer → 2次元配列)
 * - readTabularFile (File → 2次元配列)
 * - parseCsvString の未カバーブランチ (lines 116-123: クォートフィールド末尾 EOF)
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { parseCsvBuffer, parseXlsxBuffer, parseCsvString } from '../tabularReader'

// ── ヘルパー: 文字列 → ArrayBuffer ──────────────────────────────

function strToBuffer(s: string, encoding = 'utf-8'): ArrayBuffer {
  if (encoding === 'utf-8') {
    return new TextEncoder().encode(s).buffer as ArrayBuffer
  }
  // Shift_JIS をシミュレートするため、ここでは純 ASCII のみ許可
  return new TextEncoder().encode(s).buffer as ArrayBuffer
}

/** UTF-8 BOM 付きバッファを生成する */
function bomBuffer(csv: string): ArrayBuffer {
  const bom = new Uint8Array([0xef, 0xbb, 0xbf])
  const body = new TextEncoder().encode(csv)
  const buf = new Uint8Array(bom.length + body.length)
  buf.set(bom)
  buf.set(body, bom.length)
  return buf.buffer as ArrayBuffer
}

// ── parseCsvBuffer ────────────────────────────────────────────────

describe('parseCsvBuffer', () => {
  it('UTF-8 BOM 付き CSV を正しくパースする', () => {
    const buf = bomBuffer('名前,金額\n店舗A,1000')
    const rows = parseCsvBuffer(buf)
    expect(rows[0]).toContain('名前')
    expect(rows[0]).toContain('金額')
    expect(rows[1]).toContain('店舗A')
  })

  it('UTF-8 BOM なし CSV を正しくパースする', () => {
    const buf = strToBuffer('a,b,c\n1,2,3')
    const rows = parseCsvBuffer(buf)
    expect(rows[0]).toContain('a')
    expect(rows[0]).toContain('b')
    expect(rows.length).toBeGreaterThanOrEqual(2)
  })

  it('空の CSV バッファは空に近い結果を返す', () => {
    const buf = strToBuffer('')
    const rows = parseCsvBuffer(buf)
    // XLSX ライブラリで空文字をパースすると最低1行返ることがある
    expect(Array.isArray(rows)).toBe(true)
  })

  it('単一行の CSV をパースする', () => {
    const buf = strToBuffer('header1,header2,header3')
    const rows = parseCsvBuffer(buf)
    expect(rows[0]).toEqual(['header1', 'header2', 'header3'])
  })

  it('カンマを含むクォートフィールドを処理する', () => {
    const buf = strToBuffer('"hello, world",normal')
    const rows = parseCsvBuffer(buf)
    expect(rows[0][0]).toBe('hello, world')
    expect(rows[0][1]).toBe('normal')
  })
})

// ── parseXlsxBuffer ───────────────────────────────────────────────

describe('parseXlsxBuffer', () => {
  it('有効な XLSX バイト列を2次元配列に変換する', async () => {
    // XLSX ファイルを動的に生成するために xlsx ライブラリを使用する
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([
      ['名前', '金額'],
      ['店舗A', 1000],
      ['店舗B', 2000],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer

    const rows = parseXlsxBuffer(buffer)
    expect(rows[0]).toContain('名前')
    expect(rows[1][0]).toBe('店舗A')
    expect(rows[1][1]).toBe(1000)
    expect(rows[2][0]).toBe('店舗B')
  })

  it('シートが空の場合は空配列に近い結果を返す', async () => {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer

    const rows = parseXlsxBuffer(buffer)
    expect(Array.isArray(rows)).toBe(true)
  })
})

// ── readTabularFile ───────────────────────────────────────────────

describe('readTabularFile', () => {
  it('拡張子 .csv の File を parseCsvBuffer で読み込む', async () => {
    // File を CSV 内容で作成する
    const { readTabularFile } = await import('../tabularReader')
    const csvContent = 'col1,col2\nval1,val2'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    const rows = await readTabularFile(file)
    expect(rows.length).toBeGreaterThanOrEqual(2)
    expect(rows[0]).toContain('col1')
  })

  it('拡張子 .CSV（大文字）の File も CSV として読み込む', async () => {
    const { readTabularFile } = await import('../tabularReader')
    const csvContent = 'a,b\n1,2'
    const file = new File([csvContent], 'TEST.CSV', { type: 'text/csv' })
    const rows = await readTabularFile(file)
    expect(rows.length).toBeGreaterThanOrEqual(1)
  })

  it('拡張子 .xlsx の File を parseXlsxBuffer で読み込む', async () => {
    const { readTabularFile } = await import('../tabularReader')
    const XLSX = await import('xlsx')

    const ws = XLSX.utils.aoa_to_sheet([
      ['h1', 'h2'],
      [10, 20],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const xlsxData = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const file = new File([xlsxData], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const rows = await readTabularFile(file)
    expect(rows[0]).toContain('h1')
    expect(rows[1][0]).toBe(10)
  })
})

// ── parseCsvString — 未カバーブランチ (lines 116-123) ────────────────

describe('parseCsvString (additional branch coverage)', () => {
  it('クォートフィールドの後に改行が続く場合（ブランチ 116-119）', () => {
    // "field1"\nfield2 のパターン: クォート閉じ → 改行 → 次の行
    const result = parseCsvString('"quoted"\nnext_row')
    expect(result[0]).toEqual(['quoted'])
    expect(result[1]).toEqual(['next_row'])
  })

  it('クォートフィールドのみが最終行（ブランチ 121-123）', () => {
    // 最後のフィールドがクォートで囲まれ EOF になるパターン
    const result = parseCsvString('a,"b"')
    // 最初の行: ['a', 'b']
    expect(result[0][0]).toBe('a')
    expect(result[0][1]).toBe('b')
  })

  it('クォートフィールドの後に何もない EOF パターン', () => {
    const result = parseCsvString('"only"')
    expect(result[0][0]).toBe('only')
  })

  it('複数行でクォートフィールドが中間行に来るパターン', () => {
    // 修正後: 末尾空行 [''] を含まないため length も検証
    const result = parseCsvString('a,b\n"c,d",e\nf,g')
    expect(result).toEqual([
      ['a', 'b'],
      ['c,d', 'e'],
      ['f', 'g'],
    ])
  })
})
