/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { processCostInclusions, mergeCostInclusionData } from './CostInclusionProcessor'

describe('processCostInclusions', () => {
  it('基本的な消耗品データ処理', () => {
    const rows = [
      ['勘定コード', '品目コード', '品目名', '数量', '原価', '日付'],
      ['81257', 'A001', '洗剤', 10, 5000, '2026-02-01'],
      ['81257', 'A002', 'ゴミ袋', 20, 3000, '2026-02-01'],
      ['99999', 'B001', '対象外', 5, 1000, '2026-02-01'], // フィルタ外
    ]

    const result = processCostInclusions(rows, '01_消耗品.xlsx')
    const rec = result['2026-2']?.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(rec?.cost).toBe(8000) // 5000 + 3000
    expect(rec?.items).toHaveLength(2)
    expect(rec?.items[0].itemName).toBe('洗剤')
  })

  it('勘定コード81257以外はスキップ', () => {
    const rows = [['header'], ['12345', 'A001', 'X', 1, 1000, '2026-02-01']]
    const result = processCostInclusions(rows, '01_test.xlsx')
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('ファイル名から店舗コード抽出', () => {
    const rows = [['header'], ['81257', 'A', 'B', 1, 100, '2026-02-01']]
    const result1 = processCostInclusions(rows, '01_file.xlsx')
    expect(result1['2026-2']?.records.find((r) => r.storeId === '1')).toBeDefined()

    const result2 = processCostInclusions(rows, '12_file.csv')
    expect(result2['2026-2']?.records.find((r) => r.storeId === '12')).toBeDefined()
  })

  it('ファイル名に数字がない場合は空', () => {
    const result = processCostInclusions(
      [['h'], ['81257', 'A', 'B', 1, 100, '2026-02-01']],
      'no_digits.xlsx',
    )
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('行数不足の場合は空', () => {
    expect(processCostInclusions([['header']], '01_test.xlsx')).toEqual({})
  })
})

describe('mergeCostInclusionData', () => {
  it('追加モードでマージ', () => {
    const existing = {
      records: [
        {
          year: 2026,
          month: 2,
          day: 1,
          storeId: '1',
          cost: 5000,
          items: [{ accountCode: '81257', itemCode: 'A', itemName: 'X', quantity: 1, cost: 5000 }],
        },
      ],
    }
    const incoming = {
      records: [
        {
          year: 2026,
          month: 2,
          day: 1,
          storeId: '1',
          cost: 3000,
          items: [{ accountCode: '81257', itemCode: 'B', itemName: 'Y', quantity: 2, cost: 3000 }],
        },
      ],
    }

    const merged = mergeCostInclusionData(existing, incoming)
    const rec = merged.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(rec?.cost).toBe(8000)
    expect(rec?.items).toHaveLength(2)
  })

  it('新しい店舗のデータを追加', () => {
    const existing = {
      records: [{ year: 2026, month: 2, day: 1, storeId: '1', cost: 100, items: [] }],
    }
    const incoming = {
      records: [{ year: 2026, month: 2, day: 1, storeId: '2', cost: 200, items: [] }],
    }
    const merged = mergeCostInclusionData(existing, incoming)
    const rec1 = merged.records.find((r) => r.storeId === '1' && r.day === 1)
    const rec2 = merged.records.find((r) => r.storeId === '2' && r.day === 1)
    expect(rec1?.cost).toBe(100)
    expect(rec2?.cost).toBe(200)
  })

  it('同一品目コードの再取込で重複排除される（倍増しない）', () => {
    const items = [
      { accountCode: '81257', itemCode: 'A001', itemName: '洗剤', quantity: 10, cost: 5000 },
      { accountCode: '81257', itemCode: 'A002', itemName: 'ゴミ袋', quantity: 20, cost: 3000 },
    ]
    const data = {
      records: [{ year: 2026, month: 2, day: 1, storeId: '1', cost: 8000, items: [...items] }],
    }
    // 同一データを再マージ
    const merged = mergeCostInclusionData(data, data)
    const rec = merged.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(rec?.items).toHaveLength(2)
    expect(rec?.cost).toBe(8000) // 倍増しない
  })

  it('同一品目コードは incoming 側で上書きされる', () => {
    const existing = {
      records: [
        {
          year: 2026,
          month: 2,
          day: 1,
          storeId: '1',
          cost: 5000,
          items: [
            { accountCode: '81257', itemCode: 'A001', itemName: '洗剤', quantity: 10, cost: 5000 },
          ],
        },
      ],
    }
    const incoming = {
      records: [
        {
          year: 2026,
          month: 2,
          day: 1,
          storeId: '1',
          cost: 6000,
          items: [
            {
              accountCode: '81257',
              itemCode: 'A001',
              itemName: '洗剤（大）',
              quantity: 12,
              cost: 6000,
            },
          ],
        },
      ],
    }
    const merged = mergeCostInclusionData(existing, incoming)
    const rec = merged.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(rec?.items).toHaveLength(1)
    expect(rec?.items[0].itemName).toBe('洗剤（大）')
    expect(rec?.cost).toBe(6000)
  })

  it('異なる品目コードは正常に追加される', () => {
    const existing = {
      records: [
        {
          year: 2026,
          month: 2,
          day: 1,
          storeId: '1',
          cost: 5000,
          items: [
            { accountCode: '81257', itemCode: 'A001', itemName: '洗剤', quantity: 10, cost: 5000 },
          ],
        },
      ],
    }
    const incoming = {
      records: [
        {
          year: 2026,
          month: 2,
          day: 1,
          storeId: '1',
          cost: 3000,
          items: [
            {
              accountCode: '81257',
              itemCode: 'B001',
              itemName: 'ゴミ袋',
              quantity: 20,
              cost: 3000,
            },
          ],
        },
      ],
    }
    const merged = mergeCostInclusionData(existing, incoming)
    const rec = merged.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(rec?.items).toHaveLength(2)
    expect(rec?.cost).toBe(8000)
  })
})
