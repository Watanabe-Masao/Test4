/**
 * useMonthlyDataPoints フックのテスト
 *
 * 過去月データ + 当月データの結合ロジックを検証する。
 */
import { describe, it, expect } from 'vitest'
import { useMonthlyDataPoints } from '../useMonthlyHistory'
import type { MonthlyDataPoint } from '@/domain/calculations/trendAnalysis'
import { renderHook } from '@testing-library/react'

// ── Helpers ──────────────────────────────────────────

function makePoint(year: number, month: number, totalSales = 1_000_000): MonthlyDataPoint {
  return {
    year,
    month,
    totalSales,
    totalCustomers: 500,
    grossProfit: 250_000,
    grossProfitRate: 0.25,
    budget: 1_200_000,
    budgetAchievement: 0.833,
    storeCount: 1,
    discountRate: 0.02,
    costRate: 0.55,
    costInclusionRate: 0.01,
    averageMarkupRate: 0.26,
  }
}

// ── Tests ─────────────────────────────────────────────

describe('useMonthlyDataPoints', () => {
  it('returns historical data when currentPoint is null', () => {
    const historical = [makePoint(2024, 10), makePoint(2024, 11), makePoint(2024, 12)]
    const { result } = renderHook(() => useMonthlyDataPoints(historical, 2025, 1, null))
    expect(result.current).toHaveLength(3)
  })

  it('appends currentPoint to filtered historical data', () => {
    const historical = [makePoint(2024, 10), makePoint(2024, 11)]
    const currentPoint = makePoint(2025, 1, 2_000_000)
    const { result } = renderHook(() => useMonthlyDataPoints(historical, 2025, 1, currentPoint))
    expect(result.current).toHaveLength(3)
    expect(result.current[2].totalSales).toBe(2_000_000)
  })

  it('filters out historical entries for the current month', () => {
    // 当月（2025-1）が IndexedDB にも存在する場合、重複を排除する
    const historical = [
      makePoint(2024, 11),
      makePoint(2025, 1, 999_999), // 当月のエントリ（重複）
    ]
    const currentPoint = makePoint(2025, 1, 2_000_000)
    const { result } = renderHook(() => useMonthlyDataPoints(historical, 2025, 1, currentPoint))
    // 2024-11 + 2025-1（currentPoint） = 2件
    expect(result.current).toHaveLength(2)
    // currentPoint の値が使われる
    const janPoint = result.current.find((p) => p.year === 2025 && p.month === 1)
    expect(janPoint?.totalSales).toBe(2_000_000)
  })

  it('returns empty array when historical is empty and currentPoint is null', () => {
    const { result } = renderHook(() => useMonthlyDataPoints([], 2025, 1, null))
    expect(result.current).toHaveLength(0)
  })

  it('returns only currentPoint when historical is empty', () => {
    const currentPoint = makePoint(2025, 3, 5_000_000)
    const { result } = renderHook(() => useMonthlyDataPoints([], 2025, 3, currentPoint))
    expect(result.current).toHaveLength(1)
    expect(result.current[0].totalSales).toBe(5_000_000)
  })

  it('keeps historical entries that are not the current month', () => {
    const historical = [
      makePoint(2024, 10),
      makePoint(2024, 11),
      makePoint(2024, 12),
      makePoint(2025, 1, 100), // 当月 → フィルタされる
    ]
    const currentPoint = makePoint(2025, 1, 200)
    const { result } = renderHook(() => useMonthlyDataPoints(historical, 2025, 1, currentPoint))
    // 3 past + 1 current = 4
    expect(result.current).toHaveLength(4)
    // 過去月のエントリが維持されている
    const octPoint = result.current.find((p) => p.month === 10)
    expect(octPoint?.year).toBe(2024)
  })

  it('does not filter entries for different year with same month', () => {
    // year が違えば当月扱いにならない
    const historical = [makePoint(2024, 1, 111)]
    const currentPoint = makePoint(2025, 1, 222)
    const { result } = renderHook(() => useMonthlyDataPoints(historical, 2025, 1, currentPoint))
    expect(result.current).toHaveLength(2)
    const y2024 = result.current.find((p) => p.year === 2024)
    expect(y2024?.totalSales).toBe(111)
  })

  it('returns memoized result (same reference when inputs unchanged)', () => {
    const historical = [makePoint(2024, 11)]
    const currentPoint = makePoint(2025, 1)
    const { result, rerender } = renderHook(
      ({ h, cp }: { h: MonthlyDataPoint[]; cp: MonthlyDataPoint }) =>
        useMonthlyDataPoints(h, 2025, 1, cp),
      { initialProps: { h: historical, cp: currentPoint } },
    )
    const first = result.current
    rerender({ h: historical, cp: currentPoint })
    expect(result.current).toBe(first) // 同一参照（メモ化）
  })
})
