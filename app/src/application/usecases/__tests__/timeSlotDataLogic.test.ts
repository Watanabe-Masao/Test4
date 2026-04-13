/**
 * timeSlotDataLogic.ts — pure computation helpers test
 *
 * 検証対象:
 * - buildWowRange: 7日前の DateRange を計算 (月跨ぎ含む)
 * - toAmountMap / toQuantityMap: hourly 集約
 * - computeChartDataAndKpi:
 *   - 空 currentHourly → null kpi
 *   - mode='total' / 'daily' で平均化処理
 *   - peakHour / coreTime / turnaround の計算
 *   - YoY 比率 / 差分
 * - computeYoYData:
 *   - compHourly 空 → null
 *   - maxIncHour / maxDecHour 検出
 *   - rows の diff / ratio
 * - computeInsights:
 *   - kpi=null → 空配列
 *   - peak shift 検出 (>=2 時間)
 *   - coreTime 変化検出
 *   - turnaround shift 検出
 */
import { describe, it, expect } from 'vitest'
import {
  buildWowRange,
  toAmountMap,
  toQuantityMap,
  computeChartDataAndKpi,
  computeYoYData,
  computeInsights,
} from '../timeSlotDataLogic'
import type { HourlyAggregationRow } from '@/domain/models/CtsQueryContracts'

function makeRow(hour: number, totalAmount: number, totalQuantity: number): HourlyAggregationRow {
  return { hour, totalAmount, totalQuantity } as unknown as HourlyAggregationRow
}

// ─── buildWowRange ──────────────────────────────────

describe('buildWowRange', () => {
  it('同月内の 7 日前を計算', () => {
    const range = {
      from: { year: 2026, month: 4, day: 15 },
      to: { year: 2026, month: 4, day: 21 },
    }
    const result = buildWowRange(range)
    expect(result.from).toEqual({ year: 2026, month: 4, day: 8 })
    expect(result.to).toEqual({ year: 2026, month: 4, day: 14 })
  })

  it('月跨ぎ: 4/3 → 3/27', () => {
    const range = {
      from: { year: 2026, month: 4, day: 3 },
      to: { year: 2026, month: 4, day: 9 },
    }
    const result = buildWowRange(range)
    expect(result.from).toEqual({ year: 2026, month: 3, day: 27 })
  })

  it('年跨ぎ: 1/3 → 前年 12/27', () => {
    const range = {
      from: { year: 2026, month: 1, day: 3 },
      to: { year: 2026, month: 1, day: 9 },
    }
    const result = buildWowRange(range)
    expect(result.from).toEqual({ year: 2025, month: 12, day: 27 })
  })
})

// ─── toAmountMap / toQuantityMap ───────────────────

describe('toAmountMap', () => {
  it('同時間を加算する', () => {
    const rows = [makeRow(10, 1000, 10), makeRow(10, 500, 5), makeRow(11, 2000, 20)]
    const map = toAmountMap(rows)
    expect(map.get(10)).toBe(1500)
    expect(map.get(11)).toBe(2000)
  })

  it('空配列は空 Map', () => {
    expect(toAmountMap([]).size).toBe(0)
  })
})

describe('toQuantityMap', () => {
  it('同時間の quantity を加算', () => {
    const rows = [makeRow(9, 0, 15), makeRow(9, 0, 5)]
    const map = toQuantityMap(rows)
    expect(map.get(9)).toBe(20)
  })
})

// ─── computeChartDataAndKpi ─────────────────────────

describe('computeChartDataAndKpi', () => {
  it('空 currentHourly → { chartData:[], kpi:null }', () => {
    const result = computeChartDataAndKpi({
      currentHourly: [],
      compHourly: null,
      mode: 'total',
      currentDayCount: null,
      compDayCount: null,
      hasPrev: false,
    })
    expect(result.chartData).toEqual([])
    expect(result.kpi).toBeNull()
  })

  it('currentHourly=null → 空 kpi', () => {
    const result = computeChartDataAndKpi({
      currentHourly: null,
      compHourly: null,
      mode: 'total',
      currentDayCount: null,
      compDayCount: null,
      hasPrev: false,
    })
    expect(result.kpi).toBeNull()
  })

  it('peakHour: 最大 amount の hour を検出', () => {
    const current = [makeRow(9, 100, 10), makeRow(12, 500, 50), makeRow(18, 300, 30)]
    const result = computeChartDataAndKpi({
      currentHourly: current,
      compHourly: null,
      mode: 'total',
      currentDayCount: null,
      compDayCount: null,
      hasPrev: false,
    })
    expect(result.kpi?.peakHour).toBe(12)
    expect(result.kpi?.totalAmount).toBe(900)
    expect(result.kpi?.totalQuantity).toBe(90)
  })

  it('peakHourQty: 最大 quantity の hour を検出 (amount と独立)', () => {
    const current = [makeRow(9, 1000, 10), makeRow(12, 500, 50)]
    const result = computeChartDataAndKpi({
      currentHourly: current,
      compHourly: null,
      mode: 'total',
      currentDayCount: null,
      compDayCount: null,
      hasPrev: false,
    })
    expect(result.kpi?.peakHour).toBe(9)
    expect(result.kpi?.peakHourQty).toBe(12)
  })

  it("mode='daily': currentDayCount で割算", () => {
    const current = [makeRow(10, 1000, 10)]
    const result = computeChartDataAndKpi({
      currentHourly: current,
      compHourly: null,
      mode: 'daily',
      currentDayCount: 10,
      compDayCount: null,
      hasPrev: false,
    })
    // chartData[0].amount = round(1000/10) = 100
    expect(result.chartData[0].amount).toBe(100)
  })

  it('YoY: prevTotalAmount>0 なら yoyRatio 計算', () => {
    const current = [makeRow(10, 200, 20)]
    const comp = [makeRow(10, 100, 10)]
    const result = computeChartDataAndKpi({
      currentHourly: current,
      compHourly: comp,
      mode: 'total',
      currentDayCount: null,
      compDayCount: null,
      hasPrev: true,
    })
    expect(result.kpi?.yoyRatio).toBe(2)
    expect(result.kpi?.yoyDiff).toBe(100)
  })

  it('prev なし: yoyRatio=null', () => {
    const current = [makeRow(10, 200, 20)]
    const result = computeChartDataAndKpi({
      currentHourly: current,
      compHourly: null,
      mode: 'total',
      currentDayCount: null,
      compDayCount: null,
      hasPrev: false,
    })
    expect(result.kpi?.yoyRatio).toBeNull()
    expect(result.kpi?.prevPeakHour).toBeNull()
  })

  it('activeHours = curAmtMap.size (ユニーク時間数)', () => {
    const current = [makeRow(10, 100, 1), makeRow(11, 100, 1), makeRow(12, 100, 1)]
    const result = computeChartDataAndKpi({
      currentHourly: current,
      compHourly: null,
      mode: 'total',
      currentDayCount: null,
      compDayCount: null,
      hasPrev: false,
    })
    expect(result.kpi?.activeHours).toBe(3)
    expect(result.kpi?.avgPerHour).toBe(100) // 300 / 3
  })

  it('chartData の各 row に hour + amount + quantity', () => {
    const current = [makeRow(10, 1000, 10), makeRow(11, 2000, 20)]
    const result = computeChartDataAndKpi({
      currentHourly: current,
      compHourly: null,
      mode: 'total',
      currentDayCount: null,
      compDayCount: null,
      hasPrev: false,
    })
    expect(result.chartData).toHaveLength(2)
    expect(result.chartData[0].hour).toBe('10時')
    expect(result.chartData[0].amount).toBe(1000)
  })
})

// ─── computeYoYData ─────────────────────────────────

describe('computeYoYData', () => {
  it('currentHourly=null → null', () => {
    expect(computeYoYData(null, null)).toBeNull()
  })

  it('compHourly 空 → null', () => {
    expect(computeYoYData([makeRow(10, 100, 1)], [])).toBeNull()
  })

  it('rows の diff / ratio を計算', () => {
    const cur = [makeRow(10, 200, 0)]
    const comp = [makeRow(10, 100, 0)]
    const result = computeYoYData(cur, comp)
    expect(result?.rows[0].diff).toBe(100)
    expect(result?.rows[0].ratio).toBe(2)
  })

  it('prev=0 → ratio=null', () => {
    const cur = [makeRow(10, 200, 0)]
    const comp = [makeRow(11, 100, 0)]
    const result = computeYoYData(cur, comp)
    // hour 10 は comp に無いので prv=0
    const h10 = result?.rows.find((r) => r.hour === '10時')
    expect(h10?.ratio).toBeNull()
  })

  it('maxIncHour: 最大増加時間を検出', () => {
    const cur = [makeRow(9, 100, 0), makeRow(10, 500, 0), makeRow(11, 120, 0)]
    const comp = [makeRow(9, 80, 0), makeRow(10, 100, 0), makeRow(11, 100, 0)]
    const result = computeYoYData(cur, comp)
    expect(result?.summary.maxIncHour).toBe(10)
    expect(result?.summary.maxIncDiff).toBe(400)
  })

  it('maxDecHour: 最大減少時間を検出', () => {
    const cur = [makeRow(10, 50, 0)]
    const comp = [makeRow(10, 500, 0)]
    const result = computeYoYData(cur, comp)
    expect(result?.summary.maxDecHour).toBe(10)
    expect(result?.summary.maxDecDiff).toBe(-450)
  })
})

// ─── computeInsights ───────────────────────────────

describe('computeInsights', () => {
  it('kpi=null → 空配列', () => {
    expect(computeInsights(null, null, null, '前年')).toEqual([])
  })

  it('peak shift >=2 時間: 後方シフト文言', () => {
    const kpi = {
      peakHour: 15,
      totalAmount: 1000,
      coreTimeAmt: null,
    } as unknown as Parameters<typeof computeInsights>[0]
    const comp = [makeRow(12, 500, 0)]
    const result = computeInsights(kpi, comp, null, '前年')
    expect(result.some((l) => l.includes('後方'))).toBe(true)
  })

  it('peak shift <2 時間: shift 文言なし', () => {
    const kpi = {
      peakHour: 13,
      totalAmount: 1000,
      coreTimeAmt: null,
    } as unknown as Parameters<typeof computeInsights>[0]
    const comp = [makeRow(12, 500, 0)]
    const result = computeInsights(kpi, comp, null, '前年')
    expect(result.some((l) => l.includes('後方') || l.includes('前方'))).toBe(false)
  })

  it('coreTime 3 時間 > 60% → 高集中パターン文言', () => {
    const kpi = {
      peakHour: 12,
      totalAmount: 1000,
      coreTimeAmt: { startHour: 11, endHour: 13, total: 700 },
    } as unknown as Parameters<typeof computeInsights>[0]
    const result = computeInsights(kpi, null, null, '前年')
    expect(result.some((l) => l.includes('高集中'))).toBe(true)
  })

  it('compHourly 無 / kpi 高集中なし: 空出力', () => {
    const kpi = {
      peakHour: 12,
      totalAmount: 1000,
      coreTimeAmt: { startHour: 11, endHour: 13, total: 400 },
    } as unknown as Parameters<typeof computeInsights>[0]
    const result = computeInsights(kpi, null, null, '前年')
    expect(result).toEqual([])
  })
})
