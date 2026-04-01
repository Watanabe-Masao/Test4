import { describe, it, expect, beforeEach } from 'vitest'
import { useDataStore } from '../dataStore'
import { createEmptyMonthlyData } from '@/domain/models/MonthlyData'

describe('dataStore', () => {
  beforeEach(() => {
    // ストアをリセット
    useDataStore.getState().reset()
  })

  it('初期状態は空のデータ', () => {
    const state = useDataStore.getState()
    expect(state.currentMonthData?.stores.size ?? 0).toBe(0)
    expect(state.storeResults.size).toBe(0)
    expect(state.validationMessages).toEqual([])
  })

  it('setCurrentMonthData でデータを設定できる', () => {
    const data = {
      ...createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' }),
      stores: new Map([['s1', { id: 's1', code: '001', name: 'テスト店' }]]),
    }
    useDataStore.getState().setCurrentMonthData(data)

    expect(useDataStore.getState().currentMonthData?.stores.size).toBe(1)
    expect(useDataStore.getState().currentMonthData?.stores.get('s1')?.name).toBe('テスト店')
  })

  it('setStoreResults で計算結果を設定できる', () => {
    const results = new Map([['s1', { storeId: 's1' }]]) as ReadonlyMap<string, unknown>
    useDataStore.getState().setStoreResults(results as never)

    expect(useDataStore.getState().storeResults.size).toBe(1)
  })

  it('setValidationMessages でバリデーションメッセージを設定できる', () => {
    const messages = [
      { level: 'error' as const, message: 'テストエラー' },
      { level: 'warning' as const, message: 'テスト警告' },
    ]
    useDataStore.getState().setValidationMessages(messages)

    expect(useDataStore.getState().validationMessages).toHaveLength(2)
    expect(useDataStore.getState().validationMessages[0].message).toBe('テストエラー')
  })

  it('setPrevYearMonthData で前年データを設定できる', () => {
    const prevYearData = {
      ...createEmptyMonthlyData({ year: 2024, month: 1, importedAt: '' }),
      classifiedSales: {
        records: [
          {
            year: 2024,
            month: 1,
            day: 1,
            storeId: 's1',
            storeName: 'Store s1',
            groupName: 'G1',
            departmentName: 'D1',
            lineName: 'L1',
            className: 'C1',
            salesAmount: 100,
            discount71: 0,
            discount72: 0,
            discount73: 0,
            discount74: 0,
          },
        ],
      },
    }

    useDataStore.getState().setPrevYearMonthData(prevYearData)

    const state = useDataStore.getState()
    expect(state.appData.prevYear?.classifiedSales.records).toHaveLength(1)
    expect(state.appData.prevYear?.classifiedSales.records[0].storeId).toBe('s1')
  })

  it('updateInventory で在庫設定を更新できる', () => {
    const data = createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' })
    useDataStore.getState().setCurrentMonthData(data)

    useDataStore.getState().updateInventory('s1', {
      openingInventory: 1000,
      closingInventory: 2000,
    })

    const config = useDataStore.getState().currentMonthData?.settings.get('s1')
    expect(config?.openingInventory).toBe(1000)
    expect(config?.closingInventory).toBe(2000)
  })

  it('updateInventory で既存設定を部分更新できる', () => {
    const data = createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' })
    useDataStore.getState().setCurrentMonthData(data)

    useDataStore.getState().updateInventory('s1', {
      openingInventory: 1000,
    })
    useDataStore.getState().updateInventory('s1', {
      closingInventory: 2000,
    })

    const config = useDataStore.getState().currentMonthData?.settings.get('s1')
    expect(config?.openingInventory).toBe(1000)
    expect(config?.closingInventory).toBe(2000)
  })

  it('reset でストアが初期状態に戻る', () => {
    useDataStore.getState().setValidationMessages([{ level: 'info', message: 'test' }])
    expect(useDataStore.getState().validationMessages).toHaveLength(1)

    useDataStore.getState().reset()
    expect(useDataStore.getState().validationMessages).toEqual([])
    expect(useDataStore.getState().currentMonthData?.stores.size ?? 0).toBe(0)
  })

  // ─── Step F: MonthlyData 移行で追加されたテスト ────────

  it('setCurrentMonthData で authoritativeDataVersion がインクリメントされる', () => {
    const data = createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' })
    expect(useDataStore.getState().authoritativeDataVersion).toBe(0)

    useDataStore.getState().setCurrentMonthData(data)
    expect(useDataStore.getState().authoritativeDataVersion).toBe(1)

    useDataStore.getState().setCurrentMonthData(data)
    expect(useDataStore.getState().authoritativeDataVersion).toBe(2)
  })

  it('setPrevYearMonthData で comparisonDataVersion がインクリメントされる', () => {
    const prevYear = createEmptyMonthlyData({ year: 2024, month: 1, importedAt: '' })
    expect(useDataStore.getState().comparisonDataVersion).toBe(0)

    useDataStore.getState().setPrevYearMonthData(prevYear)
    expect(useDataStore.getState().comparisonDataVersion).toBe(1)
  })

  it('reset で全バージョンが 0 に戻る', () => {
    const data = createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' })
    useDataStore.getState().setCurrentMonthData(data)
    useDataStore.getState().setPrevYearMonthData(data)
    expect(useDataStore.getState().authoritativeDataVersion).toBeGreaterThan(0)
    expect(useDataStore.getState().comparisonDataVersion).toBeGreaterThan(0)

    useDataStore.getState().reset()
    expect(useDataStore.getState().authoritativeDataVersion).toBe(0)
    expect(useDataStore.getState().comparisonDataVersion).toBe(0)
    expect(useDataStore.getState().currentMonthData).toBeNull()
    expect(useDataStore.getState().appData.current).toBeNull()
    expect(useDataStore.getState().appData.prevYear).toBeNull()
  })

  it('replaceAppData で current 変更時のみ authoritativeDataVersion が上がる', () => {
    const m1 = createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' })
    const m2 = createEmptyMonthlyData({ year: 2025, month: 2, importedAt: '' })
    useDataStore.getState().replaceAppData({ current: m1, prevYear: null })
    const v1 = useDataStore.getState().authoritativeDataVersion

    // 同じ current で prevYear だけ変更 → authoritativeDataVersion 不変
    useDataStore.getState().replaceAppData({ current: m1, prevYear: m2 })
    expect(useDataStore.getState().authoritativeDataVersion).toBe(v1)
    expect(useDataStore.getState().comparisonDataVersion).toBeGreaterThan(0)

    // current 変更 → authoritativeDataVersion インクリメント
    useDataStore.getState().replaceAppData({ current: m2, prevYear: m2 })
    expect(useDataStore.getState().authoritativeDataVersion).toBeGreaterThan(v1)
  })

  it('DataStore interface に ImportedData 関連プロパティが存在しない', () => {
    const state = useDataStore.getState()
    // Step F で削除済み: data, legacyData, dataVersion, _calculationData
    expect('data' in state).toBe(false)
    expect('legacyData' in state).toBe(false)
    expect('dataVersion' in state).toBe(false)
    expect('_calculationData' in state).toBe(false)
    expect('setImportedData' in state).toBe(false)
    expect('setPrevYearAutoData' in state).toBe(false)
  })
})
