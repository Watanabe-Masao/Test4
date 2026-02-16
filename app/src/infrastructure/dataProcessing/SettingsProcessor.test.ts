import { describe, it, expect } from 'vitest'
import { processSettings } from './SettingsProcessor'

describe('processSettings', () => {
  it('基本的な初期設定処理', () => {
    const rows = [
      ['店舗コード', '期首在庫', '期末在庫', '粗利予算'],
      ['0001', 1000000, 800000, 200000],
      ['0002', 500000, 400000, 0],
    ]

    const result = processSettings(rows)
    expect(result.size).toBe(2)

    const store1 = result.get('1')
    expect(store1?.openingInventory).toBe(1000000)
    expect(store1?.closingInventory).toBe(800000)
    expect(store1?.grossProfitBudget).toBe(200000)

    const store2 = result.get('2')
    expect(store2?.openingInventory).toBe(500000)
    expect(store2?.grossProfitBudget).toBeNull() // 0はnull
  })

  it('行数不足の場合は空', () => {
    expect(processSettings([['header']])).toEqual(new Map())
  })

  it('在庫0はnull', () => {
    const rows = [
      ['header', '', '', ''],
      ['0001', 0, 0, 0],
    ]
    const result = processSettings(rows)
    const store = result.get('1')
    expect(store?.openingInventory).toBeNull()
    expect(store?.closingInventory).toBeNull()
  })
})
