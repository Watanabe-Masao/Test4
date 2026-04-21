/**
 * useSimulatorScenario テスト
 *
 * StoreResult / PrevYearData の最小 fixture から SimulatorScenario を
 * 組み立てられることを検証する。getPrevYearDailySales 経由の lyDaily 構築が
 * 既存 useBudgetChartData と整合する (同じデータソース経路)。
 */
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSimulatorScenario } from '../useSimulatorScenario'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { PrevYearData } from '@/application/comparison/comparisonTypes'
import { SimulatorScenarioSchema } from '@/domain/calculations/budgetSimulator'

// ── fixtures ──

const mkStoreResult = (
  budget: number,
  budgetDaily: ReadonlyMap<number, number>,
  daily: ReadonlyMap<number, { sales: number }>,
): StoreResult =>
  ({
    budget,
    budgetDaily,
    daily,
  }) as unknown as StoreResult

const mkPrevYearData = (
  hasPrevYear: boolean,
  dailyEntries: ReadonlyArray<readonly [string, { sales: number }]> = [],
): PrevYearData =>
  ({
    hasPrevYear,
    source: hasPrevYear ? 'loaded' : 'no-data',
    daily: new Map(dailyEntries as ReadonlyArray<readonly [string, unknown]>),
    totalSales: 0,
    totalDiscount: 0,
    totalCustomers: 0,
  }) as unknown as PrevYearData

// 2026-04-DD キー形式 (MM, DD はゼロ埋め)
const keyFor = (year: number, month: number, day: number): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

describe('useSimulatorScenario', () => {
  it('正常な StoreResult + prevYear あり → SimulatorScenario を構築する', () => {
    const budgetDaily = new Map<number, number>()
    const daily = new Map<number, { sales: number }>()
    const prevDaily: Array<[string, { sales: number }]> = []
    for (let d = 1; d <= 30; d++) {
      budgetDaily.set(d, 100)
      daily.set(d, { sales: d <= 15 ? 95 : 0 })
      // PrevYearData.daily は当期の年月日でキー化 (alignment 済み)
      prevDaily.push([keyFor(2026, 4, d), { sales: 80 }])
    }

    const result = mkStoreResult(3000, budgetDaily, daily)
    const prevYear = mkPrevYearData(true, prevDaily)

    const { result: h } = renderHook(() =>
      useSimulatorScenario({ result, prevYear, year: 2026, month: 4 }),
    )

    expect(h.current.year).toBe(2026)
    expect(h.current.month).toBe(4)
    expect(h.current.daysInMonth).toBe(30)
    expect(h.current.monthlyBudget).toBe(3000)
    expect(h.current.lyMonthly).toBeCloseTo(80 * 30, 5)
    expect(h.current.dailyBudget).toHaveLength(30)
    expect(h.current.lyDaily).toHaveLength(30)
    expect(h.current.actualDaily).toHaveLength(30)
    expect(h.current.dailyBudget[0]).toBe(100) // day 1
    expect(h.current.actualDaily[0]).toBe(95)
    expect(h.current.actualDaily[15]).toBe(0) // day 16 は未経過
    expect(h.current.lyDaily[0]).toBe(80)
  })

  it('prevYear なし → lyDaily は 0 配列、lyMonthly = 0', () => {
    const budgetDaily = new Map<number, number>([[1, 100]])
    const daily = new Map<number, { sales: number }>([[1, { sales: 90 }]])
    const result = mkStoreResult(3000, budgetDaily, daily)
    const prevYear = mkPrevYearData(false)

    const { result: h } = renderHook(() =>
      useSimulatorScenario({ result, prevYear, year: 2026, month: 4 }),
    )

    expect(h.current.lyMonthly).toBe(0)
    expect(h.current.lyDaily.every((v) => v === 0)).toBe(true)
  })

  it('daysInMonth が year/month から正しく導出される (2026-02 = 28日)', () => {
    const result = mkStoreResult(3000, new Map(), new Map())
    const prevYear = mkPrevYearData(false)
    const { result: h } = renderHook(() =>
      useSimulatorScenario({ result, prevYear, year: 2026, month: 2 }),
    )
    expect(h.current.daysInMonth).toBe(28)
    expect(h.current.dailyBudget).toHaveLength(28)
  })

  it('daysInMonth が閏年で 29 日 (2024-02)', () => {
    const result = mkStoreResult(3000, new Map(), new Map())
    const prevYear = mkPrevYearData(false)
    const { result: h } = renderHook(() =>
      useSimulatorScenario({ result, prevYear, year: 2024, month: 2 }),
    )
    expect(h.current.daysInMonth).toBe(29)
  })

  it('欠損 day は 0 埋め (Map に存在しない day)', () => {
    const budgetDaily = new Map<number, number>([
      [1, 100],
      [15, 150],
    ])
    const daily = new Map<number, { sales: number }>()
    const result = mkStoreResult(3000, budgetDaily, daily)
    const prevYear = mkPrevYearData(false)
    const { result: h } = renderHook(() =>
      useSimulatorScenario({ result, prevYear, year: 2026, month: 4 }),
    )
    expect(h.current.dailyBudget[0]).toBe(100)
    expect(h.current.dailyBudget[14]).toBe(150)
    expect(h.current.dailyBudget[5]).toBe(0) // day 6 は欠損 → 0
    expect(h.current.actualDaily.every((v) => v === 0)).toBe(true)
  })

  it('構築された scenario は SimulatorScenarioSchema を通過する', () => {
    const budgetDaily = new Map<number, number>()
    for (let d = 1; d <= 30; d++) budgetDaily.set(d, 100)
    const result = mkStoreResult(3000, budgetDaily, new Map())
    const prevYear = mkPrevYearData(false)
    const { result: h } = renderHook(() =>
      useSimulatorScenario({ result, prevYear, year: 2026, month: 4 }),
    )
    expect(() => SimulatorScenarioSchema.parse(h.current)).not.toThrow()
  })
})
