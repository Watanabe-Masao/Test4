/**
 * ImportService — 店舗抽出テスト
 *
 * budget/initialSettings インポート時にも stores が生成されることを検証する。
 * purchase/classifiedSales なしで予算や初期設定のみインポートした場合の
 * 店舗数0件バグの再発防止。
 */
import { describe, it, expect } from 'vitest'
import { processFileData } from '../ImportService'
import { createEmptyMonthlyData } from '@/domain/models/MonthlyData'
import type { AppSettings } from '@/domain/models/storeTypes'

const defaultSettings: AppSettings = {
  targetYear: 2025,
  targetMonth: 1,
  targetGrossProfitRate: 0.25,
  warningThreshold: 0.23,
  flowerCostRate: 0.8,
  directProduceCostRate: 0.85,
  defaultMarkupRate: 0.26,
  defaultBudget: 6450000,
  dataEndDay: null,
  gpDiffBlueThreshold: 0.2,
  gpDiffYellowThreshold: -0.2,
  gpDiffRedThreshold: -0.5,
  discountBlueThreshold: 0.02,
  discountYellowThreshold: 0.025,
  discountRedThreshold: 0.03,
  supplierCategoryMap: {},
  prevYearSourceYear: null,
  prevYearSourceMonth: null,
  prevYearDowOffset: null,
  alignmentPolicy: 'sameDayOfWeek' as const,
  conditionConfig: { global: {}, storeOverrides: {} },
  userCategoryLabels: {},
  storeLocations: {},
}

describe('processFileData — 店舗抽出', () => {
  it('initialSettings インポートで stores に店舗が追加されること', () => {
    // 初期設定ファイルのデータ形式: ヘッダー + データ行
    const rows: unknown[][] = [
      ['在庫基準日', '期首在庫', '期末在庫', '粗利額予算'],
      ['0001', 1000000, 900000, 500000],
      ['0002', 2000000, 1800000, 800000],
    ]

    const result = processFileData(
      'initialSettings',
      rows,
      'settings.xlsx',
      createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' }),
      defaultSettings,
    )

    // stores が0件ではないこと
    expect(result.data.stores.size).toBeGreaterThan(0)
    // 店舗数が正しいこと
    expect(result.data.stores.size).toBe(2)
    // 仮の店舗名が設定されていること
    expect(result.data.stores.get('1')).toBeDefined()
    expect(result.data.stores.get('2')).toBeDefined()
  })

  it('budget インポートで stores に店舗が追加されること', () => {
    // 予算ファイルのデータ形式: ヘッダー + データ行
    // [店舗コード, 日付, 予算金額]
    const rows: unknown[][] = [
      ['店舗コード', '日付', '予算金額'],
      ['0001', '2025/1/1', 100000],
      ['0001', '2025/1/2', 110000],
      ['0002', '2025/1/1', 80000],
    ]

    const result = processFileData(
      'budget',
      rows,
      'budget.xlsx',
      createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' }),
      defaultSettings,
    )

    // stores が0件ではないこと
    expect(result.data.stores.size).toBeGreaterThan(0)
    // 店舗数が正しいこと（0001 と 0002）
    expect(result.data.stores.size).toBe(2)
    // budget データも正しく処理されていること
    expect(result.data.budget.size).toBeGreaterThan(0)
  })

  it('既存 stores がある場合、budget/settings の仮店舗で上書きしないこと', () => {
    const existing = createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' })
    const existingWithStores = {
      ...existing,
      stores: new Map([['1', { id: '1', code: '0001', name: '本店' }]]),
    }

    const rows: unknown[][] = [
      ['在庫基準日', '期首在庫', '期末在庫', '粗利額予算'],
      ['0001', 1000000, 900000, 500000],
      ['0002', 2000000, 1800000, 800000],
    ]

    const result = processFileData(
      'initialSettings',
      rows,
      'settings.xlsx',
      existingWithStores,
      defaultSettings,
    )

    // 既存の店舗名は保持されること
    expect(result.data.stores.get('1')?.name).toBe('本店')
    // 新しい店舗は仮名で追加されること
    expect(result.data.stores.get('2')).toBeDefined()
    expect(result.data.stores.size).toBe(2)
  })
})
