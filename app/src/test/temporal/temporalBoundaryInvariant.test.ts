/**
 * Temporal Boundary Invariant テスト
 *
 * rolling window の境界不変条件を固定する。
 * scopeBoundaryInvariant と同じ思想で、temporal foundation の安全性を保証する。
 *
 * @guard D3 不変条件はテストで守る
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildTemporalFetchPlan } from '@/application/usecases/temporal'
import { buildDailySeries } from '@/application/services/temporal'
import { computeMovingAverage } from '@/domain/calculations/temporal'
import type { RollingAnalysisFrame } from '@/application/usecases/temporal'
import type { DailySeriesSourceRow } from '@/application/services/temporal'

function makeFrame(overrides: Partial<RollingAnalysisFrame> = {}): RollingAnalysisFrame {
  return {
    kind: 'analysis-frame',
    anchorRange: {
      from: { year: 2026, month: 3, day: 1 },
      to: { year: 2026, month: 3, day: 31 },
    },
    storeIds: ['S001'],
    metric: 'sales',
    granularity: 'day',
    analysisMode: 'movingAverage',
    windowSize: 7,
    direction: 'trailing',
    ...overrides,
  }
}

function makeSourceRow(
  year: number,
  month: number,
  day: number,
  sales: number,
): DailySeriesSourceRow {
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return {
    date: { year, month, day },
    dateKey: `${year}-${m}-${d}`,
    sourceMonthKey: `${year}-${m}` as DailySeriesSourceRow['sourceMonthKey'],
    values: { sales },
  }
}

describe('Temporal Boundary Invariants', () => {
  it('trailing 7日で 3月1日が 2月末データを使う', () => {
    const frame = makeFrame()
    const plan = buildTemporalFetchPlan(frame)

    // requiredRange は 2月23日から（3月1日の7日trailing窓）
    expect(plan.requiredRange.from.month).toBe(2)
    expect(plan.requiredMonths).toContain('2026-02')

    // 2月末のデータを含む series で MA を計算
    const rows: DailySeriesSourceRow[] = []
    for (let d = 23; d <= 28; d++) {
      rows.push(makeSourceRow(2026, 2, d, 1000))
    }
    for (let d = 1; d <= 31; d++) {
      rows.push(makeSourceRow(2026, 3, d, 2000))
    }

    const series = buildDailySeries(plan, rows, 'sales')
    const maPoints = computeMovingAverage(series, 7, 'strict')
    const ma = series.map((s, i) => ({
      ...s,
      value: maPoints[i].value,
      status: maPoints[i].status,
    }))

    // 3月1日（series の index = 6 = 2/23〜3/1）の MA は計算可能
    const march1 = ma.find((p) => p.dateKey === '2026-03-01')!
    expect(march1.value).not.toBeNull()
    expect(march1.status).toBe('ok')
  })

  it('trailing 28日で requiredRange が十分前へ伸びる', () => {
    const frame = makeFrame({ windowSize: 28 })
    const plan = buildTemporalFetchPlan(frame)

    // 2月2日まで伸びる（3月1日 - 27日 = 2月2日）
    expect(plan.requiredRange.from.month).toBe(2)
    expect(plan.requiredRange.from.day).toBeLessThanOrEqual(3)
    expect(plan.requiredMonths).toContain('2026-02')
  })

  it('閏年 3月初が 2/29 を含む', () => {
    const frame = makeFrame({
      anchorRange: {
        from: { year: 2028, month: 3, day: 1 },
        to: { year: 2028, month: 3, day: 31 },
      },
      windowSize: 7,
    })
    const plan = buildTemporalFetchPlan(frame)

    // 2028 は閏年。requiredRange に 2/29 が含まれる
    expect(plan.requiredRange.from.month).toBe(2)

    // 2/24〜3/31 の全日を rows として渡す
    const rows: DailySeriesSourceRow[] = []
    for (let d = 24; d <= 29; d++) {
      rows.push(makeSourceRow(2028, 2, d, 1000))
    }
    for (let d = 1; d <= 31; d++) {
      rows.push(makeSourceRow(2028, 3, d, 2000))
    }

    const series = buildDailySeries(plan, rows, 'sales')
    const feb29 = series.find((p) => p.dateKey === '2028-02-29')
    expect(feb29).toBeDefined()
    expect(feb29!.status).toBe('ok')
  })

  it('strict と partial の差が invariant として固定される', () => {
    const frame = makeFrame({ windowSize: 3 })
    const plan = buildTemporalFetchPlan(frame)

    // 2日目だけ missing
    const rows: DailySeriesSourceRow[] = []
    for (let d = 23; d <= 28; d++) {
      rows.push(makeSourceRow(2026, 2, d, 1000))
    }
    // 3月1日のデータあり、2日なし、3日あり
    rows.push(makeSourceRow(2026, 3, 1, 1000))
    // 3月2日は missing
    rows.push(makeSourceRow(2026, 3, 3, 3000))
    for (let d = 4; d <= 31; d++) {
      rows.push(makeSourceRow(2026, 3, d, 1000))
    }

    const series = buildDailySeries(plan, rows, 'sales')

    // 3月3日の窓: [3/1=1000, 3/2=missing, 3/3=3000]
    const strictPts = computeMovingAverage(series, 3, 'strict')
    const partialPts = computeMovingAverage(series, 3, 'partial')
    const strictMA = series.map((s, i) => ({
      ...s,
      value: strictPts[i].value,
      status: strictPts[i].status,
    }))
    const partialMA = series.map((s, i) => ({
      ...s,
      value: partialPts[i].value,
      status: partialPts[i].status,
    }))

    const strictMar3 = strictMA.find((p) => p.dateKey === '2026-03-03')!
    const partialMar3 = partialMA.find((p) => p.dateKey === '2026-03-03')!

    // strict: missing があるので null
    expect(strictMar3.value).toBeNull()
    expect(strictMar3.status).toBe('missing')

    // partial: ok 値のみ (1000+3000)/2 = 2000
    expect(partialMar3.value).toBeCloseTo(2000)
    expect(partialMar3.status).toBe('ok')
  })
})
