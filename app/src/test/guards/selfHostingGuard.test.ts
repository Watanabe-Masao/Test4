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
 * ## 検証 (5 tests)
 *
 * ### Test 0a (hard fail): §2 articulation 存在
 *   aag/meta.md §2.1 / §2.2 の table 範囲内に AAG-REQ-SELF-HOSTING が articulate 済。
 *
 * ### Test 0b (hard fail、§2 ↔ §4 drift 検出、PR #1234 review comment 1 対処)
 *   aag/meta.md §2.1 で AAG-REQ-SELF-HOSTING が **達成** として articulate 済。
 *   §4.1 サマリは §2 個別 status の derivative であり、§4 を flip しても §2 が
 *   未達成のまま残ると canonical drift を起こす。本 test は §2 を真値として
 *   self-hosting 達成状態を検証する。
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
 * ### Test 3 (hard fail with ratchet-down baseline): orphan AAG-REQ coverage
 *   12 AAG-REQ-* のうち rule binding を持たない orphan の数を baseline=6 として
 *   ratchet-down 軸に articulate (PR #1234 review comment 2 対処で §2.1 / §2.2
 *   table 範囲のみから抽出、prose 言及による false orphan 検出を回避)。
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

/**
 * meta.md §2.1 (Invariants) + §2.2 (Non-goals) の table 範囲のみから AAG-REQ-* を抽出する。
 *
 * 全文 grep だと §3 / §4 / §4.4 履歴 / prose に出現する REQ ID 言及まで canonical
 * requirement として treat してしまい、§2 を変更していない doc edit で false orphan
 * を起こす (PR #1234 review comment 2 への対処)。本関数は §2.1 / §2.2 section
 * heading から次 section heading までの範囲に scope を限定する。
 */
function extractSection(content: string, headingPattern: RegExp): string {
  const headingMatch = content.match(headingPattern)
  if (!headingMatch || headingMatch.index === undefined) return ''
  const start = headingMatch.index + headingMatch[0].length
  const rest = content.slice(start)
  // 次の同 level (### ) または上位 level (## ) heading で section 終端
  const nextHeading = rest.match(/^(##|###) /m)
  return nextHeading && nextHeading.index !== undefined ? rest.slice(0, nextHeading.index) : rest
}

function loadKnownRequirementIds(): Set<string> {
  if (!fs.existsSync(META_DOC_PATH)) {
    throw new Error(`aag/meta.md not found: ${META_DOC_PATH}`)
  }
  const content = fs.readFileSync(META_DOC_PATH, 'utf-8')
  const invariantsSection = extractSection(content, /^### §2\.1 不変条件.*$/m)
  const nonGoalsSection = extractSection(content, /^### §2\.2 禁則.*$/m)
  const scoped = invariantsSection + '\n' + nonGoalsSection
  if (scoped.trim() === '') {
    throw new Error('aag/meta.md §2.1 / §2.2 section が空 (parse 失敗)')
  }
  const pattern = /AAG-REQ-[A-Z][A-Z0-9-]+/g
  const matches = scoped.match(pattern) ?? []
  return new Set(matches)
}

/**
 * meta.md §2.1 / §2.2 table 内で各 AAG-REQ-* の達成 status を抽出する。
 *
 * §4.1 サマリは §2 個別 status の derivative。§4 を達成に flip しても §2 が
 * 未達成のままだと canonical drift を起こす (PR #1234 review comment 1 への対処)。
 * §2 の `達成 status` 列を canonical 真値として読み取る。
 *
 * 戻り値: { reqId → 達成 status の判定 ('達成' | '未達成' | 'unknown') }
 */
function loadRequirementStatuses(): Map<string, '達成' | '未達成' | 'unknown'> {
  const result = new Map<string, '達成' | '未達成' | 'unknown'>()
  const content = fs.readFileSync(META_DOC_PATH, 'utf-8')
  const sections = [
    extractSection(content, /^### §2\.1 不変条件.*$/m),
    extractSection(content, /^### §2\.2 禁則.*$/m),
  ].join('\n')
  for (const line of sections.split('\n')) {
    if (!line.startsWith('|')) continue
    const reqMatch = line.match(/AAG-REQ-[A-Z][A-Z0-9-]+/)
    if (!reqMatch) continue
    const reqId = reqMatch[0]
    // bold formatting (**達成** / **未達成**) は table の status 列で一貫的に使われる
    // convention。未達成 を先に判定 (含字 "達成" との衝突回避)。
    let status: '達成' | '未達成' | 'unknown' = 'unknown'
    if (/\*\*未達成\*\*/.test(line)) status = '未達成'
    else if (/\*\*達成\*\*/.test(line)) status = '達成'
    result.set(reqId, status)
  }
  return result
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
  const requirementStatuses = loadRequirementStatuses()

  it('aag/meta.md §2 が AAG-REQ-SELF-HOSTING を articulate 済 (canonical 起点が空でない)', () => {
    expect(
      knownRequirementIds.has(SELF_HOSTING_REQ_ID),
      `aag/meta.md §2 に ${SELF_HOSTING_REQ_ID} の articulation が見つからない (${META_DOC_REL})`,
    ).toBe(true)
  })

  it('aag/meta.md §2.1 が AAG-REQ-SELF-HOSTING を「達成」として articulate 済 (Test 0、§2 ↔ §4 drift 検出)', () => {
    // §4.1 サマリ (達成 12/12) は §2 個別 status の derivative。§4 を flip しても
    // §2 が **未達成** のまま残ると canonical drift。本 test は §2 を真値として
    // self-hosting 達成状態を検証する (PR #1234 review comment 1 への対処)。
    const status = requirementStatuses.get(SELF_HOSTING_REQ_ID)
    expect(
      status,
      [
        `${SELF_HOSTING_REQ_ID} の §2.1 status が「達成」でない (現状: ${status ?? '取得失敗'})。`,
        `修正: ${META_DOC_REL} §2.1 の ${SELF_HOSTING_REQ_ID} 行 4 列目を **達成** に更新。`,
        `本 guard が active な間、self-hosting closure が成立した状態 = §2.1 達成 articulate が canonical 真値。`,
      ].join('\n'),
    ).toBe('達成')
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
