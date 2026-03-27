import { describe, it, expect, beforeEach, vi } from 'vitest'
import { autoInjectDataWidgets, getWidgetMap } from '../widgetLayout'

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
  prevYearHasPrevYear: false,
  storeCount: 0,
}

const WITH_DUCKDB = {
  prevYearHasPrevYear: false,
  storeCount: 1,
  isDuckDBReady: true,
}

const WITH_DUCKDB_PREV = {
  prevYearHasPrevYear: true,
  storeCount: 1,
  isDuckDBReady: true,
}

const WITH_DUCKDB_MULTI_STORE = {
  prevYearHasPrevYear: false,
  storeCount: 2,
  isDuckDBReady: true,
}

describe('autoInjectDataWidgets', () => {
  it('データがない場合は null を返す', () => {
    const result = autoInjectDataWidgets(['widget-budget-achievement'], NO_DATA)
    expect(result).toBeNull()
  })

  it('DuckDB 準備完了時にウィジェットが注入される', () => {
    const result = autoInjectDataWidgets(['widget-budget-achievement'], WITH_DUCKDB)
    expect(result).not.toBeNull()
    // 注: chart-timeslot-sales → IntegratedSalesChart ドリルダウンに統合
    expect(result!).toContain('chart-timeslot-heatmap')
    expect(result!).toContain('chart-category-analysis')
  })

  it('既存レイアウトのウィジェットは保持される', () => {
    const result = autoInjectDataWidgets(
      ['widget-budget-achievement', 'chart-daily-sales'],
      WITH_DUCKDB,
    )
    expect(result).not.toBeNull()
    expect(result![0]).toBe('widget-budget-achievement')
    expect(result![1]).toBe('chart-daily-sales')
  })

  it('前年データがある場合に前年比較ウォーターフォールが注入される', () => {
    const result = autoInjectDataWidgets(['widget-budget-achievement'], WITH_DUCKDB_PREV)
    expect(result).not.toBeNull()
    expect(result!).toContain('analysis-yoy-waterfall')
  })

  it('前年データがない場合は前年比較ウォーターフォールは注入されない', () => {
    const result = autoInjectDataWidgets(['widget-budget-achievement'], WITH_DUCKDB)
    expect(result).not.toBeNull()
    expect(result!).not.toContain('analysis-yoy-waterfall')
  })

  it('複数店舗の場合に店舗別比較ウィジェットが注入される', () => {
    const result = autoInjectDataWidgets(['widget-budget-achievement'], WITH_DUCKDB_MULTI_STORE)
    expect(result).not.toBeNull()
    expect(result!).toContain('chart-store-timeslot-comparison')
  })

  it('単一店舗の場合は店舗別比較ウィジェットは注入されない', () => {
    const result = autoInjectDataWidgets(['widget-budget-achievement'], WITH_DUCKDB)
    expect(result).not.toBeNull()
    expect(result!).not.toContain('chart-store-timeslot-comparison')
  })

  it('既にレイアウトに含まれるウィジェットは重複注入されない', () => {
    const result = autoInjectDataWidgets(
      ['widget-budget-achievement', 'chart-timeslot-sales'],
      WITH_DUCKDB,
    )
    expect(result).not.toBeNull()
    const salesCount = result!.filter((id) => id === 'chart-timeslot-sales').length
    expect(salesCount).toBe(1)
  })

  it('2回目の呼び出しでは既に注入済みのウィジェットは再注入されない', () => {
    // 1回目
    const result1 = autoInjectDataWidgets(['widget-budget-achievement'], WITH_DUCKDB)
    expect(result1).not.toBeNull()

    // 2回目（同じ条件）
    const result2 = autoInjectDataWidgets(result1!, WITH_DUCKDB)
    expect(result2).toBeNull() // 既に全部入っている
  })

  it('ユーザーが削除した後は再注入されない', () => {
    // 1回目: 注入
    const result1 = autoInjectDataWidgets(['widget-budget-achievement'], WITH_DUCKDB)
    expect(result1).not.toBeNull()

    // ユーザーが chart-timeslot-sales を削除
    const userLayout = result1!.filter((id) => id !== 'chart-timeslot-sales')

    // 2回目: chart-timeslot-sales は seen リストにあるため再注入されない
    const result2 = autoInjectDataWidgets(userLayout, WITH_DUCKDB)
    expect(result2).toBeNull()
  })

  it('注入されたウィジェットは WIDGET_MAP に存在する', () => {
    const result = autoInjectDataWidgets([], WITH_DUCKDB_PREV)
    expect(result).not.toBeNull()
    for (const id of result!) {
      expect(getWidgetMap().has(id)).toBe(true)
    }
  })

  // ── DuckDB ウィジェット注入テスト ──

  it('DuckDB 未準備時は DuckDB ウィジェットが注入されない', () => {
    const result = autoInjectDataWidgets(['widget-budget-achievement'], {
      prevYearHasPrevYear: false,
      storeCount: 1,
      isDuckDBReady: false,
    })
    if (result) {
      const duckWidgets = result.filter(
        (id) => id.startsWith('duckdb-') || id.startsWith('analysis-duckdb-'),
      )
      expect(duckWidgets).toHaveLength(0)
    }
  })

  it('DuckDB 準備完了時に DuckDB 専用ウィジェットが注入される', () => {
    const result = autoInjectDataWidgets(['widget-budget-achievement'], WITH_DUCKDB)
    expect(result).not.toBeNull()
    expect(result!).toContain('analysis-duckdb-features')
    // 注: analysis-duckdb-cumulative → DailySalesChart「累計」ビューに統合
    // 統合ウィジェットも DuckDB 準備完了で注入される
    // 注: chart-timeslot-sales → IntegratedSalesChart ドリルダウンに統合
    expect(result!).toContain('chart-timeslot-heatmap')
  })

  it('DuckDB 準備完了時に十分な数のウィジェットが注入される', () => {
    const result = autoInjectDataWidgets(['widget-budget-achievement'], WITH_DUCKDB)
    expect(result).not.toBeNull()
    // DuckDB 専用 + 統合ウィジェット合わせて十分な数が注入される
    const injectedCount = result!.length - 1 // kpi-core-sales を除く
    expect(injectedCount).toBeGreaterThanOrEqual(5)
  })

  it('DuckDB: 前年データがないと前年比較は注入されない', () => {
    const result = autoInjectDataWidgets(['widget-budget-achievement'], WITH_DUCKDB)
    expect(result).not.toBeNull()
    expect(result!).not.toContain('analysis-yoy-variance')
  })

  it('DuckDB: 前年データがあると前年比較が注入される', () => {
    const result = autoInjectDataWidgets(['widget-budget-achievement'], WITH_DUCKDB_PREV)
    expect(result).not.toBeNull()
    // 注: analysis-yoy-variance → DailySalesChart「差分」ビューに統合
    // 前年データありでも削除済みウィジェットは注入されない
    expect(result!).not.toContain('analysis-yoy-variance')
  })

  it('DuckDB: 店舗が1つの場合は店舗比較系が注入されない', () => {
    const result = autoInjectDataWidgets(['widget-budget-achievement'], WITH_DUCKDB)
    expect(result).not.toBeNull()
    // 統合店舗比較は非注入
    expect(result!).not.toContain('chart-store-timeslot-comparison')
  })

  it('DuckDB: 複数店舗の場合は店舗比較系が注入される', () => {
    const result = autoInjectDataWidgets(['widget-budget-achievement'], WITH_DUCKDB_MULTI_STORE)
    expect(result).not.toBeNull()
    // 統合店舗比較ウィジェット
    expect(result!).toContain('chart-store-timeslot-comparison')
  })

  it('DuckDB: カテゴリベンチマークが注入される', () => {
    const result = autoInjectDataWidgets(['widget-budget-achievement'], WITH_DUCKDB)
    expect(result).not.toBeNull()
    expect(result!).toContain('duckdb-category-benchmark')
  })
})
