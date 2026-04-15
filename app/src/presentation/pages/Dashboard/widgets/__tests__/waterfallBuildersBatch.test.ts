/**
 * DrilldownWaterfall.builders.ts + YoYWaterfallChart.builders.ts test
 */
import { describe, it, expect } from 'vitest'
import { buildRecordAggregates } from '../DrilldownWaterfall.builders'
import {
  buildDateRanges,
  buildPeriodAggregates,
  buildPISummary,
} from '../YoYWaterfallChart.builders'
import type { CategoryTimeSalesRecord, DailyRecord } from '@/domain/models/record'

function makeCts(totalQuantity: number, totalAmount: number = 1000): CategoryTimeSalesRecord {
  return {
    totalQuantity,
    totalAmount,
    department: { code: 'd1', name: 'D' },
    line: { code: 'l1', name: 'L' },
    klass: { code: 'k1', name: 'K' },
  } as unknown as CategoryTimeSalesRecord
}

// ─── buildRecordAggregates ───────────────────

describe('buildRecordAggregates', () => {
  it('空 records → curTotalQty=0, hasQuantity=false, priceMix=null', () => {
    const result = buildRecordAggregates([], [])
    expect(result.curTotalQty).toBe(0)
    expect(result.prevTotalQty).toBe(0)
    expect(result.hasQuantity).toBe(false)
    expect(result.priceMix).toBeNull()
  })

  it('curTotalQty = dayRecords の totalQuantity 合計', () => {
    const dayRecs = [makeCts(10), makeCts(20)]
    const prevRecs = [makeCts(15)]
    const result = buildRecordAggregates(dayRecs, prevRecs)
    expect(result.curTotalQty).toBe(30)
    expect(result.prevTotalQty).toBe(15)
  })

  it('hasQuantity: 両方 > 0 のみ true', () => {
    expect(buildRecordAggregates([makeCts(10)], [makeCts(20)]).hasQuantity).toBe(true)
    expect(buildRecordAggregates([makeCts(10)], []).hasQuantity).toBe(false)
    expect(buildRecordAggregates([], [makeCts(10)]).hasQuantity).toBe(false)
  })

  it('両 records 有 → priceMix を計算', () => {
    const result = buildRecordAggregates([makeCts(10, 1000)], [makeCts(10, 800)])
    expect(result.priceMix).not.toBeNull()
  })
})

// ─── buildDateRanges ────────────────────────

describe('buildDateRanges', () => {
  it('overrideDateRange が無ければ year/month/day から構築', () => {
    const result = buildDateRanges({
      overrideDateRange: undefined,
      year: 2026,
      month: 4,
      dayStart: 1,
      dayEnd: 15,
      activeCompMode: 'yoy',
      canWoW: false,
      dowOffset: 0,
      wowPrevStart: 0,
      wowPrevEnd: 0,
    })
    expect(result.curDateRange.from.day).toBe(1)
    expect(result.curDateRange.to.day).toBe(15)
    expect(result.curDateRange.from.year).toBe(2026)
  })

  it('overrideDateRange 有 → そのまま伝搬', () => {
    const override = {
      from: { year: 2025, month: 10, day: 1 },
      to: { year: 2025, month: 10, day: 31 },
    }
    const result = buildDateRanges({
      overrideDateRange: override,
      year: 2026,
      month: 4,
      dayStart: 1,
      dayEnd: 30,
      activeCompMode: 'yoy',
      canWoW: false,
      dowOffset: 0,
      wowPrevStart: 0,
      wowPrevEnd: 0,
    })
    expect(result.curDateRange).toBe(override)
  })

  // unify-period-analysis Phase 2b: 単一契約 ComparisonResolvedRange
  it('yoy mode → comparison.range が year-1、provenance が yoy/sameDate', () => {
    const result = buildDateRanges({
      overrideDateRange: undefined,
      year: 2026,
      month: 4,
      dayStart: 1,
      dayEnd: 15,
      activeCompMode: 'yoy',
      canWoW: false,
      dowOffset: 0,
      wowPrevStart: 0,
      wowPrevEnd: 0,
    })
    expect(result.comparison.range).toEqual({
      from: { year: 2025, month: 4, day: 1 },
      to: { year: 2025, month: 4, day: 15 },
    })
    expect(result.comparison.provenance).toEqual({
      mode: 'yoy',
      mappingKind: 'sameDate',
      dowOffset: 0,
      fallbackApplied: false,
    })
  })

  it('yoy mode + dowOffset → mappingKind が sameDayOfWeek', () => {
    const result = buildDateRanges({
      overrideDateRange: undefined,
      year: 2026,
      month: 4,
      dayStart: 1,
      dayEnd: 7,
      activeCompMode: 'yoy',
      canWoW: false,
      dowOffset: 3,
      wowPrevStart: 0,
      wowPrevEnd: 0,
    })
    expect(result.comparison.provenance.mappingKind).toBe('sameDayOfWeek')
    expect(result.comparison.provenance.dowOffset).toBe(3)
  })

  it('wow mode + canWoW=true → comparison.range が当月の prev week', () => {
    const result = buildDateRanges({
      overrideDateRange: undefined,
      year: 2026,
      month: 4,
      dayStart: 8,
      dayEnd: 14,
      activeCompMode: 'wow',
      canWoW: true,
      dowOffset: 0,
      wowPrevStart: 1,
      wowPrevEnd: 7,
    })
    expect(result.comparison.range).toEqual({
      from: { year: 2026, month: 4, day: 1 },
      to: { year: 2026, month: 4, day: 7 },
    })
    expect(result.comparison.provenance.mode).toBe('wow')
    expect(result.comparison.provenance.fallbackApplied).toBe(false)
  })

  it('wow mode + canWoW=false → comparison.range が undefined、provenance.fallbackApplied=true', () => {
    const result = buildDateRanges({
      overrideDateRange: undefined,
      year: 2026,
      month: 4,
      dayStart: 1,
      dayEnd: 7,
      activeCompMode: 'wow',
      canWoW: false,
      dowOffset: 0,
      wowPrevStart: 0,
      wowPrevEnd: 0,
    })
    expect(result.comparison.range).toBeUndefined()
    expect(result.comparison.provenance.fallbackApplied).toBe(true)
  })

  it('scope 未指定なら comparison.provenance.sourceDate / comparisonRange が undefined', () => {
    const result = buildDateRanges({
      overrideDateRange: undefined,
      year: 2026,
      month: 4,
      dayStart: 1,
      dayEnd: 15,
      activeCompMode: 'yoy',
      canWoW: false,
      dowOffset: 0,
      wowPrevStart: 0,
      wowPrevEnd: 0,
    })
    expect(result.comparison.provenance.sourceDate).toBeUndefined()
    expect(result.comparison.provenance.comparisonRange).toBeUndefined()
  })

  it('scope 指定時: comparison.provenance.sourceDate / comparisonRange が埋まる (Phase 2b 単一契約)', () => {
    const scope = {
      period1: {
        from: { year: 2026, month: 4, day: 1 },
        to: { year: 2026, month: 4, day: 30 },
      },
      period2: {
        from: { year: 2025, month: 4, day: 1 },
        to: { year: 2025, month: 4, day: 30 },
      },
      preset: 'prevYearSameMonth' as const,
      alignmentMode: 'sameDate' as const,
      dowOffset: 0,
      effectivePeriod1: {
        from: { year: 2026, month: 4, day: 1 },
        to: { year: 2026, month: 4, day: 15 },
      },
      effectivePeriod2: {
        from: { year: 2025, month: 4, day: 1 },
        to: { year: 2025, month: 4, day: 15 },
      },
      queryRanges: [{ year: 2025, month: 4 }],
      alignmentMap: [
        {
          sourceDate: { year: 2025, month: 4, day: 1 },
          targetDate: { year: 2026, month: 4, day: 1 },
          sourceDayKey: '2025-04-01',
          targetDayKey: '2026-04-01',
        },
      ],
      sourceMonth: { year: 2025, month: 4 },
    }
    const result = buildDateRanges({
      overrideDateRange: undefined,
      year: 2026,
      month: 4,
      dayStart: 1,
      dayEnd: 15,
      activeCompMode: 'yoy',
      canWoW: false,
      dowOffset: 0,
      wowPrevStart: 0,
      wowPrevEnd: 0,
      comparisonScope: scope,
    })
    expect(result.comparison.provenance.sourceDate).toBe('2025-04-01')
    expect(result.comparison.provenance.comparisonRange).toEqual(scope.effectivePeriod2)
    // resolver 由来フィールドは変わらない
    expect(result.comparison.provenance.mode).toBe('yoy')
    expect(result.comparison.provenance.mappingKind).toBe('sameDate')
  })
})

// ─── buildPeriodAggregates ──────────────────

describe('buildPeriodAggregates', () => {
  function makeDaily(_day: number, sales: number, customers: number): DailyRecord {
    return {
      sales,
      customers,
      discount: 0,
    } as unknown as DailyRecord
  }

  // Phase 6.5-5b: 数量合計は CategoryDailySeries.grandTotals.salesQty 経由に
  // 切替。priceMix は Shapley leaf-grain のため CTS を継続利用する
  // (intentional permanent floor)。
  function makeSeriesWithQty(salesQty: number) {
    return {
      entries: [],
      grandTotals: { sales: 0, customers: 0, salesQty },
      dayCount: 0,
    }
  }

  it('空 categoryDailySeries + 空 CTS → curTotalQty=0, priceMix=null', () => {
    const daily = new Map([[1, makeDaily(1, 1000, 100)]])
    const result = buildPeriodAggregates({
      periodCTS: [],
      periodPrevCTS: [],
      categoryDailySeries: null,
      categoryDailyPrevSeries: null,
      activeCompMode: 'yoy',
      daily,
      prevDaily: new Map(),
      dayStart: 1,
      dayEnd: 30,
      wowPrevStart: 0,
      wowPrevEnd: 0,
      year: 2026,
      month: 4,
    })
    expect(result.curTotalQty).toBe(0)
    expect(result.prevTotalQty).toBe(0)
    expect(result.priceMix).toBeNull()
    expect(result.hasQuantity).toBe(false)
  })

  it('両 series 有 + 両 CTS 有 → hasQuantity=true + priceMix 有', () => {
    const daily = new Map([[1, makeDaily(1, 1000, 100)]])
    const result = buildPeriodAggregates({
      periodCTS: [makeCts(10, 1000)],
      periodPrevCTS: [makeCts(10, 800)],
      categoryDailySeries: makeSeriesWithQty(10),
      categoryDailyPrevSeries: makeSeriesWithQty(10),
      activeCompMode: 'yoy',
      daily,
      prevDaily: new Map(),
      dayStart: 1,
      dayEnd: 30,
      wowPrevStart: 0,
      wowPrevEnd: 0,
      year: 2026,
      month: 4,
    })
    expect(result.curTotalQty).toBe(10)
    expect(result.prevTotalQty).toBe(10)
    expect(result.hasQuantity).toBe(true)
    expect(result.priceMix).not.toBeNull()
  })
})

// ─── buildPISummary ─────────────────────────

describe('buildPISummary', () => {
  it('activeLevel<3 または hasQuantity=false → null', () => {
    expect(
      buildPISummary({
        activeLevel: 2,
        hasQuantity: false,
        prevCust: 100,
        curCust: 120,
        prevTotalQty: 0,
        curTotalQty: 0,
        prevSales: 1000,
        curSales: 1200,
      }),
    ).toBeNull()
  })

  it('prevCust=0 / curCust=0 → null', () => {
    expect(
      buildPISummary({
        activeLevel: 3,
        hasQuantity: true,
        prevCust: 0,
        curCust: 120,
        prevTotalQty: 50,
        curTotalQty: 60,
        prevSales: 1000,
        curSales: 1200,
      }),
    ).toBeNull()
  })

  it('activeLevel=3 + hasQuantity=true: PI / PPI を返す', () => {
    const result = buildPISummary({
      activeLevel: 3,
      hasQuantity: true,
      prevCust: 100,
      curCust: 120,
      prevTotalQty: 50,
      curTotalQty: 60,
      prevSales: 1000,
      curSales: 1200,
    })
    expect(result).not.toBeNull()
    // curPI = 60 / 120 = 0.5
    expect(result!.curPI).toBeCloseTo(0.5, 3)
    // prevPI = 50 / 100 = 0.5
    expect(result!.prevPI).toBeCloseTo(0.5, 3)
    // curPPI = 1200 / 60 = 20
    expect(result!.curPPI).toBeCloseTo(20, 3)
    // prevPPI = 1000 / 50 = 20
    expect(result!.prevPPI).toBeCloseTo(20, 3)
  })
})
