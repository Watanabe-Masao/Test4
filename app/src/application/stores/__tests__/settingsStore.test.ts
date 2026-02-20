import { describe, it, expect, beforeEach } from 'vitest'
import { useSettingsStore } from '../settingsStore'

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.getState().reset()
  })

  it('初期状態にデフォルト設定がある', () => {
    const { settings } = useSettingsStore.getState()
    expect(settings.targetGrossProfitRate).toBe(0.25)
    expect(settings.warningThreshold).toBe(0.23)
    expect(settings.flowerCostRate).toBe(0.8)
    expect(settings.directProduceCostRate).toBe(0.85)
    expect(settings.defaultMarkupRate).toBe(0.26)
    expect(settings.defaultBudget).toBe(6_450_000)
    expect(settings.dataEndDay).toBeNull()
    expect(settings.supplierCategoryMap).toEqual({})
  })

  it('updateSettings で部分更新できる', () => {
    useSettingsStore.getState().updateSettings({
      targetGrossProfitRate: 0.30,
    })

    const { settings } = useSettingsStore.getState()
    expect(settings.targetGrossProfitRate).toBe(0.30)
    // 他の値は変更されない
    expect(settings.warningThreshold).toBe(0.23)
  })

  it('updateSettings で複数フィールドを同時に更新できる', () => {
    useSettingsStore.getState().updateSettings({
      targetYear: 2025,
      targetMonth: 6,
      flowerCostRate: 0.75,
    })

    const { settings } = useSettingsStore.getState()
    expect(settings.targetYear).toBe(2025)
    expect(settings.targetMonth).toBe(6)
    expect(settings.flowerCostRate).toBe(0.75)
  })

  it('updateSettings で supplierCategoryMap を更新できる', () => {
    useSettingsStore.getState().updateSettings({
      supplierCategoryMap: { '001': '市場仕入', '002': 'LFC' },
    })

    const { settings } = useSettingsStore.getState()
    expect(settings.supplierCategoryMap['001']).toBe('市場仕入')
    expect(settings.supplierCategoryMap['002']).toBe('LFC')
  })

  it('updateSettings で前年比設定を更新できる', () => {
    useSettingsStore.getState().updateSettings({
      prevYearSourceYear: 2024,
      prevYearSourceMonth: 3,
      prevYearDowOffset: 2,
    })

    const { settings } = useSettingsStore.getState()
    expect(settings.prevYearSourceYear).toBe(2024)
    expect(settings.prevYearSourceMonth).toBe(3)
    expect(settings.prevYearDowOffset).toBe(2)
  })

  it('reset でデフォルト設定に戻る', () => {
    useSettingsStore.getState().updateSettings({
      targetGrossProfitRate: 0.50,
      flowerCostRate: 0.99,
    })

    useSettingsStore.getState().reset()

    const { settings } = useSettingsStore.getState()
    expect(settings.targetGrossProfitRate).toBe(0.25)
    expect(settings.flowerCostRate).toBe(0.8)
  })

  it('連続した updateSettings が正しく累積される', () => {
    useSettingsStore.getState().updateSettings({ targetYear: 2025 })
    useSettingsStore.getState().updateSettings({ targetMonth: 3 })
    useSettingsStore.getState().updateSettings({ defaultBudget: 7_000_000 })

    const { settings } = useSettingsStore.getState()
    expect(settings.targetYear).toBe(2025)
    expect(settings.targetMonth).toBe(3)
    expect(settings.defaultBudget).toBe(7_000_000)
  })
})
