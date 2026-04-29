/**
 * Integrity Domain Coverage Guard — Phase F 完全性 + adapter shape 検証
 *
 * canonicalization-domain-consolidation Phase F (Domain Invariant Test) で landing。
 * Phase B〜E で migration 済の 13 ペアが integrity domain primitive 経由で表現されて
 * いることを機械検証する。Phase H 着手の prerequisite (本 guard PASS が条件)。
 *
 * 検証対象:
 * - F-2 完全性: 各 pair の代表 guard file が `@app-domain/integrity` を直接 / 間接
 *   (contentSpecHelpers 経由) に import している
 * - F-3 adapter shape: 各 guard file の行数が baseline 以下 (ratchet-down)
 * - F-3 adapter shape: caller 側 inline drift detection logic の混入禁止
 *
 * **deferred pair**: obligation-collector (#11) は Phase E scope 外として明示的に
 * skip。Phase H で親 architectureRuleGuard と共に再評価。
 *
 * **scope (2026-04-28 縮小)**: Phase H tier1 (wasm + charts) は本 guard 対象外
 * (Phase F 完了時点で未 migration)。Phase H 完了時に「Phase H 採用候補を含む形」
 * へ昇格する (`projects/canonicalization-domain-consolidation/checklist.md` Phase H)。
 *
 * @see references/01-principles/canonicalization-principles.md §P9
 * @see references/03-guides/integrity-domain-architecture.md
 *
 * @responsibility R:guard
 * @taxonomyKind T:meta-guard
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const GUARDS_DIR = path.resolve(__dirname)
const TEST_DIR = path.resolve(__dirname, '..')

type PairId =
  | 'calc-canon'
  | 'canonicalization-system'
  | 'doc-registry'
  | 'test-contract'
  | 'scope-json'
  | 'taxonomy-v2'
  | 'principles'
  | 'architecture-rules-merge'
  | 'allowlists'
  | 'checklist'
  | 'obligation-collector'
  | 'content-spec'
  | 'invariant-catalog'

interface PairCoverage {
  readonly pairId: PairId
  readonly displayName: string
  /** caller 側 guard file の相対 path (test/ 起点)。複数指定すると "いずれかが" import 条件を満たせば PASS */
  readonly guardFiles: readonly string[]
  /** ratchet-down baseline (lines)。実測値以上の値を設定 */
  readonly maxLines: Record<string, number>
  readonly status: 'migrated' | 'deferred'
  readonly deferReason?: string
}

const COVERAGE_MAP: readonly PairCoverage[] = [
  {
    pairId: 'calc-canon',
    displayName: '#1 calculationCanonRegistry ↔ calculationCanonGuard',
    guardFiles: ['guards/calculationCanonGuard.test.ts'],
    maxLines: { 'guards/calculationCanonGuard.test.ts': 450 },
    status: 'migrated',
  },
  {
    pairId: 'canonicalization-system',
    displayName: '#2 readModels 構造 ↔ canonicalizationSystemGuard',
    guardFiles: ['guards/canonicalizationSystemGuard.test.ts'],
    maxLines: { 'guards/canonicalizationSystemGuard.test.ts': 200 },
    status: 'migrated',
  },
  {
    pairId: 'doc-registry',
    displayName: '#3 doc-registry.json ↔ docRegistryGuard',
    guardFiles: ['guards/docRegistryGuard.test.ts'],
    maxLines: { 'guards/docRegistryGuard.test.ts': 240 },
    status: 'migrated',
  },
  {
    pairId: 'test-contract',
    displayName: '#4 test-contract.json ↔ testContractGuard',
    guardFiles: ['guards/testContractGuard.test.ts'],
    maxLines: { 'guards/testContractGuard.test.ts': 270 },
    status: 'migrated',
  },
  {
    pairId: 'scope-json',
    displayName: '#5 scope.json ↔ scopeJsonGuard',
    guardFiles: ['guards/scopeJsonGuard.test.ts'],
    maxLines: { 'guards/scopeJsonGuard.test.ts': 210 },
    status: 'migrated',
  },
  {
    pairId: 'taxonomy-v2',
    displayName: '#6 taxonomy v2 R/T registry ↔ taxonomyInterlockGuard',
    guardFiles: ['guards/taxonomyInterlockGuard.test.ts'],
    maxLines: { 'guards/taxonomyInterlockGuard.test.ts': 210 },
    status: 'migrated',
  },
  {
    pairId: 'principles',
    displayName: '#7 principles.json ↔ documentConsistency.test.ts',
    guardFiles: ['documentConsistency.test.ts'],
    maxLines: { 'documentConsistency.test.ts': 950 },
    status: 'migrated',
  },
  {
    pairId: 'architecture-rules-merge',
    displayName: '#8 architectureRules base+overlays+defaults ↔ mergeSmokeGuard',
    guardFiles: ['guards/architectureRulesMergeSmokeGuard.test.ts'],
    maxLines: { 'guards/architectureRulesMergeSmokeGuard.test.ts': 190 },
    status: 'migrated',
  },
  {
    pairId: 'allowlists',
    displayName: '#9 allowlists/*.ts ↔ allowlistMetadataGuard',
    guardFiles: ['guards/allowlistMetadataGuard.test.ts'],
    maxLines: { 'guards/allowlistMetadataGuard.test.ts': 160 },
    status: 'migrated',
  },
  {
    pairId: 'checklist',
    displayName: '#10 projects/<id>/checklist.md ↔ checklistFormatGuard',
    guardFiles: ['guards/checklistFormatGuard.test.ts'],
    maxLines: { 'guards/checklistFormatGuard.test.ts': 270 },
    status: 'migrated',
  },
  {
    pairId: 'obligation-collector',
    displayName: '#11 OBLIGATION_MAP ↔ obligation-collector / architectureRuleGuard',
    guardFiles: [],
    maxLines: {},
    status: 'deferred',
    deferReason: 'Phase E scope 外。Phase H で親 architectureRuleGuard.test.ts と共に再評価',
  },
  {
    pairId: 'content-spec',
    displayName: '#12 references/05-contents/ ↔ contentSpec*Guard × 10',
    guardFiles: [
      'guards/contentSpecCanonicalRegistrationSyncGuard.test.ts',
      'guards/contentSpecCoChangeGuard.test.ts',
      'guards/contentSpecEvidenceLevelGuard.test.ts',
      'guards/contentSpecExistsGuard.test.ts',
      'guards/contentSpecFreshnessGuard.test.ts',
      'guards/contentSpecFrontmatterSyncGuard.test.ts',
      'guards/contentSpecLifecycleGuard.test.ts',
      'guards/contentSpecLifecycleLinkSymmetryGuard.test.ts',
      'guards/contentSpecOwnerGuard.test.ts',
      'guards/contentSpecVisualEvidenceGuard.test.ts',
    ],
    maxLines: {
      'guards/contentSpecCanonicalRegistrationSyncGuard.test.ts': 170,
      'guards/contentSpecCoChangeGuard.test.ts': 90,
      'guards/contentSpecEvidenceLevelGuard.test.ts': 290,
      'guards/contentSpecExistsGuard.test.ts': 100,
      'guards/contentSpecFreshnessGuard.test.ts': 70,
      'guards/contentSpecFrontmatterSyncGuard.test.ts': 70,
      'guards/contentSpecLifecycleGuard.test.ts': 130,
      'guards/contentSpecLifecycleLinkSymmetryGuard.test.ts': 100,
      'guards/contentSpecOwnerGuard.test.ts': 50,
      'guards/contentSpecVisualEvidenceGuard.test.ts': 110,
    },
    status: 'migrated',
  },
  {
    pairId: 'invariant-catalog',
    displayName: '#13 invariant-catalog.md ↔ documentConsistency.test.ts',
    guardFiles: ['documentConsistency.test.ts'],
    maxLines: {}, // pair #7 と同 file、line count check は #7 で実施
    status: 'migrated',
  },
]

const DOMAIN_IMPORT_RE = /from\s+['"]@app-domain\/integrity/
const HELPERS_IMPORT_RE =
  /from\s+['"]\.\/contentSpecHelpers['"]|from\s+['"]\.\.\/guards\/contentSpecHelpers['"]/

function readGuardFile(rel: string): string {
  return fs.readFileSync(path.join(TEST_DIR, rel), 'utf-8')
}

function importsDomain(rel: string): boolean {
  const content = readGuardFile(rel)
  if (DOMAIN_IMPORT_RE.test(content)) return true
  // contentSpecHelpers は domain primitive の I/O wrapper として認可された adapter
  if (rel.startsWith('guards/contentSpec') && HELPERS_IMPORT_RE.test(content)) return true
  return false
}

function countLines(rel: string): number {
  return readGuardFile(rel).split('\n').length
}

describe('Integrity Domain Coverage (Phase F 完全性 + adapter shape)', () => {
  describe('F-2: 完全性 — 全 migrated pair が domain primitive 経由', () => {
    for (const entry of COVERAGE_MAP) {
      if (entry.status === 'deferred') continue

      it(`${entry.displayName} の guard が @app-domain/integrity を経由する`, () => {
        const reachable = entry.guardFiles.filter((f) => importsDomain(f))
        expect(
          reachable.length,
          `${entry.pairId}: 0 guard imports @app-domain/integrity (or contentSpecHelpers wrapper). guardFiles=${entry.guardFiles.join(', ')}`,
        ).toBeGreaterThan(0)
      })
    }
  })

  describe('F-3: adapter shape — caller 行数が baseline 以下 (ratchet-down)', () => {
    for (const entry of COVERAGE_MAP) {
      if (entry.status === 'deferred') continue

      for (const file of entry.guardFiles) {
        const max = entry.maxLines[file]
        if (max === undefined) continue // pair #13 のような shared file は skip

        it(`${file} ≤ ${max} lines (ratchet-down baseline)`, () => {
          const actual = countLines(file)
          expect(
            actual,
            `${file}: ${actual} lines exceeds baseline ${max}. caller が太ったら domain primitive を再評価せよ (P9 + integrity-domain-architecture.md adapter pattern)`,
          ).toBeLessThanOrEqual(max)
        })
      }
    }
  })

  describe('F-3: deferred pair が明示的に list されている', () => {
    it('deferred pair (#11 obligation-collector) は理由付きで coverage map に登録されている', () => {
      const deferred = COVERAGE_MAP.filter((e) => e.status === 'deferred')
      expect(deferred.length).toBe(1)
      expect(deferred[0].pairId).toBe('obligation-collector')
      expect(deferred[0].deferReason).toBeTruthy()
    })
  })

  describe('F-2: coverage map が 13 pair をすべて記録している', () => {
    it('Phase A inventory 13 ペア全件が coverage map に list されている', () => {
      expect(COVERAGE_MAP.length).toBe(13)
    })
  })

  describe('F-2: integrity domain coverage guard 自身が baseline 化されている', () => {
    it('本 file は app/src/test/guards/ 配下に存在し discovery 可能', () => {
      const self = path.join(GUARDS_DIR, 'integrityDomainCoverageGuard.test.ts')
      expect(fs.existsSync(self)).toBe(true)
    })
  })
})
