import { describe, it, expect, beforeEach, vi } from 'vitest'
import { autoInjectDataWidgets, WIDGET_MAP } from '../widgetLayout'

// localStorage モック
const storage = new Map<string, string>()
beforeEach(() => {
  storage.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  })
})

const NO_DATA = {
  ctsRecordCount: 0,
  prevYearHasPrevYear: false,
  storeCount: 0,
}

const WITH_CTS = {
  ctsRecordCount: 1,
  prevYearHasPrevYear: false,
  storeCount: 1,
}

const WITH_CTS_PREV = {
  ctsRecordCount: 1,
  prevYearHasPrevYear: true,
  storeCount: 1,
}

const WITH_MULTI_STORE = {
  ctsRecordCount: 1,
  prevYearHasPrevYear: false,
  storeCount: 2,
}

const WITH_DUCKDB = {
  ctsRecordCount: 0,
  prevYearHasPrevYear: false,
  storeCount: 1,
  isDuckDBReady: true,
}

const WITH_DUCKDB_PREV = {
  ctsRecordCount: 0,
  prevYearHasPrevYear: true,
  storeCount: 1,
  isDuckDBReady: true,
}

const WITH_DUCKDB_MULTI_STORE = {
  ctsRecordCount: 0,
  prevYearHasPrevYear: false,
  storeCount: 2,
  isDuckDBReady: true,
}

describe('autoInjectDataWidgets', () => {
  it('データがない場合は null を返す', () => {
    const result = autoInjectDataWidgets(['kpi-core-sales'], NO_DATA)
    expect(result).toBeNull()
  })

  it('分類別時間帯データがある場合にウィジェットが注入される', () => {
    const result = autoInjectDataWidgets(['kpi-core-sales'], WITH_CTS)
    expect(result).not.toBeNull()
    expect(result!).toContain('chart-timeslot-sales')
    expect(result!).toContain('chart-timeslot-heatmap')
    expect(result!).toContain('chart-category-hierarchy-explorer')
  })

  it('既存レイアウトのウィジェットは保持される', () => {
    const result = autoInjectDataWidgets(['kpi-core-sales', 'chart-daily-sales'], WITH_CTS)
    expect(result).not.toBeNull()
    expect(result![0]).toBe('kpi-core-sales')
    expect(result![1]).toBe('chart-daily-sales')
  })

  it('前年データがある場合に前年比較ウォーターフォールが注入される', () => {
    const result = autoInjectDataWidgets(['kpi-core-sales'], WITH_CTS_PREV)
    expect(result).not.toBeNull()
    expect(result!).toContain('analysis-yoy-waterfall')
  })

  it('前年データがない場合は前年比較ウォーターフォールは注入されない', () => {
    const result = autoInjectDataWidgets(['kpi-core-sales'], WITH_CTS)
    expect(result).not.toBeNull()
    expect(result!).not.toContain('analysis-yoy-waterfall')
  })

  it('複数店舗の場合に店舗別比較ウィジェットが注入される', () => {
    const result = autoInjectDataWidgets(['kpi-core-sales'], WITH_MULTI_STORE)
    expect(result).not.toBeNull()
    expect(result!).toContain('chart-store-timeslot-comparison')
  })

  it('単一店舗の場合は店舗別比較ウィジェットは注入されない', () => {
    const result = autoInjectDataWidgets(['kpi-core-sales'], WITH_CTS)
    expect(result).not.toBeNull()
    expect(result!).not.toContain('chart-store-timeslot-comparison')
  })

  it('既にレイアウトに含まれるウィジェットは重複注入されない', () => {
    const result = autoInjectDataWidgets(['kpi-core-sales', 'chart-timeslot-sales'], WITH_CTS)
    expect(result).not.toBeNull()
    const salesCount = result!.filter((id) => id === 'chart-timeslot-sales').length
    expect(salesCount).toBe(1)
  })

  it('2回目の呼び出しでは既に注入済みのウィジェットは再注入されない', () => {
    // 1回目
    const result1 = autoInjectDataWidgets(['kpi-core-sales'], WITH_CTS)
    expect(result1).not.toBeNull()

    // 2回目（同じ条件）
    const result2 = autoInjectDataWidgets(result1!, WITH_CTS)
    expect(result2).toBeNull() // 既に全部入っている
  })

  it('ユーザーが削除した後は再注入されない', () => {
    // 1回目: 注入
    const result1 = autoInjectDataWidgets(['kpi-core-sales'], WITH_CTS)
    expect(result1).not.toBeNull()

    // ユーザーが chart-timeslot-sales を削除
    const userLayout = result1!.filter((id) => id !== 'chart-timeslot-sales')

    // 2回目: chart-timeslot-sales は seen リストにあるため再注入されない
    const result2 = autoInjectDataWidgets(userLayout, WITH_CTS)
    expect(result2).toBeNull()
  })

  it('注入されたウィジェットは WIDGET_MAP に存在する', () => {
    const result = autoInjectDataWidgets([], WITH_CTS_PREV)
    expect(result).not.toBeNull()
    for (const id of result!) {
      expect(WIDGET_MAP.has(id)).toBe(true)
    }
  })

  // ── DuckDB ウィジェット注入テスト ──

  it('DuckDB 未準備時は DuckDB ウィジェットが注入されない', () => {
    const result = autoInjectDataWidgets(['kpi-core-sales'], {
      ...WITH_CTS,
      isDuckDBReady: false,
    })
    if (result) {
      const duckWidgets = result.filter(
        (id) => id.startsWith('duckdb-') || id.startsWith('analysis-duckdb-'),
      )
      expect(duckWidgets).toHaveLength(0)
    }
  })

  it('DuckDB 準備完了時に DuckDB ウィジェットが注入される', () => {
    const result = autoInjectDataWidgets(['kpi-core-sales'], WITH_DUCKDB)
    expect(result).not.toBeNull()
    expect(result!).toContain('analysis-duckdb-features')
    expect(result!).toContain('analysis-duckdb-cumulative')
    expect(result!).toContain('duckdb-timeslot')
    expect(result!).toContain('duckdb-heatmap')
  })

  it('DuckDB: ctsRecordCount が 0 でも DuckDB ウィジェットは注入される', () => {
    const result = autoInjectDataWidgets(['kpi-core-sales'], WITH_DUCKDB)
    expect(result).not.toBeNull()
    const duckWidgets = result!.filter(
      (id) => id.startsWith('duckdb-') || id.startsWith('analysis-duckdb-'),
    )
    expect(duckWidgets.length).toBeGreaterThanOrEqual(8)
  })

  it('DuckDB: 前年データがないと analysis-duckdb-yoy は注入されない', () => {
    const result = autoInjectDataWidgets(['kpi-core-sales'], WITH_DUCKDB)
    expect(result).not.toBeNull()
    expect(result!).not.toContain('analysis-duckdb-yoy')
  })

  it('DuckDB: 前年データがあると analysis-duckdb-yoy が注入される', () => {
    const result = autoInjectDataWidgets(['kpi-core-sales'], WITH_DUCKDB_PREV)
    expect(result).not.toBeNull()
    expect(result!).toContain('analysis-duckdb-yoy')
  })

  it('DuckDB: 店舗が1つの場合は店舗比較系が注入されない', () => {
    const result = autoInjectDataWidgets(['kpi-core-sales'], WITH_DUCKDB)
    expect(result).not.toBeNull()
    expect(result!).not.toContain('duckdb-store-hourly')
    expect(result!).not.toContain('duckdb-store-benchmark')
  })

  it('DuckDB: 複数店舗の場合は店舗比較系が注入される', () => {
    const result = autoInjectDataWidgets(['kpi-core-sales'], WITH_DUCKDB_MULTI_STORE)
    expect(result).not.toBeNull()
    expect(result!).toContain('duckdb-store-hourly')
    expect(result!).toContain('duckdb-store-benchmark')
  })
})
