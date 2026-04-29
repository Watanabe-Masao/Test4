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
 * へ昇格する (`projects/completed/canonicalization-domain-consolidation/checklist.md` Phase H)。
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
import { COVERAGE_MAP } from '@app-domain/integrity'

const GUARDS_DIR = path.resolve(__dirname)
const TEST_DIR = path.resolve(__dirname, '..')

// Phase R-① 部分採用 (2026-04-29): COVERAGE_MAP は app-domain/integrity/coverage/
// に shared module 化 (R-⑥ Dogfooding: 自 domain の正本を import)。collector も
// 同 JSON を直接 read するため drift risk 解消。

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

    // Phase R-① 部分採用 follow-up (review #1201): PairId union と JSON 内
    // pairId 集合の drift を機械検証する。両者が手書き (TS union と JSON entry)
    // で並んでいるため、片方の追加・削除を忘れると silent drift する。
    it('PairId union と JSON 内 pairId 集合が一致する (drift detection)', () => {
      // PairId union のメンバを runtime で列挙するため、本 set を hardcode する。
      // 新 pair 追加時は coverage-map.json + PairId type + 本 set の 3 箇所更新。
      const expectedFromUnion: ReadonlySet<string> = new Set([
        'calc-canon',
        'canonicalization-system',
        'doc-registry',
        'test-contract',
        'scope-json',
        'taxonomy-v2',
        'principles',
        'architecture-rules-merge',
        'allowlists',
        'checklist',
        'obligation-collector',
        'content-spec',
        'invariant-catalog',
      ])
      const actualFromJson: ReadonlySet<string> = new Set(COVERAGE_MAP.map((p) => p.pairId))
      expect(actualFromJson).toEqual(expectedFromUnion)
    })

    // Phase R-① follow-up: COVERAGE_MAP は Object.freeze() されている。
    // runtime mutation を防ぐ (TypeScript の readonly は compile-time のみ)。
    it('COVERAGE_MAP は runtime で frozen (mutation 不可)', () => {
      expect(Object.isFrozen(COVERAGE_MAP)).toBe(true)
    })
  })

  describe('F-2: integrity domain coverage guard 自身が baseline 化されている', () => {
    it('本 file は app/src/test/guards/ 配下に存在し discovery 可能', () => {
      const self = path.join(GUARDS_DIR, 'integrityDomainCoverageGuard.test.ts')
      expect(fs.existsSync(self)).toBe(true)
    })
  })
})
