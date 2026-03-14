/**
 * ドキュメント整合性テスト
 *
 * CLAUDE.md・roles/・references/ とコードベースの整合性を機械的に検証する。
 * 設計思想1「アーキテクチャの境界は人の注意力ではなく、機械で守る」の
 * ドキュメント版。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..')

// ─── ヘルパー ───────────────────────────────────────────

function readFile(relativePath: string): string {
  const fullPath = path.join(ROOT_DIR, relativePath)
  if (!fs.existsSync(fullPath)) return ''
  return fs.readFileSync(fullPath, 'utf-8')
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT_DIR, relativePath))
}

function listDir(relativePath: string): string[] {
  const fullPath = path.join(ROOT_DIR, relativePath)
  if (!fs.existsSync(fullPath)) return []
  return fs
    .readdirSync(fullPath, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
}

// ─── MetricId 整合性 ────────────────────────────────────

describe('MetricId registry consistency', () => {
  it('metric-id-registry.md covers all MetricIds defined in Explanation.ts', () => {
    const explanationTs = readFile('app/src/domain/models/Explanation.ts')
    const registry = readFile('references/03-guides/metric-id-registry.md')

    // Explanation.ts から MetricId 型定義ブロックだけを抽出
    const metricIdBlockMatch = explanationTs.match(/export type MetricId =\n([\s\S]*?)(?:\n\n|$)/)
    expect(metricIdBlockMatch).not.toBeNull()
    const metricIdBlock = metricIdBlockMatch![1]

    const metricIdPattern = /\| '(\w+)'/g
    const codeMetricIds: string[] = []
    let match
    while ((match = metricIdPattern.exec(metricIdBlock)) !== null) {
      codeMetricIds.push(match[1])
    }

    expect(codeMetricIds.length).toBeGreaterThan(0)

    // registry に各 MetricId が記載されているか
    const missing = codeMetricIds.filter((id) => !registry.includes(id))
    expect(missing).toEqual([])
  })
})

// ─── ロール・ディレクトリ整合性 ─────────────────────────

describe('Role directory consistency', () => {
  const claudeMd = readFile('CLAUDE.md')

  it('all roles referenced in CLAUDE.md routing table have ROLE.md', () => {
    const roleNames = [
      'pm-business',
      'review-gate',
      'documentation-steward',
      'architecture',
      'implementation',
    ]
    const specialistRoles = ['invariant-guardian', 'duckdb-specialist', 'explanation-steward']

    for (const role of roleNames) {
      // staff か line かを判定
      const isStaff = ['pm-business', 'review-gate', 'documentation-steward'].includes(role)
      const dir = isStaff ? `roles/staff/${role}` : `roles/line/${role}`
      expect(fileExists(`${dir}/ROLE.md`)).toBe(true)
      expect(fileExists(`${dir}/SKILL.md`)).toBe(true)
    }

    for (const role of specialistRoles) {
      const dir = `roles/line/specialist/${role}`
      expect(fileExists(`${dir}/ROLE.md`)).toBe(true)
      expect(fileExists(`${dir}/SKILL.md`)).toBe(true)
    }
  })

  it('CLAUDE.md routing table mentions all existing roles', () => {
    // staff ロール
    const staffRoles = listDir('roles/staff')
    for (const role of staffRoles) {
      expect(claudeMd).toContain(role)
    }

    // line ロール
    const lineRoles = listDir('roles/line').filter((d) => d !== 'specialist')
    for (const role of lineRoles) {
      expect(claudeMd).toContain(role)
    }

    // specialist ロール
    const specialistDir = path.join(ROOT_DIR, 'roles/line/specialist')
    if (fs.existsSync(specialistDir)) {
      const specialists = listDir('roles/line/specialist')
      for (const role of specialists) {
        expect(claudeMd).toContain(role)
      }
    }
  })
})

// ─── ガードテスト存在確認 ────────────────────────────────

describe('Guard test map consistency', () => {
  it('guard-test-map.md references existing test files', () => {
    const guardTestMap = readFile('references/03-guides/guard-test-map.md')
    const testFilePattern = /`([^`]*\.test\.ts[x]?)`/g
    const referencedFiles: string[] = []
    let match
    while ((match = testFilePattern.exec(guardTestMap)) !== null) {
      referencedFiles.push(match[1])
    }

    for (const testFile of referencedFiles) {
      // パスを正規化（app/src/ プレフィックスを補完）
      const fullPath = testFile.startsWith('app/') ? testFile : `app/src/${testFile}`
      expect(fileExists(fullPath)).toBe(true)
    }
  })
})

// ─── references/ パス参照の有効性 ────────────────────────

describe('Reference path validity', () => {
  it('ROLE.md files reference existing documents', () => {
    const roleDirs = [
      'roles/staff/pm-business',
      'roles/staff/review-gate',
      'roles/staff/documentation-steward',
      'roles/line/architecture',
      'roles/line/implementation',
      'roles/line/specialist/invariant-guardian',
      'roles/line/specialist/duckdb-specialist',
      'roles/line/specialist/explanation-steward',
    ]

    for (const dir of roleDirs) {
      const roleMd = readFile(`${dir}/ROLE.md`)
      // references/ へのパス参照を抽出
      const refPattern = /`(references\/[^`]+)`/g
      let match
      while ((match = refPattern.exec(roleMd)) !== null) {
        const refPath = match[1]
        expect(fileExists(refPath)).toBe(true)
      }
    }
  })
})

// ─── 禁止事項の整合性 ───────────────────────────────────

describe('Prohibition consistency', () => {
  it('prohibition-quick-ref.md covers all prohibitions in CLAUDE.md', () => {
    const claudeMd = readFile('CLAUDE.md')
    const quickRef = readFile('references/01-principles/prohibition-quick-ref.md')

    // CLAUDE.md の禁止事項番号を抽出
    const prohibitionPattern = /### (\d+)\. /g
    const numbers: string[] = []
    let match
    while ((match = prohibitionPattern.exec(claudeMd)) !== null) {
      numbers.push(match[1])
    }

    // quick-ref に各番号が記載されているか
    for (const num of numbers) {
      expect(quickRef).toContain(num)
    }
  })
})

// ─── 不変条件カタログ ↔ ガードテスト対応表 ──────────────

describe('Invariant catalog ↔ guard test map consistency', () => {
  it('all INV-* IDs in invariant-catalog.md appear in guard-test-map.md', () => {
    const catalog = readFile('references/03-guides/invariant-catalog.md')
    const guardMap = readFile('references/03-guides/guard-test-map.md')

    const invPattern = /### (INV-[A-Z]+-\d+)/g
    const catalogIds: string[] = []
    let match
    while ((match = invPattern.exec(catalog)) !== null) {
      catalogIds.push(match[1])
    }

    expect(catalogIds.length).toBeGreaterThan(0)

    const missing = catalogIds.filter((id) => !guardMap.includes(id))
    expect(missing).toEqual([])
  })

  it('all INV-* IDs in guard-test-map.md appear in invariant-catalog.md', () => {
    const catalog = readFile('references/03-guides/invariant-catalog.md')
    const guardMap = readFile('references/03-guides/guard-test-map.md')

    const invPattern = /INV-[A-Z]+-\d+/g
    const mapIds = new Set<string>()
    let match
    while ((match = invPattern.exec(guardMap)) !== null) {
      mapIds.add(match[0])
    }

    expect(mapIds.size).toBeGreaterThan(0)

    const missing = [...mapIds].filter((id) => !catalog.includes(id))
    expect(missing).toEqual([])
  })
})

// ─── エンジン責務マトリクス ↔ 実コード ──────────────────

describe('Engine responsibility ↔ code consistency', () => {
  it('JS modules listed in engine-responsibility.md exist in domain/calculations/', () => {
    const doc = readFile('references/01-principles/engine-responsibility.md')

    // JS テーブルからモジュール名を抽出（`module.ts` or `subdir/module.ts` パターン）
    const jsSection = doc.split('### DuckDB')[0]
    const modulePattern = /`([\w/]+\.ts)`/g
    const modules = new Set<string>()
    let match
    while ((match = modulePattern.exec(jsSection)) !== null) {
      modules.add(match[1])
    }

    expect(modules.size).toBeGreaterThan(0)

    const missing = [...modules].filter((mod) => !fileExists(`app/src/domain/calculations/${mod}`))
    expect(missing).toEqual([])
  })

  it('DuckDB modules listed in engine-responsibility.md exist in infrastructure/duckdb/queries/', () => {
    const doc = readFile('references/01-principles/engine-responsibility.md')

    // DuckDB テーブルからモジュール名を抽出
    const duckSection = doc.split('### DuckDB')[1]?.split('### 両エンジン')[0] ?? ''
    const modulePattern = /`(\w+\.ts)`/g
    const modules = new Set<string>()
    let match
    while ((match = modulePattern.exec(duckSection)) !== null) {
      modules.add(match[1])
    }

    expect(modules.size).toBeGreaterThan(0)

    const missing = [...modules].filter(
      (mod) => !fileExists(`app/src/infrastructure/duckdb/queries/${mod}`),
    )
    expect(missing).toEqual([])
  })
})

// ─── CLAUDE.md 内の references/ パス有効性 ──────────────

describe('CLAUDE.md reference path validity', () => {
  it('all references/ paths in CLAUDE.md exist on disk', () => {
    const claudeMd = readFile('CLAUDE.md')

    const refPattern = /`(references\/[^`]+\.md)`/g
    const paths = new Set<string>()
    let match
    while ((match = refPattern.exec(claudeMd)) !== null) {
      paths.add(match[1])
    }

    expect(paths.size).toBeGreaterThan(0)

    const missing = [...paths].filter((p) => !fileExists(p))
    expect(missing).toEqual([])
  })
})

// ─── ROLE.md 連携プロトコル相互参照 ─────────────────────

describe('Role protocol bidirectional consistency', () => {
  const roleNameToPath: Record<string, string> = {
    'pm-business': 'roles/staff/pm-business',
    'review-gate': 'roles/staff/review-gate',
    'documentation-steward': 'roles/staff/documentation-steward',
    architecture: 'roles/line/architecture',
    implementation: 'roles/line/implementation',
    'invariant-guardian': 'roles/line/specialist/invariant-guardian',
    'duckdb-specialist': 'roles/line/specialist/duckdb-specialist',
    'explanation-steward': 'roles/line/specialist/explanation-steward',
  }

  it('every role mentioned in a protocol table has a corresponding ROLE.md', () => {
    for (const [, dir] of Object.entries(roleNameToPath)) {
      const roleMd = readFile(`${dir}/ROLE.md`)
      // 連携プロトコルセクションのみを抽出
      const sectionMatch = roleMd.match(/## 連携プロトコル[\s\S]*?(?=\n## |\n$|$)/)
      if (!sectionMatch) continue
      const section = sectionMatch[0]

      // テーブルの「方向+相手」列からロール名を抽出
      const protocolPattern = /\|\s*(?:←|→|←→)\s+(\S+)\s*\|/g
      let match
      while ((match = protocolPattern.exec(section)) !== null) {
        const counterpart = match[1]
        // 汎用表現・グループ参照はスキップ
        if (counterpart === '全ロール' || counterpart === '人間' || counterpart.includes('*'))
          continue
        expect(Object.keys(roleNameToPath)).toContain(counterpart)
      }
    }
  })
})
