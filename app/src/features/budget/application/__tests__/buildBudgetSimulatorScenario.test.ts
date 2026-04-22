/**
 * buildBudgetSimulatorScenario — pure builder のテスト
 *
 * Phase E: source → SimulatorScenario の変換仕様を固定する。
 */
import { describe, it, expect } from 'vitest'
import {
  buildBudgetSimulatorScenario,
  extractFullMonthLyDaily,
} from '../buildBudgetSimulatorScenario'
import type { BudgetSimulatorSource } from '../buildBudgetSimulatorSource'
import type {
  PrevYearData,
  PrevYearMonthlyKpi,
  DayMappingRow,
} from '@/application/comparison/comparisonTypes'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'

function makeEmptyPrevYear(): PrevYearData {
  return {
    hasPrevYear: false,
    source: 'no-data',
    daily: new Map(),
    totalSales: 0,
    totalDiscount: 0,
    totalCustomers: 0,
    totalCtsQuantity: 0,
    grossSales: 0,
    discountRate: 0,
    totalDiscountEntries: [],
  }
}

function makeStoreResult(year: number, month: number): StoreResult {
  const daysInMonth = new Date(year, month, 0).getDate()
  const budgetDaily = new Map<number, number>()
  const daily = new Map<number, { sales: number }>()
  for (let d = 1; d <= daysInMonth; d++) {
    budgetDaily.set(d, 100_000)
  }
  return {
    budget: 100_000 * daysInMonth,
    budgetDaily,
    daily,
    elapsedDays: 0,
  } as unknown as StoreResult
}

function makePrevYearKpi(
  dailyMapping: readonly DayMappingRow[],
  monthlyTotal: number,
): PrevYearMonthlyKpi {
  const makeEntry = () => ({
    sales: dailyMapping.reduce((s, r) => s + r.prevSales, 0),
    customers: 0,
    transactionValue: 0,
    ctsQuantity: 0,
    dailyMapping,
    storeContributions: [],
  })
  return {
    hasPrevYear: true,
    sameDow: makeEntry(),
    sameDate: makeEntry(),
    monthlyTotal: {
      sales: monthlyTotal,
      customers: 0,
      transactionValue: 0,
      ctsQuantity: 0,
    },
    sourceYear: 2025,
    sourceMonth: 4,
    dowOffset: 0,
  }
}

function makeScope(alignmentMode: 'sameDate' | 'sameDayOfWeek'): ComparisonScope {
  return { alignmentMode } as unknown as ComparisonScope
}

describe('extractFullMonthLyDaily', () => {
  it('prevYearMonthlyKpi 未取得なら null', () => {
    const result = extractFullMonthLyDaily({
      result: makeStoreResult(2026, 4),
      prevYear: makeEmptyPrevYear(),
      year: 2026,
      month: 4,
      prevYearMonthlyKpi: undefined,
      comparisonScope: null,
      freePeriodCompTotalSales: null,
    })
    expect(result.daily).toBeNull()
    expect(result.monthlyTotal).toBeNull()
  })

  it('dailyMapping の currentDay → prevSales が Map になる', () => {
    const mapping: readonly DayMappingRow[] = [
      {
        currentDay: 1,
        prevDay: 1,
        prevMonth: 4,
        prevYear: 2025,
        prevSales: 100,
        prevCustomers: 0,
        prevCtsQuantity: 0,
      },
      {
        currentDay: 2,
        prevDay: 2,
        prevMonth: 4,
        prevYear: 2025,
        prevSales: 200,
        prevCustomers: 0,
        prevCtsQuantity: 0,
      },
    ]
    const result = extractFullMonthLyDaily({
      result: makeStoreResult(2026, 4),
      prevYear: makeEmptyPrevYear(),
      year: 2026,
      month: 4,
      prevYearMonthlyKpi: makePrevYearKpi(mapping, 300),
      comparisonScope: makeScope('sameDate'),
      freePeriodCompTotalSales: null,
    })
    expect(result.daily?.get(1)).toBe(100)
    expect(result.daily?.get(2)).toBe(200)
    expect(result.monthlyTotal).toBe(300)
  })
})

describe('buildBudgetSimulatorScenario', () => {
  it('daysInMonth を year/month から導出し、dailyBudget を budgetDaily から構築する', () => {
    const source: BudgetSimulatorSource = {
      result: makeStoreResult(2026, 4),
      prevYear: makeEmptyPrevYear(),
      year: 2026,
      month: 4,
      prevYearMonthlyKpi: undefined,
      comparisonScope: null,
      freePeriodCompTotalSales: null,
    }
    const scenario = buildBudgetSimulatorScenario(source)
    expect(scenario.daysInMonth).toBe(30)
    expect(scenario.dailyBudget.length).toBe(30)
    expect(scenario.dailyBudget[0]).toBe(100_000)
    expect(scenario.monthlyBudget).toBe(3_000_000)
  })

  it('prevYearMonthlyKpi.monthlyTotal.sales を lyMonthly に採用する (alignment 非経由)', () => {
    const mapping: readonly DayMappingRow[] = [
      {
        currentDay: 1,
        prevDay: 1,
        prevMonth: 4,
        prevYear: 2025,
        prevSales: 1_000,
        prevCustomers: 0,
        prevCtsQuantity: 0,
      },
    ]
    const source: BudgetSimulatorSource = {
      result: makeStoreResult(2026, 4),
      prevYear: makeEmptyPrevYear(),
      year: 2026,
      month: 4,
      prevYearMonthlyKpi: makePrevYearKpi(mapping, 42_000_000),
      comparisonScope: makeScope('sameDate'),
      freePeriodCompTotalSales: 22_000_000, // 無視される
    }
    const scenario = buildBudgetSimulatorScenario(source)
    expect(scenario.lyMonthly).toBe(42_000_000)
  })

  it('KPI 取得なしで freePeriodCompTotalSales があれば fallback に採用', () => {
    const source: BudgetSimulatorSource = {
      result: makeStoreResult(2026, 4),
      prevYear: makeEmptyPrevYear(),
      year: 2026,
      month: 4,
      prevYearMonthlyKpi: undefined,
      comparisonScope: null,
      freePeriodCompTotalSales: 22_000_000,
    }
    const scenario = buildBudgetSimulatorScenario(source)
    expect(scenario.lyMonthly).toBe(22_000_000)
  })

  // Phase F: 主要欠損ケースで空描画 / クラッシュしないこと
  it('全データ欠損 (prev 年なし / budget 0 / actual 空) でも有効な scenario を返す', () => {
    const empty: StoreResult = {
      budget: 0,
      budgetDaily: new Map(),
      daily: new Map(),
      elapsedDays: 0,
    } as unknown as StoreResult
    const scenario = buildBudgetSimulatorScenario({
      result: empty,
      prevYear: makeEmptyPrevYear(),
      year: 2026,
      month: 4,
      prevYearMonthlyKpi: undefined,
      comparisonScope: null,
      freePeriodCompTotalSales: null,
    })
    expect(scenario.daysInMonth).toBe(30)
    expect(scenario.monthlyBudget).toBe(0)
    expect(scenario.lyMonthly).toBe(0)
    expect(scenario.dailyBudget.every((v) => v === 0)).toBe(true)
    expect(scenario.lyDaily.every((v) => v === 0)).toBe(true)
    expect(scenario.actualDaily.every((v) => v === 0)).toBe(true)
  })

  it('2 月の daysInMonth が年に応じて切り替わる (閏年判定)', () => {
    const s2024 = buildBudgetSimulatorScenario({
      result: makeStoreResult(2024, 2),
      prevYear: makeEmptyPrevYear(),
      year: 2024,
      month: 2,
      prevYearMonthlyKpi: undefined,
      comparisonScope: null,
      freePeriodCompTotalSales: null,
    })
    const s2026 = buildBudgetSimulatorScenario({
      result: makeStoreResult(2026, 2),
      prevYear: makeEmptyPrevYear(),
      year: 2026,
      month: 2,
      prevYearMonthlyKpi: undefined,
      comparisonScope: null,
      freePeriodCompTotalSales: null,
    })
    expect(s2024.daysInMonth).toBe(29) // 閏年
    expect(s2026.daysInMonth).toBe(28)
  })

  it('alignmentMode が sameDayOfWeek なら sameDow.dailyMapping を採用する', () => {
    const dateMapping: readonly DayMappingRow[] = [
      {
        currentDay: 1,
        prevDay: 1,
        prevMonth: 4,
        prevYear: 2025,
        prevSales: 100,
        prevCustomers: 0,
        prevCtsQuantity: 0,
      },
    ]
    const dowMapping: readonly DayMappingRow[] = [
      {
        currentDay: 1,
        prevDay: 2,
        prevMonth: 4,
        prevYear: 2025,
        prevSales: 999,
        prevCustomers: 0,
        prevCtsQuantity: 0,
      },
    ]
    const kpi: PrevYearMonthlyKpi = {
      hasPrevYear: true,
      sameDate: {
        sales: 100,
        customers: 0,
        transactionValue: 0,
        ctsQuantity: 0,
        dailyMapping: dateMapping,
        storeContributions: [],
      },
      sameDow: {
        sales: 999,
        customers: 0,
        transactionValue: 0,
        ctsQuantity: 0,
        dailyMapping: dowMapping,
        storeContributions: [],
      },
      monthlyTotal: { sales: 42_000_000, customers: 0, transactionValue: 0, ctsQuantity: 0 },
      sourceYear: 2025,
      sourceMonth: 4,
      dowOffset: 0,
    }
    const dow = buildBudgetSimulatorScenario({
      result: makeStoreResult(2026, 4),
      prevYear: makeEmptyPrevYear(),
      year: 2026,
      month: 4,
      prevYearMonthlyKpi: kpi,
      comparisonScope: makeScope('sameDayOfWeek'),
      freePeriodCompTotalSales: null,
    })
    expect(dow.lyDaily[0]).toBe(999) // sameDow.prevSales が採用される
  })
})
