/**
 * RuleBinding Boundary Guard
 *
 * `app/src/test/architectureRules/types.ts` の `RuleBinding` interface に
 * 意味系 field (what / why / decisionCriteria / migrationRecipe /
 * sunsetCondition / fixNow / executionPlan / lifecyclePolicy) や禁止 prefix
 * (`detection*` / `governance*` / `operationalState*`) が漏れていないことを
 * 機械保証する boundary guard。
 *
 * **canonical RuleBinding interface**: `architectureRules/types.ts` の
 *   `RuleBinding` interface 自身が canonical。本 guard は同 interface の field
 *   set が許可 5 field に閉じていることを regex 経由で hard fail 検証する。
 *
 * 検証項目:
 * 1. RuleBinding interface 抽出 sanity check (find succeeded)
 * 2. RuleBinding interface 内 declared fields ⊆ 許可 5 field
 * 3. 禁止意味系 field (8 件) が RuleBinding に articulate されていない
 * 4. 禁止 prefix (3 件) で始まる field 名が articulate されていない
 * 5. synthetic violation: hypothetical 「what」 field 追加コードが本 guard logic で hard fail することを単体検証 (regex 健全性確認)
 *
 * 意図: RuleBinding は app-specific concrete binding 専用層 (paths / imports /
 * codeSignals / example / doc-link)。意味は別 interface (RuleSemantics /
 * Governance / OperationalState / DetectionSpec) に articulate する。本 guard
 * は意味の漏れ (= boundary violation) を構造的に防ぐ。
 *
 * @responsibility R:guard
 * @see app/src/test/architectureRules/types.ts (RuleBinding interface)
 * @see aag/core/principles/core-boundary-policy.md — 原則 E
 *
 * @taxonomyKind T:meta-guard
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const TYPES_PATH = resolve(__dirname, '../architectureRules/types.ts')

// 許可 field set (canonical = RuleBinding interface in types.ts)
const ALLOWED_BINDING_FIELDS: ReadonlySet<string> = new Set([
  'doc',
  'correctPattern',
  'outdatedPattern',
  'canonicalDocRef',
  'metaRequirementRefs',
])

// 禁止 意味系 field (= 漏れたら hard fail)
const FORBIDDEN_SEMANTIC_FIELDS: readonly string[] = [
  'what',
  'why',
  'decisionCriteria',
  'migrationRecipe',
  'sunsetCondition',
  'fixNow',
  'executionPlan',
  'lifecyclePolicy',
] as const

// 禁止 prefix (= 意味系の漏れと見なす)
const FORBIDDEN_PREFIXES: readonly string[] = [
  'detection',
  'governance',
  'operationalState',
] as const

/**
 * `types.ts` から `RuleBinding` interface body を抽出 (中括弧内の field 宣言部)。
 * 抽出失敗時は null。
 */
function extractRuleBindingBody(source: string): string | null {
  // `export interface RuleBinding {` から最初の閉じ `}` (top-level) まで
  const startMatch = source.match(/export\s+interface\s+RuleBinding\s*\{/)
  if (!startMatch) return null
  const startIdx = startMatch.index! + startMatch[0].length

  // 中括弧バランスを取りながら閉じ位置を探す
  let depth = 1
  let i = startIdx
  while (i < source.length && depth > 0) {
    const ch = source[i]
    if (ch === '{') depth++
    else if (ch === '}') depth--
    i++
  }
  if (depth !== 0) return null
  return source.slice(startIdx, i - 1)
}

/**
 * interface body から **top-level** field 宣言を抽出 (nested `{...}` 内の field
 * は含めない)。`readonly fieldName?: ...` パターンを検出。
 */
function extractTopLevelFields(body: string): readonly string[] {
  const fields: string[] = []
  let depth = 0
  let i = 0
  while (i < body.length) {
    const ch = body[i]
    if (ch === '{') depth++
    else if (ch === '}') depth--
    else if (depth === 0) {
      // top-level position、`readonly fieldName?:` を検出
      const slice = body.slice(i)
      const m = slice.match(/^\s*readonly\s+(\w+)\??\s*:/)
      if (m) {
        fields.push(m[1])
        i += m[0].length
        continue
      }
    }
    i++
  }
  return fields
}

describe('RuleBinding Boundary Guard', () => {
  const source = readFileSync(TYPES_PATH, 'utf-8')
  const body = extractRuleBindingBody(source)

  it('RuleBinding interface 抽出 sanity check', () => {
    expect(body, `failed to extract RuleBinding interface body from ${TYPES_PATH}`).not.toBeNull()
  })

  it('RuleBinding 内 top-level fields ⊆ 許可 5 field', () => {
    expect(body).not.toBeNull()
    const fields = extractTopLevelFields(body!)
    const extras = fields.filter((f) => !ALLOWED_BINDING_FIELDS.has(f))
    expect(
      extras,
      `RuleBinding interface に許可外 field: [${extras.join(', ')}]。意味系は別 interface (RuleSemantics / Governance / OperationalState / DetectionSpec) に articulate すること。`,
    ).toEqual([])
  })

  it('RuleBinding に禁止意味系 field が articulate されていない', () => {
    expect(body).not.toBeNull()
    const fields = new Set(extractTopLevelFields(body!))
    const violations = FORBIDDEN_SEMANTIC_FIELDS.filter((f) => fields.has(f))
    expect(
      violations,
      `RuleBinding に意味系 field 漏れ: [${violations.join(', ')}]。これらは別 interface に articulate すること。`,
    ).toEqual([])
  })

  it('RuleBinding に禁止 prefix で始まる field 名が articulate されていない', () => {
    expect(body).not.toBeNull()
    const fields = extractTopLevelFields(body!)
    const violations = fields.filter((f) =>
      FORBIDDEN_PREFIXES.some((prefix) => f.startsWith(prefix)),
    )
    expect(
      violations,
      `RuleBinding に禁止 prefix field: [${violations.join(', ')}]。意味系の漏れと見なされる。`,
    ).toEqual([])
  })

  it('synthetic violation 検出 — guard logic 健全性確認', () => {
    // hypothetical 違反 interface を構築して同 logic で検出されるか単体検証
    const violatingBody = `
      readonly doc?: string
      readonly what?: string  // 意味系漏れ
      readonly correctPattern?: { readonly example?: string }
      readonly detectionHint?: string  // 禁止 prefix
    `
    const fields = extractTopLevelFields(violatingBody)
    const fieldSet = new Set(fields)

    // (a) extras detection
    const extras = fields.filter((f) => !ALLOWED_BINDING_FIELDS.has(f))
    expect(extras).toContain('what')
    expect(extras).toContain('detectionHint')

    // (b) semantic field detection
    const semanticViolations = FORBIDDEN_SEMANTIC_FIELDS.filter((f) => fieldSet.has(f))
    expect(semanticViolations).toContain('what')

    // (c) prefix detection
    const prefixViolations = fields.filter((f) =>
      FORBIDDEN_PREFIXES.some((prefix) => f.startsWith(prefix)),
    )
    expect(prefixViolations).toContain('detectionHint')
  })

  it('既存 RuleBinding 5 field (doc / correctPattern / outdatedPattern / canonicalDocRef / metaRequirementRefs) が全て articulate されている', () => {
    expect(body).not.toBeNull()
    const fields = new Set(extractTopLevelFields(body!))
    const missing = [...ALLOWED_BINDING_FIELDS].filter((f) => !fields.has(f))
    expect(
      missing,
      `RuleBinding interface に articulate されていない既存 field: [${missing.join(', ')}]。削除なら canonical update + DA entry が必要。`,
    ).toEqual([])
  })
})
