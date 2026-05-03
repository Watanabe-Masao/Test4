/**
 * reviewPolicyRequiredGuard —
 * Architecture Rule の `reviewPolicy` 必須化 + 時刻フィールド検証
 *
 * projects/architecture-debt-recovery SP-D ADR-D-001。
 *
 * 進捗:
 *  - PR1 (2026-04-24): baseline=139 で ratchet-down 導入
 *  - PR2 (2026-04-24): 139 rule に bulk 追記、baseline=0 到達
 *  - PR3 (2026-04-24): RuleOperationalState.reviewPolicy を required 昇格 (BC-6)。
 *                       本 guard は型システムのバックストップ + 時刻検証に転換
 *  - PR4 (予定): expiresAt 超過 entry の fail 検出を追加
 *
 * 検出対象（PR3 以降）:
 *  - R1: reviewPolicy 未設定 rule が 0 件（型で強制されるがランタイム確認）
 *  - R2a-c: allowlist 空の状態を維持（新規 rule 追加時は必ず設定）
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-D-001
 *  - projects/architecture-debt-recovery/inquiry/16-breaking-changes.md §BC-6
 *  - references/03-implementation/architecture-rule-system.md §Temporal Governance
 *
 * @responsibility R:guard
 *
 * @taxonomyKind T:unclassified
 */

import { describe, expect, it } from 'vitest'
import { ARCHITECTURE_RULES } from '../architectureRules'

const BASELINE = 0

const KNOWN_UNSET_ALLOWLIST: readonly string[] = [
  // ADR-D-001 PR2 (2026-04-24): 139 rule 全てに reviewPolicy bulk 追記完了。
  // baseline 139→0 到達。PR3 で RuleOperationalState.reviewPolicy を
  // type-level で required 昇格（BC-6）、PR4 で expiresAt 超過検出を追加。
]

describe('reviewPolicyRequiredGuard', () => {
  const missing = ARCHITECTURE_RULES.filter((r) => !r.reviewPolicy).map((r) => r.id)
  const missingSet = new Set(missing)
  const allowlistSet = new Set(KNOWN_UNSET_ALLOWLIST)

  it('R1: reviewPolicy 未設定ルール数が baseline を超えない（ratchet-down）', () => {
    expect(missing.length).toBeLessThanOrEqual(BASELINE)
  })

  it('R2a: allowlist 記載の ruleId が実在する（stale 検出）', () => {
    const stale = KNOWN_UNSET_ALLOWLIST.filter((id) => !ARCHITECTURE_RULES.some((r) => r.id === id))
    expect(stale, `存在しない ruleId が allowlist に残存: ${stale.join(', ')}`).toEqual([])
  })

  it('R2b: allowlist 記載の rule が reviewPolicy を獲得していない（卒業検出）', () => {
    const graduated = KNOWN_UNSET_ALLOWLIST.filter((id) => !missingSet.has(id))
    expect(
      graduated,
      `reviewPolicy を獲得した rule が allowlist に残存: ${graduated.join(', ')}（卒業処理してください）`,
    ).toEqual([])
  })

  it('R2c: 実際に未設定の rule が全て allowlist に載っている（新規追加検出）', () => {
    const newUnset = missing.filter((id) => !allowlistSet.has(id))
    expect(
      newUnset,
      `reviewPolicy 未設定の新規 rule: ${newUnset.join(', ')}\n` +
        `新規 rule は reviewPolicy を設定するか、やむを得ない場合 allowlist に追加 + baseline 調整してください。`,
    ).toEqual([])
  })
})
