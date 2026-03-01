import { describe, it, expect } from 'vitest'
import { processSettings } from './SettingsProcessor'

describe('processSettings', () => {
  it('旧フォーマット: 基本的な初期設定処理', () => {
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
    // 旧フォーマットでは商品在庫・消耗品はnull
    expect(store1?.productInventory).toBeNull()
    expect(store1?.consumableInventory).toBeNull()

    const store2 = result.get('2')
    expect(store2?.openingInventory).toBe(500000)
    expect(store2?.grossProfitBudget).toBeNull() // 0はnull
  })

  it('行数不足の場合は空', () => {
    expect(processSettings([['header']])).toEqual(new Map())
  })

  it('在庫0は有効値として保持、空欄はnull', () => {
    const rows = [
      ['header', '', '', ''],
      ['0001', 0, 0, 0],
      ['0002', '', null, 0],
    ]
    const result = processSettings(rows)
    const store1 = result.get('1')
    expect(store1?.openingInventory).toBe(0)
    expect(store1?.closingInventory).toBe(0)

    const store2 = result.get('2')
    expect(store2?.openingInventory).toBeNull()
    expect(store2?.closingInventory).toBeNull()
  })

  it('新フォーマット: 商品在庫・消耗品分離', () => {
    const rows = [
      ['2026/2/1', '機首在庫', '期末在庫（消耗品込）', '粗利額予算', '商品在庫', '消耗品'],
      [1, 747854, '', 1343000, 467930, 10187],
      [6, 1476221, '', 2857000, 1227823, 29425],
    ]

    const result = processSettings(rows)
    expect(result.size).toBe(2)

    const store1 = result.get('1')
    expect(store1?.openingInventory).toBe(747854)
    expect(store1?.productInventory).toBe(467930)
    expect(store1?.consumableInventory).toBe(10187)
    // 期末在庫（消耗品込）= 商品在庫 + 消耗品
    expect(store1?.closingInventory).toBe(467930 + 10187)
    expect(store1?.grossProfitBudget).toBe(1343000)
    expect(store1?.inventoryDate).toBe('2026/2/1')
    expect(store1?.closingInventoryDay).toBeNull()

    const store6 = result.get('6')
    expect(store6?.productInventory).toBe(1227823)
    expect(store6?.consumableInventory).toBe(29425)
    expect(store6?.closingInventory).toBe(1227823 + 29425)
  })

  it('新フォーマット: E列に数値があれば新フォーマットと判定', () => {
    const rows = [
      ['2026/2/1', '機首在庫', '期末在庫', '粗利額予算'],
      [1, 747854, '', 1343000, 467930, 10187],
    ]

    const result = processSettings(rows)
    const store1 = result.get('1')
    // E列に数値があるので新フォーマットと判定
    expect(store1?.productInventory).toBe(467930)
    expect(store1?.consumableInventory).toBe(10187)
    expect(store1?.closingInventory).toBe(467930 + 10187)
  })

  it('新フォーマット: 在庫基準日がExcel日付文字列の場合', () => {
    const rows = [
      ['2026/2/1', '機首在庫', '期末在庫（消耗品込）', '粗利額予算', '商品在庫', '消耗品'],
      [1, 100000, '', 200000, 80000, 5000],
    ]

    const result = processSettings(rows)
    const store1 = result.get('1')
    expect(store1?.inventoryDate).toBe('2026/2/1')
  })

  it('新フォーマット: 在庫基準日がDateオブジェクトの場合', () => {
    const rows = [
      [new Date(2026, 1, 1), '機首在庫', '期末在庫', '粗利額予算', '商品在庫', '消耗品'],
      [1, 100000, '', 200000, 80000, 5000],
    ]

    const result = processSettings(rows)
    const store1 = result.get('1')
    expect(store1?.inventoryDate).toBe('2026/2/1')
  })
})
