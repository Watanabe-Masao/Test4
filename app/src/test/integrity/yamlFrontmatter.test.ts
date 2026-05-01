/**
 * Integrity Domain — yamlFrontmatter primitive unit tests
 *
 * Phase B Step B-3 で landing した `parseSpecFrontmatter` の動作を fixture string で検証。
 * 既存 `contentSpecHelpers.parseSpecFrontmatter` と同等出力を出すこと (動作同一性)。
 *
 * @taxonomyKind T:meta-guard
 * @responsibility R:guard
 */
import { describe, it, expect } from 'vitest'
import { parseSpecFrontmatter, inferKindFromId, type SpecFrontmatter } from '@app-domain/integrity'

describe('parsing/inferKindFromId', () => {
  it('kind を id prefix から推定', () => {
    expect(inferKindFromId('WID-001')).toBe('widget')
    expect(inferKindFromId('RM-005')).toBe('read-model')
    expect(inferKindFromId('CALC-024')).toBe('calculation')
    expect(inferKindFromId('CHART-003')).toBe('chart')
    expect(inferKindFromId('UIC-002')).toBe('ui-component')
  })

  it('未知 prefix で null', () => {
    expect(inferKindFromId('UNKNOWN-001')).toBeNull()
    expect(inferKindFromId('WID-1')).toBeNull() // 桁数不一致
  })
})

describe('parsing/parseSpecFrontmatter', () => {
  it('frontmatter なしで例外', () => {
    expect(() => parseSpecFrontmatter('no frontmatter here', 'test')).toThrow(/Invalid frontmatter/)
  })

  it('最小 widget spec を parse できる', () => {
    const content = [
      '---',
      'id: WID-001',
      'widgetDefId: foo',
      'registry: bar',
      'registrySource: src/foo.tsx',
      'registryLine: 42',
      '---',
      '',
      '# Body',
    ].join('\n')
    const spec: SpecFrontmatter = parseSpecFrontmatter(content, 'WID-001.md')
    expect(spec.id).toBe('WID-001')
    expect(spec.kind).toBe('widget')
    expect(spec.widgetDefId).toBe('foo')
    expect(spec.registryLine).toBe(42)
    expect(spec.lifecycleStatus).toBe('active') // default
  })

  it('lifecycle / replacedBy / supersedes / sunsetCondition を parse', () => {
    const content = [
      '---',
      'id: CALC-001',
      "lifecycleStatus: 'sunsetting'",
      "replacedBy: 'CALC-002'",
      "supersedes: 'CALC-000'",
      "sunsetCondition: 'after Q3'",
      "deadline: '2026-09-30'",
      '---',
    ].join('\n')
    const spec = parseSpecFrontmatter(content, 'CALC-001.md')
    expect(spec.kind).toBe('calculation')
    expect(spec.lifecycleStatus).toBe('sunsetting')
    expect(spec.replacedBy).toBe('CALC-002')
    expect(spec.supersedes).toBe('CALC-000')
    expect(spec.sunsetCondition).toBe('after Q3')
    expect(spec.deadline).toBe('2026-09-30')
  })

  it('null / 数値 scalar を正しく parse', () => {
    const content = ['---', 'id: RM-001', 'sourceLine: 42', 'lastSourceCommit: null', '---'].join(
      '\n',
    )
    const spec = parseSpecFrontmatter(content, 'RM-001.md')
    expect(spec.kind).toBe('read-model')
    expect(spec.sourceLine).toBe(42)
    expect(spec.lastSourceCommit).toBeNull()
  })

  it('純粋性: 同じ入力 → 同じ出力 (副作用なし)', () => {
    const content = ['---', 'id: WID-001', '---'].join('\n')
    const a = parseSpecFrontmatter(content, 'x')
    const b = parseSpecFrontmatter(content, 'x')
    expect(a).toEqual(b)
  })
})
