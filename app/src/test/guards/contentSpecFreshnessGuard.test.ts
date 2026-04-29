/**
 * Content Spec Freshness Guard — AR-CONTENT-SPEC-FRESHNESS [DEPRECATED in Phase K]
 *
 * Phase C scope (2026-04-27、deprecated 2026-04-29): 全 spec (widget + read-model)
 * frontmatter について `(today - lastReviewedAt) > reviewCadenceDays` で fail、
 * `> reviewCadenceDays * 0.8` で warn（warn は console 出力のみ）。
 *
 * **Phase K Option 1 (2026-04-29、deprecation):**
 * date-based cadence は「review = date 更新」で構造的検証を伴わない儀式
 * (HANDOFF.md §3.9 + plan.md §Phase K)。`lastVerifiedCommit` が source 最新
 * commit と一致するかを検証する `contentSpecLastVerifiedCommitGuard` (新設、
 * AR-CONTENT-SPEC-LAST-VERIFIED-COMMIT) に置換。本 guard は `.skip` 化し、
 * 1 sprint 後の物理削除に向けた deprecation 期間とする。
 *
 * 詳細: projects/phased-content-specs-rollout/plan.md §Phase K K2,
 * references/05-contents/{widgets,read-models}/README.md §「3 軸 drift 防御 / 時間軸」。
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import { loadAllSpecs } from './contentSpecHelpers'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function ageInDays(lastReviewedAt: string, today: Date): number {
  const reviewed = new Date(lastReviewedAt + 'T00:00:00Z')
  if (Number.isNaN(reviewed.getTime())) return Number.POSITIVE_INFINITY
  return Math.floor((today.getTime() - reviewed.getTime()) / MS_PER_DAY)
}

describe.skip('Content Spec Freshness Guard (AR-CONTENT-SPEC-FRESHNESS) [DEPRECATED]', () => {
  const today = new Date()

  it('全 spec (widget + read-model) の lastReviewedAt が reviewCadenceDays を超過していない', () => {
    const violations: string[] = []
    const warnings: string[] = []
    for (const spec of loadAllSpecs()) {
      if (!spec.lastReviewedAt || spec.reviewCadenceDays == null) {
        violations.push(`${spec.id}: lastReviewedAt または reviewCadenceDays が未設定。`)
        continue
      }
      const age = ageInDays(spec.lastReviewedAt, today)
      const cadence = spec.reviewCadenceDays
      if (age > cadence) {
        violations.push(
          `${spec.id}: lastReviewedAt=${spec.lastReviewedAt} (age=${age}d) > reviewCadenceDays=${cadence}d`,
        )
      } else if (age > cadence * 0.8) {
        warnings.push(
          `${spec.id}: lastReviewedAt=${spec.lastReviewedAt} (age=${age}d) approaching cadence ${cadence}d`,
        )
      }
    }
    if (warnings.length > 0) {
      console.warn(`[content-spec-freshness] warn (${warnings.length}):\n${warnings.join('\n')}`)
    }
    expect(violations, violations.join('\n')).toEqual([])
  })
})
