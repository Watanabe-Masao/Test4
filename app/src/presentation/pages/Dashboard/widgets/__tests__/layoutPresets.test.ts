/**
 * Phase 3.3: レイアウトプリセット テスト
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  LAYOUT_PRESETS,
  PRESET_MAP,
  loadActivePreset,
  saveActivePreset,
} from '../layoutPresets'

describe('レイアウトプリセット', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('3つのプリセットが定義されている', () => {
    expect(LAYOUT_PRESETS).toHaveLength(3)
  })

  it('各プリセットに必須フィールドがある', () => {
    for (const preset of LAYOUT_PRESETS) {
      expect(preset.id).toBeTruthy()
      expect(preset.label).toBeTruthy()
      expect(preset.description).toBeTruthy()
      expect(preset.widgetIds.length).toBeGreaterThan(0)
    }
  })

  it('経営者向けプリセットが存在する', () => {
    expect(PRESET_MAP.has('executive')).toBe(true)
    const exec = PRESET_MAP.get('executive')!
    expect(exec.label).toBe('経営者向け')
    expect(exec.widgetIds.length).toBeGreaterThanOrEqual(5)
  })

  it('現場担当者向けプリセットが存在する', () => {
    expect(PRESET_MAP.has('field')).toBe(true)
    const field = PRESET_MAP.get('field')!
    expect(field.label).toBe('現場担当者向け')
  })

  it('分析者向けプリセットが存在する', () => {
    expect(PRESET_MAP.has('analyst')).toBe(true)
    const analyst = PRESET_MAP.get('analyst')!
    expect(analyst.label).toBe('分析者向け')
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
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('test') })
    expect(loadActivePreset()).toBeNull()
    vi.restoreAllMocks()
  })
})
