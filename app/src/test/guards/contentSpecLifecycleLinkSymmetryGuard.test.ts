/**
 * Content Spec Lifecycle Link Symmetry Guard — AR-CONTENT-SPEC-LIFECYCLE-LINK-SYMMETRY
 *
 * Phase D Step 2 (2026-04-28): replacedBy / supersedes の **双方向対称性** を強制する。
 *
 * 双方向対称ルール:
 *   - spec A が `replacedBy: B` を持つなら、spec B は `supersedes: A` を持たねばならない
 *   - spec A が `supersedes: B` を持つなら、spec B は `replacedBy: A` を持たねばならない
 *   - 参照先 spec が存在しない場合は孤立リンクとして hard fail
 *
 * 不可侵原則:
 *   片方向リンクは「移行が完結していない / 半移行状態が居残る」典型 anti-pattern。
 *   構造的に排除し、Promote Ceremony が 1 PR で双方を同期更新することを強制する。
 *
 * 詳細: projects/completed/phased-content-specs-rollout/plan.md §5.4 Lifecycle State Machine,
 * references/03-implementation/promote-ceremony-pr-template.md §「状態遷移の規則」.
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import { loadAllSpecs } from './contentSpecHelpers'

describe('Content Spec Lifecycle Link Symmetry Guard (AR-CONTENT-SPEC-LIFECYCLE-LINK-SYMMETRY)', () => {
  it('replacedBy が示す spec は supersedes で逆方向に参照を持つ', () => {
    const specs = loadAllSpecs()
    const byId = new Map(specs.map((s) => [s.id, s]))
    const violations: string[] = []
    for (const spec of specs) {
      if (!spec.replacedBy) continue
      const target = byId.get(spec.replacedBy)
      if (!target) {
        violations.push(
          `${spec.id}: replacedBy='${spec.replacedBy}' が示す spec が存在しない (孤立リンク)`,
        )
        continue
      }
      if (target.supersedes !== spec.id) {
        violations.push(
          `${spec.id} → ${target.id}: 双方向リンク不整合。${spec.id}.replacedBy='${spec.replacedBy}' に対し、` +
            `${target.id}.supersedes='${target.supersedes ?? 'null'}' (期待値: '${spec.id}')`,
        )
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('supersedes が示す spec は replacedBy で逆方向に参照を持つ', () => {
    const specs = loadAllSpecs()
    const byId = new Map(specs.map((s) => [s.id, s]))
    const violations: string[] = []
    for (const spec of specs) {
      if (!spec.supersedes) continue
      const target = byId.get(spec.supersedes)
      if (!target) {
        violations.push(
          `${spec.id}: supersedes='${spec.supersedes}' が示す spec が存在しない (孤立リンク)`,
        )
        continue
      }
      if (target.replacedBy !== spec.id) {
        violations.push(
          `${spec.id} → ${target.id}: 双方向リンク不整合。${spec.id}.supersedes='${spec.supersedes}' に対し、` +
            `${target.id}.replacedBy='${target.replacedBy ?? 'null'}' (期待値: '${spec.id}')`,
        )
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('自己参照禁止 (replacedBy / supersedes が自身を指さない)', () => {
    const violations: string[] = []
    for (const spec of loadAllSpecs()) {
      if (spec.replacedBy === spec.id) {
        violations.push(`${spec.id}: replacedBy が自分自身を指している (循環)`)
      }
      if (spec.supersedes === spec.id) {
        violations.push(`${spec.id}: supersedes が自分自身を指している (循環)`)
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })
})
