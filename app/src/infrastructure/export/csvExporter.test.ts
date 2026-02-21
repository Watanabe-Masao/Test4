import { describe, it, expect } from 'vitest'
import { toCsvString } from './csvExporter'

describe('csvExporter', () => {
  describe('toCsvString', () => {
    it('基本的な2次元配列を CSV 文字列に変換する', () => {
      const rows = [
        ['名前', '売上', '粗利'],
        ['店舗A', 1000, 250],
      ]
      const result = toCsvString(rows)
      expect(result).toBe('名前,売上,粗利\r\n店舗A,1000,250')
    })

    it('null/undefined はは空文字として出力する', () => {
      const rows = [['a', null, undefined, 'b']]
      const result = toCsvString(rows)
      expect(result).toBe('a,,,b')
    })

    it('カンマを含むセルをダブルクォートで囲む', () => {
      const rows = [['hello, world', 'normal']]
      const result = toCsvString(rows)
      expect(result).toBe('"hello, world",normal')
    })

    it('ダブルクォートを含むセルをエスケープする', () => {
      const rows = [['say "hello"', 'ok']]
      const result = toCsvString(rows)
      expect(result).toBe('"say ""hello""",ok')
    })

    it('改行を含むセルをダブルクォートで囲む', () => {
      const rows = [['line1\nline2', 'ok']]
      const result = toCsvString(rows)
      expect(result).toBe('"line1\nline2",ok')
    })

    it('カスタム区切り文字を使用する', () => {
      const rows = [['a', 'b', 'c']]
      const result = toCsvString(rows, '\t')
      expect(result).toBe('a\tb\tc')
    })

    it('空の配列は空文字を返す', () => {
      expect(toCsvString([])).toBe('')
    })
  })
})
