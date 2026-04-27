/**
 * allowlistMetadataGuard —
 * AllowlistEntry の temporal governance metadata 必須化 ratchet-down
 *
 * projects/architecture-debt-recovery SP-D ADR-D-002。
 *
 * 進捗:
 *  - PR1 (2026-04-24): baseline=3/4/11 で ratchet-down 導入
 *  - PR2 (2026-04-24): AllowlistEntry に reviewPolicy field 追加 +
 *                       35 entry に 4 metadata bulk 整備、全 baseline=0 到達
 *  - PR3 (予定): Entry 型の 4 metadata field を required 昇格 (BC-7)
 *  - PR4 (予定): expiresAt 超過 entry の fail 検出
 *
 * 検出対象:
 *  - M1: ruleId 未設定 entry が 0 件
 *  - M2: createdAt 未設定 entry が 0 件
 *  - M3: active-debt な entry のうち expiresAt 未設定が 0 件
 *  - M4: reviewPolicy 未設定 entry が 0 件
 *
 * Scope:
 *  - 7+ categories の `app/src/test/allowlists/*.ts` 配下の `AllowlistEntry[]` 型 export
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-D-002
 *  - projects/aag-temporal-governance-hardening/checklist.md Phase 4
 *
 * @responsibility R:guard
 *
 * @taxonomyKind T:allowlist-integrity
 */

import { describe, expect, it } from 'vitest'
import * as allowlists from '../allowlists'
import type { AllowlistEntry } from '../allowlists/types'

const BASELINE_MISSING_RULE_ID = 0
const BASELINE_MISSING_CREATED_AT = 0
const BASELINE_MISSING_EXPIRES_AT_ACTIVE_DEBT = 0
const BASELINE_MISSING_REVIEW_POLICY = 0

const collectAllEntries = (): AllowlistEntry[] => {
  const result: AllowlistEntry[] = []
  for (const value of Object.values(allowlists)) {
    if (!Array.isArray(value)) continue
    for (const e of value) {
      if (e && typeof e === 'object' && 'path' in e && 'reason' in e && 'category' in e) {
        result.push(e as AllowlistEntry)
      }
    }
  }
  return result
}

describe('allowlistMetadataGuard', () => {
  const entries = collectAllEntries()

  it('M1: ruleId 未設定 entry が baseline を超えない（ratchet-down）', () => {
    const missing = entries.filter((e) => !e.ruleId).map((e) => e.path)
    expect(
      missing.length,
      `ruleId 未設定 entry が baseline=${BASELINE_MISSING_RULE_ID} を超過 (${missing.length}): ${missing.join(', ')}`,
    ).toBeLessThanOrEqual(BASELINE_MISSING_RULE_ID)
  })

  it('M2: createdAt 未設定 entry が baseline を超えない（ratchet-down）', () => {
    const missing = entries.filter((e) => !e.createdAt).map((e) => e.path)
    expect(
      missing.length,
      `createdAt 未設定 entry が baseline=${BASELINE_MISSING_CREATED_AT} を超過 (${missing.length}): ${missing.join(', ')}`,
    ).toBeLessThanOrEqual(BASELINE_MISSING_CREATED_AT)
  })

  it('M3: active-debt な entry のうち expiresAt 未設定が baseline を超えない（ratchet-down）', () => {
    const missing = entries
      .filter((e) => e.lifecycle === 'active-debt' && !e.expiresAt)
      .map((e) => e.path)
    expect(
      missing.length,
      `active-debt entry の expiresAt 未設定が baseline=${BASELINE_MISSING_EXPIRES_AT_ACTIVE_DEBT} を超過 (${missing.length}): ${missing.join(', ')}`,
    ).toBeLessThanOrEqual(BASELINE_MISSING_EXPIRES_AT_ACTIVE_DEBT)
  })

  it('M4: reviewPolicy 未設定 entry が baseline を超えない（ratchet-down）', () => {
    const missing = entries.filter((e) => !e.reviewPolicy).map((e) => e.path)
    expect(
      missing.length,
      `reviewPolicy 未設定 entry が baseline=${BASELINE_MISSING_REVIEW_POLICY} を超過 (${missing.length}): ${missing.join(', ')}`,
    ).toBeLessThanOrEqual(BASELINE_MISSING_REVIEW_POLICY)
  })

  it('M5: expiresAt が超過した entry を検出する (ADR-D-002 PR4: hard fail)', () => {
    // active-debt entry の期限切れを hard fail に昇格。期限超過 = 見直しの時期。
    const now = Date.now()
    const expired: string[] = []
    for (const e of entries) {
      if (!e.expiresAt) continue
      const expiresTs = new Date(e.expiresAt).getTime()
      if (now > expiresTs) {
        expired.push(`${e.path} (expired at ${e.expiresAt})`)
      }
    }
    expect(
      expired,
      `expiresAt 超過 entry ${expired.length} 件:\n  ${expired.join('\n  ')}\n` +
        '  → allowlist entry の見直しを実施するか、expiresAt を延長してください。\n' +
        '     延長時は renewalCount を incr してください（2 超で ruleId 自体の review 強制）。',
    ).toEqual([])
  })
})
