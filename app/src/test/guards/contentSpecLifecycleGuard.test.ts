/**
 * Content Spec Lifecycle Guard — AR-CONTENT-SPEC-LIFECYCLE-FIELDS
 *
 * Phase D 着手 (2026-04-27): 全 spec (widget + read-model + calculation) の
 * lifecycleStatus と必須付随 field の整合を検証する。
 *
 * Lifecycle State Machine:
 *   proposed → active → deprecated → sunsetting → retired → archived
 *
 * 必須 field 表:
 *   active        : exportName / sourceRef / sourceLine（generator 既保証）
 *   deprecated    : + replacedBy 必須
 *   sunsetting    : + replacedBy + sunsetCondition + deadline 必須
 *   retired       : + replacedBy 必須（active consumer 0 検証は将来 commit）
 *   proposed      : source 不在許容（candidate 計画段階）
 *   archived      : source 削除済み（ID は欠番保持）
 *
 * deadline 超過の sunsetting / deprecated は temporal governance で hard fail。
 * Phase D Step1 では「lifecycle 値の妥当性」+「必須 field の存在」+「deadline 形式」
 * + 「deadline 超過の Hard fail」を検証する。replacedBy/supersedes の双方向対称
 * 検証は後続 commit。
 *
 * 詳細: projects/completed/phased-content-specs-rollout/plan.md §5.4 Lifecycle State Machine,
 * references/05-contents/calculations/README.md §「Lifecycle State Machine」.
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import { loadAllSpecs } from './contentSpecHelpers'

const VALID_LIFECYCLE_STATUSES = new Set([
  'proposed',
  'active',
  'deprecated',
  'sunsetting',
  'retired',
  'archived',
])

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

describe('Content Spec Lifecycle Guard (AR-CONTENT-SPEC-LIFECYCLE-FIELDS)', () => {
  it('全 spec の lifecycleStatus が enum 値である', () => {
    const violations: string[] = []
    for (const spec of loadAllSpecs()) {
      if (!VALID_LIFECYCLE_STATUSES.has(spec.lifecycleStatus)) {
        violations.push(
          `${spec.id}: lifecycleStatus="${spec.lifecycleStatus}" は無効。proposed | active | deprecated | sunsetting | retired | archived のいずれかを指定`,
        )
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('deprecated / sunsetting / retired には replacedBy が必須', () => {
    const requiresReplacedBy = new Set(['deprecated', 'sunsetting', 'retired'])
    const violations: string[] = []
    for (const spec of loadAllSpecs()) {
      if (!requiresReplacedBy.has(spec.lifecycleStatus)) continue
      if (!spec.replacedBy || spec.replacedBy.trim() === '') {
        violations.push(
          `${spec.id}: lifecycleStatus="${spec.lifecycleStatus}" のとき replacedBy フィールド (後継 spec ID) が必須`,
        )
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('sunsetting には sunsetCondition + deadline が必須', () => {
    const violations: string[] = []
    for (const spec of loadAllSpecs()) {
      if (spec.lifecycleStatus !== 'sunsetting') continue
      if (!spec.sunsetCondition || spec.sunsetCondition.trim() === '') {
        violations.push(`${spec.id}: sunsetting のとき sunsetCondition が必須`)
      }
      if (!spec.deadline || spec.deadline.trim() === '') {
        violations.push(`${spec.id}: sunsetting のとき deadline (YYYY-MM-DD) が必須`)
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('deadline は YYYY-MM-DD 形式で、未来 date は許容、過去 date は hard fail', () => {
    const today = new Date().toISOString().slice(0, 10)
    const violations: string[] = []
    for (const spec of loadAllSpecs()) {
      if (!spec.deadline) continue
      if (!ISO_DATE_RE.test(spec.deadline)) {
        violations.push(`${spec.id}: deadline="${spec.deadline}" は YYYY-MM-DD 形式でない`)
        continue
      }
      // sunsetting / deprecated で deadline が過ぎている → hard fail (temporal governance)
      const isExpiringStatus =
        spec.lifecycleStatus === 'sunsetting' || spec.lifecycleStatus === 'deprecated'
      if (isExpiringStatus && spec.deadline < today) {
        violations.push(
          `${spec.id}: deadline=${spec.deadline} が過去 (today=${today}) かつ lifecycleStatus="${spec.lifecycleStatus}". ` +
            `期限超過 → retired への transition + replacedBy への consumer 切替を完了すること`,
        )
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })
})
