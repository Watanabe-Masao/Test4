/**
 * Content Spec Owner Guard — AR-CONTENT-SPEC-OWNER
 *
 * Phase A scope: Anchor Slice 5 widget の WID-NNN.md frontmatter に
 * `owner` フィールドが必須。owner 欠落 spec は責任所在不明のため fail。
 *
 * 詳細: projects/phased-content-specs-rollout/plan.md §Phase A
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import { loadAnchorSpecs } from './contentSpecHelpers'

describe('Content Spec Owner Guard (AR-CONTENT-SPEC-OWNER)', () => {
  it('Anchor Slice 5 件の全 spec に owner field が設定されている', () => {
    const violations: string[] = []
    for (const spec of loadAnchorSpecs()) {
      if (!spec.owner || spec.owner.trim() === '') {
        violations.push(
          `${spec.id}: owner が未設定。frontmatter に owner: <role-id> を追加すること。`,
        )
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })
})
