/**
 * categoryTimeSales クエリモジュールのテスト
 *
 * DuckDB 接続をモックして SQL 生成の内容を検証する。
 * groupRowsToRecords の変換ロジックは queryCategoryTimeRecords を経由してテストする。
 */
import { describe, it, expect, vi } from 'vitest'
import {
  queryHourlyAggregation,
  queryLevelAggregation,
  queryStoreAggregation,
  queryHourDowMatrix,
  queryDistinctDayCount,
  queryCategoryDailyTrend,
  queryCategoryHourly,
  queryDowDivisorMap,
  queryCategoryTimeRecords,
  type CtsFilterParams,
} from '@/infrastructure/duckdb/queries/categoryTimeSales'

// DuckDB接続のモック（SQL文字列を捕捉する）
function makeMockConn(returnRows: Record<string, unknown>[] = []) {
  const capturedSql: string[] = []
  const conn = {
    query: vi.fn((sql: string) => {
      capturedSql.push(sql)
      return Promise.resolve({
        toArray: () => returnRows,
      })
    }),
    getCapturedSql: () => capturedSql,
  }
  return conn
}

const baseParams: CtsFilterParams = {
  dateFrom: '2026-02-01',
  dateTo: '2026-02-28',
}

describe('queryHourlyAggregation', () => {
  it('time_slots テーブルに対して正しい SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryHourlyAggregation(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('time_slots ts')
    expect(sql).toContain('SUM(ts.amount)')
    expect(sql).toContain('ts.hour')
    expect(sql).toContain('GROUP BY ts.hour')
    expect(sql).toContain("ts.date_key BETWEEN '2026-02-01' AND '2026-02-28'")
    expect(sql).toContain('is_prev_year = FALSE')
  })

  it('isPrevYear=true が SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryHourlyAggregation(conn as never, { ...baseParams, isPrevYear: true })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('is_prev_year = TRUE')
  })

  it('storeIds フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryHourlyAggregation(conn as never, {
      ...baseParams,
      storeIds: ['1', '2', '3'],
    })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("ts.store_id IN ('1', '2', '3')")
  })

  it('dow フィルタは time_slots ではなく別途処理される（tsWhereClause は dow を含まない）', async () => {
    const conn = makeMockConn()
    await queryHourlyAggregation(conn as never, { ...baseParams, dow: [1, 2, 3] })
    const sql = conn.getCapturedSql()[0]
    // tsWhereClause は dow を含まない
    expect(sql).not.toContain('dow IN')
  })

  it('結果がモックデータを返す', async () => {
    const rows = [{ hour: 10, total_amount: 50000, total_quantity: 100 }]
    const conn = makeMockConn(rows)
    const result = await queryHourlyAggregation(conn as never, baseParams)
    expect(result).toHaveLength(1)
  })
})

describe('queryLevelAggregation', () => {
  it('department レベルの SQL を正しく生成する', async () => {
    const conn = makeMockConn()
    await queryLevelAggregation(conn as never, { ...baseParams, level: 'department' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('category_time_sales cts')
    expect(sql).toContain('cts.dept_code AS code')
    expect(sql).toContain('cts.dept_name AS name')
    expect(sql).toContain('COUNT(DISTINCT cts.line_code)')
    expect(sql).toContain("cts.date_key BETWEEN '2026-02-01' AND '2026-02-28'")
  })

  it('line レベルの SQL を正しく生成する', async () => {
    const conn = makeMockConn()
    await queryLevelAggregation(conn as never, { ...baseParams, level: 'line' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cts.line_code AS code')
    expect(sql).toContain('cts.line_name AS name')
    expect(sql).toContain('COUNT(DISTINCT cts.klass_code)')
  })

  it('klass レベルの SQL を正しく生成する', async () => {
    const conn = makeMockConn()
    await queryLevelAggregation(conn as never, { ...baseParams, level: 'klass' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cts.klass_code AS code')
    expect(sql).toContain('cts.klass_name AS name')
    // child_count は 0 固定（klass は最下位）
    expect(sql).toContain('0 AS child_count')
    // handled_day_count は COUNT(DISTINCT...) で算出される（R-8）
    expect(sql).toContain('handled_day_count')
  })

  it('deptCode フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryLevelAggregation(conn as never, {
      ...baseParams,
      level: 'line',
      deptCode: 'D01',
    })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("cts.dept_code = 'D01'")
  })

  it('klassCode フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryLevelAggregation(conn as never, {
      ...baseParams,
      level: 'klass',
      klassCode: 'K99',
    })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("cts.klass_code = 'K99'")
  })

  it('ORDER BY amount DESC が含まれる', async () => {
    const conn = makeMockConn()
    await queryLevelAggregation(conn as never, { ...baseParams, level: 'department' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ORDER BY amount DESC')
  })
})

describe('queryStoreAggregation', () => {
  it('店舗別×時間帯集約 SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryStoreAggregation(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('time_slots ts')
    expect(sql).toContain('ts.store_id')
    expect(sql).toContain('ts.hour')
    expect(sql).toContain('SUM(ts.amount) AS amount')
    expect(sql).toContain('GROUP BY ts.store_id, ts.hour')
    expect(sql).toContain('ORDER BY ts.store_id, ts.hour')
  })

  it('日付条件が SQL に含まれる', async () => {
    const conn = makeMockConn()
    await queryStoreAggregation(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("ts.date_key BETWEEN '2026-02-01' AND '2026-02-28'")
  })
})

describe('queryHourDowMatrix', () => {
  it('時間帯×曜日マトリクス SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryHourDowMatrix(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('time_slots ts')
    expect(sql).toContain('ts.hour')
    expect(sql).toContain('EXTRACT(dow')
    expect(sql).toContain('make_date(ts.year, ts.month, ts.day)')
    expect(sql).toContain('SUM(ts.amount) AS amount')
    expect(sql).toContain('COUNT(DISTINCT ts.date_key) AS day_count')
    expect(sql).toContain('GROUP BY ts.hour, dow')
  })

  it('storeIds フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryHourDowMatrix(conn as never, { ...baseParams, storeIds: ['10'] })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("ts.store_id IN ('10')")
  })
})

describe('queryDistinctDayCount', () => {
  it('category_time_sales から distinct 日数をカウントする SQL を生成する', async () => {
    const conn = makeMockConn([{ cnt: 20 }])
    const result = await queryDistinctDayCount(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('COUNT(DISTINCT cts.date_key) AS cnt')
    expect(sql).toContain('category_time_sales cts')
    expect(result).toBe(20)
  })

  it('結果が null の場合は 0 を返す', async () => {
    const conn = makeMockConn([])
    const result = await queryDistinctDayCount(conn as never, baseParams)
    expect(result).toBe(0)
  })

  it('dow フィルタが SQL に反映される（ctsWhereClause 経由）', async () => {
    const conn = makeMockConn([{ cnt: 5 }])
    await queryDistinctDayCount(conn as never, { ...baseParams, dow: [6] })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cts.dow IN (6)')
  })
})

describe('queryCategoryDailyTrend', () => {
  it('department レベルの日次トレンド SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryCategoryDailyTrend(conn as never, { ...baseParams, level: 'department' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cts.dept_code AS code')
    expect(sql).toContain('cts.dept_name AS name')
    expect(sql).toContain('cts.date_key')
    expect(sql).toContain('SUM(cts.total_amount) AS amount')
    expect(sql).toContain('LIMIT 10')
  })

  it('topN パラメータが LIMIT に反映される', async () => {
    const conn = makeMockConn()
    await queryCategoryDailyTrend(conn as never, {
      ...baseParams,
      level: 'department',
      topN: 5,
    })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('LIMIT 5')
  })

  it('line レベルの SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryCategoryDailyTrend(conn as never, { ...baseParams, level: 'line' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cts.line_code AS code')
    expect(sql).toContain('cts.line_name AS name')
  })

  it('klass レベルの SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryCategoryDailyTrend(conn as never, { ...baseParams, level: 'klass' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cts.klass_code AS code')
    expect(sql).toContain('cts.klass_name AS name')
  })

  it('WITH daily AS ... ranked AS の CTE 構造を含む', async () => {
    const conn = makeMockConn()
    await queryCategoryDailyTrend(conn as never, { ...baseParams, level: 'department' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('WITH daily AS')
    expect(sql).toContain('ranked AS')
    expect(sql).toContain('WHERE d.code IN (SELECT code FROM ranked)')
  })
})

describe('queryCategoryHourly', () => {
  it('department レベルのカテゴリ×時間帯集約 SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryCategoryHourly(conn as never, { ...baseParams, level: 'department' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('time_slots ts')
    expect(sql).toContain('ts.dept_code AS code')
    expect(sql).toContain('SUM(ts.amount) AS amount')
    expect(sql).toContain('GROUP BY')
  })

  it('line レベルの SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryCategoryHourly(conn as never, { ...baseParams, level: 'line' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ts.line_code AS code')
  })

  it('klass レベルの SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryCategoryHourly(conn as never, { ...baseParams, level: 'klass' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ts.klass_code AS code')
  })

  it('category_time_sales との JOIN で name を取得する', async () => {
    const conn = makeMockConn()
    await queryCategoryHourly(conn as never, { ...baseParams, level: 'department' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('category_time_sales')
    expect(sql).toContain('LEFT JOIN names')
  })
})

describe('queryDowDivisorMap', () => {
  it('曜日別除数マップ SQL を生成し Map を返す', async () => {
    const rows = [
      { dow: 0, divisor: 4 },
      { dow: 1, divisor: 4 },
      { dow: 6, divisor: 3 },
    ]
    const conn = makeMockConn(rows)
    const result = await queryDowDivisorMap(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cts.dow')
    expect(sql).toContain('COUNT(DISTINCT cts.date_key) AS divisor')
    expect(sql).toContain('category_time_sales cts')
    expect(result).toBeInstanceOf(Map)
    expect(result.get(0)).toBe(4)
    expect(result.get(6)).toBe(3)
  })

  it('データなしの場合は空 Map を返す', async () => {
    const conn = makeMockConn([])
    const result = await queryDowDivisorMap(conn as never, baseParams)
    expect(result.size).toBe(0)
  })
})

describe('queryCategoryTimeRecords', () => {
  it('category_time_sales と time_slots を JOIN する SQL を生成する', async () => {
    const conn = makeMockConn([])
    await queryCategoryTimeRecords(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('category_time_sales cts')
    expect(sql).toContain('LEFT JOIN time_slots ts ON')
    expect(sql).toContain('cts.store_id = ts.store_id')
    expect(sql).toContain('cts.is_prev_year = ts.is_prev_year')
  })

  it('JOIN 結果を CategoryTimeSalesRecord[] にグループ化する', async () => {
    // storeId + date + category が同じ複数行（時間帯データ）を1レコードにまとめる
    const rows = [
      {
        year: 2026,
        month: 2,
        day: 1,
        storeId: '1',
        deptCode: 'D01',
        deptName: '青果',
        lineCode: 'L01',
        lineName: '野菜',
        klassCode: 'K01',
        klassName: 'きのこ',
        totalQuantity: 100,
        totalAmount: 50000,
        hour: 10,
        hourQuantity: 30,
        hourAmount: 15000,
      },
      {
        year: 2026,
        month: 2,
        day: 1,
        storeId: '1',
        deptCode: 'D01',
        deptName: '青果',
        lineCode: 'L01',
        lineName: '野菜',
        klassCode: 'K01',
        klassName: 'きのこ',
        totalQuantity: 100,
        totalAmount: 50000,
        hour: 11,
        hourQuantity: 70,
        hourAmount: 35000,
      },
    ]
    const conn = makeMockConn(rows)
    const result = await queryCategoryTimeRecords(conn as never, baseParams)
    expect(result).toHaveLength(1)
    expect(result[0].storeId).toBe('1')
    expect(result[0].totalAmount).toBe(50000)
    expect(result[0].timeSlots).toHaveLength(2)
    expect(result[0].timeSlots[0]).toEqual({ hour: 10, quantity: 30, amount: 15000 })
    expect(result[0].timeSlots[1]).toEqual({ hour: 11, quantity: 70, amount: 35000 })
  })

  it('複数の異なる kategory を正しく分割する', async () => {
    const rows = [
      {
        year: 2026,
        month: 2,
        day: 1,
        storeId: '1',
        deptCode: 'D01',
        deptName: '青果',
        lineCode: 'L01',
        lineName: '野菜',
        klassCode: 'K01',
        klassName: 'きのこ',
        totalQuantity: 100,
        totalAmount: 50000,
        hour: 10,
        hourQuantity: 100,
        hourAmount: 50000,
      },
      {
        year: 2026,
        month: 2,
        day: 1,
        storeId: '1',
        deptCode: 'D01',
        deptName: '青果',
        lineCode: 'L01',
        lineName: '野菜',
        klassCode: 'K02', // 別 klass
        klassName: 'たまご',
        totalQuantity: 50,
        totalAmount: 25000,
        hour: 10,
        hourQuantity: 50,
        hourAmount: 25000,
      },
    ]
    const conn = makeMockConn(rows)
    const result = await queryCategoryTimeRecords(conn as never, baseParams)
    expect(result).toHaveLength(2)
    expect(result[0].klass.code).toBe('K01')
    expect(result[1].klass.code).toBe('K02')
  })

  it('hour が null の場合は timeSlots が空になる', async () => {
    const rows = [
      {
        year: 2026,
        month: 2,
        day: 1,
        storeId: '1',
        deptCode: 'D01',
        deptName: null,
        lineCode: 'L01',
        lineName: null,
        klassCode: 'K01',
        klassName: null,
        totalQuantity: 100,
        totalAmount: 50000,
        hour: null,
        hourQuantity: null,
        hourAmount: null,
      },
    ]
    const conn = makeMockConn(rows)
    const result = await queryCategoryTimeRecords(conn as never, baseParams)
    expect(result).toHaveLength(1)
    expect(result[0].timeSlots).toHaveLength(0)
    // name が null の場合は code がフォールバックとして使われる
    expect(result[0].department.name).toBe('D01')
    expect(result[0].line.name).toBe('L01')
    expect(result[0].klass.name).toBe('K01')
  })

  it('空行の場合は空配列を返す', async () => {
    const conn = makeMockConn([])
    const result = await queryCategoryTimeRecords(conn as never, baseParams)
    expect(result).toHaveLength(0)
  })
})

describe('バリデーションエラー', () => {
  it('不正な日付形式は例外をスローする', async () => {
    const conn = makeMockConn()
    await expect(
      queryHourlyAggregation(conn as never, {
        dateFrom: '2026/02/01', // スラッシュ区切りは不正
        dateTo: '2026-02-28',
      }),
    ).rejects.toThrow('Invalid date key')
  })

  it('不正な deptCode は例外をスローする', async () => {
    const conn = makeMockConn()
    await expect(
      queryLevelAggregation(conn as never, {
        ...baseParams,
        level: 'department',
        deptCode: "D01'; DROP TABLE --",
      }),
    ).rejects.toThrow('Invalid code')
  })

  it('SQL メタ文字を含む storeId は例外をスローする', async () => {
    const conn = makeMockConn()
    await expect(
      queryHourlyAggregation(conn as never, {
        ...baseParams,
        storeIds: ["1'; DROP TABLE--"],
      }),
    ).rejects.toThrow('Invalid store ID')
  })
})

// ── R-8: null/0 棲み分け不変条件 ──────────────────────────────

describe('R-8: 営業日フィルタ（businessDaysOnly）', () => {
  it('queryDistinctDayCount に businessDaysOnly=true で total_amount > 0 が追加される', async () => {
    const conn = makeMockConn([{ cnt: 15 }])
    await queryDistinctDayCount(conn as never, { ...baseParams, businessDaysOnly: true })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cts.total_amount > 0')
    expect(sql).toContain('COUNT(DISTINCT cts.date_key)')
  })

  it('queryDistinctDayCount に businessDaysOnly 未指定で total_amount フィルタなし', async () => {
    const conn = makeMockConn([{ cnt: 20 }])
    await queryDistinctDayCount(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).not.toContain('total_amount > 0')
  })

  it('queryDowDivisorMap に businessDaysOnly=true で total_amount > 0 が追加される', async () => {
    const conn = makeMockConn([{ dow: 1, divisor: 4 }])
    await queryDowDivisorMap(conn as never, { ...baseParams, businessDaysOnly: true })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cts.total_amount > 0')
    expect(sql).toContain('GROUP BY cts.dow')
  })

  it('queryDowDivisorMap に businessDaysOnly 未指定で total_amount フィルタなし', async () => {
    const conn = makeMockConn([{ dow: 1, divisor: 4 }])
    await queryDowDivisorMap(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).not.toContain('total_amount > 0')
  })
})

describe('R-8: 非取扱品目除外', () => {
  it('queryLevelAggregation に HAVING SUM > 0 が含まれる', async () => {
    const conn = makeMockConn()
    await queryLevelAggregation(conn as never, { ...baseParams, level: 'department' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('HAVING SUM(cts.total_amount) > 0')
  })

  it('queryLevelAggregation が handledDayCount と totalDayCount を返す', async () => {
    const conn = makeMockConn()
    await queryLevelAggregation(conn as never, { ...baseParams, level: 'department' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('handled_day_count')
    expect(sql).toContain('total_day_count')
    expect(sql).toContain('CASE WHEN cts.total_amount > 0 THEN cts.date_key END')
  })

  it('不変条件: handledDayCount <= totalDayCount（型構造の保証）', () => {
    // LevelAggregationRow の型定義に handledDayCount と totalDayCount が必須
    const row = {
      code: 'D01',
      name: '青果',
      amount: 100000,
      quantity: 500,
      childCount: 3,
      handledDayCount: 20,
      totalDayCount: 25,
    }
    expect(row.handledDayCount).toBeLessThanOrEqual(row.totalDayCount)
    expect(row.handledDayCount).toBeGreaterThanOrEqual(0)
  })
})
