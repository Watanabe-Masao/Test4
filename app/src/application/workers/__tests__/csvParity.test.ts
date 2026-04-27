/**
 * CSV 生成テスト
 *
 * domain/utilities/csv.ts の toCsvString() が正しく動作することを保証する。
 *
 * 以前は reportExportWorker.ts と csvExporter.ts に同一ロジックが重複しており
 * パリティテストで同期を検証していた。現在は domain/utilities/csv.ts に一元化済み。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { toCsvString } from '@/domain/utilities/csv'

describe('toCsvString', () => {
  const testCases: {
    name: string
    rows: (string | number | null | undefined)[][]
    delimiter?: string
  }[] = [
    {
      name: '基本的な文字列と数値',
      rows: [
        ['名前', '金額', '数量'],
        ['商品A', 1000, 5],
        ['商品B', 2500, 10],
      ],
    },
    {
      name: 'null / undefined セル',
      rows: [
        ['a', null, 'b'],
        [undefined, 1, undefined],
      ],
    },
    {
      name: 'カンマを含むセル',
      rows: [['hello, world', 'normal', '1,000']],
    },
    {
      name: '改行を含むセル',
      rows: [['line1\nline2', 'ok']],
    },
    {
      name: 'ダブルクォートを含むセル',
      rows: [['say "hello"', 'ok']],
    },
    {
      name: '空の行列',
      rows: [],
    },
    {
      name: '空セルのみの行',
      rows: [['', '', '']],
    },
    {
      name: 'タブ区切り',
      rows: [
        ['A', 'B'],
        ['C', 'D'],
      ],
      delimiter: '\t',
    },
  ]

  for (const tc of testCases) {
    it(tc.name, () => {
      const delimiter = tc.delimiter ?? ','
      const result = toCsvString(tc.rows, delimiter)
      expect(typeof result).toBe('string')
    })
  }

  it('カンマ含有セルをクォートで囲む', () => {
    expect(toCsvString([['a,b']])).toBe('"a,b"')
  })

  it('ダブルクォートをエスケープする', () => {
    expect(toCsvString([['say "hi"']])).toBe('"say ""hi"""')
  })

  it('行を CRLF で結合する', () => {
    const result = toCsvString([['a'], ['b']])
    expect(result).toBe('a\r\nb')
  })

  it('null/undefined を空文字に変換する', () => {
    const result = toCsvString([[null, undefined, 'ok']])
    expect(result).toBe(',,ok')
  })
})
