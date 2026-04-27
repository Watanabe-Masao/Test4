/**
 * Content Spec Owner Guard — AR-CONTENT-SPEC-OWNER
 *
 * Phase B scope (2026-04-27): 全 45 WID-NNN.md frontmatter に
 * `owner` フィールドが必須。owner 欠落 spec は責任所在不明のため fail。
 *
 * 詳細: projects/phased-content-specs-rollout/plan.md §Phase A / §Phase B
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import { loadAllSpecs } from './contentSpecHelpers'

describe('Content Spec Owner Guard (AR-CONTENT-SPEC-OWNER)', () => {
  it('全 WID-NNN.md spec に owner field が設定されている', () => {
    const violations: string[] = []
    for (const spec of loadAllSpecs()) {
      if (!spec.owner || spec.owner.trim() === '') {
        violations.push(
          `${spec.id}: owner が未設定。frontmatter に owner: <role-id> を追加すること。`,
        )
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })
})
