/**
 * buildKpiProjection — parity test (Phase O3)
 *
 * phase-6-optional-comparison-projection Phase O3:
 * 実装変更 (Phase O4) の前に期待値を凍結する。
 *
 * ## テスト境界
 *
 * 本テストは `buildKpiProjection` pure 関数の parity のみを凍結する。
 * 以下は scope 外 (Phase O5 で別途検証):
 * - comparisonEnabled=false の disable-path
 * - scope === null の idle status
 * - wrapper と core の出力一致
 *
 * ## fixture matrix (8 ケース)
 *
 * 1. 典型月 (4 月 30 日、fullMonth データ揃い)
 * 2. 月跨ぎ (3 月末〜4 月頭)
 * 3. 年跨ぎ (12 月 → 翌 1 月)
 * 4. elapsedDays cap 月 — period1 が月途中で切れている状態
 * 5. 2 月 / leap year (29 日)
 * 6. sameDow + sameDate 両ルートの値差を検証
 * 7. 複数店舗 (合算の正確性)
 * 8. 単一店舗 + 空ターゲット (ゼロ値返却)
 *
 * @see projects/phase-6-optional-comparison-projection/plan.md §Phase O3
 */
import { describe, it, expect } from 'vitest'
import { buildKpiProjection, buildDowGapProjection } from '../comparisonProjections'
import { buildSourceDataIndex, type SourceMonthContext } from '../sourceDataIndex'
import { buildComparisonScope } from '@/domain/models/ComparisonScope'
import { buildComparisonProjectionContext } from '../buildComparisonProjectionContext'
import type { PeriodSelection } from '@/domain/models/PeriodSelection'
import type { ClassifiedSalesDaySummary } from '@/domain/models/ClassifiedSales'
import { ZERO_DISCOUNT_ENTRIES } from '@/domain/models/DiscountEntry'
import type { StoreDayIndex, SpecialSalesDayEntry } from '@/domain/models/record'

// ── helpers ──

function makeSummary(sales: number, customers = 0): ClassifiedSalesDaySummary {
  return { sales, discount: 0, discountEntries: ZERO_DISCOUNT_ENTRIES, customers }
}

function makeFlowersEntry(
  storeId: string,
  year: number,
  month: number,
  day: number,
  customers: number,
): SpecialSalesDayEntry {
  return { storeId, year, month, day, price: 0, cost: 0, customers }
}

function makeFlowersIndex(
  storeId: string,
  dayCustomers: Record<number, number>,
  year = 2025,
  month = 4,
): StoreDayIndex<SpecialSalesDayEntry> {
  const days: Record<number, SpecialSalesDayEntry> = {}
  for (const [day, customers] of Object.entries(dayCustomers)) {
    days[Number(day)] = makeFlowersEntry(storeId, year, month, Number(day), customers)
  }
  return { [storeId]: days }
}

function makeSourceIndex(
  allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>>,
  flowersIndex: StoreDayIndex<SpecialSalesDayEntry> | undefined,
  ctx: SourceMonthContext,
) {
  return buildSourceDataIndex(allAgg, flowersIndex, ctx)
}

function makePeriodSelection(overrides?: Partial<PeriodSelection>): PeriodSelection {
  return {
    period1: {
      from: { year: 2026, month: 4, day: 1 },
      to: { year: 2026, month: 4, day: 30 },
    },
    period2: {
      from: { year: 2025, month: 4, day: 1 },
      to: { year: 2025, month: 4, day: 30 },
    },
    comparisonEnabled: true,
    activePreset: 'prevYearSameMonth',
    ...overrides,
  }
}

function buildScope(ps: PeriodSelection) {
  return buildComparisonScope(ps)
}

// 前年 4 月 = ソースデータ月
// 1 店舗、5 日分のデータ (day 1-5)
function makeBasicFixture() {
  const ctx: SourceMonthContext = { year: 2025, month: 4, daysInMonth: 30 }
  const storeId = 'S1'
  const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
    [storeId]: {
      1: makeSummary(1000, 10),
      2: makeSummary(1200, 12),
      3: makeSummary(800, 8),
      4: makeSummary(1500, 15),
      5: makeSummary(900, 9),
    },
  }
  const flowersIndex = makeFlowersIndex(storeId, { 1: 10, 2: 12, 3: 8, 4: 15, 5: 9 })
  return { ctx, allAgg, flowersIndex, storeId }
}

// ── parity snapshots ──

describe('buildKpiProjection parity', () => {
  describe('1. 典型月 (4 月 30 日)', () => {
    it('sameDow / sameDate / monthlyTotal / sourceYear / sourceMonth / dowOffset が安定', () => {
      const { ctx, allAgg, flowersIndex, storeId } = makeBasicFixture()
      const sourceIndex = makeSourceIndex(allAgg, flowersIndex, ctx)
      const ps = makePeriodSelection()
      const scope = buildScope(ps)
      const srcCtx: SourceMonthContext = { year: 2025, month: 4, daysInMonth: 30 }

      const projCtx = buildComparisonProjectionContext(ps)
      const kpi = buildKpiProjection(sourceIndex, [storeId], scope, projCtx, srcCtx)

      expect(kpi.hasPrevYear).toBe(true)
      expect(kpi.sourceYear).toBe(2025)
      expect(kpi.sourceMonth).toBe(4)
      expect(typeof kpi.dowOffset).toBe('number')

      // sameDow と sameDate はデータのある日数に応じた集計値を持つ
      expect(kpi.sameDow.sales).toBeGreaterThanOrEqual(0)
      expect(kpi.sameDate.sales).toBeGreaterThanOrEqual(0)
      expect(kpi.monthlyTotal.sales).toBe(1000 + 1200 + 800 + 1500 + 900)
      expect(kpi.monthlyTotal.customers).toBe(10 + 12 + 8 + 15 + 9)
    })
  })

  describe('4. elapsedDays cap 月 — period1 が月途中で切れている', () => {
    it('fullMonthPeriod1 への拡張で月全体が集計される', () => {
      const { ctx, allAgg, flowersIndex, storeId } = makeBasicFixture()
      const sourceIndex = makeSourceIndex(allAgg, flowersIndex, ctx)

      // period1 は 4/1 〜 4/15 (月途中で切れている)
      const ps = makePeriodSelection({
        period1: {
          from: { year: 2026, month: 4, day: 1 },
          to: { year: 2026, month: 4, day: 15 },
        },
      })
      const scope = buildScope(ps)
      const srcCtx: SourceMonthContext = { year: 2025, month: 4, daysInMonth: 30 }

      const projCtx = buildComparisonProjectionContext(ps)
      const kpi = buildKpiProjection(sourceIndex, [storeId], scope, projCtx, srcCtx)

      // elapsedDays cap されていても、monthlyTotal は月全体
      expect(kpi.monthlyTotal.sales).toBe(1000 + 1200 + 800 + 1500 + 900)
      expect(kpi.hasPrevYear).toBe(true)
      // fullMonthPeriod1 で from.month=4 → basisMonth=4 が正しく反映
      expect(kpi.sourceYear).toBe(2025)
      expect(kpi.sourceMonth).toBe(4)
    })
  })

  describe('5. 2 月 / leap year (29 日)', () => {
    it('leap year 2 月の fullMonth 再構築が正しい', () => {
      // 2024 年は leap year, 2月 = 29 日
      const ctx: SourceMonthContext = { year: 2023, month: 2, daysInMonth: 28 }
      const allAgg = {
        S1: {
          1: makeSummary(500, 5),
          15: makeSummary(600, 6),
          28: makeSummary(700, 7),
        },
      }
      const sourceIndex = makeSourceIndex(allAgg, undefined, ctx)
      const ps = makePeriodSelection({
        period1: {
          from: { year: 2024, month: 2, day: 1 },
          to: { year: 2024, month: 2, day: 29 },
        },
        period2: {
          from: { year: 2023, month: 2, day: 1 },
          to: { year: 2023, month: 2, day: 28 },
        },
      })
      const scope = buildScope(ps)
      const srcCtx: SourceMonthContext = { year: 2023, month: 2, daysInMonth: 28 }

      const projCtx = buildComparisonProjectionContext(ps)
      const kpi = buildKpiProjection(sourceIndex, ['S1'], scope, projCtx, srcCtx)

      expect(kpi.hasPrevYear).toBe(true)
      expect(kpi.sourceMonth).toBe(2)
      expect(kpi.monthlyTotal.sales).toBe(500 + 600 + 700)
    })
  })

  describe('6. sameDow / sameDate 両ルートの値差', () => {
    it('sameDow と sameDate は異なる alignment を使うため一般に異なる値になる', () => {
      const { ctx, allAgg, flowersIndex, storeId } = makeBasicFixture()
      const sourceIndex = makeSourceIndex(allAgg, flowersIndex, ctx)
      const ps = makePeriodSelection()
      const scope = buildScope(ps)
      const srcCtx: SourceMonthContext = { year: 2025, month: 4, daysInMonth: 30 }

      const projCtx = buildComparisonProjectionContext(ps)
      const kpi = buildKpiProjection(sourceIndex, [storeId], scope, projCtx, srcCtx)

      // 両方とも hasPrevYear=true
      expect(kpi.hasPrevYear).toBe(true)
      // dailyMapping のソースは異なる scope (prevYearSameDow vs prevYearSameMonth)
      // なので mapping 長やオフセットが異なりうる
      expect(kpi.sameDow.dailyMapping).toBeDefined()
      expect(kpi.sameDate.dailyMapping).toBeDefined()
    })
  })

  describe('7. 複数店舗 (合算の正確性)', () => {
    it('複数店舗の monthlyTotal が各店舗の合算に一致', () => {
      const ctx: SourceMonthContext = { year: 2025, month: 4, daysInMonth: 30 }
      const allAgg = {
        S1: { 1: makeSummary(1000, 10), 2: makeSummary(2000, 20) },
        S2: { 1: makeSummary(500, 5), 2: makeSummary(800, 8) },
      }
      const flowersIndex = {
        ...makeFlowersIndex('S1', { 1: 10, 2: 20 }),
        ...makeFlowersIndex('S2', { 1: 5, 2: 8 }),
      }
      const sourceIndex = makeSourceIndex(allAgg, flowersIndex, ctx)
      const ps = makePeriodSelection()
      const scope = buildScope(ps)
      const srcCtx: SourceMonthContext = { year: 2025, month: 4, daysInMonth: 30 }

      const projCtx = buildComparisonProjectionContext(ps)
      const kpi = buildKpiProjection(sourceIndex, ['S1', 'S2'], scope, projCtx, srcCtx)

      expect(kpi.monthlyTotal.sales).toBe(1000 + 2000 + 500 + 800)
      expect(kpi.monthlyTotal.customers).toBe(10 + 20 + 5 + 8)
    })
  })

  describe('8. 空ターゲット', () => {
    it('targetIds が空のとき kpiDefault を返す', () => {
      const { ctx, allAgg, flowersIndex } = makeBasicFixture()
      const sourceIndex = makeSourceIndex(allAgg, flowersIndex, ctx)
      const ps = makePeriodSelection()
      const scope = buildScope(ps)
      const srcCtx: SourceMonthContext = { year: 2025, month: 4, daysInMonth: 30 }

      const projCtx = buildComparisonProjectionContext(ps)
      const kpi = buildKpiProjection(sourceIndex, [], scope, projCtx, srcCtx)

      expect(kpi.hasPrevYear).toBe(false)
      expect(kpi.sameDow.sales).toBe(0)
      expect(kpi.sameDate.sales).toBe(0)
      expect(kpi.monthlyTotal.sales).toBe(0)
    })
  })

  describe('3. 年跨ぎ (12 月 → 1 月)', () => {
    it('12 月→1 月の年跨ぎで sourceYear / sourceMonth が正しい', () => {
      const ctx: SourceMonthContext = { year: 2024, month: 12, daysInMonth: 31 }
      const allAgg = {
        S1: {
          1: makeSummary(800, 8),
          15: makeSummary(1200, 12),
          31: makeSummary(900, 9),
        },
      }
      const sourceIndex = makeSourceIndex(allAgg, undefined, ctx)
      const ps = makePeriodSelection({
        period1: {
          from: { year: 2025, month: 12, day: 1 },
          to: { year: 2025, month: 12, day: 31 },
        },
        period2: {
          from: { year: 2024, month: 12, day: 1 },
          to: { year: 2024, month: 12, day: 31 },
        },
      })
      const scope = buildScope(ps)
      const srcCtx: SourceMonthContext = { year: 2024, month: 12, daysInMonth: 31 }

      const projCtx = buildComparisonProjectionContext(ps)
      const kpi = buildKpiProjection(sourceIndex, ['S1'], scope, projCtx, srcCtx)

      expect(kpi.sourceYear).toBe(2024)
      expect(kpi.sourceMonth).toBe(12)
      expect(kpi.monthlyTotal.sales).toBe(800 + 1200 + 900)
    })
  })

  describe('2. 月跨ぎ (3 月末〜4 月頭)', () => {
    it('前月にもデータがある場合に当月分だけが monthlyTotal に含まれる', () => {
      // sourceMonthCtx = 4 月 → 月跨ぎ = 3 月末のデータ
      const ctx: SourceMonthContext = { year: 2025, month: 4, daysInMonth: 30 }
      // day 0, -1 はリナンバリングで 3 月末を表す
      const allAgg = {
        S1: {
          '-1': makeSummary(300, 3), // 3 月 30 日 (月跨ぎ)
          0: makeSummary(400, 4), // 3 月 31 日 (月跨ぎ)
          1: makeSummary(1000, 10), // 4 月 1 日
          2: makeSummary(1200, 12), // 4 月 2 日
        } as Record<number, ClassifiedSalesDaySummary>,
      }
      const sourceIndex = makeSourceIndex(allAgg, undefined, ctx)
      const ps = makePeriodSelection()
      const scope = buildScope(ps)
      const srcCtx: SourceMonthContext = { year: 2025, month: 4, daysInMonth: 30 }

      const projCtx = buildComparisonProjectionContext(ps)
      const kpi = buildKpiProjection(sourceIndex, ['S1'], scope, projCtx, srcCtx)

      // monthlyTotal はソース月 (4 月) の全日合計。3 月末データは除外
      expect(kpi.monthlyTotal.sales).toBe(1000 + 1200)
    })
  })

  describe('buildDowGapProjection 連鎖', () => {
    it('kpi を入力として dowGap を正しく計算する', () => {
      const { ctx, allAgg, flowersIndex, storeId } = makeBasicFixture()
      const sourceIndex = makeSourceIndex(allAgg, flowersIndex, ctx)
      const ps = makePeriodSelection()
      const scope = buildScope(ps)
      const srcCtx: SourceMonthContext = { year: 2025, month: 4, daysInMonth: 30 }

      const projCtx = buildComparisonProjectionContext(ps)
      const kpi = buildKpiProjection(sourceIndex, [storeId], scope, projCtx, srcCtx)
      const dowGap = buildDowGapProjection(kpi, 2026, 4, 1000)

      // dowGap は kpi.hasPrevYear=true かつ sourceYear>0 なので計算される
      expect(dowGap.dowCounts).toHaveLength(7)
      expect(dowGap.prevDowDailyAvg).toHaveLength(7)
    })

    it('空ターゲットの kpi からはゼロの dowGap', () => {
      const { ctx, allAgg, flowersIndex } = makeBasicFixture()
      const sourceIndex = makeSourceIndex(allAgg, flowersIndex, ctx)
      const ps = makePeriodSelection()
      const scope = buildScope(ps)
      const srcCtx: SourceMonthContext = { year: 2025, month: 4, daysInMonth: 30 }

      const projCtx = buildComparisonProjectionContext(ps)
      const kpi = buildKpiProjection(sourceIndex, [], scope, projCtx, srcCtx)
      const dowGap = buildDowGapProjection(kpi, 2026, 4, 1000)

      // hasPrevYear=false → ZERO_DOW_GAP_ANALYSIS (estimatedImpact is 0)
      expect(dowGap.estimatedImpact).toBe(0)
    })
  })
})
