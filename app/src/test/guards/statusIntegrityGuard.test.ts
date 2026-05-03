/**
 * Status Integrity Guard — Project B Phase 4 meta-guard #1
 *
 * SemanticTraceBinding の status field の構造的整合性を機械検証する。
 * protocol §2.4 (status 整合性) を hard fail で実装。
 *
 * 検証する不整合パターン:
 * - status='pending' なのに refs.length > 0 (= 矛盾、pending は未対応 = 空配列のはず)
 * - status='bound' なのに refs.length === 0 (= 矛盾、bound は記入済 = 1 件以上のはず)
 * - status='not-applicable' なのに justification 不在 or 空文字 (= not-applicable は理由必須)
 * - status='not-applicable' なのに refs.length > 0 (= 矛盾、該当しないなら ref を持つはずがない)
 *
 * @guard G8 責務分離ガード
 * @guard F3 全パターン同一
 * @see references/04-tracking/ar-rule-audit.md §2.4 (`AAG-REQ-SEMANTIC-ARTICULATION` の機械検証)
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { ARCHITECTURE_RULES } from '../architectureRules'
import type { SemanticTraceBinding, SemanticTraceRef } from '../architectureRules'

function checkBinding(
  ruleId: string,
  fieldName: string,
  binding: SemanticTraceBinding<SemanticTraceRef> | undefined,
): string[] {
  if (!binding) return []
  const violations: string[] = []
  const { status, refs, justification } = binding
  if (status === 'pending' && refs.length > 0) {
    violations.push(
      `${ruleId}.${fieldName}: status='pending' なのに refs.length=${refs.length} (= 矛盾、pending は空配列のはず)`,
    )
  }
  if (status === 'bound' && refs.length === 0) {
    violations.push(
      `${ruleId}.${fieldName}: status='bound' なのに refs.length=0 (= 矛盾、bound は 1 件以上のはず)`,
    )
  }
  if (status === 'not-applicable') {
    if (refs.length > 0) {
      violations.push(
        `${ruleId}.${fieldName}: status='not-applicable' なのに refs.length=${refs.length} (= 矛盾、該当しないなら ref を持たない)`,
      )
    }
    if (!justification || justification.trim() === '') {
      violations.push(
        `${ruleId}.${fieldName}: status='not-applicable' なのに justification 不在 (= not-applicable は理由必須)`,
      )
    }
  }
  return violations
}

describe('Status Integrity Guard: SemanticTraceBinding status ↔ refs ↔ justification 整合性', () => {
  it('全 rule の canonicalDocRef が status 整合性を満たす', () => {
    const violations: string[] = []
    for (const rule of ARCHITECTURE_RULES) {
      violations.push(...checkBinding(rule.id, 'canonicalDocRef', rule.canonicalDocRef))
    }
    expect(violations).toEqual([])
  })

  it('全 rule の metaRequirementRefs が status 整合性を満たす', () => {
    const violations: string[] = []
    for (const rule of ARCHITECTURE_RULES) {
      violations.push(...checkBinding(rule.id, 'metaRequirementRefs', rule.metaRequirementRefs))
    }
    expect(violations).toEqual([])
  })
})
