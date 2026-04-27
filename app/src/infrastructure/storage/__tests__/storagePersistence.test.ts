/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  requestPersistentStorage,
  isStoragePersisted,
  getStorageEstimate,
  isOpfsAvailable,
} from '../storagePersistence'

describe('storagePersistence', () => {
  beforeEach(() => {
    // Reset navigator.storage mock
    vi.restoreAllMocks()
  })

  describe('requestPersistentStorage', () => {
    it('returns false when persist is not available', async () => {
      const original = navigator.storage
      Object.defineProperty(navigator, 'storage', {
        value: { persist: undefined },
        configurable: true,
      })
      expect(await requestPersistentStorage()).toBe(false)
      Object.defineProperty(navigator, 'storage', { value: original, configurable: true })
    })

    it('returns result from persist()', async () => {
      const original = navigator.storage
      Object.defineProperty(navigator, 'storage', {
        value: { persist: vi.fn().mockResolvedValue(true) },
        configurable: true,
      })
      expect(await requestPersistentStorage()).toBe(true)
      Object.defineProperty(navigator, 'storage', { value: original, configurable: true })
    })

    it('returns false on error', async () => {
      const original = navigator.storage
      Object.defineProperty(navigator, 'storage', {
        value: {
          persist: vi.fn().mockRejectedValue(new Error('denied')),
        },
        configurable: true,
      })
      expect(await requestPersistentStorage()).toBe(false)
      Object.defineProperty(navigator, 'storage', { value: original, configurable: true })
    })
  })

  describe('isStoragePersisted', () => {
    it('returns false when persisted is not available', async () => {
      const original = navigator.storage
      Object.defineProperty(navigator, 'storage', {
        value: { persisted: undefined },
        configurable: true,
      })
      expect(await isStoragePersisted()).toBe(false)
      Object.defineProperty(navigator, 'storage', { value: original, configurable: true })
    })

    it('returns result from persisted()', async () => {
      const original = navigator.storage
      Object.defineProperty(navigator, 'storage', {
        value: { persisted: vi.fn().mockResolvedValue(true) },
        configurable: true,
      })
      expect(await isStoragePersisted()).toBe(true)
      Object.defineProperty(navigator, 'storage', { value: original, configurable: true })
    })

    it('returns false on error', async () => {
      const original = navigator.storage
      Object.defineProperty(navigator, 'storage', {
        value: {
          persisted: vi.fn().mockRejectedValue(new Error('error')),
        },
        configurable: true,
      })
      expect(await isStoragePersisted()).toBe(false)
      Object.defineProperty(navigator, 'storage', { value: original, configurable: true })
    })
  })

  describe('getStorageEstimate', () => {
    it('returns null when estimate is not available', async () => {
      const original = navigator.storage
      Object.defineProperty(navigator, 'storage', {
        value: { estimate: undefined },
        configurable: true,
      })
      expect(await getStorageEstimate()).toBeNull()
      Object.defineProperty(navigator, 'storage', { value: original, configurable: true })
    })

    it('returns estimate with usage ratio', async () => {
      const original = navigator.storage
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: vi.fn().mockResolvedValue({ usage: 500, quota: 1000 }),
        },
        configurable: true,
      })
      const result = await getStorageEstimate()
      expect(result).toEqual({ usage: 500, quota: 1000, usageRatio: 0.5 })
      Object.defineProperty(navigator, 'storage', { value: original, configurable: true })
    })

    it('handles zero quota', async () => {
      const original = navigator.storage
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }),
        },
        configurable: true,
      })
      const result = await getStorageEstimate()
      expect(result).toEqual({ usage: 0, quota: 0, usageRatio: 0 })
      Object.defineProperty(navigator, 'storage', { value: original, configurable: true })
    })

    it('returns null on error', async () => {
      const original = navigator.storage
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: vi.fn().mockRejectedValue(new Error('error')),
        },
        configurable: true,
      })
      expect(await getStorageEstimate()).toBeNull()
      Object.defineProperty(navigator, 'storage', { value: original, configurable: true })
    })
  })

  describe('isOpfsAvailable', () => {
    it('returns false on error (no OPFS)', async () => {
      const original = navigator.storage
      Object.defineProperty(navigator, 'storage', {
        value: {
          getDirectory: vi.fn().mockRejectedValue(new Error('no opfs')),
        },
        configurable: true,
      })
      expect(await isOpfsAvailable()).toBe(false)
      Object.defineProperty(navigator, 'storage', { value: original, configurable: true })
    })

    it('returns true when getDirectory succeeds', async () => {
      const original = navigator.storage
      Object.defineProperty(navigator, 'storage', {
        value: {
          getDirectory: vi.fn().mockResolvedValue({}),
        },
        configurable: true,
      })
      expect(await isOpfsAvailable()).toBe(true)
      Object.defineProperty(navigator, 'storage', { value: original, configurable: true })
    })
  })
})
