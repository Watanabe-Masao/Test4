/**
 * unifiedRegistry — UNIFIED_WIDGET_REGISTRY / UNIFIED_WIDGET_MAP 整合性 tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { UNIFIED_WIDGET_REGISTRY, UNIFIED_WIDGET_MAP } from '../unifiedRegistry'

describe('UNIFIED_WIDGET_REGISTRY', () => {
  it('空配列でない', () => {
    expect(UNIFIED_WIDGET_REGISTRY.length).toBeGreaterThan(0)
  })

  it('各 widget が id / label / group / size を持つ', () => {
    for (const w of UNIFIED_WIDGET_REGISTRY) {
      expect(w.id).toBeDefined()
      expect(w.label).toBeDefined()
      expect(w.group).toBeDefined()
      expect(w.size).toBeDefined()
      expect(typeof w.render).toBe('function')
    }
  })

  it("size は 'kpi' / 'half' / 'full' のいずれか", () => {
    for (const w of UNIFIED_WIDGET_REGISTRY) {
      expect(['kpi', 'half', 'full']).toContain(w.size)
    }
  })

  it('全 widget id が一意（重複なし）', () => {
    const ids = UNIFIED_WIDGET_REGISTRY.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('UNIFIED_WIDGET_MAP', () => {
  it('REGISTRY と同じエントリ数', () => {
    expect(UNIFIED_WIDGET_MAP.size).toBe(UNIFIED_WIDGET_REGISTRY.length)
  })

  it('各 widget を id で lookup できる', () => {
    for (const w of UNIFIED_WIDGET_REGISTRY) {
      expect(UNIFIED_WIDGET_MAP.get(w.id)).toBe(w)
    }
  })

  it('存在しない id で undefined', () => {
    expect(UNIFIED_WIDGET_MAP.get('___nonexistent___')).toBeUndefined()
  })
})
