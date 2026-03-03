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
    const registry = readFile('references/metric-id-registry.md')

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
    const guardTestMap = readFile('references/guard-test-map.md')
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
    const quickRef = readFile('references/prohibition-quick-ref.md')

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
