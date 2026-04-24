/**
 * reviewPolicyRequiredGuard —
 * Architecture Rule の `reviewPolicy` 必須化 ratchet-down
 *
 * projects/architecture-debt-recovery SP-D ADR-D-001 PR1。
 *
 * 現在、RuleOperationalState.reviewPolicy は optional。
 * PR3 で required に型レベル昇格するまでの間、新規 rule 追加時に
 * reviewPolicy 未設定のルールが増えないことを ratchet-down で保証する。
 *
 * 検出対象:
 *  - R1: reviewPolicy 未設定 rule が baseline を超えない（ratchet-down）
 *  - R2: baseline を構成する unset rule の allowlist と一致する（削除忘れ検出）
 *
 * Baseline の由来:
 *  - ADR-D-001 の当初見積もりは 92 件（inquiry/11 §E 時点）
 *  - Wave 0 切替で 9 SAFETY rule に reviewPolicy 付記済み
 *  - 現状は 139 件の rule が reviewPolicy 未設定（本 baseline の根拠）
 *  - ADR-D-001 PR2 で 92 件を bulk 整備し baseline を減少させる
 *  - ADR-D-001 PR3 で RuleOperationalState.reviewPolicy を required 昇格
 *  - ADR-D-001 PR4 で baseline=0 固定モード移行
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-D-001
 *  - references/03-guides/architecture-rule-system.md §Temporal Governance
 *
 * @responsibility R:guard
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
