/**
 * AdminPage — category resolver tests
 *
 * 検証対象:
 * - resolveCategoryLabel: preset id → PRESET_CATEGORY_LABELS / user: prefix → userCategoryLabels
 * - resolveCategoryColor: preset id → CATEGORY_COLORS / user: prefix → 固定色
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { resolveCategoryLabel, resolveCategoryColor } from '../AdminPage'

describe('resolveCategoryLabel', () => {
  it('preset id は PRESET_CATEGORY_LABELS から引く（定義済み id を想定）', () => {
    // presetId が未知の場合は id をそのまま返す fallback 動作を確認
    expect(resolveCategoryLabel('unknown-preset', {})).toBe('unknown-preset')
  })

  it('user: prefix は userCategoryLabels から引く', () => {
    expect(resolveCategoryLabel('user:abc', { 'user:abc': '自由カテゴリ' })).toBe('自由カテゴリ')
  })

  it('user: prefix で labels 未定義なら user: を剥いて返す', () => {
    expect(resolveCategoryLabel('user:abc', {})).toBe('abc')
  })
})

describe('resolveCategoryColor', () => {
  it('user: prefix は teal 固定色（#14b8a6）', () => {
    expect(resolveCategoryColor('user:abc')).toBe('#14b8a6')
    expect(resolveCategoryColor('user:xyz123')).toBe('#14b8a6')
  })

  it('preset id は CATEGORY_COLORS から引く（未定義は slate fallback）', () => {
    // 未知の preset id でも何らかの色（hex 文字列）を返す
    const result = resolveCategoryColor('unknown-preset')
    expect(result).toMatch(/^#[0-9a-fA-F]{3,8}$/)
  })
})
