import { describe, it, expect, beforeEach } from 'vitest'
import { loadSettingsFromStorage } from './useSettings'

// jsdom 環境では localStorage がモック可能
beforeEach(() => {
  localStorage.clear()
})

describe('loadSettingsFromStorage', () => {
  it('保存データがない場合は null を返す', () => {
    expect(loadSettingsFromStorage()).toBeNull()
  })

  it('保存された設定を読み込める', () => {
    const settings = {
      targetYear: 2026,
      targetMonth: 3,
      targetGrossProfitRate: 0.28,
    }
    localStorage.setItem('shiire-arari-settings', JSON.stringify(settings))

    const loaded = loadSettingsFromStorage()
    expect(loaded).not.toBeNull()
    expect(loaded!.targetYear).toBe(2026)
    expect(loaded!.targetMonth).toBe(3)
    expect(loaded!.targetGrossProfitRate).toBe(0.28)
  })

  it('不正なJSONの場合は null を返す', () => {
    localStorage.setItem('shiire-arari-settings', '{invalid json}')
    expect(loadSettingsFromStorage()).toBeNull()
  })

  it('空文字列の場合は null を返す', () => {
    // JSON.parse('') はエラーを投げるのでcatchされてnull
    localStorage.setItem('shiire-arari-settings', '')
    expect(loadSettingsFromStorage()).toBeNull()
  })

  it('部分的な設定のみ保存されている場合でも読み込める', () => {
    localStorage.setItem('shiire-arari-settings', JSON.stringify({ flowerCostRate: 0.75 }))

    const loaded = loadSettingsFromStorage()
    expect(loaded).not.toBeNull()
    expect(loaded!.flowerCostRate).toBe(0.75)
    // 他のフィールドは含まれない（マージはuseSettings側の責務）
    expect(loaded!.targetYear).toBeUndefined()
  })
})
