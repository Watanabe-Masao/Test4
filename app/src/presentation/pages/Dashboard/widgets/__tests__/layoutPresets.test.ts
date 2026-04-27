/**
 * Phase 3.3: レイアウトプリセット テスト
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LAYOUT_PRESETS, loadActivePreset, saveActivePreset } from '../layoutPresets'

describe('レイアウトプリセット', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saveActivePreset / loadActivePreset が動作する', () => {
    expect(loadActivePreset()).toBeNull()

    saveActivePreset('executive')
    expect(loadActivePreset()).toBe('executive')

    saveActivePreset(null)
    expect(loadActivePreset()).toBeNull()
  })

  it('各プリセットの widgetIds が重複していない', () => {
    for (const preset of LAYOUT_PRESETS) {
      const unique = new Set(preset.widgetIds)
      expect(unique.size).toBe(preset.widgetIds.length)
    }
  })

  it('localStorage エラー時に例外を投げない', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('test')
    })
    expect(loadActivePreset()).toBeNull()
    vi.restoreAllMocks()
  })
})
