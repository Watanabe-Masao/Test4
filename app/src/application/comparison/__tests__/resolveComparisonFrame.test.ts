import { describe, it, expect } from 'vitest'
import {
  resolveComparisonFrame,
  calcSameDowOffset,
  buildPrevYearScope,
} from '../resolveComparisonFrame'
import type { DateRange, ComparisonFrame } from '@/domain/models'

describe('calcSameDowOffset', () => {
  it('同じ月初曜日なら offset=0', () => {
    // 2024-03-01 は金曜, 2025-03-01 は土曜 → offset=1
    // テスト用に同曜日のケースを探す: 2023-01 (日) と 2017-01 (日)
    // 直接計算: offset = (curDow - prevDow + 7) % 7
    const offset = calcSameDowOffset(2026, 3, 2025, 3)
    // 2026-03-01 = 日(0), 2025-03-01 = 土(6) → (0-6+7)%7 = 1
    expect(offset).toBe(1)
  })

  it('NaN 入力は 0 を返す', () => {
    expect(calcSameDowOffset(NaN, 3)).toBe(0)
    expect(calcSameDowOffset(2026, NaN)).toBe(0)
  })

  it('sourceYear/Month を省略すると year-1, same month を使う', () => {
    const withExplicit = calcSameDowOffset(2026, 3, 2025, 3)
    const withDefault = calcSameDowOffset(2026, 3)
    expect(withDefault).toBe(withExplicit)
  })
})

describe('resolveComparisonFrame', () => {
  const currentRange: DateRange = {
    from: { year: 2026, month: 3, day: 1 },
    to: { year: 2026, month: 3, day: 31 },
  }

  it('sameDate: previous は year-1 の同日付、offset=0', () => {
    const frame = resolveComparisonFrame(currentRange, 'sameDate')
    expect(frame.previous.from).toEqual({ year: 2025, month: 3, day: 1 })
    expect(frame.previous.to).toEqual({ year: 2025, month: 3, day: 31 })
    expect(frame.dowOffset).toBe(0)
    expect(frame.policy).toBe('sameDate')
    expect(frame.current).toBe(currentRange)
  })

  it('sameDayOfWeek: offset が自動計算される', () => {
    const frame = resolveComparisonFrame(currentRange, 'sameDayOfWeek')
    // 2026-03-01 = 日(0), 2025-03-01 = 土(6) → offset=1
    expect(frame.dowOffset).toBe(1)
    expect(frame.policy).toBe('sameDayOfWeek')
  })

  it('sourceYear/Month オーバーライドが反映される', () => {
    const frame = resolveComparisonFrame(currentRange, 'sameDate', {
      sourceYear: 2024,
      sourceMonth: 2,
    })
    expect(frame.previous.from.year).toBe(2024)
    expect(frame.previous.from.month).toBe(2)
    // 2024年2月はうるう年(29日) → to.day=31 が 29 にクランプされる
    expect(frame.previous.to.day).toBe(29)
  })

  it('dowOffset 手動オーバーライドが反映される', () => {
    const frame = resolveComparisonFrame(currentRange, 'sameDayOfWeek', {
      dowOffset: 3,
    })
    expect(frame.dowOffset).toBe(3)
  })

  it('dowOffset オーバーライドは 0-6 にクランプされる', () => {
    expect(resolveComparisonFrame(currentRange, 'sameDayOfWeek', { dowOffset: -1 }).dowOffset).toBe(
      0,
    )
    expect(resolveComparisonFrame(currentRange, 'sameDayOfWeek', { dowOffset: 10 }).dowOffset).toBe(
      6,
    )
  })

  it('sameDate モードでは dowOffset オーバーライドは無視される', () => {
    const frame = resolveComparisonFrame(currentRange, 'sameDate', { dowOffset: 3 })
    expect(frame.dowOffset).toBe(0)
  })

  it('null オーバーライドはデフォルトにフォールバック', () => {
    const frame = resolveComparisonFrame(currentRange, 'sameDayOfWeek', {
      sourceYear: null,
      sourceMonth: null,
      dowOffset: null,
    })
    expect(frame.previous.from.year).toBe(2025)
    expect(frame.dowOffset).toBe(1) // 自動計算
  })

  // ── 月境界: 前年月の日数が少ない場合のクランプ ──

  it('31日月 → 前年2月(28日)にオーバーライド時、to.day が28にクランプされる', () => {
    // 当年3月31日 → 前年2月(非うるう年2025: 28日)
    const frame = resolveComparisonFrame(currentRange, 'sameDate', {
      sourceMonth: 2,
    })
    expect(frame.previous.to).toEqual({ year: 2025, month: 2, day: 28 })
    expect(frame.previous.from).toEqual({ year: 2025, month: 2, day: 1 })
  })

  it('うるう年 → 非うるう年で2月29日が28日にクランプされる', () => {
    // 2024年(うるう年)2月29日 → 2023年(非うるう年)2月
    const leapRange: DateRange = {
      from: { year: 2024, month: 2, day: 1 },
      to: { year: 2024, month: 2, day: 29 },
    }
    const frame = resolveComparisonFrame(leapRange, 'sameDate')
    expect(frame.previous.to).toEqual({ year: 2023, month: 2, day: 28 })
    expect(frame.previous.from).toEqual({ year: 2023, month: 2, day: 1 })
  })

  it('非うるう年 → うるう年はクランプ不要（28 ≤ 29）', () => {
    const nonLeapRange: DateRange = {
      from: { year: 2025, month: 2, day: 1 },
      to: { year: 2025, month: 2, day: 28 },
    }
    const frame = resolveComparisonFrame(nonLeapRange, 'sameDate')
    // 2024年はうるう年(29日) → 28はクランプ不要
    expect(frame.previous.to).toEqual({ year: 2024, month: 2, day: 28 })
  })

  it('31日月 → 30日月にオーバーライド時、to.day が30にクランプされる', () => {
    // 当年1月31日 → 前年11月(30日)
    const janRange: DateRange = {
      from: { year: 2026, month: 1, day: 1 },
      to: { year: 2026, month: 1, day: 31 },
    }
    const frame = resolveComparisonFrame(janRange, 'sameDate', {
      sourceMonth: 11,
    })
    expect(frame.previous.to).toEqual({ year: 2025, month: 11, day: 30 })
  })
})

// ── buildPrevYearScope ──

describe('buildPrevYearScope', () => {
  function makeFrame(
    offset: number,
    prevFrom: { year: number; month: number; day: number },
    prevTo: { year: number; month: number; day: number },
  ): ComparisonFrame {
    return {
      current: { from: { year: 2026, month: 3, day: 1 }, to: { year: 2026, month: 3, day: 31 } },
      previous: { from: prevFrom, to: prevTo },
      dowOffset: offset,
      policy: 'sameDayOfWeek',
    }
  }

  it('offset=0 のとき from/to はそのまま', () => {
    const frame = makeFrame(0, { year: 2025, month: 3, day: 1 }, { year: 2025, month: 3, day: 31 })
    const scope = buildPrevYearScope(frame, 31, 500)
    expect(scope.dateRange.from.day).toBe(1)
    expect(scope.dateRange.to.day).toBe(31)
    expect(scope.totalCustomers).toBe(500)
    expect(scope.dowOffset).toBe(0)
  })

  it('offset=3 のとき from.day が 4 になる（月初3日をスキップ）', () => {
    const frame = makeFrame(3, { year: 2025, month: 3, day: 1 }, { year: 2025, month: 3, day: 31 })
    const scope = buildPrevYearScope(frame, 31, 450)
    // JS: origDay 4→mapped 1, ..., origDay 31→mapped 28. スキップ: day 1-3
    // DuckDB: from=4, to=min(31+3,31)=31
    expect(scope.dateRange.from.day).toBe(4)
    expect(scope.dateRange.to.day).toBe(31)
  })

  it('offset=3 + effectiveEndDay=20 のとき to.day が 23 になる', () => {
    const frame = makeFrame(3, { year: 2025, month: 3, day: 1 }, { year: 2025, month: 3, day: 31 })
    const scope = buildPrevYearScope(frame, 20, 300)
    // DuckDB: from=4, to=min(20+3,31)=23
    expect(scope.dateRange.from.day).toBe(4)
    expect(scope.dateRange.to.day).toBe(23)
  })

  it('offset=3 + 前年月が28日の場合、to.day が28にクランプされる', () => {
    // 2025年2月(28日)
    const frame = makeFrame(3, { year: 2025, month: 2, day: 1 }, { year: 2025, month: 2, day: 28 })
    const scope = buildPrevYearScope(frame, 28, 200)
    // DuckDB: from=4, to=min(28+3,28)=28
    expect(scope.dateRange.from.day).toBe(4)
    expect(scope.dateRange.to.day).toBe(28)
  })

  it('effectiveEndDay が小さく offset が大きい場合でも正しい範囲', () => {
    const frame = makeFrame(6, { year: 2025, month: 3, day: 1 }, { year: 2025, month: 3, day: 31 })
    const scope = buildPrevYearScope(frame, 10, 100)
    // DuckDB: from=7, to=min(10+6,31)=16
    expect(scope.dateRange.from.day).toBe(7)
    expect(scope.dateRange.to.day).toBe(16)
  })

  it('totalCustomers と dowOffset が正しくバンドルされる', () => {
    const frame = makeFrame(2, { year: 2025, month: 3, day: 1 }, { year: 2025, month: 3, day: 31 })
    const scope = buildPrevYearScope(frame, 31, 1234)
    expect(scope.totalCustomers).toBe(1234)
    expect(scope.dowOffset).toBe(2)
  })
})
