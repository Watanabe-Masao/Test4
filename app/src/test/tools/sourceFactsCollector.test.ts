/**
 * Source Facts Collector 契約テスト (Wave 1 #4 = reposteward-ai-ops-platform)
 *
 * collector が以下 contract を満たすことを固定する:
 *   - SourceFactsBundle shape (= schemaVersion / generatedAt / summary / facts)
 *   - kind 推定 (= .ts / .tsx / .go / .md / .json)
 *   - layer 推定 (= app/src/presentation → 'presentation' / aag-engine → 'aag-engine' 等)
 *   - comment counting (= TS の // と /* * /、MD/JSON は 0)
 *   - effectiveCodeLines = physicalLines - blankLines - commentLines
 *   - imports / exports 抽出 (= TS / Go)
 *   - React hooks 検出 (= TSX のみ)
 *   - excludedKinds による filtering (= generated / fixture / archive)
 *
 * @responsibility R:unclassified
 * @see tools/architecture-health/src/facts/source-facts.ts
 * @see docs/contracts/aag/source-facts.schema.json
 *
 * @taxonomyKind T:unclassified
 */
import { describe, expect, it, afterEach } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collectSourceFacts } from '@tools/architecture-health/facts/source-facts'

interface TempRepo {
  readonly root: string
  cleanup(): void
}

function createTempRepo(files: Readonly<Record<string, string>>): TempRepo {
  const root = mkdtempSync(join(tmpdir(), 'source-facts-test-'))
  for (const [relPath, content] of Object.entries(files)) {
    const abs = join(root, relPath)
    mkdirSync(join(abs, '..'), { recursive: true })
    writeFileSync(abs, content, 'utf-8')
  }
  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  }
}

describe('Source Facts Collector 契約テスト', () => {
  let repo: TempRepo | null = null
  afterEach(() => {
    repo?.cleanup()
    repo = null
  })

  it('SourceFactsBundle shape が schema 互換', () => {
    repo = createTempRepo({
      'app/src/foo.ts': 'export const x = 1\n',
    })
    const bundle = collectSourceFacts({ repoRoot: repo.root })
    expect(bundle.schemaVersion).toBe('source-facts-v1')
    expect(typeof bundle.generatedAt).toBe('string')
    expect(bundle.summary.totalFiles).toBe(1)
    expect(bundle.summary.byKind).toEqual({ typescript: 1 })
    expect(bundle.facts).toHaveLength(1)
  })

  it('TS file の size + imports + exports を articulate する', () => {
    const ts = [
      "import { foo } from 'bar'",
      "import { baz } from '@/qux'",
      '',
      '// helper',
      'export const a = 1',
      'export function b() {}',
      'export type T = number', // export type は除外される
    ].join('\n')
    repo = createTempRepo({ 'app/src/sample.ts': ts })
    const bundle = collectSourceFacts({ repoRoot: repo.root })
    const fact = bundle.facts[0]
    expect(fact.kind).toBe('typescript')
    expect(fact.layer).toBe('app')
    expect(fact.physicalLines).toBe(7)
    expect(fact.blankLines).toBe(1)
    expect(fact.commentLines).toBe(1)
    expect(fact.effectiveCodeLines).toBe(5)
    expect(fact.imports).toEqual(['bar', '@/qux'])
    expect(fact.exports).toBe(2) // export const, export function (export type 除外)
  })

  it('TSX file の hooks を articulate する', () => {
    const tsx = [
      "import { useState, useEffect } from 'react'",
      'export function Comp() {',
      '  const [x, setX] = useState(0)',
      '  useEffect(() => {}, [])',
      '  useEffect(() => {}, [x])',
      '  return null',
      '}',
    ].join('\n')
    repo = createTempRepo({ 'app/src/presentation/Comp.tsx': tsx })
    const bundle = collectSourceFacts({ repoRoot: repo.root })
    const fact = bundle.facts[0]
    expect(fact.kind).toBe('tsx')
    expect(fact.layer).toBe('presentation')
    expect(fact.hooks).toEqual({ useState: 1, useEffect: 2 })
  })

  it('Go file の imports + exports を articulate する', () => {
    const go = [
      'package foo',
      '',
      'import "fmt"',
      '',
      'import (',
      '  "os"',
      '  "strings"',
      ')',
      '',
      '// PublicFn is exported',
      'func PublicFn() {}',
      'func privateFn() {}',
      'type PublicType struct{}',
      'var PublicVar = 1',
    ].join('\n')
    repo = createTempRepo({ 'aag-engine/internal/foo/foo.go': go })
    const bundle = collectSourceFacts({ repoRoot: repo.root })
    const fact = bundle.facts[0]
    expect(fact.kind).toBe('go')
    expect(fact.layer).toBe('aag-engine')
    expect(fact.imports).toEqual(['fmt', 'os', 'strings'])
    expect(fact.exports).toBe(3) // PublicFn + PublicType + PublicVar
  })

  it('Markdown file は size のみ articulate (= imports/exports/hooks omit)', () => {
    repo = createTempRepo({
      'references/foo.md': '# Title\n\nbody\n',
    })
    const bundle = collectSourceFacts({ repoRoot: repo.root })
    const fact = bundle.facts[0]
    expect(fact.kind).toBe('markdown')
    expect(fact.layer).toBe('references')
    expect(fact.commentLines).toBe(0)
    expect(fact.imports).toBeUndefined()
    expect(fact.exports).toBeUndefined()
    expect(fact.hooks).toBeUndefined()
  })

  it('layer 推定 (= 各種 path に対応)', () => {
    repo = createTempRepo({
      'app/src/presentation/p.ts': 'export const p = 1\n',
      'app/src/application/a.ts': 'export const a = 1\n',
      'app/src/domain/d.ts': 'export const d = 1\n',
      'app/src/infrastructure/i.ts': 'export const i = 1\n',
      'app/src/features/sales/s.ts': 'export const s = 1\n',
      'app/src/test/t.ts': 'export const t = 1\n',
      'tools/architecture-health/src/foo.ts': 'export const f = 1\n',
      'docs/foo.md': '# x\n',
      'projects/active/x/y.md': '# y\n',
    })
    const bundle = collectSourceFacts({ repoRoot: repo.root })
    const layers = new Map(bundle.facts.map((f) => [f.path, f.layer]))
    expect(layers.get('app/src/presentation/p.ts')).toBe('presentation')
    expect(layers.get('app/src/application/a.ts')).toBe('application')
    expect(layers.get('app/src/domain/d.ts')).toBe('domain')
    expect(layers.get('app/src/infrastructure/i.ts')).toBe('infrastructure')
    expect(layers.get('app/src/features/sales/s.ts')).toBe('features/sales')
    expect(layers.get('app/src/test/t.ts')).toBe('test')
    expect(layers.get('tools/architecture-health/src/foo.ts')).toBe('tools')
    expect(layers.get('docs/foo.md')).toBe('docs')
    expect(layers.get('projects/active/x/y.md')).toBe('projects')
  })

  it('excludedKinds=generated は generated/ 配下を skip', () => {
    repo = createTempRepo({
      'references/foo.md': '# foo\n',
      'references/04-tracking/generated/bar.md': '# bar\n',
    })
    const bundle = collectSourceFacts({
      repoRoot: repo.root,
      excludedKinds: ['generated'],
    })
    const paths = bundle.facts.map((f) => f.path)
    expect(paths).toContain('references/foo.md')
    expect(paths).not.toContain('references/04-tracking/generated/bar.md')
  })

  it('excludedKinds=fixture は fixtures/ 配下を skip', () => {
    repo = createTempRepo({
      'app/src/foo.ts': 'export const x = 1\n',
      'app/src/fixtures/bar.ts': 'export const y = 1\n',
    })
    const bundle = collectSourceFacts({
      repoRoot: repo.root,
      excludedKinds: ['fixture'],
    })
    const paths = bundle.facts.map((f) => f.path)
    expect(paths).toContain('app/src/foo.ts')
    expect(paths).not.toContain('app/src/fixtures/bar.ts')
  })

  it('excludedKinds=archive は projects/completed/ 配下を skip', () => {
    repo = createTempRepo({
      'projects/active/x/foo.md': '# foo\n',
      'projects/completed/x/bar.md': '# bar\n',
    })
    const bundle = collectSourceFacts({
      repoRoot: repo.root,
      excludedKinds: ['archive'],
    })
    const paths = bundle.facts.map((f) => f.path)
    expect(paths).toContain('projects/active/x/foo.md')
    expect(paths).not.toContain('projects/completed/x/bar.md')
  })

  it('comment counting: TS 行コメント / block コメント', () => {
    const ts = [
      '// line comment',
      '/* block start',
      ' * middle',
      ' */',
      'export const x = 1',
      '',
      '/**',
      ' * jsdoc',
      ' */',
      'export const y = 2',
    ].join('\n')
    repo = createTempRepo({ 'app/src/sample.ts': ts })
    const bundle = collectSourceFacts({ repoRoot: repo.root })
    const fact = bundle.facts[0]
    expect(fact.physicalLines).toBe(10)
    expect(fact.blankLines).toBe(1)
    // 1 (// line) + 3 (block) + 3 (jsdoc) = 7 comment lines
    expect(fact.commentLines).toBe(7)
    expect(fact.effectiveCodeLines).toBe(10 - 1 - 7)
  })

  it('facts は path 昇順で sort される', () => {
    repo = createTempRepo({
      'app/src/zeta.ts': 'export const z = 1\n',
      'app/src/alpha.ts': 'export const a = 1\n',
      'app/src/middle.ts': 'export const m = 1\n',
    })
    const bundle = collectSourceFacts({ repoRoot: repo.root })
    const paths = bundle.facts.map((f) => f.path)
    expect(paths).toEqual([
      'app/src/alpha.ts',
      'app/src/middle.ts',
      'app/src/zeta.ts',
    ])
  })

  it('node_modules / .git / dist は walking 対象外', () => {
    repo = createTempRepo({
      'app/src/foo.ts': 'export const x = 1\n',
      'app/src/node_modules/lib/index.ts': 'export const lib = 1\n',
      'dist/bundle.ts': 'export const b = 1\n',
    })
    const bundle = collectSourceFacts({ repoRoot: repo.root })
    const paths = bundle.facts.map((f) => f.path)
    expect(paths).toContain('app/src/foo.ts')
    expect(paths).not.toContain('app/src/node_modules/lib/index.ts')
    expect(paths).not.toContain('dist/bundle.ts')
  })
})
