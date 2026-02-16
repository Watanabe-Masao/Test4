import { describe, it, expect } from 'vitest'
import { processConsumables, mergeConsumableData } from './ConsumableProcessor'

describe('processConsumables', () => {
  it('基本的な消耗品データ処理', () => {
    const rows = [
      ['勘定コード', '品目コード', '品目名', '数量', '原価', '日付'],
      ['81257', 'A001', '洗剤', 10, 5000, '2026-02-01'],
      ['81257', 'A002', 'ゴミ袋', 20, 3000, '2026-02-01'],
      ['99999', 'B001', '対象外', 5, 1000, '2026-02-01'], // フィルタ外
    ]

    const result = processConsumables(rows, '01_消耗品.xlsx')
    const dayData = result['1']?.[1]
    expect(dayData?.cost).toBe(8000) // 5000 + 3000
    expect(dayData?.items).toHaveLength(2)
    expect(dayData?.items[0].itemName).toBe('洗剤')
  })

  it('勘定コード81257以外はスキップ', () => {
    const rows = [
      ['header'],
      ['12345', 'A001', 'X', 1, 1000, '2026-02-01'],
    ]
    const result = processConsumables(rows, '01_test.xlsx')
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('ファイル名から店舗コード抽出', () => {
    const rows = [
      ['header'],
      ['81257', 'A', 'B', 1, 100, '2026-02-01'],
    ]
    const result1 = processConsumables(rows, '01_file.xlsx')
    expect(result1['1']).toBeDefined()

    const result2 = processConsumables(rows, '12_file.csv')
    expect(result2['12']).toBeDefined()
  })

  it('ファイル名に数字がない場合は空', () => {
    const result = processConsumables(
      [['h'], ['81257', 'A', 'B', 1, 100, '2026-02-01']],
      'no_digits.xlsx',
    )
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('行数不足の場合は空', () => {
    expect(processConsumables([['header']], '01_test.xlsx')).toEqual({})
  })
})

describe('mergeConsumableData', () => {
  it('追加モードでマージ', () => {
    const existing = {
      '1': { 1: { cost: 5000, items: [{ accountCode: '81257', itemCode: 'A', itemName: 'X', quantity: 1, cost: 5000 }] } },
    }
    const incoming = {
      '1': { 1: { cost: 3000, items: [{ accountCode: '81257', itemCode: 'B', itemName: 'Y', quantity: 2, cost: 3000 }] } },
    }

    const merged = mergeConsumableData(existing, incoming)
    expect(merged['1']?.[1]?.cost).toBe(8000)
    expect(merged['1']?.[1]?.items).toHaveLength(2)
  })

  it('新しい店舗のデータを追加', () => {
    const existing = {
      '1': { 1: { cost: 100, items: [] } },
    }
    const incoming = {
      '2': { 1: { cost: 200, items: [] } },
    }
    const merged = mergeConsumableData(existing, incoming)
    expect(merged['1']?.[1]?.cost).toBe(100)
    expect(merged['2']?.[1]?.cost).toBe(200)
  })
})
