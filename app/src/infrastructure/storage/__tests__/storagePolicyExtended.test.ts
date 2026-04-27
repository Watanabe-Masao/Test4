/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect, vi } from 'vitest'
import { getCleanupActions } from '../storagePolicy'

describe('getCleanupActions', () => {
  it('returns empty array when no options provided', () => {
    const actions = getCleanupActions({})
    expect(actions).toHaveLength(0)
  })

  it('includes query cache action when clearQueryCache provided', () => {
    const clearFn = vi.fn()
    const actions = getCleanupActions({ clearQueryCache: clearFn })
    expect(actions).toHaveLength(1)
    expect(actions[0].id).toBe('query-cache')
    expect(actions[0].label).toBe('クエリキャッシュ削除')
  })

  it('includes duckdb action when deleteDuckDBFile provided', () => {
    const deleteFn = vi.fn().mockResolvedValue(true)
    const actions = getCleanupActions({ deleteDuckDBFile: deleteFn })
    expect(actions).toHaveLength(1)
    expect(actions[0].id).toBe('duckdb-opfs')
  })

  it('includes old months action when clearOldMonths provided', () => {
    const clearFn = vi.fn().mockResolvedValue(5)
    const actions = getCleanupActions({ clearOldMonths: clearFn })
    expect(actions).toHaveLength(1)
    expect(actions[0].id).toBe('old-months')
  })

  it('returns all actions in priority order', () => {
    const actions = getCleanupActions({
      clearQueryCache: vi.fn(),
      deleteDuckDBFile: vi.fn().mockResolvedValue(true),
      clearOldMonths: vi.fn().mockResolvedValue(0),
    })
    expect(actions).toHaveLength(3)
    expect(actions[0].id).toBe('query-cache')
    expect(actions[1].id).toBe('duckdb-opfs')
    expect(actions[2].id).toBe('old-months')
  })

  it('execute() calls the provided function for query cache', async () => {
    const clearFn = vi.fn()
    const actions = getCleanupActions({ clearQueryCache: clearFn })
    await actions[0].execute()
    expect(clearFn).toHaveBeenCalledOnce()
  })

  it('execute() calls the provided function for duckdb', async () => {
    const deleteFn = vi.fn().mockResolvedValue(true)
    const actions = getCleanupActions({ deleteDuckDBFile: deleteFn })
    await actions[0].execute()
    expect(deleteFn).toHaveBeenCalledOnce()
  })

  it('execute() calls clearOldMonths with keepRecent=3', async () => {
    const clearFn = vi.fn().mockResolvedValue(2)
    const actions = getCleanupActions({ clearOldMonths: clearFn })
    await actions[0].execute()
    expect(clearFn).toHaveBeenCalledWith(3)
  })

  it('all actions have null estimatedSavings', () => {
    const actions = getCleanupActions({
      clearQueryCache: vi.fn(),
      deleteDuckDBFile: vi.fn().mockResolvedValue(true),
      clearOldMonths: vi.fn().mockResolvedValue(0),
    })
    for (const action of actions) {
      expect(action.estimatedSavings).toBeNull()
    }
  })
})
