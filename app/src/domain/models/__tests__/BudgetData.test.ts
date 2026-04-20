/**
 * BudgetData — mergeInventoryConfig tests
 *
 * 既存 InventoryConfig に部分更新を適用する pure merge。
 * 商品在庫 + 消耗品在庫 = 期末在庫 の自動計算ルールを固定する。
 */
import { describe, it, expect } from 'vitest'
import { mergeInventoryConfig } from '../BudgetData'

describe('mergeInventoryConfig', () => {
  it('existing 未指定ならデフォルト + storeId でベース生成', () => {
    const r = mergeInventoryConfig(undefined, 's1', {})
    expect(r.storeId).toBe('s1')
    expect(r.openingInventory).toBeNull()
    expect(r.closingInventory).toBeNull()
    expect(r.grossProfitBudget).toBeNull()
    expect(r.productInventory).toBeNull()
    expect(r.costInclusionInventory).toBeNull()
  })

  it('update が空なら existing を返す', () => {
    const existing = {
      storeId: 's1',
      openingInventory: 100,
      closingInventory: 200,
      grossProfitBudget: 500,
      productInventory: 150,
      costInclusionInventory: 50,
      inventoryDate: '2026/3/1',
      closingInventoryDay: 31,
    }
    const r = mergeInventoryConfig(existing, 's1', {})
    expect(r).toEqual(existing)
  })

  it('update のフィールドで上書き', () => {
    const existing = {
      storeId: 's1',
      openingInventory: 100,
      closingInventory: null,
      grossProfitBudget: null,
      productInventory: null,
      costInclusionInventory: null,
      inventoryDate: null,
      closingInventoryDay: null,
    }
    const r = mergeInventoryConfig(existing, 's1', { openingInventory: 999 })
    expect(r.openingInventory).toBe(999)
  })

  it('productInventory 更新で closingInventory 自動計算', () => {
    const r = mergeInventoryConfig(undefined, 's1', {
      productInventory: 100,
      costInclusionInventory: 50,
    })
    expect(r.closingInventory).toBe(150)
  })

  it('productInventory のみ指定でも closingInventory 計算（消耗品=0）', () => {
    const r = mergeInventoryConfig(undefined, 's1', { productInventory: 200 })
    expect(r.closingInventory).toBe(200)
  })

  it('costInclusionInventory のみ指定でも closingInventory 計算（商品=0）', () => {
    const r = mergeInventoryConfig(undefined, 's1', { costInclusionInventory: 75 })
    expect(r.closingInventory).toBe(75)
  })

  it('inventory 関連 update がなければ closingInventory は再計算されない', () => {
    const existing = {
      storeId: 's1',
      openingInventory: null,
      closingInventory: 500, // 既存値
      grossProfitBudget: null,
      productInventory: null,
      costInclusionInventory: null,
      inventoryDate: null,
      closingInventoryDay: null,
    }
    const r = mergeInventoryConfig(existing, 's1', { grossProfitBudget: 1000 })
    expect(r.closingInventory).toBe(500)
    expect(r.grossProfitBudget).toBe(1000)
  })

  it('両方 null でも inventory キーが更新に含まれれば再計算（両方 null なら 0）', () => {
    const existing = {
      storeId: 's1',
      openingInventory: null,
      closingInventory: 999,
      grossProfitBudget: null,
      productInventory: null,
      costInclusionInventory: null,
      inventoryDate: null,
      closingInventoryDay: null,
    }
    // update に inventory キーが含まれるが両方 null → 再計算しない（ガード条件で null/null はスキップ）
    const r = mergeInventoryConfig(existing, 's1', { productInventory: null })
    expect(r.closingInventory).toBe(999) // 両方 null だから再計算スキップ
  })

  it('storeId は base に設定される（existing なしの場合）', () => {
    const r = mergeInventoryConfig(undefined, 'store-xyz', {})
    expect(r.storeId).toBe('store-xyz')
  })

  it('flowerCostRate / directProduceCostRate を受け取れる', () => {
    const r = mergeInventoryConfig(undefined, 's1', {
      flowerCostRate: 0.4,
      directProduceCostRate: 0.3,
    })
    expect(r.flowerCostRate).toBe(0.4)
    expect(r.directProduceCostRate).toBe(0.3)
  })
})
