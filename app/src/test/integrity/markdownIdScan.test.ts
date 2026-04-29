/**
 * Integrity Domain — markdownIdScan primitive unit tests
 *
 * Phase D Wave 3 で landing。fixture string で完結。
 *
 * @taxonomyKind T:meta-guard
 * @responsibility R:guard
 */
import { describe, it, expect } from 'vitest'
import { scanMarkdownIds } from '@app-domain/integrity'

const INV_PATTERN = /^###\s+(INV-[A-Z]+-\d+)/

describe('parsing/scanMarkdownIds', () => {
  it('heading から id を抽出して Registry に格納', () => {
    const md = [
      '# Title',
      '',
      '### INV-SH-01: シャープリー効率性',
      '本文',
      '### INV-PI-02: PI',
    ].join('\n')
    const reg = scanMarkdownIds(md, 'fixture.md', { idPattern: INV_PATTERN })
    expect(reg.source).toBe('fixture.md')
    expect(reg.entries.size).toBe(2)
    expect(reg.entries.get('INV-SH-01')?.line).toBe(3)
    expect(reg.entries.get('INV-PI-02')?.line).toBe(5)
    expect(reg.entries.get('INV-SH-01')?.raw).toContain('シャープリー効率性')
  })

  it('id のない md で空 Registry', () => {
    const reg = scanMarkdownIds('# Just title\n\nbody', 'src.md', { idPattern: INV_PATTERN })
    expect(reg.entries.size).toBe(0)
  })

  it('同一 id の重複 heading は最初の出現を採用 (line 番号)', () => {
    const md = ['### INV-X-01: first', '### INV-X-01: dup'].join('\n')
    const reg = scanMarkdownIds(md, 'src.md', { idPattern: INV_PATTERN })
    expect(reg.entries.get('INV-X-01')?.line).toBe(1)
  })

  it('純粋性: 同じ入力 → 同じ出力', () => {
    const md = '### INV-A-01: foo'
    const a = scanMarkdownIds(md, 'src', { idPattern: INV_PATTERN })
    const b = scanMarkdownIds(md, 'src', { idPattern: INV_PATTERN })
    expect([...a.entries]).toEqual([...b.entries])
  })

  it('カスタム pattern (CALC-NNN) も動作', () => {
    const md = '### CALC-001: customerGap'
    const reg = scanMarkdownIds(md, 'src', { idPattern: /^###\s+(CALC-\d{3})/ })
    expect(reg.entries.get('CALC-001')?.line).toBe(1)
  })
})
