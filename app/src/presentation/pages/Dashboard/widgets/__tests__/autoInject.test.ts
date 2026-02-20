import { describe, it, expect, beforeEach, vi } from 'vitest'
import { autoInjectDataWidgets, WIDGET_MAP } from '../registry'

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
  categoryTimeSales: { records: [] as unknown[] },
  prevYearCategoryTimeSales: { hasPrevYear: false },
  stores: new Map() as ReadonlyMap<string, unknown>,
}

const WITH_CTS = {
  categoryTimeSales: { records: [{ day: 1 }] },
  prevYearCategoryTimeSales: { hasPrevYear: false },
  stores: new Map([['1', {}]]) as ReadonlyMap<string, unknown>,
}

const WITH_CTS_PREV = {
  categoryTimeSales: { records: [{ day: 1 }] },
  prevYearCategoryTimeSales: { hasPrevYear: true },
  stores: new Map([['1', {}]]) as ReadonlyMap<string, unknown>,
}

const WITH_MULTI_STORE = {
  categoryTimeSales: { records: [{ day: 1 }] },
  prevYearCategoryTimeSales: { hasPrevYear: false },
  stores: new Map([['1', {}], ['2', {}]]) as ReadonlyMap<string, unknown>,
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

  it('前年データがある場合に前年比較ウィジェットが注入される', () => {
    const result = autoInjectDataWidgets(['kpi-core-sales'], WITH_CTS_PREV)
    expect(result).not.toBeNull()
    expect(result!).toContain('chart-timeslot-yoy-comparison')
  })

  it('前年データがない場合は前年比較ウィジェットは注入されない', () => {
    const result = autoInjectDataWidgets(['kpi-core-sales'], WITH_CTS)
    expect(result).not.toBeNull()
    expect(result!).not.toContain('chart-timeslot-yoy-comparison')
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
    const result = autoInjectDataWidgets(
      ['kpi-core-sales', 'chart-timeslot-sales'],
      WITH_CTS,
    )
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
})
