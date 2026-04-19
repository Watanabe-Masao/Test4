/**
 * DayDetailModal 前年データ空表示バグの候補シグネチャ観測
 *
 * project: day-detail-modal-prev-year-investigation (Phase 1)
 *
 * ## 目的
 *
 * 3 症状 (3/5-factor 不表示 / 時間帯「データなし」 / ドリルダウン非表示) の
 * 原因候補 A/B/C が、`queryCategoryTimeRecords` の戻り値にどのような
 * observable シグネチャを生むかを console.log で出力する。
 *
 * runtime で観測した `dayLeafBundle.currentSeries.entries` の形と
 * この出力を突合することで、原因層を機械的に確定できる。
 *
 * ## 実行方法
 *
 * ```
 * cd app && npx vitest run src/infrastructure/duckdb/__tests__/dayDetailPrevYearCandidateSignatures.test.ts --reporter=verbose
 * ```
 *
 * ## 候補マッピング
 *
 * | 候補 | SQL レイヤーでの差異 | 予測シグネチャ |
 * |---|---|---|
 * | A | `category_time_sales.is_prev_year=TRUE` 行が 0 件 | entries.length === 0 |
 * | B | CTS 行あり / `time_slots.is_prev_year=TRUE` 行が 0 件 → LEFT JOIN → hour=null | entries.length > 0 / entries[0].timeSlots.length === 0 / totalQuantity > 0 |
 * | C | CTS 行の total_quantity=0 (ingest 集計の異常) | entries[0].totalQuantity === 0 |
 */
import { describe, it, expect, vi } from 'vitest'
import { queryCategoryTimeRecords } from '@/infrastructure/duckdb/queries/ctsHierarchyQueries'
import type { CtsFilterParams } from '@/infrastructure/duckdb/queries/categoryTimeSales'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'

function makeMockConn(rows: Record<string, unknown>[]) {
  return {
    query: vi.fn(async () => ({ toArray: () => rows })),
  } as never
}

const prevYearParams: CtsFilterParams = {
  dateFrom: '2024-10-15',
  dateTo: '2024-10-15',
  isPrevYear: true,
}

function logSignature(label: string, records: readonly CategoryTimeSalesRecord[]): void {
  const lines = [
    `\n=== 候補 ${label} シグネチャ ===`,
    `entries.length         = ${records.length}`,
  ]
  if (records.length > 0) {
    const r = records[0]
    lines.push(
      `entries[0].totalQuantity = ${r.totalQuantity}`,
      `entries[0].totalAmount   = ${r.totalAmount}`,
      `entries[0].timeSlots.len = ${r.timeSlots.length}`,
      `entries[0].dept          = ${r.department.code}/${r.department.name}`,
    )
  }
  console.log(lines.join('\n'))
}

describe('DayDetailModal prev-year 候補シグネチャ観測', () => {
  it('候補 A: is_prev_year=TRUE の CTS 行が 0 件 (ingest 漏れ / dataStore.prevYear 未反映)', async () => {
    const conn = makeMockConn([])
    const records = await queryCategoryTimeRecords(conn, prevYearParams)
    logSignature('A', records)

    // A の識別条件
    expect(records.length).toBe(0)
  })

  it('候補 B: CTS 行あり / time_slots が LEFT JOIN で NULL (timeSlots 未 INSERT or fingerprint 漏れ)', async () => {
    const conn = makeMockConn([
      {
        year: 2024,
        month: 10,
        day: 15,
        store_id: '1',
        dept_code: 'D01',
        dept_name: '食品',
        line_code: 'L01',
        line_name: '精肉',
        klass_code: 'K01',
        klass_name: '牛肉',
        total_quantity: 120,
        total_amount: 150000,
        hour: null,
        hour_quantity: null,
        hour_amount: null,
      },
    ])
    const records = await queryCategoryTimeRecords(conn, prevYearParams)
    logSignature('B', records)

    // B の識別条件
    expect(records.length).toBe(1)
    expect(records[0].timeSlots.length).toBe(0)
    expect(records[0].totalQuantity).toBeGreaterThan(0)
  })

  it('候補 C: CTS 行あり / total_quantity = 0 (ingest 集計の異常)', async () => {
    const conn = makeMockConn([
      {
        year: 2024,
        month: 10,
        day: 15,
        store_id: '1',
        dept_code: 'D01',
        dept_name: '食品',
        line_code: 'L01',
        line_name: '精肉',
        klass_code: 'K01',
        klass_name: '牛肉',
        total_quantity: 0,
        total_amount: 0,
        hour: null,
        hour_quantity: null,
        hour_amount: null,
      },
    ])
    const records = await queryCategoryTimeRecords(conn, prevYearParams)
    logSignature('C', records)

    // C の識別条件
    expect(records.length).toBe(1)
    expect(records[0].totalQuantity).toBe(0)
  })

  it('参照: 正常ケース (CTS + time_slots 揃い) — prev year が正常ならこの形になる', async () => {
    const conn = makeMockConn([
      {
        year: 2024,
        month: 10,
        day: 15,
        store_id: '1',
        dept_code: 'D01',
        dept_name: '食品',
        line_code: 'L01',
        line_name: '精肉',
        klass_code: 'K01',
        klass_name: '牛肉',
        total_quantity: 120,
        total_amount: 150000,
        hour: 10,
        hour_quantity: 30,
        hour_amount: 40000,
      },
      {
        year: 2024,
        month: 10,
        day: 15,
        store_id: '1',
        dept_code: 'D01',
        dept_name: '食品',
        line_code: 'L01',
        line_name: '精肉',
        klass_code: 'K01',
        klass_name: '牛肉',
        total_quantity: 120,
        total_amount: 150000,
        hour: 11,
        hour_quantity: 90,
        hour_amount: 110000,
      },
    ])
    const records = await queryCategoryTimeRecords(conn, prevYearParams)
    logSignature('Normal (参照)', records)

    expect(records.length).toBe(1)
    expect(records[0].timeSlots.length).toBe(2)
    expect(records[0].totalQuantity).toBe(120)
  })
})
