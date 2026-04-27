/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadLayout, saveLayout, DEFAULT_WIDGET_IDS, getWidgetMap } from '../widgetLayout'
import { UNIFIED_WIDGET_MAP } from '@/presentation/components/widgets'
import { setStorageBackend, resetStorageBackend } from '@/application/adapters/uiPersistenceAdapter'

// adapter 経由のストレージモック
const storage = new Map<string, string>()
beforeEach(() => {
  storage.clear()
  setStorageBackend({
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => {
      storage.delete(key)
    },
  })
})

afterEach(() => {
  resetStorageBackend()
})

const STORAGE_KEY = 'dashboard_layout_v14'

describe('loadLayout', () => {
  it('localStorage が空の場合はデフォルトレイアウトを返す', () => {
    const result = loadLayout()
    expect(result).toEqual(DEFAULT_WIDGET_IDS)
  })

  it('有効な保存済みレイアウトを読み込む', () => {
    // getWidgetMap() に存在する ID を使う
    const validIds = Array.from(getWidgetMap().keys()).slice(0, 3)
    storage.set(STORAGE_KEY, JSON.stringify(validIds))
    const result = loadLayout()
    expect(result).toEqual(validIds)
  })

  it('保存値が配列でない場合はデフォルトを返す', () => {
    storage.set(STORAGE_KEY, JSON.stringify('not-an-array'))
    const result = loadLayout()
    expect(result).toEqual(DEFAULT_WIDGET_IDS)
  })

  it('保存値が不正な JSON の場合はデフォルトを返す', () => {
    storage.set(STORAGE_KEY, '{invalid json')
    const result = loadLayout()
    expect(result).toEqual(DEFAULT_WIDGET_IDS)
  })

  it('全て無効な ID の場合はデフォルトを返す', () => {
    storage.set(STORAGE_KEY, JSON.stringify(['nonexistent-widget-1', 'nonexistent-widget-2']))
    const result = loadLayout()
    expect(result).toEqual(DEFAULT_WIDGET_IDS)
  })

  it('無効な ID を除外し、有効な ID のみ返す', () => {
    const validIds = Array.from(getWidgetMap().keys()).slice(0, 2)
    const mixedIds = [...validIds, 'nonexistent-widget']
    storage.set(STORAGE_KEY, JSON.stringify(mixedIds))
    const result = loadLayout()
    expect(result).toEqual(validIds)
  })

  it('旧 DuckDB ID が統合 ID にマイグレーションされる', () => {
    // duckdb-timeslot → chart-timeslot-sales
    const validNewId = 'chart-timeslot-sales'
    if (getWidgetMap().has(validNewId)) {
      storage.set(STORAGE_KEY, JSON.stringify(['duckdb-timeslot']))
      const result = loadLayout()
      expect(result).toContain(validNewId)
      expect(result).not.toContain('duckdb-timeslot')
    }
  })

  it('マイグレーション後に重複が除去される', () => {
    const validNewId = 'chart-timeslot-sales'
    if (getWidgetMap().has(validNewId)) {
      // 旧 ID と新 ID の両方が存在する場合、重複除去される
      storage.set(STORAGE_KEY, JSON.stringify(['duckdb-timeslot', validNewId]))
      const result = loadLayout()
      const count = result.filter((id) => id === validNewId).length
      expect(count).toBe(1)
    }
  })
})

describe('saveLayout', () => {
  it('レイアウトを localStorage に保存する', () => {
    const ids = ['widget-a', 'widget-b']
    saveLayout(ids)
    const stored = storage.get(STORAGE_KEY)
    expect(stored).toBe(JSON.stringify(ids))
  })

  it('localStorage.setItem が例外を投げても crash しない', () => {
    setStorageBackend({
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => undefined,
    })
    expect(() => saveLayout(['a'])).not.toThrow()
  })
})

describe('DEFAULT_WIDGET_IDS', () => {
  it('全て UNIFIED_WIDGET_MAP に存在する', () => {
    for (const id of DEFAULT_WIDGET_IDS) {
      expect(
        UNIFIED_WIDGET_MAP.has(id),
        `DEFAULT_WIDGET_IDS に含まれる "${id}" が UNIFIED_WIDGET_MAP に存在しない`,
      ).toBe(true)
    }
  })

  it('重複がない', () => {
    const unique = new Set(DEFAULT_WIDGET_IDS)
    expect(unique.size).toBe(DEFAULT_WIDGET_IDS.length)
  })
})
