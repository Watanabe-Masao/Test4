/**
 * runtimeTypes — isBlockingPhase / INITIAL_RUNTIME_STATE tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { isBlockingPhase, INITIAL_RUNTIME_STATE } from '../runtimeTypes'

describe('isBlockingPhase', () => {
  it("'ready' は非 blocking", () => {
    expect(isBlockingPhase('ready')).toBe(false)
  })

  it("'degraded' は非 blocking", () => {
    expect(isBlockingPhase('degraded')).toBe(false)
  })

  it("'idle' は blocking", () => {
    expect(isBlockingPhase('idle')).toBe(true)
  })

  it("'booting' は blocking", () => {
    expect(isBlockingPhase('booting')).toBe(true)
  })

  it("'loading-cache' は blocking", () => {
    expect(isBlockingPhase('loading-cache')).toBe(true)
  })

  it("'recovering' は blocking", () => {
    expect(isBlockingPhase('recovering')).toBe(true)
  })

  it("'failed' は blocking", () => {
    expect(isBlockingPhase('failed')).toBe(true)
  })
})

describe('INITIAL_RUNTIME_STATE', () => {
  it("phase='idle'", () => {
    expect(INITIAL_RUNTIME_STATE.phase).toBe('idle')
  })

  it('error=null', () => {
    expect(INITIAL_RUNTIME_STATE.error).toBeNull()
  })

  it('engineAvailable=false', () => {
    expect(INITIAL_RUNTIME_STATE.engineAvailable).toBe(false)
  })

  it('dataLoaded=false', () => {
    expect(INITIAL_RUNTIME_STATE.dataLoaded).toBe(false)
  })
})
