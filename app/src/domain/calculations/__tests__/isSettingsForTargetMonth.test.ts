/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { isSettingsForTargetMonth } from '../utils'

describe('isSettingsForTargetMonth', () => {
  it('inventoryDate が対象月と一致 → true', () => {
    expect(isSettingsForTargetMonth('2026/3/1', 2026, 3)).toBe(true)
  })

  it('inventoryDate が対象月と不一致（年違い） → false', () => {
    expect(isSettingsForTargetMonth('2025/3/1', 2026, 3)).toBe(false)
  })

  it('inventoryDate が対象月と不一致（月違い） → false', () => {
    expect(isSettingsForTargetMonth('2026/2/1', 2026, 3)).toBe(false)
  })

  it('inventoryDate がゼロ埋め形式でも一致判定可能', () => {
    expect(isSettingsForTargetMonth('2026/03/01', 2026, 3)).toBe(true)
  })

  it('inventoryDate が null → 後方互換で true', () => {
    expect(isSettingsForTargetMonth(null, 2026, 3)).toBe(true)
  })

  it('inventoryDate が空文字 → 後方互換で true', () => {
    expect(isSettingsForTargetMonth('', 2026, 3)).toBe(true)
  })

  it('inventoryDate がパース不能な形式 → 後方互換で true', () => {
    expect(isSettingsForTargetMonth('unknown', 2026, 3)).toBe(true)
  })
})
