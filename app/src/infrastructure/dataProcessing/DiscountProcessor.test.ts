import { describe, it, expect } from 'vitest'
import { processDiscount } from './DiscountProcessor'

describe('processDiscount', () => {
  it('基本的な売変データ処理', () => {
    const rows = [
      ['', '', '', '0001:店舗A', ''],          // 行0
      ['', '', '', 'ヘッダー', ''],             // 行1
      ['2026-02-01', '', '', 500000, -10000],  // 行2+: データ
      ['2026-02-02', '', '', 600000, -15000],
    ]

    const result = processDiscount(rows)
    expect(result['1']?.[1]?.sales).toBe(500000)
    expect(result['1']?.[1]?.discount).toBe(10000) // 絶対値
    expect(result['1']?.[2]?.discount).toBe(15000)
  })

  it('売変額が正の値でも絶対値で格納', () => {
    const rows = [
      ['', '', '', '0001:A', ''],
      [''],
      ['2026-02-01', '', '', 100000, 5000],
    ]
    const result = processDiscount(rows)
    expect(result['1']?.[1]?.discount).toBe(5000)
  })

  it('売上0の行はスキップ', () => {
    const rows = [
      ['', '', '', '0001:A', ''],
      [''],
      ['2026-02-01', '', '', 0, -5000],
    ]
    const result = processDiscount(rows)
    expect(result['1']?.[1]).toBeUndefined()
  })

  it('行数不足の場合は空', () => {
    expect(processDiscount([['a'], ['b']])).toEqual({})
  })

  it('複数店舗の売変', () => {
    const rows = [
      ['', '', '', '0001:A', '', '0002:B', ''],
      [''],
      ['2026-02-01', '', '', 100000, -2000, 200000, -5000],
    ]
    const result = processDiscount(rows)
    expect(result['1']?.[1]?.discount).toBe(2000)
    expect(result['2']?.[1]?.discount).toBe(5000)
  })
})
