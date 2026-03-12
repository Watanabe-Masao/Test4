import { describe, it, expect } from 'vitest'
import { storeResultToCausalPrev } from '../useCausalChain'

describe('useCausalChain re-exports', () => {
  it('storeResultToCausalPrev が関数としてエクスポートされる', () => {
    expect(typeof storeResultToCausalPrev).toBe('function')
  })
})
