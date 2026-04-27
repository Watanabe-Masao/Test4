/**
 * @taxonomyKind T:unclassified
 */

import { describe, expect, it } from 'vitest'
import { generateTextSummary, generateMetricSummary } from '../summaryGenerator'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { Explanation } from '@/domain/models/analysis'

/** Minimal StoreResult-shaped factory for summary generator tests. */
function mkResult(partial: Record<string, unknown>): StoreResult {
  return {
    totalSales: 0,
    totalCustomers: 0,
    transactionValue: 0,
    budget: 0,
    budgetAchievementRate: 0,
    invMethodGrossProfitRate: null,
    estMethodMarginRate: 0,
    discountRate: 0,
    costInclusionRate: 0,
    ...partial,
  } as unknown as StoreResult
}

describe('generateTextSummary', () => {
  it('returns a single sentence for a minimal result (no prev, no target, no warnings)', () => {
    const result = mkResult({ totalSales: 1_000_000, estMethodMarginRate: 0.25 })
    const out = generateTextSummary(result)
    expect(out).toContain('当月売上')
    expect(out).toContain('1,000,000円')
    // gp rate line present
    expect(out).toContain('粗利率')
    expect(out).toContain('推定法')
    // ends with punctuation
    expect(out.endsWith('。')).toBe(true)
    // no 注意 without warnings
    expect(out).not.toContain('注意')
    // no 前年比 without prev
    expect(out).not.toContain('前年比')
  })

  it('includes budget achievement line when budget > 0', () => {
    const result = mkResult({
      totalSales: 500_000,
      budget: 400_000,
      budgetAchievementRate: 1.25,
      estMethodMarginRate: 0.3,
    })
    const out = generateTextSummary(result)
    expect(out).toContain('予算達成率')
    expect(out).toContain('125.0%')
  })

  it('includes YoY line and customer/transaction factors when prevYearResult is provided', () => {
    const result = mkResult({
      totalSales: 1_200_000,
      totalCustomers: 110,
      transactionValue: 10909,
      estMethodMarginRate: 0.28,
    })
    const prev = mkResult({
      totalSales: 1_000_000,
      totalCustomers: 100,
      transactionValue: 10000,
      estMethodMarginRate: 0.25,
      discountRate: 0.03,
    })
    const out = generateTextSummary(result, { prevYearResult: prev })
    expect(out).toContain('前年比 +20.0%')
    expect(out).toContain('主な要因')
    expect(out).toContain('客数 +10.0%')
    expect(out).toContain('客単価')
  })

  it('uses 在庫法 label when invMethodGrossProfitRate is not null', () => {
    const result = mkResult({
      totalSales: 1_000_000,
      invMethodGrossProfitRate: 0.3,
      estMethodMarginRate: 0.25,
    })
    const out = generateTextSummary(result)
    expect(out).toContain('在庫法')
    expect(out).not.toContain('推定法')
  })

  it('adds 目標比 diff with sign when targetGrossProfitRate is provided', () => {
    const result = mkResult({
      totalSales: 1_000_000,
      invMethodGrossProfitRate: 0.3,
      estMethodMarginRate: 0.25,
    })
    const outPositive = generateTextSummary(result, { targetGrossProfitRate: 0.28 })
    expect(outPositive).toContain('目標比 +2.0pt')
    const outNegative = generateTextSummary(result, { targetGrossProfitRate: 0.32 })
    expect(outNegative).toContain('目標比 -2.0pt')
  })

  it('emits 売変率 warning when discountRate exceeds 5%', () => {
    const result = mkResult({
      totalSales: 1_000_000,
      estMethodMarginRate: 0.25,
      discountRate: 0.07,
    })
    const out = generateTextSummary(result)
    expect(out).toContain('注意')
    expect(out).toContain('売変率')
  })

  it('emits 原価算入率 warning when costInclusionRate exceeds 3%', () => {
    const result = mkResult({
      totalSales: 1_000_000,
      estMethodMarginRate: 0.25,
      costInclusionRate: 0.05,
    })
    const out = generateTextSummary(result)
    expect(out).toContain('原価算入率')
  })

  it('does not emit warnings when rates are under threshold', () => {
    const result = mkResult({
      totalSales: 1_000_000,
      estMethodMarginRate: 0.25,
      discountRate: 0.04,
      costInclusionRate: 0.02,
    })
    const out = generateTextSummary(result)
    expect(out).not.toContain('注意')
  })
})

describe('generateMetricSummary', () => {
  it('formats a yen-unit Explanation with 円 suffix', () => {
    const exp = {
      title: '総売上',
      unit: 'yen',
      value: 123456,
      formula: 'sum(records.price)',
    } as unknown as Explanation
    const out = generateMetricSummary(exp)
    expect(out).toContain('総売上')
    expect(out).toContain('123,456円')
    expect(out).toContain('計算式: sum(records.price)')
  })

  it('formats a rate-unit Explanation with % suffix', () => {
    const exp = {
      title: '粗利率',
      unit: 'rate',
      value: 0.283,
      formula: 'gp / sales',
    } as unknown as Explanation
    const out = generateMetricSummary(exp)
    expect(out).toContain('粗利率')
    expect(out).toContain('28.3%')
  })

  it('formats a count-unit Explanation with localized number', () => {
    const exp = {
      title: '客数',
      unit: 'count',
      value: 12345,
      formula: 'sum(records.customers)',
    } as unknown as Explanation
    const out = generateMetricSummary(exp)
    expect(out).toContain('客数')
    expect(out).toContain('12,345')
  })
})
