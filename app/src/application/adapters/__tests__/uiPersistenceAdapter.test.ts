/**
 * uiPersistenceAdapter テスト
 *
 * STORAGE_KEYS カタログの整合性と基本操作の検証。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  loadJson,
  saveJson,
  removeKey,
  loadRaw,
  saveRaw,
  setStorageBackend,
  resetStorageBackend,
  STORAGE_KEYS,
  type StorageBackend,
} from '../uiPersistenceAdapter'

function createMockBackend(): StorageBackend & { store: Map<string, string> } {
  const store = new Map<string, string>()
  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  }
}

describe('uiPersistenceAdapter', () => {
  let backend: ReturnType<typeof createMockBackend>

  beforeEach(() => {
    backend = createMockBackend()
    setStorageBackend(backend)
  })

  afterEach(() => {
    resetStorageBackend()
  })

  describe('saveJson / loadJson', () => {
    it('JSON を保存・復元できる', () => {
      saveJson('test-key', { a: 1, b: 'hello' })
      const result = loadJson('test-key', null)
      expect(result).toEqual({ a: 1, b: 'hello' })
    })

    it('キーが存在しない場合は fallback を返す', () => {
      const result = loadJson('nonexistent', 'default')
      expect(result).toBe('default')
    })

    it('validate 関数で型検証できる', () => {
      saveJson('arr-key', [1, 2, 3])
      const result = loadJson('arr-key', [], (raw) =>
        Array.isArray(raw) ? (raw as number[]) : null,
      )
      expect(result).toEqual([1, 2, 3])
    })

    it('validate 関数が null を返したら fallback を返す', () => {
      saveJson('bad-key', 'not-an-array')
      const result = loadJson('bad-key', [], (raw) =>
        Array.isArray(raw) ? (raw as unknown[]) : null,
      )
      expect(result).toEqual([])
    })
  })

  describe('saveRaw / loadRaw', () => {
    it('生文字列を保存・復元できる', () => {
      saveRaw('raw-key', 'dark')
      expect(loadRaw('raw-key')).toBe('dark')
    })

    it('キーが存在しない場合は null を返す', () => {
      expect(loadRaw('nonexistent')).toBeNull()
    })
  })

  describe('removeKey', () => {
    it('キーを削除できる', () => {
      saveRaw('temp-key', 'value')
      removeKey('temp-key')
      expect(loadRaw('temp-key')).toBeNull()
    })
  })

  describe('STORAGE_KEYS', () => {
    it('全ての固定キーが文字列である', () => {
      const fixedKeys = Object.entries(STORAGE_KEYS).filter(([, v]) => typeof v === 'string')
      expect(fixedKeys.length).toBeGreaterThan(0)
      for (const [, value] of fixedKeys) {
        expect(typeof value).toBe('string')
        expect((value as string).length).toBeGreaterThan(0)
      }
    })

    it('widgetLayout が関数で動的キーを返す', () => {
      const key = STORAGE_KEYS.widgetLayout('my-page')
      expect(key).toBe('widget_layout_my-page_v1')
    })

    it('キーに重複がない', () => {
      const allKeys = Object.entries(STORAGE_KEYS)
        .filter(([, v]) => typeof v === 'string')
        .map(([, v]) => v as string)
      const unique = new Set(allKeys)
      expect(unique.size).toBe(allKeys.length)
    })
  })
})
