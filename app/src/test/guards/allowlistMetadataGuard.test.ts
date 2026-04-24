/**
 * allowlistMetadataGuard —
 * AllowlistEntry の temporal governance metadata 必須化 ratchet-down
 *
 * projects/architecture-debt-recovery SP-D ADR-D-002 PR1。
 *
 * 現在 AllowlistEntry の `ruleId` / `createdAt` / `expiresAt` は optional。
 * PR2 で 4 metadata（reviewPolicy 含む）を bulk 追記、PR3 で型 required 昇格（BC-7）、
 * PR4 で expiresAt 超過検出を追加。
 *
 * 検出対象:
 *  - M1: ruleId 未設定 entry が baseline=3 を超えない
 *  - M2: createdAt 未設定 entry が baseline=4 を超えない
 *  - M3: active-debt な entry のうち expiresAt 未設定が baseline=11 を超えない
 *
 * Scope:
 *  - 7 categories の `app/src/test/allowlists/*.ts` 配下の `AllowlistEntry[]` 型 export
 *  - reviewPolicy field は PR2 で追加されるため本 PR1 の検出対象外
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-D-002
 *  - projects/aag-temporal-governance-hardening/checklist.md Phase 4
 *
 * @responsibility R:guard
 */

import { describe, expect, it } from 'vitest'
import * as allowlists from '../allowlists'
import type { AllowlistEntry } from '../allowlists/types'

const BASELINE_MISSING_RULE_ID = 3
const BASELINE_MISSING_CREATED_AT = 4
const BASELINE_MISSING_EXPIRES_AT_ACTIVE_DEBT = 11

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
})
