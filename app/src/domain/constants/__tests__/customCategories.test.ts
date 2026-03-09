import { describe, expect, it } from 'vitest'
import {
  isPresetCategory,
  isUserCategory,
  isCustomCategoryId,
  createUserCategoryId,
  PRESET_CATEGORY_DEFS,
  UNCATEGORIZED_CATEGORY_ID,
  PRESET_CATEGORY_LABELS,
  LEGACY_LABEL_TO_ID,
  type PresetCategoryId,
} from '@/domain/constants/customCategories'

// ─── isPresetCategory ─────────────────────────────────────

describe('isPresetCategory', () => {
  const ALL_PRESET_IDS: readonly PresetCategoryId[] = [
    'market_purchase',
    'lfc',
    'salad',
    'processed',
    'consumables',
    'direct_delivery',
    'other',
    'uncategorized',
  ]

  it.each(ALL_PRESET_IDS)('returns true for preset id "%s"', (id) => {
    expect(isPresetCategory(id)).toBe(true)
  })

  it('returns false for a user category id', () => {
    expect(isPresetCategory('user:custom')).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isPresetCategory('')).toBe(false)
  })

  it('returns false for an arbitrary string', () => {
    expect(isPresetCategory('nonexistent')).toBe(false)
  })

  it('returns false for a preset id with extra whitespace', () => {
    expect(isPresetCategory(' lfc')).toBe(false)
    expect(isPresetCategory('lfc ')).toBe(false)
  })

  it('returns false for a preset id in different case', () => {
    expect(isPresetCategory('LFC')).toBe(false)
    expect(isPresetCategory('Market_Purchase')).toBe(false)
  })
})

// ─── isUserCategory ───────────────────────────────────────

describe('isUserCategory', () => {
  it('returns true for a valid user category id', () => {
    expect(isUserCategory('user:custom')).toBe(true)
  })

  it('returns true for user: with empty name', () => {
    expect(isUserCategory('user:')).toBe(true)
  })

  it('returns true for user: with special characters', () => {
    expect(isUserCategory('user:foo bar')).toBe(true)
    expect(isUserCategory('user:日本語')).toBe(true)
    expect(isUserCategory('user:a:b:c')).toBe(true)
  })

  it('returns false for a preset category id', () => {
    expect(isUserCategory('lfc')).toBe(false)
    expect(isUserCategory('uncategorized')).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isUserCategory('')).toBe(false)
  })

  it('returns false for a string that contains but does not start with user:', () => {
    expect(isUserCategory('notuser:abc')).toBe(false)
    expect(isUserCategory('prefix_user:abc')).toBe(false)
  })

  it('returns false for "user" without colon', () => {
    expect(isUserCategory('user')).toBe(false)
  })

  it('returns false for "User:" with uppercase', () => {
    expect(isUserCategory('User:abc')).toBe(false)
  })
})

// ─── isCustomCategoryId ───────────────────────────────────

describe('isCustomCategoryId', () => {
  it('returns true for preset category ids', () => {
    expect(isCustomCategoryId('market_purchase')).toBe(true)
    expect(isCustomCategoryId('uncategorized')).toBe(true)
  })

  it('returns true for user category ids', () => {
    expect(isCustomCategoryId('user:custom')).toBe(true)
    expect(isCustomCategoryId('user:')).toBe(true)
  })

  it('returns false for arbitrary strings', () => {
    expect(isCustomCategoryId('')).toBe(false)
    expect(isCustomCategoryId('random')).toBe(false)
    expect(isCustomCategoryId('User:abc')).toBe(false)
  })
})

// ─── createUserCategoryId ─────────────────────────────────

describe('createUserCategoryId', () => {
  it('prefixes name with "user:"', () => {
    expect(createUserCategoryId('custom')).toBe('user:custom')
  })

  it('handles empty string', () => {
    expect(createUserCategoryId('')).toBe('user:')
  })

  it('handles names with special characters', () => {
    expect(createUserCategoryId('日本語カテゴリ')).toBe('user:日本語カテゴリ')
    expect(createUserCategoryId('a:b')).toBe('user:a:b')
    expect(createUserCategoryId('with space')).toBe('user:with space')
  })

  it('result is recognized as a user category', () => {
    const id = createUserCategoryId('test')
    expect(isUserCategory(id)).toBe(true)
    expect(isCustomCategoryId(id)).toBe(true)
    expect(isPresetCategory(id)).toBe(false)
  })
})

// ─── PRESET_CATEGORY_DEFS ────────────────────────────────

describe('PRESET_CATEGORY_DEFS', () => {
  it('contains exactly 8 preset categories', () => {
    expect(PRESET_CATEGORY_DEFS).toHaveLength(12)
  })

  it('each entry has a non-empty id and label', () => {
    for (const def of PRESET_CATEGORY_DEFS) {
      expect(def.id).toBeTruthy()
      expect(def.label).toBeTruthy()
      expect(typeof def.id).toBe('string')
      expect(typeof def.label).toBe('string')
    }
  })

  it('has unique ids', () => {
    const ids = PRESET_CATEGORY_DEFS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has unique labels', () => {
    const labels = PRESET_CATEGORY_DEFS.map((d) => d.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('contains all expected preset ids', () => {
    const ids = PRESET_CATEGORY_DEFS.map((d) => d.id)
    expect(ids).toContain('market_purchase')
    expect(ids).toContain('lfc')
    expect(ids).toContain('salad')
    expect(ids).toContain('processed')
    expect(ids).toContain('consumables')
    expect(ids).toContain('direct_delivery')
    expect(ids).toContain('flowers')
    expect(ids).toContain('direct_produce')
    expect(ids).toContain('inter_store')
    expect(ids).toContain('inter_department')
    expect(ids).toContain('other')
    expect(ids).toContain('uncategorized')
  })

  it('maps expected labels', () => {
    const labelMap = Object.fromEntries(PRESET_CATEGORY_DEFS.map((d) => [d.id, d.label]))
    expect(labelMap['market_purchase']).toBe('市場仕入')
    expect(labelMap['lfc']).toBe('LFC')
    expect(labelMap['salad']).toBe('サラダ')
    expect(labelMap['processed']).toBe('加工品')
    expect(labelMap['consumables']).toBe('消耗品')
    expect(labelMap['direct_delivery']).toBe('直伝')
    expect(labelMap['other']).toBe('その他')
    expect(labelMap['uncategorized']).toBe('未分類')
  })
})

// ─── UNCATEGORIZED_CATEGORY_ID ───────────────────────────

describe('UNCATEGORIZED_CATEGORY_ID', () => {
  it('equals "uncategorized"', () => {
    expect(UNCATEGORIZED_CATEGORY_ID).toBe('uncategorized')
  })

  it('is a valid preset category', () => {
    expect(isPresetCategory(UNCATEGORIZED_CATEGORY_ID)).toBe(true)
  })
})

// ─── PRESET_CATEGORY_LABELS ─────────────────────────────

describe('PRESET_CATEGORY_LABELS', () => {
  it('has an entry for every preset category id', () => {
    for (const def of PRESET_CATEGORY_DEFS) {
      expect(PRESET_CATEGORY_LABELS[def.id]).toBe(def.label)
    }
  })

  it('has exactly 12 entries', () => {
    expect(Object.keys(PRESET_CATEGORY_LABELS)).toHaveLength(12)
  })

  it('returns correct label for each id', () => {
    expect(PRESET_CATEGORY_LABELS['market_purchase']).toBe('市場仕入')
    expect(PRESET_CATEGORY_LABELS['lfc']).toBe('LFC')
    expect(PRESET_CATEGORY_LABELS['uncategorized']).toBe('未分類')
  })
})

// ─── LEGACY_LABEL_TO_ID ─────────────────────────────────

describe('LEGACY_LABEL_TO_ID', () => {
  it('has an entry for every preset category label', () => {
    for (const def of PRESET_CATEGORY_DEFS) {
      expect(LEGACY_LABEL_TO_ID[def.label]).toBe(def.id)
    }
  })

  it('has exactly 12 entries', () => {
    expect(Object.keys(LEGACY_LABEL_TO_ID)).toHaveLength(12)
  })

  it('is the inverse of PRESET_CATEGORY_LABELS', () => {
    for (const [id, label] of Object.entries(PRESET_CATEGORY_LABELS)) {
      expect(LEGACY_LABEL_TO_ID[label]).toBe(id)
    }
  })

  it('returns correct id for each label', () => {
    expect(LEGACY_LABEL_TO_ID['市場仕入']).toBe('market_purchase')
    expect(LEGACY_LABEL_TO_ID['LFC']).toBe('lfc')
    expect(LEGACY_LABEL_TO_ID['サラダ']).toBe('salad')
    expect(LEGACY_LABEL_TO_ID['加工品']).toBe('processed')
    expect(LEGACY_LABEL_TO_ID['消耗品']).toBe('consumables')
    expect(LEGACY_LABEL_TO_ID['直伝']).toBe('direct_delivery')
    expect(LEGACY_LABEL_TO_ID['その他']).toBe('other')
    expect(LEGACY_LABEL_TO_ID['未分類']).toBe('uncategorized')
  })

  it('returns undefined for unknown labels', () => {
    expect(LEGACY_LABEL_TO_ID['存在しない']).toBeUndefined()
    expect(LEGACY_LABEL_TO_ID['']).toBeUndefined()
  })
})
