/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect, vi } from 'vitest'
import { clearAllData, type ClearAllDataEffects } from '../clearAllData'

function createMockEffects(): ClearAllDataEffects {
  return {
    repo: {
      clearAll: vi.fn().mockResolvedValue(undefined),
    } as unknown as ClearAllDataEffects['repo'],
    resetDataStore: vi.fn(),
    resetUiTransientState: vi.fn(),
    resetSettingsStore: vi.fn(),
    clearCalculationCache: vi.fn(),
  }
}

describe('clearAllData', () => {
  it('全リセット関数と repo.clearAll を呼ぶ', async () => {
    const effects = createMockEffects()

    await clearAllData(effects)

    expect(effects.resetDataStore).toHaveBeenCalledOnce()
    expect(effects.resetUiTransientState).toHaveBeenCalledOnce()
    expect(effects.resetSettingsStore).toHaveBeenCalledOnce()
    expect(effects.clearCalculationCache).toHaveBeenCalledOnce()
    expect(effects.repo.clearAll).toHaveBeenCalledOnce()
  })

  it('インメモリリセットが repo.clearAll より先に実行される', async () => {
    const callOrder: string[] = []
    const effects: ClearAllDataEffects = {
      repo: {
        clearAll: vi.fn().mockImplementation(async () => {
          callOrder.push('repo.clearAll')
        }),
      } as unknown as ClearAllDataEffects['repo'],
      resetDataStore: vi.fn(() => callOrder.push('resetDataStore')),
      resetUiTransientState: vi.fn(() => callOrder.push('resetUiTransientState')),
      resetSettingsStore: vi.fn(() => callOrder.push('resetSettingsStore')),
      clearCalculationCache: vi.fn(() => callOrder.push('clearCalculationCache')),
    }

    await clearAllData(effects)

    expect(callOrder).toEqual([
      'resetDataStore',
      'resetUiTransientState',
      'resetSettingsStore',
      'clearCalculationCache',
      'repo.clearAll',
    ])
  })

  it('repo.clearAll のエラーが伝播する', async () => {
    const effects = createMockEffects()
    const error = new Error('IndexedDB failure')
    vi.mocked(effects.repo.clearAll).mockRejectedValue(error)

    await expect(clearAllData(effects)).rejects.toThrow('IndexedDB failure')
  })
})
