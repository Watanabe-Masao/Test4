/**
 * useDeviceSync テスト
 *
 * decodeSettingsCode / encodeSettingsCode の実挙動を直接検証する。
 */
import { describe, it, expect } from 'vitest'
import { decodeSettingsCode, encodeSettingsCode } from '../useDeviceSync'
import { createDefaultSettings } from '@/domain/constants/defaults'

describe('decodeSettingsCode', () => {
  it('正常な設定コードをデコードして Partial<AppSettings> を返す', () => {
    const settings = createDefaultSettings()
    const { code } = encodeSettingsCode(settings)
    const decoded = decodeSettingsCode(code)

    expect(decoded.targetGrossProfitRate).toBe(0.25)
    expect(decoded.defaultBudget).toBe(6_450_000)
    expect(decoded.alignmentPolicy).toBe('sameDayOfWeek')
  })

  it('targetYear / targetMonth はエンコード時に除外される', () => {
    const settings = createDefaultSettings()
    const { code } = encodeSettingsCode(settings)
    const decoded = decodeSettingsCode(code)

    expect(decoded).not.toHaveProperty('targetYear')
    expect(decoded).not.toHaveProperty('targetMonth')
  })

  it('未知キーは Zod によりストリップされる', () => {
    const settings = createDefaultSettings()
    const transferable: Record<string, unknown> = { ...settings, unknownField: 'bad' }
    delete transferable.targetYear
    delete transferable.targetMonth
    const json = JSON.stringify(transferable)
    const bytes = new TextEncoder().encode(json)
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    const code = 'SHIIRE_SETTINGS:' + btoa(binary)

    const decoded = decodeSettingsCode(code)
    expect(decoded).not.toHaveProperty('unknownField')
    expect(decoded.targetGrossProfitRate).toBe(0.25)
  })

  it('不正なプレフィックスで Error をスローする', () => {
    expect(() => decodeSettingsCode('INVALID:abc')).toThrow('SHIIRE_SETTINGS:')
  })

  it('配列を渡すと Error をスローする', () => {
    const json = JSON.stringify([1, 2, 3])
    const bytes = new TextEncoder().encode(json)
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    const code = 'SHIIRE_SETTINGS:' + btoa(binary)

    expect(() => decodeSettingsCode(code)).toThrow('不正')
  })

  it('型不一致フィールドがあると Error をスローする', () => {
    const json = JSON.stringify({ targetGrossProfitRate: 'not-a-number' })
    const bytes = new TextEncoder().encode(json)
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    const code = 'SHIIRE_SETTINGS:' + btoa(binary)

    expect(() => decodeSettingsCode(code)).toThrow('不正')
  })

  it('壊れた Base64 で Error をスローする', () => {
    expect(() => decodeSettingsCode('SHIIRE_SETTINGS:!!!invalid-base64!!!')).toThrow()
  })

  it('空オブジェクトは空の Partial を返す（エラーにならない）', () => {
    const json = JSON.stringify({})
    const bytes = new TextEncoder().encode(json)
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    const code = 'SHIIRE_SETTINGS:' + btoa(binary)

    const decoded = decodeSettingsCode(code)
    expect(Object.keys(decoded)).toHaveLength(0)
  })
})

describe('encodeSettingsCode', () => {
  it('プレフィックス付きのコードとバイトサイズを返す', () => {
    const settings = createDefaultSettings()
    const result = encodeSettingsCode(settings)

    expect(result.code.startsWith('SHIIRE_SETTINGS:')).toBe(true)
    expect(result.byteSize).toBeGreaterThan(0)
  })

  it('encode → decode のラウンドトリップで値が保持される', () => {
    const settings = createDefaultSettings()
    const { code } = encodeSettingsCode(settings)
    const decoded = decodeSettingsCode(code)

    expect(decoded.warningThreshold).toBe(settings.warningThreshold)
    expect(decoded.flowerCostRate).toBe(settings.flowerCostRate)
    expect(decoded.supplierCategoryMap).toEqual(settings.supplierCategoryMap)
  })
})
