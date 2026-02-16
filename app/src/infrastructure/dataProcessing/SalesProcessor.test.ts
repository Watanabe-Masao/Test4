import { describe, it, expect } from 'vitest'
import { processSales, extractStoresFromSales } from './SalesProcessor'

describe('processSales', () => {
  it('基本的な売上データ処理', () => {
    const rows = [
      ['', '', '', '0001:店舗A', '', '0002:店舗B'],  // 行0
      ['', '', '', '', '', ''],                        // 行1
      ['', '', '', '', '', ''],                        // 行2
      ['2026-02-01', '', '', 500000, '', 300000],     // 行3+: データ
      ['2026-02-02', '', '', 600000, '', 400000],
    ]

    const result = processSales(rows)
    expect(result['1']?.[1]?.sales).toBe(500000)
    expect(result['2']?.[1]?.sales).toBe(300000)
    expect(result['1']?.[2]?.sales).toBe(600000)
  })

  it('行数不足の場合は空', () => {
    expect(processSales([['a'], ['b'], ['c']])).toEqual({})
  })

  it('日付パース不能な行はスキップ', () => {
    const rows = [
      ['', '', '', '0001:店舗A'],
      [''], [''],
      ['invalid', '', '', 100000],
    ]
    const result = processSales(rows)
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('売上0の日もデータとして残る', () => {
    const rows = [
      ['', '', '', '0001:A'],
      [''], [''],
      ['2026-02-01', '', '', 0],
    ]
    const result = processSales(rows)
    expect(result['1']?.[1]?.sales).toBe(0)
  })
})

describe('extractStoresFromSales', () => {
  it('行0から店舗を抽出', () => {
    const rows = [
      ['', '', '', '0001:東京店', '', '0002:大阪店'],
    ]
    const stores = extractStoresFromSales(rows)
    expect(stores.size).toBe(2)
    expect(stores.get('1')?.name).toBe('東京店')
  })
})
