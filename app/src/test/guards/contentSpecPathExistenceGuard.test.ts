/**
 * Content Spec Path Existence Guard — AR-CONTENT-SPEC-PATH-EXISTENCE
 *
 * Phase J 後続課題 J7 (2026-04-29、phased-content-specs-rollout #1 着手):
 * spec body の Behavior Claims に記載された tests / guards path が repo 内に実在
 * することを機械検証する。`AR-CONTENT-SPEC-EVIDENCE-LEVEL` (cell 非空のみ検証) の
 * 補完 rule として、path typo / 移動後の stale reference / 削除後の orphan を排除。
 *
 * 検証対象:
 * - 全 spec の Behavior Claims table から parse した各 claim の `tests` 列
 * - 同じく `guards` 列
 * - 各 path を REPO_ROOT 起点で existsSync チェック
 *
 * 違反時の修正経路:
 * - path を実 file に合わせて修正
 * - test / guard を復活させる
 * - evidence 再収集不可なら evidenceLevel を unknown / asserted に降格
 *
 * **dogfooding (R-⑥)**: 本 guard は `@app-domain/integrity` の primitive
 * (`parseBehaviorClaimsTable` + `checkPathExistence`) を経由する。同 primitive を
 * `contentSpecEvidenceLevelGuard.test.ts` も使うため、parser logic は単一正本
 * (`app-domain/integrity/parsing/behaviorClaimsTable.ts`) に集約。
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:guard
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  parseBehaviorClaimsTable,
  checkPathExistence,
  type RegisteredPath,
} from '@app-domain/integrity'
import { REPO_ROOT, SPECS_BASE } from './contentSpecHelpers'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const rule = getRuleById('AR-CONTENT-SPEC-PATH-EXISTENCE')!

const SPEC_KIND_DIRS = [
  'widgets',
  'read-models',
  'calculations',
  'charts',
  'ui-components',
] as const

function listSpecFiles(): string[] {
  const out: string[] = []
  for (const dir of SPEC_KIND_DIRS) {
    const fullDir = resolve(SPECS_BASE, dir)
    if (!existsSync(fullDir)) continue
    const files = readdirSync(fullDir).filter((f) => /^[A-Z]+(?:-\d{3})\.md$/.test(f))
    for (const f of files) out.push(resolve(fullDir, f))
  }
  return out
}

describe('Content Spec Path Existence Guard (AR-CONTENT-SPEC-PATH-EXISTENCE)', () => {
  it('全 spec の Behavior Claims tests / guards path が repo 内に実在する', () => {
    const allPaths: RegisteredPath[] = []
    for (const specPath of listSpecFiles()) {
      const content = readFileSync(specPath, 'utf-8')
      const claims = parseBehaviorClaimsTable(content)
      const specId = specPath.split('/').pop()?.replace(/\.md$/, '') ?? ''
      for (const claim of claims) {
        for (const t of claim.tests) {
          allPaths.push({
            absPath: resolve(REPO_ROOT, t),
            displayPath: t,
            registryLocation: `${specId} ${claim.id} tests`,
          })
        }
        for (const g of claim.guards) {
          allPaths.push({
            absPath: resolve(REPO_ROOT, g),
            displayPath: g,
            registryLocation: `${specId} ${claim.id} guards`,
          })
        }
      }
    }
    const violations = checkPathExistence(allPaths, existsSync, {
      ruleId: rule.id,
      registryLabel: 'references/05-contents (Behavior Claims tests/guards)',
    })
    const broken = violations.map((v) => `${v.location}: ${v.actual}`)
    expect(broken, formatViolationMessage(rule, broken)).toEqual([])
  })
})
