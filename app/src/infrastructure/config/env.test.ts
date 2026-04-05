import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('env config', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should export WEATHER_ENABLED', async () => {
    const { WEATHER_ENABLED } = await import('./env')
    expect(typeof WEATHER_ENABLED).toBe('boolean')
  })

  it('should export BASE_PATH as string', async () => {
    const { BASE_PATH } = await import('./env')
    expect(typeof BASE_PATH).toBe('string')
  })

  it('should export parsedEnv', async () => {
    const { parsedEnv } = await import('./env')
    expect(parsedEnv).toBeDefined()
    expect(typeof parsedEnv).toBe('object')
  })
})
