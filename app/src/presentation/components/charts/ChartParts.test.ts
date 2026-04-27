/**
 * ChartParts — 共通パーツのテスト
 *
 * 検証対象（pure のみ）:
 * - HIERARCHY_LABELS / CATEGORY_COLORS の定義正当性
 * - formatDateKey: YYYYMMDD → MM/DD 変換と不一致形式のパススルー
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { formatDateKey, HIERARCHY_LABELS, CATEGORY_COLORS } from './ChartParts'

describe('HIERARCHY_LABELS', () => {
  it('3 階層の日本語ラベルを持つ', () => {
    expect(HIERARCHY_LABELS.department).toBe('部門')
    expect(HIERARCHY_LABELS.line).toBe('ライン')
    expect(HIERARCHY_LABELS.klass).toBe('クラス')
  })
})

describe('CATEGORY_COLORS', () => {
  it('全カラー値が # 始まりの 7 文字（HEX 6 桁）', () => {
    expect(CATEGORY_COLORS).toHaveLength(10)
    for (const c of CATEGORY_COLORS) {
      expect(c).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})

describe('formatDateKey', () => {
  it('YYYYMMDD（8文字）を MM/DD に変換する', () => {
    expect(formatDateKey('20260301')).toBe('03/01')
    expect(formatDateKey('20261231')).toBe('12/31')
  })

  it('8 文字以外はそのまま返す（不一致形式のパススルー）', () => {
    expect(formatDateKey('2026-03-01')).toBe('2026-03-01')
    expect(formatDateKey('20260301extra')).toBe('20260301extra')
    expect(formatDateKey('')).toBe('')
    expect(formatDateKey('202603')).toBe('202603')
  })
})
