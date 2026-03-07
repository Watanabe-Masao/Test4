/**
 * CSV 生成パリティテスト
 *
 * reportExportWorker.ts 内の toCsvStringInWorker() と
 * csvExporter.ts の toCsvString() が同一の出力を生成することを保証する。
 *
 * Worker アーキテクチャの制約（application は infrastructure を import 不可）により、
 * CSV 生成ロジックが2箇所に存在する。このテストで同期を検証する。
 */
import { describe, it, expect } from 'vitest'
import { toCsvString } from '@/infrastructure/export/csvExporter'

/**
 * reportExportWorker.ts から toCsvStringInWorker のロジックを転記。
 * Worker ファイルは self.onmessage を持つため直接 import できない。
 */
function toCsvStringInWorker(
  rows: readonly (readonly (string | number | null | undefined)[])[],
  delimiter: string,
): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell == null) return ''
          const s = String(cell)
          if (s.includes(delimiter) || s.includes('\n') || s.includes('"')) {
            return `"${s.replace(/"/g, '""')}"`
          }
          return s
        })
        .join(delimiter),
    )
    .join('\r\n')
}

describe('CSV parity: toCsvString vs toCsvStringInWorker', () => {
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
      const expected = toCsvString(tc.rows, delimiter)
      const actual = toCsvStringInWorker(tc.rows, delimiter)
      expect(actual).toBe(expected)
    })
  }
})
