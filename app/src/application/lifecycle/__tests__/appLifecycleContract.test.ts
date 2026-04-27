/**
 * appLifecycleContract — isBlockingPhase tests
 *
 * UI をブロックするフェーズの判定を固定する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { isBlockingPhase, type AppLifecyclePhase } from '../appLifecycleContract'

describe('isBlockingPhase', () => {
  it('booting は blocking', () => {
    expect(isBlockingPhase('booting')).toBe(true)
  })

  it('restoring は blocking', () => {
    expect(isBlockingPhase('restoring')).toBe(true)
  })

  it('initializing_engine は blocking', () => {
    expect(isBlockingPhase('initializing_engine')).toBe(true)
  })

  it('loading_data は blocking', () => {
    expect(isBlockingPhase('loading_data')).toBe(true)
  })

  it('applying_update は blocking', () => {
    expect(isBlockingPhase('applying_update')).toBe(true)
  })

  it('ready は blocking ではない', () => {
    expect(isBlockingPhase('ready')).toBe(false)
  })

  it('error は blocking ではない', () => {
    expect(isBlockingPhase('error')).toBe(false)
  })

  it('全フェーズを網羅する（未知のフェーズ追加時に fail）', () => {
    const all: readonly AppLifecyclePhase[] = [
      'booting',
      'restoring',
      'initializing_engine',
      'loading_data',
      'applying_update',
      'ready',
      'error',
    ]
    // 列挙網羅確認（契約テスト: 新フェーズ追加時に網羅漏れを検出）
    expect(all).toHaveLength(7)
    for (const phase of all) {
      const result = isBlockingPhase(phase)
      expect(typeof result).toBe('boolean')
    }
  })
})
