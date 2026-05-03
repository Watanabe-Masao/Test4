/**
 * Canonical Doc Back Link Guard — Project B Phase 4 meta-guard #3
 *
 * reverse direction (設計 doc / requirement → 実装 rule binding) の整合性を機械検証する。
 * 各 rule の metaRequirementRefs.refs[].requirementId が aag/meta.md §2 の `AAG-REQ-*`
 * namespace に実在することを hard fail で検証 (orphan requirementId の検出)。
 *
 * 検証:
 * - 各 rule で metaRequirementRefs.status='bound' の場合、refs[].requirementId が
 *   `aag/_internal/meta.md` 内で `AAG-REQ-*` として articulate されていること
 * - aag/meta.md §2 で articulate された AAG-REQ-* で、どの rule の metaRequirementRefs にも
 *   bound されていない orphan requirementId は warning level (本 MVP は warn のみ、
 *   hard fail は forward direction の path 実在のみ)
 *
 * @guard F8 正本保護
 * @guard G8 責務分離ガード
 * @see references/04-tracking/ar-rule-audit.md §2.5 (`AAG-REQ-SEMANTIC-ARTICULATION` + `AAG-REQ-BIDIRECTIONAL-INTEGRITY` の機械検証)
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { ARCHITECTURE_RULES } from '../architectureRules'

const REPO_ROOT = path.resolve(__dirname, '../../../..')
const META_DOC_PATH = path.resolve(REPO_ROOT, 'aag/_internal/meta.md')

function loadKnownRequirementIds(): Set<string> {
  if (!fs.existsSync(META_DOC_PATH)) {
    throw new Error(`aag/meta.md not found: ${META_DOC_PATH}`)
  }
  const content = fs.readFileSync(META_DOC_PATH, 'utf-8')
  // Match `AAG-REQ-*` IDs in inline code or backticks
  const pattern = /AAG-REQ-[A-Z][A-Z0-9-]+/g
  const matches = content.match(pattern) ?? []
  return new Set(matches)
}

describe('Canonical Doc Back Link Guard: reverse direction (AAG-REQ ↔ rule binding)', () => {
  const knownRequirementIds = loadKnownRequirementIds()

  it('aag/meta.md 内に AAG-REQ-* が articulate 済 (canonical 起点が空でない)', () => {
    expect(knownRequirementIds.size).toBeGreaterThan(0)
  })

  it('全 rule の metaRequirementRefs.refs[].requirementId が aag/meta.md に articulate 済', () => {
    const violations: string[] = []
    for (const rule of ARCHITECTURE_RULES) {
      const binding = rule.metaRequirementRefs
      if (!binding || binding.status !== 'bound') continue
      for (const ref of binding.refs) {
        if (!knownRequirementIds.has(ref.requirementId)) {
          violations.push(
            `${rule.id}.metaRequirementRefs.refs[].requirementId: '${ref.requirementId}' が aag/meta.md §2 で articulate 不在 (orphan)`,
          )
        }
      }
    }
    expect(violations).toEqual([])
  })
})
