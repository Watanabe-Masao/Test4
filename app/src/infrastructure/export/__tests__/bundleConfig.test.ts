/**
 * Phase 5.3: バンドル設定の検証テスト
 *
 * vite.config.ts の manualChunks 設定が正しく定義されているか検証する。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('バンドル設定', () => {
  const configPath = resolve(__dirname, '../../../../vite.config.ts')
  const configContent = readFileSync(configPath, 'utf-8')

  it('recharts が独立チャンクに設定されている', () => {
    expect(configContent).toContain("'vendor-recharts'")
    expect(configContent).toContain("'recharts'")
  })

  it('xlsx が独立チャンクに設定されている', () => {
    expect(configContent).toContain("'vendor-xlsx'")
    expect(configContent).toContain("'xlsx'")
  })

  it('styled-components が独立チャンクに設定されている', () => {
    expect(configContent).toContain("'vendor-styled'")
    expect(configContent).toContain("'styled-components'")
  })

  it('@tanstack/react-table が独立チャンクに設定されている', () => {
    expect(configContent).toContain("'vendor-table'")
    expect(configContent).toContain("'@tanstack/react-table'")
  })

  it('react-router-dom が独立チャンクに設定されている', () => {
    expect(configContent).toContain("'vendor-router'")
    expect(configContent).toContain("'react-router-dom'")
  })

  it('zustand と immer が state チャンクに設定されている', () => {
    expect(configContent).toContain("'vendor-state'")
    expect(configContent).toContain("'zustand'")
    expect(configContent).toContain("'immer'")
  })

  it('Worker 設定が含まれている', () => {
    expect(configContent).toContain('worker')
    expect(configContent).toContain("format: 'es'")
  })
})
