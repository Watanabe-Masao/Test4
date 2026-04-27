/**
 * useCtsQuantity.ts — aggregateCurrentCts pure function test
 *
 * 検証対象:
 * - 空 records → EMPTY_CTS
 * - effectiveDay フィルタ: day > effectiveDay を除外
 * - day <= 0 を除外
 * - selectedStoreIds フィルタ (isAllStores=false 時)
 * - isAllStores=true → 全店舗
 * - total / byStore / byDay / byStoreDay の集約
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { aggregateCurrentCts } from '../useCtsQuantity'
import type { CategoryTimeSalesRecord } from '@/domain/models/DataTypes'

function makeRec(storeId: string, day: number, totalQuantity: number): CategoryTimeSalesRecord {
  return { storeId, day, totalQuantity } as unknown as CategoryTimeSalesRecord
}

describe('aggregateCurrentCts', () => {
  it('空 records → EMPTY_CTS (全て 0 / 空 Map)', () => {
    const result = aggregateCurrentCts([], 30, new Set(), true)
    expect(result.total).toBe(0)
    expect(result.byStore.size).toBe(0)
    expect(result.byDay.size).toBe(0)
    expect(result.byStoreDay.size).toBe(0)
  })

  it('total = Σ totalQuantity (isAllStores=true)', () => {
    const records = [makeRec('s1', 1, 100), makeRec('s1', 2, 200), makeRec('s2', 1, 50)]
    const result = aggregateCurrentCts(records, 30, new Set(), true)
    expect(result.total).toBe(350)
  })

  it('byStore 集約 (storeId 別)', () => {
    const records = [makeRec('s1', 1, 100), makeRec('s1', 2, 200), makeRec('s2', 1, 50)]
    const result = aggregateCurrentCts(records, 30, new Set(), true)
    expect(result.byStore.get('s1')).toBe(300)
    expect(result.byStore.get('s2')).toBe(50)
  })

  it('byDay 集約 (day 別)', () => {
    const records = [makeRec('s1', 1, 100), makeRec('s2', 1, 50), makeRec('s1', 2, 200)]
    const result = aggregateCurrentCts(records, 30, new Set(), true)
    expect(result.byDay.get(1)).toBe(150)
    expect(result.byDay.get(2)).toBe(200)
  })

  it('byStoreDay 集約 (storeId:day 別)', () => {
    const records = [
      makeRec('s1', 1, 100),
      makeRec('s1', 1, 50), // 同 storeId + day → 加算
      makeRec('s2', 1, 30),
    ]
    const result = aggregateCurrentCts(records, 30, new Set(), true)
    expect(result.byStoreDay.get('s1:1')).toBe(150)
    expect(result.byStoreDay.get('s2:1')).toBe(30)
  })

  it('effectiveDay より大きい day は除外', () => {
    const records = [
      makeRec('s1', 1, 100),
      makeRec('s1', 15, 200),
      makeRec('s1', 16, 9999), // 除外
    ]
    const result = aggregateCurrentCts(records, 15, new Set(), true)
    expect(result.total).toBe(300)
    expect(result.byDay.has(16)).toBe(false)
  })

  it('day <= 0 は除外', () => {
    const records = [makeRec('s1', 0, 999), makeRec('s1', -1, 888), makeRec('s1', 1, 100)]
    const result = aggregateCurrentCts(records, 30, new Set(), true)
    expect(result.total).toBe(100)
  })

  it('isAllStores=false + selectedStoreIds でフィルタ', () => {
    const records = [makeRec('s1', 1, 100), makeRec('s2', 1, 200), makeRec('s3', 1, 300)]
    const result = aggregateCurrentCts(records, 30, new Set(['s1', 's3']), false)
    expect(result.total).toBe(400)
    expect(result.byStore.has('s2')).toBe(false)
  })

  it('isAllStores=true なら selectedStoreIds を無視する', () => {
    const records = [makeRec('s1', 1, 100), makeRec('s2', 1, 200)]
    // selectedStoreIds が空でも isAllStores=true で全店対象
    const result = aggregateCurrentCts(records, 30, new Set(), true)
    expect(result.total).toBe(300)
  })
})
