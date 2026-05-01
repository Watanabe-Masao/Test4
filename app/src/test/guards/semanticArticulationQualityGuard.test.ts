/**
 * Semantic Articulation Quality Guard — Project B Phase 4 meta-guard #4
 *
 * SemanticTraceBinding の articulation 品質を機械検証する。
 * protocol §2.1 (禁止 keyword) + §2.2 (20 char minimum) + §2.3 (内部重複) を hard fail で実装。
 *
 * 検証:
 * - §2.1: problemAddressed / resolutionContribution / justification 内の禁止 keyword 検出
 * - §2.2: 各文字列が 20 char minimum (空白 trim 後)
 * - §2.3: 同一 RuleBinding 内で問題と解決の articulate に内部重複なし
 *
 * @guard F2 文字列カタログ
 * @guard F3 全パターン同一
 * @guard G8 責務分離ガード
 * @see references/02-status/ar-rule-audit.md §2.1 / §2.2 / §2.3 (`AAG-REQ-SEMANTIC-ARTICULATION` + `AAG-REQ-ANTI-DUPLICATION` の機械検証)
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { ARCHITECTURE_RULES } from '../architectureRules'
import type { SemanticTraceBinding, SemanticTraceRef } from '../architectureRules'

const BANNED_KEYWORDS: readonly string[] = [
  'TBD',
  'tbd',
  'same as above',
  'see above',
  '上記参照',
  '同上',
  'ditto',
] as const

const MIN_LENGTH = 20

function checkBanned(label: string, text: string, violations: string[]): void {
  for (const kw of BANNED_KEYWORDS) {
    if (text.includes(kw)) {
      violations.push(`${label}: 禁止 keyword '${kw}' を含む`)
      return
    }
  }
  // N/A 本文中検出 (status 値ではなく文字列内に N/A が出現)
  if (/\bN\/A\b/.test(text)) {
    violations.push(
      `${label}: 禁止 keyword 'N/A' (本文中) を含む — not-applicable は status field で表現すべき`,
    )
  }
  // 文末単独 etc. / etc / など 検出
  if (/(?:etc\.?|など)\s*$/.test(text.trim())) {
    violations.push(`${label}: 禁止 keyword (文末単独 'etc.' / 'など') を含む`)
  }
}

function checkMinLength(label: string, text: string, violations: string[]): void {
  const trimmed = text.trim()
  if (trimmed.length < MIN_LENGTH) {
    violations.push(`${label}: 文字数 ${trimmed.length} < ${MIN_LENGTH} char minimum`)
  }
}

function checkBindingQuality(
  ruleId: string,
  fieldName: string,
  binding: SemanticTraceBinding<SemanticTraceRef> | undefined,
): string[] {
  if (!binding || binding.status !== 'bound') return []
  const violations: string[] = []
  const problems: string[] = []
  const resolutions: string[] = []

  for (let i = 0; i < binding.refs.length; i++) {
    const ref = binding.refs[i]
    const labelP = `${ruleId}.${fieldName}.refs[${i}].problemAddressed`
    const labelR = `${ruleId}.${fieldName}.refs[${i}].resolutionContribution`
    checkBanned(labelP, ref.problemAddressed, violations)
    checkBanned(labelR, ref.resolutionContribution, violations)
    checkMinLength(labelP, ref.problemAddressed, violations)
    checkMinLength(labelR, ref.resolutionContribution, violations)
    problems.push(ref.problemAddressed)
    resolutions.push(ref.resolutionContribution)
  }
  if (binding.justification) {
    const labelJ = `${ruleId}.${fieldName}.justification`
    checkBanned(labelJ, binding.justification, violations)
    checkMinLength(labelJ, binding.justification, violations)
  }

  // §2.3: same RuleBinding 内の同一文字列重複 (refs[] が複数のとき該当)
  if (problems.length >= 2) {
    const uniqueP = new Set(problems)
    if (uniqueP.size !== problems.length) {
      violations.push(
        `${ruleId}.${fieldName}: refs[].problemAddressed に同一文字列重複 (${problems.length} 件中 unique ${uniqueP.size} 件)`,
      )
    }
  }
  if (resolutions.length >= 2) {
    const uniqueR = new Set(resolutions)
    if (uniqueR.size === 1 && resolutions.length >= 2) {
      violations.push(
        `${ruleId}.${fieldName}: 全 refs[].resolutionContribution が同一文字列 (multi-ref の意味消失)`,
      )
    }
  }

  return violations
}

describe('Semantic Articulation Quality Guard: protocol §2.1/§2.2/§2.3 機械検証', () => {
  it('全 rule の canonicalDocRef.refs[] articulation が品質基準を満たす', () => {
    const violations: string[] = []
    for (const rule of ARCHITECTURE_RULES) {
      violations.push(...checkBindingQuality(rule.id, 'canonicalDocRef', rule.canonicalDocRef))
    }
    expect(violations).toEqual([])
  })

  it('全 rule の metaRequirementRefs.refs[] articulation が品質基準を満たす', () => {
    const violations: string[] = []
    for (const rule of ARCHITECTURE_RULES) {
      violations.push(
        ...checkBindingQuality(rule.id, 'metaRequirementRefs', rule.metaRequirementRefs),
      )
    }
    expect(violations).toEqual([])
  })
})
