/**
 * Self-Hosting Guard — AR-AAG-META-SELF-HOSTING
 *
 * Project SelfHostingGuard MVP (2026-05-01): AAG-REQ-SELF-HOSTING (= AAG が AAG を
 * 守る、aag/meta.md 自身が AR-rule に linked、meta-rule が自分自身を検証) を
 * 構造的に達成する self-reference closure を機械検証する。
 *
 * 検証する closure:
 *
 *   aag/meta.md §2 の AAG-REQ-SELF-HOSTING articulation
 *      ↓ bound to (metaRequirementRefs)
 *   AR-AAG-META-SELF-HOSTING (本 closure 起点 rule)
 *      ↓ bound to (canonicalDocRef)
 *   aag/meta.md (= 起点 doc に back-reference、closure 完成)
 *      ↑ verified by
 *   selfHostingGuard.test.ts (= 本 file、closure 構造を hard fail で検証)
 *
 * 本 guard の存在自体が AAG framework が自分自身を保護する instance であり、
 * AAG-REQ-SELF-HOSTING の達成判定 mechanism (= ar-rule-audit.md §6 articulate 済)。
 *
 * ## 検証 (3 tests)
 *
 * ### Test 1 (hard fail): AAG-REQ-SELF-HOSTING が rule に bound
 *   aag/meta.md §2 で articulate された AAG-REQ-SELF-HOSTING が、
 *   ≥ 1 rule の metaRequirementRefs に bound されていることを検証。
 *
 * ### Test 2 (hard fail): self-reference back-link 成立
 *   AAG-REQ-SELF-HOSTING を bind した rule の canonicalDocRef が
 *   `references/01-principles/aag/meta.md` を指していることを検証。
 *   これにより rule cluster ↔ meta.md の双方向 closure が機械的に保証される。
 *
 * ### Test 3 (warn-only, ratchet-down 候補): orphan AAG-REQ coverage
 *   12 AAG-REQ-* のうち rule binding を持たない orphan の数を baseline 化。
 *   現状 baseline=6 (NO-AI-HUMAN-SUBSTITUTION / NO-BUSINESS-LOGIC-INTRUSION /
 *   NO-DATE-RITUAL / NO-PERFECTIONISM / SEMANTIC-ARTICULATION /
 *   STATE-BASED-GOVERNANCE)。Phase 2 で各 orphan に対応 rule を articulate して
 *   baseline 6→0 ratchet-down を漸次実施。
 *
 * @guard G1 テストに書く
 * @guard F8 正本保護
 * @taxonomyKind T:meta-guard
 * @responsibility R:guard
 * @see references/01-principles/aag/meta.md §2 (AAG-REQ-SELF-HOSTING)
 * @see references/02-status/ar-rule-audit.md §6 (selfHostingGuard scope articulate)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { ARCHITECTURE_RULES } from '../architectureRules'

const REPO_ROOT = path.resolve(__dirname, '../../../..')
const META_DOC_PATH = path.resolve(REPO_ROOT, 'references/01-principles/aag/meta.md')
const META_DOC_REL = 'references/01-principles/aag/meta.md'

const SELF_HOSTING_REQ_ID = 'AAG-REQ-SELF-HOSTING'

/** ratchet-down baseline: orphan AAG-REQ count (Phase 2 で 0 に向けて漸次解消) */
const ORPHAN_BASELINE = 6

function loadKnownRequirementIds(): Set<string> {
  if (!fs.existsSync(META_DOC_PATH)) {
    throw new Error(`aag/meta.md not found: ${META_DOC_PATH}`)
  }
  const content = fs.readFileSync(META_DOC_PATH, 'utf-8')
  const pattern = /AAG-REQ-[A-Z][A-Z0-9-]+/g
  const matches = content.match(pattern) ?? []
  return new Set(matches)
}

interface RuleBindingSelfHosting {
  readonly ruleId: string
  readonly hasMetaReqBinding: boolean
  readonly hasCanonicalDocBackRef: boolean
}

function findRulesBindingSelfHosting(): RuleBindingSelfHosting[] {
  const result: RuleBindingSelfHosting[] = []
  for (const rule of ARCHITECTURE_RULES) {
    const metaRefs = rule.metaRequirementRefs
    if (!metaRefs || metaRefs.status !== 'bound') continue
    const bindsSelfHosting = metaRefs.refs.some((r) => r.requirementId === SELF_HOSTING_REQ_ID)
    if (!bindsSelfHosting) continue
    const canonicalRefs = rule.canonicalDocRef
    const hasCanonicalDocBackRef =
      canonicalRefs?.status === 'bound' &&
      canonicalRefs.refs.some((r) => r.docPath === META_DOC_REL)
    result.push({
      ruleId: rule.id,
      hasMetaReqBinding: true,
      hasCanonicalDocBackRef,
    })
  }
  return result
}

describe('Self-Hosting Guard (AR-AAG-META-SELF-HOSTING)', () => {
  const knownRequirementIds = loadKnownRequirementIds()

  it('aag/meta.md §2 が AAG-REQ-SELF-HOSTING を articulate 済 (canonical 起点が空でない)', () => {
    expect(
      knownRequirementIds.has(SELF_HOSTING_REQ_ID),
      `aag/meta.md §2 に ${SELF_HOSTING_REQ_ID} の articulation が見つからない (${META_DOC_REL})`,
    ).toBe(true)
  })

  it(`AAG-REQ-SELF-HOSTING が ≥ 1 rule の metaRequirementRefs に bound (Test 1)`, () => {
    const rulesBindingSelfHosting = findRulesBindingSelfHosting()
    expect(
      rulesBindingSelfHosting.length,
      [
        `AAG-REQ-SELF-HOSTING がどの rule の metaRequirementRefs にも bound されていない (orphan)。`,
        `修正: app-domain/gross-profit/rule-catalog/base-rules.ts に AR-* rule を articulate し、`,
        `      metaRequirementRefs.refs[].requirementId='${SELF_HOSTING_REQ_ID}' を追加。`,
        `      閉路を成立させるため canonicalDocRef.refs[].docPath='${META_DOC_REL}' も同時に articulate。`,
      ].join('\n'),
    ).toBeGreaterThanOrEqual(1)
  })

  it(`AAG-REQ-SELF-HOSTING を bind した rule が canonicalDocRef で aag/meta.md を back-reference (Test 2)`, () => {
    const rulesBindingSelfHosting = findRulesBindingSelfHosting()
    const violations = rulesBindingSelfHosting
      .filter((r) => !r.hasCanonicalDocBackRef)
      .map(
        (r) =>
          `${r.ruleId}: AAG-REQ-SELF-HOSTING を bind しているが canonicalDocRef が ${META_DOC_REL} を指していない (closure 不成立)`,
      )
    expect(
      violations,
      [
        `self-reference closure (rule → meta.md back-reference) が成立していない rule:`,
        ...violations,
        ``,
        `修正: 該当 rule の canonicalDocRef.refs[] に { docPath: '${META_DOC_REL}', problemAddressed, resolutionContribution } を追加。`,
      ].join('\n'),
    ).toEqual([])
  })

  it(`orphan AAG-REQ-* count が baseline ${ORPHAN_BASELINE} 以下 (Test 3, ratchet-down)`, () => {
    const boundRequirementIds = new Set<string>()
    for (const rule of ARCHITECTURE_RULES) {
      const metaRefs = rule.metaRequirementRefs
      if (!metaRefs || metaRefs.status !== 'bound') continue
      for (const ref of metaRefs.refs) {
        boundRequirementIds.add(ref.requirementId)
      }
    }
    const orphans = [...knownRequirementIds].filter((id) => !boundRequirementIds.has(id)).sort()

    if (orphans.length > 0) {
      console.warn(
        `[self-hosting-guard] orphan AAG-REQ-* (no rule binding): ${orphans.length} 件\n` +
          orphans.map((id) => `  - ${id}`).join('\n') +
          `\n  ratchet-down baseline=${ORPHAN_BASELINE} (Phase 2 で各 orphan に rule binding 追加して baseline=0 に向けて漸次解消)`,
      )
    }

    expect(
      orphans.length,
      [
        `orphan AAG-REQ-* count が baseline ${ORPHAN_BASELINE} を超過: ${orphans.length} 件`,
        ...orphans.map((id) => `  - ${id}`),
        ``,
        `ratchet-down 原則: baseline は下がる方向のみ許容。新規 AAG-REQ-* を articulate するときは`,
        `同 commit 内で対応 rule binding を追加するか、本 baseline を increment しない設計判断が必要。`,
      ].join('\n'),
    ).toBeLessThanOrEqual(ORPHAN_BASELINE)
  })
})
