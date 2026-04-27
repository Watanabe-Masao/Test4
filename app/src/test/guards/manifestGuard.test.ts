/**
 * Manifest Guard — .claude/manifest.json の整合性検証
 *
 * AI Single Entry Manifest が参照する全ての構造化正本（doc-registry /
 * principles / scope.json 群 / test-contract / pathTriggers の source）
 * が実在することを機械検証する。
 *
 * Phase 1（本 PR）: 静的参照の実在性 + schema 検証
 * Phase 2 以降: hook 整合性、activeContext 妥当性検証を追加予定
 *
 * @guard G1 テストに書く / governance-ops
 * ルール定義: architectureRules.ts (AR-DOC-STATIC-NUMBER — 文書品質ガバナンス)
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const MANIFEST_PATH = path.join(PROJECT_ROOT, '.claude/manifest.json')
const rule = getRuleById('AR-DOC-STATIC-NUMBER')!

interface CanonicalSourceEntry {
  path: string
  purpose: string
}
interface ScopeDeclarations {
  directory: string
  filenamePattern: string
  loaders: string[]
}
interface CanonicalSources {
  docRegistry: CanonicalSourceEntry
  principles: CanonicalSourceEntry
  projectMetadata: CanonicalSourceEntry
  testContract: CanonicalSourceEntry
  scopeDeclarations: ScopeDeclarations
}
interface PathTriggers {
  source: string
  exportedSymbol: string
  semantics: string
}
interface Discovery {
  policy: string
  byTopic: Record<string, string[]>
  byExpertise: Record<string, string>
}
interface ActiveContext {
  policy: string
  currentFocus: string | null
  loadedRefs: unknown[]
  openQuestions: unknown[]
  sessionNotes: string | null
  lastUpdated: string | null
}
interface Lifecycle {
  updatedBy: { static: string; activeContext: string }
  updateTrigger: { static: string[]; activeContext: string[] }
  validation: string
}
interface Manifest {
  version: string
  schema: string
  owner: string
  rationale: string
  canonicalSources: CanonicalSources
  pathTriggers: PathTriggers
  dispatcherPolicy?: { recommendedHandlers: { taskPattern: string }[] }
  discovery: Discovery
  activeContext: ActiveContext
  lifecycle: Lifecycle
}

const manifest: Manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'))

function exists(relPath: string): boolean {
  return fs.existsSync(path.join(PROJECT_ROOT, relPath))
}

describe('Manifest Guard: .claude/manifest.json の整合性', () => {
  it('manifest.json が読み込め、必須フィールドを持つ', () => {
    expect(manifest.version).toBeTruthy()
    expect(manifest.schema).toBe('manifest-v1')
    expect(manifest.owner).toBeTruthy()
    expect(manifest.rationale).toBeTruthy()
    expect(manifest.canonicalSources).toBeTruthy()
    expect(manifest.pathTriggers).toBeTruthy()
    expect(manifest.discovery).toBeTruthy()
    expect(manifest.activeContext).toBeTruthy()
    expect(manifest.lifecycle).toBeTruthy()
  })

  it('discovery.byTopic の全 doc path が実在する', () => {
    const violations: string[] = []
    for (const [topic, paths] of Object.entries(manifest.discovery.byTopic)) {
      if (topic.startsWith('$')) continue // $comment 等のメタフィールドは skip
      if (!Array.isArray(paths)) continue
      for (const docPath of paths) {
        if (!exists(docPath)) {
          violations.push(`discovery.byTopic['${topic}']: '${docPath}' が実在しない`)
        }
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('discovery.byExpertise の全 directory path が実在する', () => {
    const violations: string[] = []
    for (const [expertise, dirPath] of Object.entries(manifest.discovery.byExpertise)) {
      if (expertise.startsWith('$')) continue // $comment 等のメタフィールドは skip
      if (typeof dirPath !== 'string') continue
      if (!exists(dirPath)) {
        violations.push(`discovery.byExpertise['${expertise}']: '${dirPath}' が実在しない`)
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('activeContext が free-form schema を持つ（rigid rule なし）', () => {
    const violations: string[] = []
    const ac = manifest.activeContext
    // policy フィールドが「free-form notebook」であることを軽く確認（rigid 化したら警告）
    if (typeof ac.policy !== 'string' || !ac.policy.includes('free-form')) {
      violations.push(
        'activeContext.policy が free-form 表記を失っている（rigid 化していないか確認）',
      )
    }
    // currentFocus / loadedRefs / openQuestions / sessionNotes は存在するが値の中身は問わない
    if (!('currentFocus' in ac)) violations.push('activeContext.currentFocus フィールドが無い')
    if (!('loadedRefs' in ac)) violations.push('activeContext.loadedRefs フィールドが無い')
    if (!('openQuestions' in ac)) violations.push('activeContext.openQuestions フィールドが無い')
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('canonicalSources の各正本ファイルが実在する', () => {
    const violations: string[] = []
    const cs = manifest.canonicalSources
    for (const key of ['docRegistry', 'principles', 'projectMetadata', 'testContract'] as const) {
      const entry = cs[key]
      if (!exists(entry.path)) {
        violations.push(`canonicalSources.${key}: '${entry.path}' が実在しない`)
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('scopeDeclarations の directory が存在し全 loaders が実在する', () => {
    const violations: string[] = []
    const sd = manifest.canonicalSources.scopeDeclarations
    if (!exists(sd.directory)) {
      violations.push(`scopeDeclarations.directory '${sd.directory}' が実在しない`)
    }
    for (const loader of sd.loaders) {
      if (!exists(loader)) {
        violations.push(`scopeDeclarations.loaders: '${loader}' が実在しない`)
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('scopeDeclarations.loaders が roles/ 配下の全 scope.json と一致する', () => {
    const violations: string[] = []
    // roles/ 配下を再帰的に走査して scope.json を集める
    function walk(dir: string, found: string[]): void {
      const fullDir = path.join(PROJECT_ROOT, dir)
      if (!fs.existsSync(fullDir)) return
      for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
        const sub = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(sub, found)
        } else if (entry.name === 'scope.json') {
          found.push(sub.replace(/\\/g, '/'))
        }
      }
    }
    const actualScopes: string[] = []
    walk('roles', actualScopes)
    actualScopes.sort()

    const declaredSet = new Set(manifest.canonicalSources.scopeDeclarations.loaders)
    const actualSet = new Set(actualScopes)

    for (const a of actualScopes) {
      if (!declaredSet.has(a)) {
        violations.push(
          `scope.json '${a}' が実在するが manifest.scopeDeclarations.loaders に未宣言`,
        )
      }
    }
    for (const d of declaredSet) {
      if (!actualSet.has(d)) {
        violations.push(`manifest が宣言する '${d}' が実在しない`)
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('pathTriggers.source が実在し exportedSymbol を含む', () => {
    const violations: string[] = []
    const pt = manifest.pathTriggers
    if (!exists(pt.source)) {
      violations.push(`pathTriggers.source '${pt.source}' が実在しない`)
    } else {
      const sourceContent = fs.readFileSync(path.join(PROJECT_ROOT, pt.source), 'utf-8')
      if (!sourceContent.includes(pt.exportedSymbol)) {
        violations.push(`pathTriggers.source に exportedSymbol '${pt.exportedSymbol}' の記述がない`)
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('lifecycle.validation が指す guard 自身が存在する（自己参照）', () => {
    const violations: string[] = []
    if (!exists(manifest.lifecycle.validation)) {
      violations.push(`lifecycle.validation '${manifest.lifecycle.validation}' が実在しない`)
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('lifecycle.updatedBy / updateTrigger が static / activeContext の 2 区分を持つ', () => {
    const violations: string[] = []
    const ub = manifest.lifecycle.updatedBy
    if (!ub.static || !ub.activeContext) {
      violations.push(
        'lifecycle.updatedBy は static / activeContext の 2 区分が必須（更新主体の責務分離）',
      )
    }
    const ut = manifest.lifecycle.updateTrigger
    if (!Array.isArray(ut.static) || !Array.isArray(ut.activeContext)) {
      violations.push(
        'lifecycle.updateTrigger は static / activeContext の 2 区分が必須（更新契機の責務分離）',
      )
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })
})
