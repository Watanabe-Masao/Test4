/**
 * renderClipHtml — pure helper tests
 *
 * 検証対象:
 * - escapeHtml: 4 種の HTML 特殊文字エスケープ
 * - renderClipHtml: HTML 文字列の最低限の整合性（lang / title / DATA 埋め込み）
 */
import { describe, it, expect } from 'vitest'
import { escapeHtml, renderClipHtml } from '../renderClipHtml'
import type { ClipBundle } from '../types'

describe('escapeHtml', () => {
  it('& は &amp;', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('< / > は &lt; / &gt;', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;')
  })

  it('" は &quot;', () => {
    expect(escapeHtml('say "hi"')).toBe('say &quot;hi&quot;')
  })

  it('特殊文字なしならそのまま', () => {
    expect(escapeHtml('plain text 123')).toBe('plain text 123')
  })

  it('空文字列', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('複数の特殊文字を全て変換', () => {
    expect(escapeHtml('<a href="x">&y</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;y&lt;/a&gt;',
    )
  })

  it('& は最初に変換される（順序保証 — 後続の &lt; 等が二重変換されない）', () => {
    // &amp;lt; のような二重変換を避ける
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })
})

describe('renderClipHtml', () => {
  function bundle(overrides: Partial<ClipBundle> = {}): ClipBundle {
    return {
      storeName: '東京店',
      year: 2026,
      month: 3,
      sections: [],
      ...overrides,
    } as ClipBundle
  }

  it('lang="ja" の HTML5 ドキュメントを返す', () => {
    const html = renderClipHtml(bundle())
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html lang="ja">')
  })

  it('title に store + year + month が入る', () => {
    const html = renderClipHtml(bundle({ storeName: 'A店', year: 2026, month: 3 }))
    expect(html).toContain('<title>A店 2026年3月 レポート</title>')
  })

  it('storeName に HTML 特殊文字があればエスケープされる', () => {
    const html = renderClipHtml(bundle({ storeName: '<script>X</script>' }))
    expect(html).toContain('&lt;script&gt;X&lt;/script&gt;')
    expect(html).not.toContain('<title><script>')
  })

  it('DATA に bundle JSON が埋め込まれる', () => {
    const html = renderClipHtml(bundle({ storeName: 'B店' }))
    expect(html).toMatch(/const DATA = \{.*"storeName":"B店"/)
  })

  it('charset utf-8 / viewport meta が入る', () => {
    const html = renderClipHtml(bundle())
    expect(html).toContain('<meta charset="UTF-8">')
    expect(html).toContain('viewport')
  })

  it('app div が含まれる（マウントポイント）', () => {
    const html = renderClipHtml(bundle())
    expect(html).toContain('<div id="app"></div>')
  })
})
