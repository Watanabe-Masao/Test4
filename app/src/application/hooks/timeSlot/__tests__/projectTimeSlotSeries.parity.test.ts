/**
 * projectTimeSlotSeries — parity / truth-table test
 *
 * unify-period-analysis Phase 6 Step C pre-work:
 * `StoreAggregationRow[] → TimeSlotSeries` 変換意味を fixture ベースで凍結する。
 * Step C 実装 (`useTimeSlotBundle` hook + ctx 配布 + `StoreHourlyChartLogic`
 * 載せ替え) は本テストが緑である状態を維持するだけでよい。
 *
 * ## 凍結対象 (truth table)
 *
 *   1. hour の並び順 — 0-23 を index 順に固定
 *   2. 欠損 hour の扱い — null (ゼロ円ではない)
 *   3. storeId の並び順 — 安定 (localeCompare 昇順)
 *   4. store subset 集約 — 指定外は除外
 *   5. 同一 (storeId, hour) 複数 row の合算
 *   6. 範囲外 hour (< 0 / >= 24) の defensive ignore
 *   7. 空入力 — empty series
 *   8. dayCount の伝搬
 *   9. grandTotal が entries.total の和に一致
 *  10. (sameDate / sameDayOfWeek 系列対応) — projection レイヤでは「2 回呼ぶ」だけ
 *  11. comparison disabled の表現 — caller 側で comparison rows を空配列にして
 *      呼ぶ or skip する
 *  12. meta.usedFallback / provenance — 本 projection 関数の責務外 (bundle hook
 *      が組み立てる)。本テストは projection 単位の意味だけを固定する
 *
 * ## 関連
 *
 *   - app/src/application/hooks/timeSlot/projectTimeSlotSeries.ts
 *   - app/src/application/hooks/timeSlot/TimeSlotBundle.types.ts
 *   - projects/completed/unify-period-analysis/step-c-timeslot-lane-policy.md
 */
import { describe, it, expect } from 'vitest'
import { projectTimeSlotSeries, EMPTY_TIME_SLOT_SERIES } from '../projectTimeSlotSeries'
import type { StoreAggregationRow } from '@/application/hooks/duckdb'
import type { TimeSlotSeries } from '../TimeSlotBundle.types'

// ── helpers ───────────────────────────────────────────────

function row(storeId: string, hour: number, amount: number): StoreAggregationRow {
  return { storeId, hour, amount }
}

// ── truth table ───────────────────────────────────────────

describe('projectTimeSlotSeries — pure projection truth table', () => {
  // (1) hour の並び順
  it('byHour は index = hour 0-23 の固定配列を返す (24 長)', () => {
    const rows = [row('S1', 5, 100), row('S1', 18, 999)]
    const result = projectTimeSlotSeries(rows, { dayCount: 1 })
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].byHour).toHaveLength(24)
    expect(result.entries[0].byHour[5]).toBe(100)
    expect(result.entries[0].byHour[18]).toBe(999)
  })

  // (2) 欠損 hour の扱い
  it('入力に存在しない hour は null になる (= ゼロ円との区別)', () => {
    const rows = [row('S1', 10, 500)]
    const result = projectTimeSlotSeries(rows, { dayCount: 1 })
    const byHour = result.entries[0].byHour
    expect(byHour[10]).toBe(500)
    // 0-9 と 11-23 は全て null
    for (let h = 0; h < 24; h++) {
      if (h === 10) continue
      expect(byHour[h], `hour=${h} should be null`).toBe(null)
    }
  })

  // (3) storeId の並び順
  it('entries は storeId の localeCompare 昇順で安定ソートされる', () => {
    const rows = [row('STORE_C', 9, 1), row('STORE_A', 9, 1), row('STORE_B', 9, 1)]
    const result = projectTimeSlotSeries(rows, { dayCount: 1 })
    expect(result.entries.map((e) => e.storeId)).toEqual(['STORE_A', 'STORE_B', 'STORE_C'])
  })

  // (4) store subset 集約
  it('storeIds option が指定されたら subset 外の row を除外する', () => {
    const rows = [row('S1', 9, 100), row('S2', 9, 200), row('S3', 9, 300)]
    const subset = new Set(['S1', 'S3'])
    const result = projectTimeSlotSeries(rows, { dayCount: 1, storeIds: subset })
    expect(result.entries.map((e) => e.storeId)).toEqual(['S1', 'S3'])
    expect(result.grandTotal).toBe(400)
  })

  it('storeIds option が空 set のときは全 store を対象にする', () => {
    const rows = [row('S1', 9, 100), row('S2', 9, 200)]
    const result = projectTimeSlotSeries(rows, { dayCount: 1, storeIds: new Set() })
    expect(result.entries).toHaveLength(2)
    expect(result.grandTotal).toBe(300)
  })

  // (5) 同一 (storeId, hour) の複数 row 合算
  it('同じ (storeId, hour) の row が複数あれば合算される', () => {
    const rows = [row('S1', 12, 100), row('S1', 12, 50), row('S1', 12, 25)]
    const result = projectTimeSlotSeries(rows, { dayCount: 1 })
    expect(result.entries[0].byHour[12]).toBe(175)
    expect(result.entries[0].total).toBe(175)
  })

  // (6) 範囲外 hour の defensive
  it('hour < 0 や hour >= 24 の row は無視される (defensive)', () => {
    const rows = [row('S1', -1, 999), row('S1', 24, 999), row('S1', 100, 999), row('S1', 12, 100)]
    const result = projectTimeSlotSeries(rows, { dayCount: 1 })
    expect(result.entries[0].total).toBe(100)
    expect(result.entries[0].byHour[12]).toBe(100)
  })

  it('整数でない hour も無視される', () => {
    const rows = [row('S1', 12.5, 999), row('S1', 13, 100)]
    const result = projectTimeSlotSeries(rows, { dayCount: 1 })
    expect(result.entries[0].total).toBe(100)
  })

  // (7) 空入力
  it('空 row 配列のときは entries 空 + grandTotal 0', () => {
    const result = projectTimeSlotSeries([], { dayCount: 7 })
    expect(result.entries).toEqual([])
    expect(result.grandTotal).toBe(0)
    expect(result.dayCount).toBe(7)
  })

  it('EMPTY_TIME_SLOT_SERIES は entries=[] / grandTotal=0 / dayCount=0', () => {
    expect(EMPTY_TIME_SLOT_SERIES.entries).toEqual([])
    expect(EMPTY_TIME_SLOT_SERIES.grandTotal).toBe(0)
    expect(EMPTY_TIME_SLOT_SERIES.dayCount).toBe(0)
  })

  // (8) dayCount の伝搬
  it('options.dayCount が結果にそのまま伝搬する', () => {
    const result = projectTimeSlotSeries([row('S1', 9, 1)], { dayCount: 30 })
    expect(result.dayCount).toBe(30)
  })

  // (9) grandTotal の整合性
  it('grandTotal は全 entries の total の和に一致する', () => {
    const rows = [row('S1', 9, 100), row('S1', 10, 200), row('S2', 9, 300), row('S2', 11, 400)]
    const result = projectTimeSlotSeries(rows, { dayCount: 1 })
    const sumOfTotals = result.entries.reduce((acc, e) => acc + e.total, 0)
    expect(result.grandTotal).toBe(sumOfTotals)
    expect(result.grandTotal).toBe(1000)
  })

  // (10) sameDate / sameDayOfWeek の系列対応
  it('sameDate と sameDayOfWeek は同じ projection 関数を 2 回呼ぶことで表現する', () => {
    // sameDate fixture: 当期と前年同日が同じ row 形式で渡される
    const currentRows = [row('S1', 9, 1000), row('S1', 18, 2000)]
    const comparisonSameDateRows = [row('S1', 9, 900), row('S1', 18, 1800)]
    const comparisonSameDowRows = [row('S1', 10, 950), row('S1', 19, 1850)]

    const current = projectTimeSlotSeries(currentRows, { dayCount: 7 })
    const sameDate = projectTimeSlotSeries(comparisonSameDateRows, { dayCount: 7 })
    const sameDow = projectTimeSlotSeries(comparisonSameDowRows, { dayCount: 7 })

    // 同じ shape を返すことを確認 (mappingKind による形変化なし、
    // 解釈は bundle/UI 層が provenance で行う)
    expect(current.entries[0].byHour).toHaveLength(24)
    expect(sameDate.entries[0].byHour).toHaveLength(24)
    expect(sameDow.entries[0].byHour).toHaveLength(24)
    // sameDate と sameDow は時刻位置が違う前提
    expect(sameDate.entries[0].byHour[9]).toBe(900)
    expect(sameDow.entries[0].byHour[10]).toBe(950)
  })

  // (11) comparison disabled
  it('comparison disabled 相当 — 空配列を渡せば EMPTY と等価な series が返る', () => {
    const result = projectTimeSlotSeries([], { dayCount: 7 })
    expect(result.entries).toEqual([])
    expect(result.grandTotal).toBe(0)
  })

  // (12) projection は meta を持たない (bundle 層の責務)
  it('TimeSlotSeries には meta フィールドが存在しない (provenance は bundle 層)', () => {
    const result = projectTimeSlotSeries([row('S1', 9, 1)], { dayCount: 1 })
    // 型レベルで meta が存在しないことを確認
    const keys = Object.keys(result).sort()
    expect(keys).toEqual(['dayCount', 'entries', 'grandTotal'])
  })
})

// ── parity: caller 側で起きる代表的な使い方 ─────────────────

describe('projectTimeSlotSeries — caller-pattern parity', () => {
  it('current/comparison ペアの典型ユースケース (2 series + 同じ store subset)', () => {
    const subset = new Set(['S1', 'S2'])
    const currentRows = [
      row('S1', 12, 1000),
      row('S2', 12, 2000),
      row('S3', 12, 9999), // subset 外
    ]
    const comparisonRows = [row('S1', 12, 800), row('S2', 12, 1700)]

    const current = projectTimeSlotSeries(currentRows, { dayCount: 7, storeIds: subset })
    const comparison = projectTimeSlotSeries(comparisonRows, { dayCount: 7, storeIds: subset })

    expect(current.grandTotal).toBe(3000)
    expect(comparison.grandTotal).toBe(2500)

    // 両 series で store 順序が一致する (UI で zip しやすい)
    expect(current.entries.map((e) => e.storeId)).toEqual(['S1', 'S2'])
    expect(comparison.entries.map((e) => e.storeId)).toEqual(['S1', 'S2'])
  })

  it('store subset で current と comparison が異なる store 集合を持っても、subset で揃う', () => {
    const subset = new Set(['S1'])
    const currentRows = [row('S1', 12, 1000), row('S2', 12, 999)]
    const comparisonRows = [row('S1', 12, 800), row('S3', 12, 999)]

    const current = projectTimeSlotSeries(currentRows, { dayCount: 1, storeIds: subset })
    const comparison = projectTimeSlotSeries(comparisonRows, { dayCount: 1, storeIds: subset })

    expect(current.entries.map((e) => e.storeId)).toEqual(['S1'])
    expect(comparison.entries.map((e) => e.storeId)).toEqual(['S1'])
  })

  it('結果型が TimeSlotSeries shape を満たす (compile-time + runtime)', () => {
    const result: TimeSlotSeries = projectTimeSlotSeries([row('S1', 9, 100)], { dayCount: 1 })
    expect(result).toBeDefined()
    expect(typeof result.dayCount).toBe('number')
    expect(typeof result.grandTotal).toBe('number')
    expect(Array.isArray(result.entries)).toBe(true)
  })
})
