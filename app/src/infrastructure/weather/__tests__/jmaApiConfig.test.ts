/**
 * jmaApiConfig.ts — JMA URL resolution test
 *
 * 検証対象:
 * - getJmaBaseUrl: DEV / proxy / fallback
 * - getJmaDataBaseUrl: DEV / proxy / fallback
 * - proxy URL の末尾スラッシュ除去
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { getJmaBaseUrl, getJmaDataBaseUrl } from '../jmaApiConfig'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getJmaBaseUrl', () => {
  it("DEV=true → '/jma-api'", () => {
    ;(vi.stubEnv as unknown as (k: string, v: boolean) => void)('DEV', true)
    expect(getJmaBaseUrl()).toBe('/jma-api')
  })

  it('DEV=false + proxy 設定 → proxy URL', () => {
    ;(vi.stubEnv as unknown as (k: string, v: boolean) => void)('DEV', false)
    vi.stubEnv('VITE_JMA_PROXY_URL', 'https://proxy.example.com')
    expect(getJmaBaseUrl()).toBe('https://proxy.example.com')
  })

  it('proxy URL 末尾スラッシュを除去', () => {
    ;(vi.stubEnv as unknown as (k: string, v: boolean) => void)('DEV', false)
    vi.stubEnv('VITE_JMA_PROXY_URL', 'https://proxy.example.com/')
    expect(getJmaBaseUrl()).toBe('https://proxy.example.com')
  })

  it('DEV=false + proxy 未設定 → デフォルト https://www.jma.go.jp', () => {
    ;(vi.stubEnv as unknown as (k: string, v: boolean) => void)('DEV', false)
    vi.stubEnv('VITE_JMA_PROXY_URL', '')
    expect(getJmaBaseUrl()).toBe('https://www.jma.go.jp')
  })
})

describe('getJmaDataBaseUrl', () => {
  it("DEV=true → '/jma-data'", () => {
    ;(vi.stubEnv as unknown as (k: string, v: boolean) => void)('DEV', true)
    expect(getJmaDataBaseUrl()).toBe('/jma-data')
  })

  it('DEV=false + proxy 設定 → proxy URL', () => {
    ;(vi.stubEnv as unknown as (k: string, v: boolean) => void)('DEV', false)
    vi.stubEnv('VITE_JMA_PROXY_URL', 'https://proxy.example.com')
    expect(getJmaDataBaseUrl()).toBe('https://proxy.example.com')
  })

  it('proxy URL 末尾スラッシュを除去', () => {
    ;(vi.stubEnv as unknown as (k: string, v: boolean) => void)('DEV', false)
    vi.stubEnv('VITE_JMA_PROXY_URL', 'https://worker.example.com/')
    expect(getJmaDataBaseUrl()).toBe('https://worker.example.com')
  })

  it('DEV=false + proxy 未設定 → デフォルト https://www.data.jma.go.jp', () => {
    ;(vi.stubEnv as unknown as (k: string, v: boolean) => void)('DEV', false)
    vi.stubEnv('VITE_JMA_PROXY_URL', '')
    expect(getJmaDataBaseUrl()).toBe('https://www.data.jma.go.jp')
  })
})
