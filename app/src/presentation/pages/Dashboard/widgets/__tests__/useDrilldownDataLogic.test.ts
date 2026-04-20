/**
 * useDrilldownDataLogic — pure helper テスト
 *
 * 検証対象:
 * - buildBreadcrumb: 階層フィルタに応じた breadcrumb 配列
 * - sortDrillItems: sortKey / sortDir / metric の組み合わせ
 *
 * `buildLevelColorMap` は aggregateForDrill + CategoryLeafDailyEntry 依存のため
 * ここでは対象外（drilldownUtils 側で aggregateForDrill のテストが担う）。
 */
import { describe, it, expect } from 'vitest'
import { buildBreadcrumb, sortDrillItems } from '../useDrilldownDataLogic'
import type { DrillItem, SortKey, SortDir } from '../drilldownUtils'

describe('buildBreadcrumb', () => {
  it('空フィルタでは 全カテゴリ のみ', () => {
    const items = buildBreadcrumb({})
    expect(items).toHaveLength(1)
    expect(items[0]?.label).toBe('全カテゴリ')
    expect(items[0]?.f).toEqual({})
  })

  it('departmentCode のみで 2 階層', () => {
    const items = buildBreadcrumb({ departmentCode: 'D01', departmentName: '惣菜' })
    expect(items).toHaveLength(2)
    expect(items[1]?.label).toBe('惣菜')
    expect(items[1]?.f).toEqual({ departmentCode: 'D01', departmentName: '惣菜' })
  })

  it('departmentName が空なら code を label に使う', () => {
    const items = buildBreadcrumb({ departmentCode: 'D01' })
    expect(items[1]?.label).toBe('D01')
  })

  it('lineCode を持つと 3 階層', () => {
    const items = buildBreadcrumb({
      departmentCode: 'D01',
      departmentName: '惣菜',
      lineCode: 'L01',
      lineName: 'お弁当',
    })
    expect(items).toHaveLength(3)
    expect(items[2]?.label).toBe('お弁当')
    expect(items[2]?.f).toMatchObject({ lineCode: 'L01' })
  })

  it('lineCode のみ（departmentCode 無し）の場合、department 階層は追加されない', () => {
    const items = buildBreadcrumb({ lineCode: 'L01', lineName: 'お弁当' })
    expect(items).toHaveLength(2)
    expect(items[1]?.label).toBe('お弁当')
  })
})

describe('sortDrillItems', () => {
  const primaryAmt = (it: DrillItem) => it.amount
  const primaryQty = (it: DrillItem) => it.quantity

  const mk = (
    name: string,
    amount: number,
    quantity: number,
    pct = 0,
    yoyRatio = 1,
  ): DrillItem => ({
    code: name,
    name,
    amount,
    quantity,
    pct,
    childCount: 0,
    color: '#000',
    yoyRatio,
  })

  const items: readonly DrillItem[] = [
    mk('B', 300, 30, 0.3, 1.5),
    mk('A', 100, 10, 0.1, 1.1),
    mk('C', 200, 20, 0.2, 0.9),
  ]

  it('sortKey=amount / metric=amount / desc で金額降順', () => {
    const result = sortDrillItems(items, 'amount', 'desc', 'amount', primaryAmt, primaryQty)
    expect(result.map((i) => i.name)).toEqual(['B', 'C', 'A'])
  })

  it('sortKey=amount / metric=quantity で quantity に切替', () => {
    const result = sortDrillItems(items, 'amount', 'desc', 'quantity', primaryAmt, primaryQty)
    expect(result.map((i) => i.name)).toEqual(['B', 'C', 'A']) // quantity も同順
  })

  it('sortKey=quantity / asc で quantity 昇順', () => {
    const result = sortDrillItems(items, 'quantity', 'asc', 'amount', primaryAmt, primaryQty)
    expect(result.map((i) => i.name)).toEqual(['A', 'C', 'B'])
  })

  it('sortKey=pct / desc で pct 降順', () => {
    const result = sortDrillItems(items, 'pct', 'desc', 'amount', primaryAmt, primaryQty)
    expect(result.map((i) => i.name)).toEqual(['B', 'C', 'A'])
  })

  it('sortKey=name は 日本語ロケールで比較', () => {
    const jp: readonly DrillItem[] = [
      mk('バナナ', 0, 0),
      mk('アップル', 0, 0),
      mk('チェリー', 0, 0),
    ]
    const result = sortDrillItems(jp, 'name', 'asc', 'amount', primaryAmt, primaryQty)
    expect(result[0]?.name).toBe('アップル')
    expect(result[1]?.name).toBe('チェリー')
    expect(result[2]?.name).toBe('バナナ')
  })

  it('sortKey=yoyRatio / desc で降順', () => {
    const result = sortDrillItems(items, 'yoyRatio', 'desc', 'amount', primaryAmt, primaryQty)
    expect(result.map((i) => i.name)).toEqual(['B', 'A', 'C'])
  })

  it('yoyRatio が未定義の項目は 0 扱い', () => {
    const withMissing: DrillItem[] = [
      { code: 'X', name: 'X', amount: 0, quantity: 0, pct: 0, childCount: 0, color: '#000' },
      mk('Y', 0, 0, 0, 1.5),
    ]
    const result = sortDrillItems(withMissing, 'yoyRatio', 'desc', 'amount', primaryAmt, primaryQty)
    expect(result[0]?.name).toBe('Y')
    expect(result[1]?.name).toBe('X')
  })

  it('元配列を変更しない（非破壊ソート）', () => {
    const original = [...items]
    const originalSnapshot = original.map((i) => i.name)
    sortDrillItems(original, 'amount', 'asc', 'amount', primaryAmt, primaryQty)
    expect(original.map((i) => i.name)).toEqual(originalSnapshot)
  })

  it.each<[SortKey, SortDir, string[]]>([
    ['amount', 'asc', ['A', 'C', 'B']],
    ['pct', 'asc', ['A', 'C', 'B']],
    ['quantity', 'desc', ['B', 'C', 'A']],
  ])('sortKey=%s dir=%s で期待順', (key, dir, expected) => {
    const result = sortDrillItems(items, key, dir, 'amount', primaryAmt, primaryQty)
    expect(result.map((i) => i.name)).toEqual(expected)
  })
})
