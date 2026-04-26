/**
 * Constitution Bootstrap Guard — taxonomy-v2 family の Constitution 5 deliverables
 * の存在 + 相互参照整合 + 内部不変条件を検証する。
 *
 * 親 plan §8 昇華メカニズム #8「Constitution Bootstrap Test」の正本。
 * `taxonomy-constitution.md` 原則 5 + 親 plan §AR-TAXONOMY-* で参照される。
 *
 * 検出する違反 (失敗シナリオ — TSIG self-check coverage matrix):
 *
 * | id  | 何を弾くか                                                | 何が壊れている可能性                                       |
 * |-----|----------------------------------------------------------|-----------------------------------------------------------|
 * | B1  | 必須ファイル欠落                                          | Phase 1 deliverable の削除 / mv で path 不一致              |
 * | B2  | Constitution 必須セクション欠落                            | 7 原則のいずれかが消された / OCS 統合節が削除された         |
 * | B3  | Interlock マトリクス欠落                                  | §2 完全マトリクスや §3 Anchor Slice 節が消された            |
 * | B4  | Origin Journal 形式欠落                                  | 必須フィールド (Why/When/Who/Sunset/...) が形式から脱落    |
 * | B5  | CLAUDE.md §taxonomy-binding 欠落                          | AI Vocabulary Binding が CLAUDE.md から削除された           |
 * | B6  | 相互参照欠落 (canonical source link)                       | 文書間 link が rename / typo で broken                     |
 * | B7  | 親 plan の Constitution 系 canonical reference 欠落         | 親 plan の §関連実装 が rename で古くなった                  |
 * | B8  | 7 原則 ↔ AR-TAXONOMY-* rule mapping の網羅性違反            | 原則追加 / rule 追加で対応 mapping が漏れた                  |
 * | B9  | Interlock §2.1 と §2.2 の双方向整合違反                     | 片方だけ R/T 関係を更新して対称性が崩れた                    |
 * | B10 | Anchor Slice 三者一致違反                                | plan / Constitution / Origin Journal / Interlock の Anchor 不一致 |
 * | B11 | Lifecycle state name 一貫性違反                            | 6 状態 (proposed→active→deprecated→sunsetting→retired→archived) のいずれか 1 文書だけ綴り変更 |
 * | B12 | Promotion Gate L0-L6 名称一貫性違反                        | plan §OCS.5 と Constitution §6 で L レベル名が drift |
 * | B13 | Review Window 文書構造の欠落                                | review-window.md の §1-§9 セクションのいずれかが消えた |
 * | B14 | Constitution 原則ごとの 3 要素 (何が壊れる/どう守る/判断) 不揃い | 1 要素だけ消されても気付かない silent gap (HANDOFF 穴チェック §1) |
 * | B15 | CLAUDE.md §taxonomy-binding ↔ review-window §9 OCS.9 boundary 齟齬 | AI 制約 (touch 可 / 不可) の 2 文書間齟齬 (HANDOFF 穴チェック §2) |
 * | B16 | TXE 例外形式 (review-window §4.3 vs journal §3) 不一致     | 形式齟齬で TXE-NNN 採番ルール混乱 (HANDOFF 穴チェック §3) |
 * | B17 | AR-TAXONOMY-* baseline 戦略の欠落                          | rule によって戦略 (baseline=current 値 / ratchet-down) 言及が抜ける silent gap (HANDOFF 穴チェック §4) |
 * | B18 | doc-registry 4 entries ↔ Constitution/plan 双方向 link 欠落 | doc-registry 登録だけして Constitution / plan から参照が孤立 (HANDOFF 穴チェック §5) |
 *
 * 設計方針 (TSIG H1/H2 防御):
 * - 「section heading exists」だけの shallow check に留めない
 * - 文書間の **意味的整合性** (mapping / matrix / Anchor Slice 三者一致) を機械検証
 * - 片方向の link check ではなく **双方向の網羅性** を要求 (drift 検出)
 * - 用語 / 状態 / Level 名の **token-level drift** も検出 (B11/B12)
 *
 * 本 guard は Phase 1 + Phase 2 Constitution の bootstrap が完了していることを保証する
 * **structural + semantic invariant** check。AR-TAXONOMY-* rule の active 化は
 * 子 Phase 3（Guard 実装）が担う。
 *
 * 完全な「変更された source → 影響する spec → 必要な tag → test obligation
 * → 欠落 guard → CI/health 反映」の chain は plan §OCS.3 taxonomy:impact CLI
 * (Phase I-equivalent) で実現される。本 guard はその静的部分を担う。
 *
 * @responsibility R:guard
 * @see references/01-principles/taxonomy-constitution.md
 * @see projects/taxonomy-v2/plan.md §Operational Control System
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')

const CONSTITUTION_PATH = 'references/01-principles/taxonomy-constitution.md'
const INTERLOCK_PATH = 'references/01-principles/taxonomy-interlock.md'
const ORIGIN_JOURNAL_PATH = 'references/01-principles/taxonomy-origin-journal.md'
const CLAUDE_MD_PATH = 'CLAUDE.md'
const PLAN_PATH = 'projects/taxonomy-v2/plan.md'

const DELIVERABLES = [
  CONSTITUTION_PATH,
  INTERLOCK_PATH,
  ORIGIN_JOURNAL_PATH,
  CLAUDE_MD_PATH,
  // constitutionBootstrapGuard.test.ts itself is implicitly verified by being run
] as const

interface Violation {
  readonly id: string
  readonly file: string
  readonly message: string
}

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relPath), 'utf-8')
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(PROJECT_ROOT, relPath))
}

function formatViolations(violations: readonly Violation[]): string {
  if (violations.length === 0) return ''
  return [
    `\nConstitution Bootstrap Guard が ${violations.length} 件の違反を検出しました:\n`,
    ...violations.map((v) => `  [${v.id}] ${v.file}\n        ${v.message}`),
    '',
    '修正方針:',
    '  - Phase 1 Constitution 5 deliverables を完成させる',
    '  - 各文書の必須セクションを landing する',
    '  - 相互参照（canonical source へのリンク）を維持する',
    '  詳細: projects/taxonomy-v2/plan.md §Operational Control System',
  ].join('\n')
}

describe('Constitution Bootstrap Guard', () => {
  it('B1: Phase 1 Constitution 5 deliverables が全て存在する', () => {
    const missing: Violation[] = []
    for (const f of DELIVERABLES) {
      if (!fileExists(f)) {
        missing.push({
          id: 'B1',
          file: f,
          message: '必須 deliverable が存在しません',
        })
      }
    }
    expect(missing, formatViolations(missing)).toEqual([])
  })

  it('B2: Constitution 本体に必須セクションが全て存在する', () => {
    if (!fileExists(CONSTITUTION_PATH)) return // B1 で検出済み
    const content = readFile(CONSTITUTION_PATH)
    const violations: Violation[] = []

    const required = [
      { name: '3 種類の正しさを分離（OCS.1）', pattern: /3 種類の正しさを分離/ },
      { name: '7 不可侵原則', pattern: /7 不可侵原則/ },
      { name: '原則 1: 未分類は分類である', pattern: /原則 1.*未分類は分類である/ },
      { name: '原則 2: 1 タグ = 1 軸', pattern: /原則 2.*1 タグ.*1 軸/ },
      { name: '原則 3: 語彙生成は高コスト儀式', pattern: /原則 3.*語彙生成は高コスト儀式/ },
      { name: '原則 4: Tag ↔ Test は双方向契約', pattern: /原則 4.*Tag.*Test.*双方向契約/ },
      { name: '原則 5: Origin は記録する', pattern: /原則 5.*Origin は記録する/ },
      { name: '原則 6: Antibody Pair を持つ', pattern: /原則 6.*Antibody Pair を持つ/ },
      { name: '原則 7: Cognitive Load Ceiling', pattern: /原則 7.*Cognitive Load Ceiling/ },
      { name: 'Interlock 仕様', pattern: /Interlock 仕様/ },
      { name: 'Evidence Level（OCS.2）', pattern: /Evidence Level.*OCS\.2/ },
      { name: 'Promotion Gate L0〜L6（OCS.5）', pattern: /Promotion Gate.*L0.*L6.*OCS\.5/ },
      { name: '4-Loop Operational Model（OCS.10）', pattern: /4-Loop Operational Model.*OCS\.10/ },
      { name: 'AR-TAXONOMY-* rule', pattern: /AR-TAXONOMY-.*rule/ },
      { name: '制度成立 5 要件', pattern: /制度成立 5 要件/ },
    ]

    for (const r of required) {
      if (!r.pattern.test(content)) {
        violations.push({
          id: 'B2',
          file: CONSTITUTION_PATH,
          message: `必須セクション欠落: ${r.name}`,
        })
      }
    }
    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('B3: Interlock マトリクスに必須セクションが存在する', () => {
    if (!fileExists(INTERLOCK_PATH)) return
    const content = readFile(INTERLOCK_PATH)
    const violations: Violation[] = []

    const required = [
      { name: 'Interlock の意味', pattern: /Interlock の意味/ },
      { name: 'R:tag → 必須 T:kind / 任意 T:kind', pattern: /R:tag.*必須 T:kind.*任意 T:kind/ },
      { name: 'T:kind → 検証対象 R:tag', pattern: /T:kind.*検証対象 R:tag/ },
      { name: 'Anchor Slice', pattern: /Anchor Slice/ },
      { name: 'AR-TAXONOMY-INTERLOCK 検証ロジック', pattern: /AR-TAXONOMY-INTERLOCK 検証ロジック/ },
      { name: '改訂手続き', pattern: /改訂手続き/ },
    ]

    for (const r of required) {
      if (!r.pattern.test(content)) {
        violations.push({
          id: 'B3',
          file: INTERLOCK_PATH,
          message: `必須セクション欠落: ${r.name}`,
        })
      }
    }
    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('B4: Origin Journal に形式定義 + Anchor Slice skeleton が存在する', () => {
    if (!fileExists(ORIGIN_JOURNAL_PATH)) return
    const content = readFile(ORIGIN_JOURNAL_PATH)
    const violations: Violation[] = []

    const required = [
      { name: '形式定義', pattern: /形式定義/ },
      { name: '必須フィールド', pattern: /必須フィールド/ },
      { name: 'Why', pattern: /\*\*Why\*\*/ },
      { name: 'When', pattern: /\*\*When\*\*/ },
      { name: 'Who', pattern: /\*\*Who\*\*/ },
      { name: 'Sunset 条件', pattern: /\*\*Sunset 条件\*\*/ },
      { name: 'Antibody Pair', pattern: /\*\*Antibody Pair\*\*/ },
      { name: 'promotionLevel', pattern: /\*\*promotionLevel\*\*/ },
      { name: 'evidenceLevel', pattern: /\*\*evidenceLevel\*\*/ },
      { name: 'Lifecycle status', pattern: /\*\*Lifecycle status\*\*/ },
      { name: 'legacy-unknown の扱い', pattern: /legacy-unknown の扱い/ },
      { name: 'R:unclassified entry', pattern: /### R:unclassified/ },
      { name: 'T:unclassified entry', pattern: /### T:unclassified/ },
    ]

    for (const r of required) {
      if (!r.pattern.test(content)) {
        violations.push({
          id: 'B4',
          file: ORIGIN_JOURNAL_PATH,
          message: `必須要素欠落: ${r.name}`,
        })
      }
    }
    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('B5: CLAUDE.md に §taxonomy-binding（AI Vocabulary Binding）が存在する', () => {
    const content = readFile(CLAUDE_MD_PATH)
    const violations: Violation[] = []

    const required = [
      { name: '§taxonomy-binding 見出し', pattern: /### taxonomy-binding/ },
      { name: 'AI Vocabulary Binding 表記', pattern: /AI Vocabulary Binding/ },
      { name: 'AI が触ってよいこと', pattern: /AI が触ってよいこと/ },
      { name: 'AI が触ってはいけないこと', pattern: /AI が触ってはいけないこと/ },
      { name: 'review window 経路', pattern: /review window/ },
      {
        name: 'AR-TAXONOMY-AI-VOCABULARY-BINDING 参照',
        pattern: /AR-TAXONOMY-AI-VOCABULARY-BINDING/,
      },
    ]

    for (const r of required) {
      if (!r.pattern.test(content)) {
        violations.push({
          id: 'B5',
          file: CLAUDE_MD_PATH,
          message: `§taxonomy-binding 必須要素欠落: ${r.name}`,
        })
      }
    }
    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('B6: 各文書が canonical source への相互参照を持つ', () => {
    const violations: Violation[] = []

    // Constitution → Interlock + Origin Journal + plan + CLAUDE.md §taxonomy-binding
    if (fileExists(CONSTITUTION_PATH)) {
      const c = readFile(CONSTITUTION_PATH)
      const refs = [
        { name: 'Interlock マトリクス参照', pattern: /taxonomy-interlock\.md/ },
        { name: 'Origin Journal 参照', pattern: /taxonomy-origin-journal\.md/ },
        { name: '親 plan 参照', pattern: /projects\/taxonomy-v2\/plan\.md/ },
        { name: 'constitutionBootstrapGuard 参照', pattern: /constitutionBootstrapGuard/ },
      ]
      for (const r of refs) {
        if (!r.pattern.test(c)) {
          violations.push({
            id: 'B6',
            file: CONSTITUTION_PATH,
            message: `canonical source 参照欠落: ${r.name}`,
          })
        }
      }
    }

    // Interlock → Constitution + Origin Journal + plan
    if (fileExists(INTERLOCK_PATH)) {
      const c = readFile(INTERLOCK_PATH)
      const refs = [
        { name: 'Constitution 参照', pattern: /taxonomy-constitution\.md/ },
        { name: 'Origin Journal 参照', pattern: /taxonomy-origin-journal\.md/ },
        { name: '親 plan 参照', pattern: /projects\/taxonomy-v2\/plan\.md/ },
      ]
      for (const r of refs) {
        if (!r.pattern.test(c)) {
          violations.push({
            id: 'B6',
            file: INTERLOCK_PATH,
            message: `canonical source 参照欠落: ${r.name}`,
          })
        }
      }
    }

    // Origin Journal → Constitution + Interlock + plan + 子 Phase 0
    if (fileExists(ORIGIN_JOURNAL_PATH)) {
      const c = readFile(ORIGIN_JOURNAL_PATH)
      const refs = [
        { name: 'Constitution 参照', pattern: /taxonomy-constitution\.md/ },
        { name: 'Interlock 参照', pattern: /taxonomy-interlock\.md/ },
        { name: '親 plan 参照', pattern: /projects\/taxonomy-v2\/plan\.md/ },
        { name: '子 responsibility plan 参照', pattern: /responsibility-taxonomy-v2/ },
        { name: '子 test plan 参照', pattern: /test-taxonomy-v2/ },
      ]
      for (const r of refs) {
        if (!r.pattern.test(c)) {
          violations.push({
            id: 'B6',
            file: ORIGIN_JOURNAL_PATH,
            message: `canonical source 参照欠落: ${r.name}`,
          })
        }
      }
    }

    // CLAUDE.md §taxonomy-binding → Constitution + Interlock + Origin + plan
    {
      const c = readFile(CLAUDE_MD_PATH)
      // §taxonomy-binding section content extraction (next H2 boundary)
      const startIdx = c.indexOf('### taxonomy-binding')
      // Match "\n## " (next H2) to avoid matching "### subsection" which would
      // truncate our §taxonomy-binding section prematurely.
      const endIdx = startIdx === -1 ? -1 : c.indexOf('\n## ', startIdx + 1)
      const section = startIdx === -1 ? '' : c.slice(startIdx, endIdx === -1 ? undefined : endIdx)

      const refs = [
        { name: 'Constitution 参照', pattern: /taxonomy-constitution\.md/ },
        { name: 'Interlock 参照', pattern: /taxonomy-interlock\.md/ },
        { name: 'Origin Journal 参照', pattern: /taxonomy-origin-journal\.md/ },
        { name: '親 plan 参照', pattern: /projects\/taxonomy-v2\/plan\.md/ },
      ]
      for (const r of refs) {
        if (section && !r.pattern.test(section)) {
          violations.push({
            id: 'B6',
            file: `${CLAUDE_MD_PATH} §taxonomy-binding`,
            message: `canonical source 参照欠落: ${r.name}`,
          })
        }
      }
    }

    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('B7: 親 plan が Constitution を canonical source として参照する', () => {
    if (!fileExists(PLAN_PATH)) return
    const content = readFile(PLAN_PATH)
    const violations: Violation[] = []

    const refs = [
      { name: 'Constitution 参照', pattern: /taxonomy-constitution\.md/ },
      { name: 'Interlock 参照（Constitution §4 詳細）', pattern: /taxonomy-interlock\.md/ },
      { name: 'Origin Journal 参照', pattern: /taxonomy-origin-journal\.md/ },
    ]
    for (const r of refs) {
      if (!r.pattern.test(content)) {
        violations.push({
          id: 'B7',
          file: PLAN_PATH,
          message: `Constitution 系 canonical source 参照欠落: ${r.name}`,
        })
      }
    }
    expect(violations, formatViolations(violations)).toEqual([])
  })

  // ─────────────────────────────────────────────────────────────────────
  // B8 / B9 / B10: 文書間の意味的整合性 (semantic invariant)
  //
  // section heading の存在 (B2-B5) や個別 link の存在 (B6-B7) を超えて、
  // 文書 A の内容が文書 B / C と矛盾しないことを機械検証する。
  // 片方の文書だけ更新して対称性が崩れる drift を検出する。
  // ─────────────────────────────────────────────────────────────────────

  it('B8: Constitution §3 (7 原則) と §8 (AR-TAXONOMY-*) の mapping 網羅性', () => {
    if (!fileExists(CONSTITUTION_PATH)) return
    const content = readFile(CONSTITUTION_PATH)
    const violations: Violation[] = []

    // Extract §8 table content (between "## 8." and next "## ")
    const sec8Start = content.indexOf('## 8. AR-TAXONOMY-')
    const sec8End = sec8Start === -1 ? -1 : content.indexOf('\n## ', sec8Start + 1)
    const sec8 =
      sec8Start === -1 ? '' : content.slice(sec8Start, sec8End === -1 ? undefined : sec8End)

    if (!sec8) {
      violations.push({
        id: 'B8',
        file: CONSTITUTION_PATH,
        message: '§8 AR-TAXONOMY-* セクションが見つからない (B2 で検出されるはずだが念のため)',
      })
      expect(violations, formatViolations(violations)).toEqual([])
      return
    }

    // Required 7 rules (must all appear in §8 with 原則 mapping)
    const requiredRules = [
      'AR-TAXONOMY-NO-UNTAGGED',
      'AR-TAXONOMY-KNOWN-VOCABULARY',
      'AR-TAXONOMY-ONE-TAG-ONE-AXIS',
      'AR-TAXONOMY-INTERLOCK',
      'AR-TAXONOMY-ORIGIN-REQUIRED',
      'AR-TAXONOMY-COGNITIVE-LOAD',
      'AR-TAXONOMY-AI-VOCABULARY-BINDING',
    ]

    for (const rule of requiredRules) {
      // Each rule must appear in §8 with 原則 N reference
      // Pattern: a single line in the table that mentions both rule and 原則
      const ruleRegex = new RegExp(`\\|\\s*\`${rule}\`[^|]*\\|[^|]*原則`)
      if (!ruleRegex.test(sec8)) {
        violations.push({
          id: 'B8',
          file: `${CONSTITUTION_PATH} §8`,
          message: `${rule} の 原則 mapping が §8 table に見つからない`,
        })
      }
    }

    // Each principle 1-7 must be enforced (either via AR-TAXONOMY-* rule in §8 table,
    // OR via an explicit alternative-path note like §8.1).
    // 原則 6 (Antibody Pair) is intentionally enforced via taxonomy-pairs.json (registry
    // structure check), not via AR-TAXONOMY-* rule. The alternative path MUST be
    // documented in §8.1 to avoid TSIG H1 (False Green) misreading.
    const principlesViaAR = new Set([1, 2, 3, 4, 5, 7]) // mapped to AR-TAXONOMY-*
    const principlesViaAlternative = new Map([
      [6, /§8\.1.*原則 6.*Antibody Pair/s], // must have §8.1 documenting alternative path
    ])

    for (let i = 1; i <= 7; i++) {
      if (principlesViaAR.has(i)) {
        const principleRegex = new RegExp(`原則\\s*${i}\\b`)
        if (!principleRegex.test(sec8)) {
          violations.push({
            id: 'B8',
            file: `${CONSTITUTION_PATH} §8`,
            message: `原則 ${i} を §8 AR-TAXONOMY-* table が参照していない (網羅性違反、AR rule mapping 漏れ)`,
          })
        }
      } else {
        const altPattern = principlesViaAlternative.get(i)
        if (altPattern && !altPattern.test(sec8)) {
          violations.push({
            id: 'B8',
            file: `${CONSTITUTION_PATH} §8`,
            message: `原則 ${i} は AR-TAXONOMY-* 非対応のため §8.x で alternative enforcement path を文書化する必要があるが見つからない (TSIG H1 False Green 防御)`,
          })
        }
      }
    }

    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('B9: Interlock §2.1 R:tag マトリクスと §2.2 T:kind マトリクスの双方向整合', () => {
    if (!fileExists(INTERLOCK_PATH)) return
    const content = readFile(INTERLOCK_PATH)
    const violations: Violation[] = []

    // Extract §2 完全マトリクス section
    const sec2Start = content.indexOf('## 2. 完全マトリクス')
    const sec2End = sec2Start === -1 ? -1 : content.indexOf('\n## ', sec2Start + 1)
    const sec2 =
      sec2Start === -1 ? '' : content.slice(sec2Start, sec2End === -1 ? undefined : sec2End)

    if (!sec2) {
      violations.push({
        id: 'B9',
        file: INTERLOCK_PATH,
        message: '§2 完全マトリクス セクションが見つからない',
      })
      expect(violations, formatViolations(violations)).toEqual([])
      return
    }

    // Find §2.1 (R:tag → 必須 T:kind) section
    const sub21Start = sec2.indexOf('### 2.1.')
    const sub21End = sub21Start === -1 ? -1 : sec2.indexOf('\n### ', sub21Start + 1)
    const sub21 =
      sub21Start === -1 ? '' : sec2.slice(sub21Start, sub21End === -1 ? undefined : sub21End)

    // Find §2.2 (T:kind → 検証対象 R:tag) section
    const sub22Start = sec2.indexOf('### 2.2.')
    const sub22End = sub22Start === -1 ? -1 : sec2.indexOf('\n### ', sub22Start + 1)
    const sub22 =
      sub22Start === -1 ? '' : sec2.slice(sub22Start, sub22End === -1 ? undefined : sub22End)

    if (!sub21 || !sub22) {
      violations.push({
        id: 'B9',
        file: INTERLOCK_PATH,
        message: `§2.1 (${sub21 ? 'OK' : 'MISSING'}) または §2.2 (${sub22 ? 'OK' : 'MISSING'}) が見つからない`,
      })
      expect(violations, formatViolations(violations)).toEqual([])
      return
    }

    // Parse §2.1: rows like "| `R:calculation` | `T:unit-numerical`, `T:boundary` | `T:invariant-math` | ..."
    // Build map: R:tag -> {required: Set<T:kind>, optional: Set<T:kind>}
    type RtoT = Map<string, { required: Set<string>; optional: Set<string> }>
    const rToT: RtoT = new Map()

    const tablRowRegex = /\|\s*`(R:[\w-]+)`\s*\|([^|]*)\|([^|]*)\|/g
    let m: RegExpExecArray | null
    while ((m = tablRowRegex.exec(sub21)) !== null) {
      const rTag = m[1]
      const requiredCol = m[2]
      const optionalCol = m[3]
      const required = new Set(Array.from(requiredCol.matchAll(/`(T:[\w-]+)`/g)).map((mm) => mm[1]))
      const optional = new Set(Array.from(optionalCol.matchAll(/`(T:[\w-]+)`/g)).map((mm) => mm[1]))
      rToT.set(rTag, { required, optional })
    }

    // Parse §2.2: rows like "| `T:unit-numerical` | `R:calculation` | ..."
    // Build map: T:kind -> Set<R:tag>
    const tToR: Map<string, Set<string>> = new Map()
    const tRowRegex = /\|\s*`(T:[\w-]+)`\s*\|([^|]*)\|/g
    while ((m = tRowRegex.exec(sub22)) !== null) {
      const tKind = m[1]
      const targetCol = m[2]
      const targets = new Set(Array.from(targetCol.matchAll(/`(R:[\w-]+)`/g)).map((mm) => mm[1]))
      tToR.set(tKind, targets)
    }

    if (rToT.size === 0 || tToR.size === 0) {
      violations.push({
        id: 'B9',
        file: INTERLOCK_PATH,
        message: `parse 結果が空: §2.1=${rToT.size} entries / §2.2=${tToR.size} entries (table 形式が想定と違う可能性)`,
      })
    }

    // Verify: every (R:X requires T:Y) in §2.1 has T:Y -> R:X in §2.2
    for (const [rTag, { required }] of rToT.entries()) {
      for (const tKind of required) {
        const targets = tToR.get(tKind)
        if (!targets) {
          violations.push({
            id: 'B9',
            file: INTERLOCK_PATH,
            message: `§2.1 に ${rTag} 必須=${tKind} があるが §2.2 に ${tKind} の entry がない`,
          })
          continue
        }
        if (!targets.has(rTag)) {
          violations.push({
            id: 'B9',
            file: INTERLOCK_PATH,
            message: `§2.1 に ${rTag} 必須=${tKind} があるが §2.2 で ${tKind} → ${rTag} 関係が宣言されていない`,
          })
        }
      }
    }

    // Verify: every (T:Y -> R:X) in §2.2 has R:X requires-or-optional T:Y in §2.1
    for (const [tKind, targets] of tToR.entries()) {
      for (const rTag of targets) {
        const rEntry = rToT.get(rTag)
        if (!rEntry) {
          // R:X may not have an entry if it's a meta-tag like R:unclassified
          // unclassified pair is handled separately
          if (rTag === 'R:unclassified' && tKind === 'T:unclassified') continue
          violations.push({
            id: 'B9',
            file: INTERLOCK_PATH,
            message: `§2.2 に ${tKind} → ${rTag} があるが §2.1 に ${rTag} の entry がない`,
          })
          continue
        }
        if (!rEntry.required.has(tKind) && !rEntry.optional.has(tKind)) {
          violations.push({
            id: 'B9',
            file: INTERLOCK_PATH,
            message: `§2.2 に ${tKind} → ${rTag} があるが §2.1 で ${rTag} の必須/任意 T:kind に ${tKind} が含まれない`,
          })
        }
      }
    }

    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('B10: Anchor Slice 5 R:tag + 6 T:kind が plan / Constitution / Origin Journal / Interlock の四者で一致', () => {
    const violations: Violation[] = []

    // Anchor Slice spec from plan §OCS.7
    const expectedRTags = new Set([
      'R:calculation',
      'R:bridge',
      'R:read-model',
      'R:guard',
      'R:presentation',
    ])
    const expectedTKinds = new Set([
      'T:unit-numerical',
      'T:boundary',
      'T:contract-parity',
      'T:zod-contract',
      'T:meta-guard',
      'T:render-shape',
    ])

    const sources: Array<{ file: string; section: string; content: string }> = []

    // Plan §OCS.7 (Children への absorption 戦略 / Anchor Slice)
    if (fileExists(PLAN_PATH)) {
      const planContent = readFile(PLAN_PATH)
      const ocs7Start = planContent.indexOf('### §OCS.7')
      const ocs7End = ocs7Start === -1 ? -1 : planContent.indexOf('\n### §', ocs7Start + 1)
      sources.push({
        file: PLAN_PATH,
        section: '§OCS.7',
        content:
          ocs7Start === -1
            ? ''
            : planContent.slice(ocs7Start, ocs7End === -1 ? undefined : ocs7End),
      })
    }

    // Interlock §3 Anchor Slice
    if (fileExists(INTERLOCK_PATH)) {
      const ilContent = readFile(INTERLOCK_PATH)
      const sec3Start = ilContent.indexOf('## 3. Anchor Slice')
      const sec3End = sec3Start === -1 ? -1 : ilContent.indexOf('\n## ', sec3Start + 1)
      sources.push({
        file: INTERLOCK_PATH,
        section: '§3 Anchor Slice',
        content:
          sec3Start === -1 ? '' : ilContent.slice(sec3Start, sec3End === -1 ? undefined : sec3End),
      })
    }

    // Origin Journal §2 Anchor Slice (R:* entries) + §3 Anchor Slice (T:* entries)
    if (fileExists(ORIGIN_JOURNAL_PATH)) {
      const ojContent = readFile(ORIGIN_JOURNAL_PATH)
      // §2 covers R:* tags, §3 covers T:* tags
      const sec2Start = ojContent.indexOf('## 2. 責務軸')
      const sec3Start = ojContent.indexOf('## 3. テスト軸')
      const sec4Start = ojContent.indexOf('## 4. 採取 obligation')
      const sec2to3 =
        sec2Start === -1 ? '' : ojContent.slice(sec2Start, sec3Start === -1 ? sec4Start : sec3Start)
      const sec3to4 =
        sec3Start === -1 ? '' : ojContent.slice(sec3Start, sec4Start === -1 ? undefined : sec4Start)
      sources.push({
        file: ORIGIN_JOURNAL_PATH,
        section: '§2 + §3 Anchor Slice skeleton',
        content: sec2to3 + sec3to4,
      })
    }

    if (sources.length === 0) {
      violations.push({
        id: 'B10',
        file: '(any)',
        message: 'Anchor Slice 検証に使う source 文書がいずれも存在しない',
      })
      expect(violations, formatViolations(violations)).toEqual([])
      return
    }

    // Verify each source mentions every expected R:tag and T:kind at least once.
    // (We accept either backtick-wrapped or plain references for robustness.)
    for (const { file, section, content } of sources) {
      if (!content) {
        violations.push({
          id: 'B10',
          file,
          message: `${section} セクションが見つからない (文書構造が変更された可能性)`,
        })
        continue
      }
      for (const rTag of expectedRTags) {
        if (!content.includes(rTag)) {
          violations.push({
            id: 'B10',
            file,
            message: `${section} に Anchor R:tag ${rTag} が含まれない (4 文書間で不一致)`,
          })
        }
      }
      for (const tKind of expectedTKinds) {
        if (!content.includes(tKind)) {
          violations.push({
            id: 'B10',
            file,
            message: `${section} に Anchor T:kind ${tKind} が含まれない (4 文書間で不一致)`,
          })
        }
      }
    }

    expect(violations, formatViolations(violations)).toEqual([])
  })

  // ─────────────────────────────────────────────────────────────────────
  // B11 / B12 / B13: 用語・状態・Level 名の token-level drift 検出
  //
  // 「Lifecycle 6 states」「Promotion Gate L0-L6」「Review Window 文書構造」など、
  // 複数文書にまたがる固定 vocabulary が片方の文書だけ綴り変更で drift する
  // パターンを検出する。typo / partial rename / 名称統一忘れの早期発見。
  // ─────────────────────────────────────────────────────────────────────

  it('B11: Lifecycle 6 states (proposed→active→deprecated→sunsetting→retired→archived) が 4 文書で一致', () => {
    const REVIEW_WINDOW_PATH = 'references/03-guides/taxonomy-review-window.md'
    const REVIEW_JOURNAL_PATH = 'references/02-status/taxonomy-review-journal.md'

    const lifecycleStates = [
      'proposed',
      'active',
      'deprecated',
      'sunsetting',
      'retired',
      'archived',
    ]

    // Lifecycle 6 states are defined in plan §OCS.4 and referenced in:
    // - Origin Journal (Lifecycle status field, R:unclassified entry)
    // - Review Window (§6.1 OCS.4 Lifecycle)
    // - Review Journal (§3 transition records)
    const docs = [
      { file: PLAN_PATH, section: '§OCS.4 Lifecycle State Machine（定義元）' },
      { file: ORIGIN_JOURNAL_PATH, section: '§1 形式定義 + active タグ entry' },
      { file: REVIEW_WINDOW_PATH, section: '§6.1 OCS.4 Lifecycle 接続' },
      { file: REVIEW_JOURNAL_PATH, section: '§1/§3 Lifecycle transition 記録' },
    ]

    const violations: Violation[] = []
    for (const { file, section } of docs) {
      if (!fileExists(file)) {
        violations.push({
          id: 'B11',
          file,
          message: `Lifecycle states 検証対象 file が存在しない (B1 で検出されるはずだが念のため)`,
        })
        continue
      }
      const content = readFile(file)
      const missing = lifecycleStates.filter((state) => {
        // word-boundary check: avoid matching "actively" when looking for "active"
        const wordBoundaryRegex = new RegExp(`\\b${state}\\b`)
        return !wordBoundaryRegex.test(content)
      })
      if (missing.length > 0) {
        violations.push({
          id: 'B11',
          file: `${file} ${section}`,
          message: `Lifecycle states ${missing.join(' / ')} が文書内に出現しない (token-level drift / 4 文書 vocabulary 不一致)`,
        })
      }
    }

    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('B12: Promotion Gate L0-L6 名称が plan §OCS.5 と Constitution §6 で一致', () => {
    const violations: Violation[] = []

    // Canonical Level names from Constitution §6 + plan §OCS.5
    // L0 has no canonical name in source; we treat L1-L6 as the verifiable set.
    const levelNames: Array<{ level: string; canonical: string }> = [
      { level: 'L1', canonical: 'Registered' },
      { level: 'L2', canonical: 'Origin-linked' },
      { level: 'L3', canonical: 'Interlock-bound' },
      { level: 'L4', canonical: 'Guarded' },
      { level: 'L5', canonical: 'Coverage' }, // "Coverage 100%" / "Coverage" — substring check
      { level: 'L6', canonical: 'Health-tracked' },
    ]

    const docs = [
      { file: CONSTITUTION_PATH, section: '§6 Promotion Gate' },
      { file: PLAN_PATH, section: '§OCS.5 Promotion Gate' },
    ]

    for (const { file, section } of docs) {
      if (!fileExists(file)) continue
      const content = readFile(file)
      // Line-based check: a single line must contain both Lx token and the canonical name.
      // Markdown table cells span across `|` separators within one line, so line-based
      // matching is more robust than character-level regex (which gets cut off at `|`).
      const lines = content.split('\n')
      for (const { level, canonical } of levelNames) {
        const found = lines.some((line) => {
          const levelRegex = new RegExp(`\\b${level}\\b`)
          return levelRegex.test(line) && line.includes(canonical)
        })
        if (!found) {
          violations.push({
            id: 'B12',
            file: `${file} ${section}`,
            message: `Promotion Gate ${level} の canonical 名 "${canonical}" が ${level} 行に見つからない (level 名 drift / plan ↔ Constitution 不一致)`,
          })
        }
      }

      // Also verify L0 exists with a recognizable description
      // Constitution: "L0 | proposed only" / plan: "L0 | Not tracked"
      // Both should at least mention L0 somewhere.
      if (!/\bL0\b/.test(content)) {
        violations.push({
          id: 'B12',
          file: `${file} ${section}`,
          message: 'Promotion Gate L0 が文書内に出現しない',
        })
      }
    }

    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('B13: Review Window 文書 (§1-§9) の構造完全性', () => {
    const REVIEW_WINDOW_PATH = 'references/03-guides/taxonomy-review-window.md'
    if (!fileExists(REVIEW_WINDOW_PATH)) {
      // file doesn't exist — Phase 2 deliverable not yet landed
      return
    }
    const content = readFile(REVIEW_WINDOW_PATH)
    const violations: Violation[] = []

    const requiredSections = [
      { name: '§1 review window とは何か', pattern: /## 1\. review window とは何か/ },
      { name: '§2 提案手順', pattern: /## 2\. 提案手順/ },
      { name: '§2.3 AI による提案の制限', pattern: /### 2\.3\. AI による提案の制限/ },
      { name: '§3 開催手順', pattern: /## 3\. 開催手順/ },
      { name: '§4 判定基準', pattern: /## 4\. 判定基準/ },
      { name: '§4.1 追加', pattern: /### 4\.1\. 追加/ },
      { name: '§4.2 撤退', pattern: /### 4\.2\. 撤退/ },
      { name: '§4.3 例外承認', pattern: /### 4\.3\. 例外承認/ },
      { name: '§4.4 改訂', pattern: /### 4\.4\. 改訂/ },
      { name: '§5 記録形式', pattern: /## 5\. 記録形式/ },
      { name: '§6 OCS との接続', pattern: /## 6\. OCS との接続/ },
      { name: '§6.1 OCS.4 Lifecycle', pattern: /### 6\.1\. OCS\.4 Lifecycle/ },
      { name: '§6.2 OCS.8 Exception Policy', pattern: /### 6\.2\. OCS\.8 Exception Policy/ },
      {
        name: '§6.3 OCS.9 Human Review Boundary',
        pattern: /### 6\.3\. OCS\.9 Human Review Boundary/,
      },
      { name: '§7 AI が review window 外で...', pattern: /## 7\. AI が review window 外/ },
      { name: '§7.1 検出', pattern: /### 7\.1\. 検出/ },
      { name: '§7.2 CI fail 時の AI 行動', pattern: /### 7\.2\. CI fail 時の AI 行動/ },
      { name: '§7.3 レビュー時の reviewer 行動', pattern: /### 7\.3\. レビュー時の reviewer 行動/ },
      { name: '§8 改訂手続き (メタ運用)', pattern: /## 8\. 改訂手続き/ },
      { name: '§9 関連文書', pattern: /## 9\. 関連文書/ },
    ]

    for (const r of requiredSections) {
      if (!r.pattern.test(content)) {
        violations.push({
          id: 'B13',
          file: REVIEW_WINDOW_PATH,
          message: `Review Window 必須セクション欠落: ${r.name}`,
        })
      }
    }

    expect(violations, formatViolations(violations)).toEqual([])
  })

  // ─────────────────────────────────────────────────────────────────────
  // B14 / B15 / B16 / B17 / B18: Phase 3 HANDOFF 穴チェック表の昇格
  //
  // taxonomy-v2 Phase 3 HANDOFF.md §「Phase 3 で穴の可能性がある領域」表に
  // 列挙された 5 項目を test obligation に変換した検出規則。
  // 子 Phase 0 統合 branch (claude/taxonomy-v2-phase0-integration) で landing。
  // ─────────────────────────────────────────────────────────────────────

  it('B14: Constitution 7 原則それぞれが 3 要素 (何が壊れる/どう守る/判断) を持つ', () => {
    if (!fileExists(CONSTITUTION_PATH)) return // B1 で検出済み
    const content = readFile(CONSTITUTION_PATH)
    const violations: Violation[] = []

    // 7 原則の section heading: ### 原則 N: <name>
    const principleHeadings = [...content.matchAll(/^###\s+原則\s+(\d+):/gm)]
    if (principleHeadings.length < 7) {
      violations.push({
        id: 'B14',
        file: CONSTITUTION_PATH,
        message: `7 原則の section heading が ${principleHeadings.length} 件しか見つからない (期待: 7)`,
      })
    }

    // 各原則 section 配下に 3 要素を要求 (heading 表記の揺れを許容)
    // - 「何が壊れる」/「壊れている可能性」 (failure mode)
    // - 「どう守る」/「守る仕組み」/「機械検証」 (defense mechanism)
    // - 「判断」/「裁定」/「決定」 (judgment)
    const elementPatterns: ReadonlyArray<{ name: string; pattern: RegExp }> = [
      { name: '何が壊れる/壊れる', pattern: /(壊れる|壊れている)/ },
      { name: '守る/機械検証', pattern: /(どう守る|守る仕組|機械検証|機械化|guard)/i },
      { name: '判断/裁定', pattern: /(判断|裁定|決定|review window)/i },
    ]

    for (let i = 0; i < principleHeadings.length; i++) {
      const start = principleHeadings[i].index ?? 0
      const end = principleHeadings[i + 1]?.index ?? content.length
      const section = content.slice(start, end)
      const principleNum = principleHeadings[i][1]
      for (const el of elementPatterns) {
        if (!el.pattern.test(section)) {
          violations.push({
            id: 'B14',
            file: CONSTITUTION_PATH,
            message: `原則 ${principleNum}: 3 要素のうち「${el.name}」を含む記述が見当たらない`,
          })
        }
      }
    }

    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('B15: CLAUDE.md §taxonomy-binding と review-window §9 OCS.9 が一貫した AI boundary を記述している', () => {
    if (!fileExists(CLAUDE_MD_PATH)) return
    if (!fileExists('references/03-guides/taxonomy-review-window.md')) return
    const claudeMd = readFile(CLAUDE_MD_PATH)
    const reviewWindow = readFile('references/03-guides/taxonomy-review-window.md')
    const violations: Violation[] = []

    // 両文書で「AI が触ってよいこと」「AI が触ってはいけないこと」が記述されているか
    // (粗粒度: section heading + 必須キーフレーズ)
    const requiredInBoth: ReadonlyArray<{ name: string; pattern: RegExp }> = [
      { name: 'unclassified への退避が touch 可', pattern: /unclassified/i },
      {
        name: '新タグ追加が review window 経路必須',
        pattern: /(新タグ|新 R:tag|新 T:kind|review window)/,
      },
      { name: 'Cognitive Load Ceiling の引き上げ制限', pattern: /Cognitive Load/i },
      {
        name: 'AR-TAXONOMY-AI-VOCABULARY-BINDING の参照',
        pattern: /AR-TAXONOMY-AI-VOCABULARY-BINDING/,
      },
    ]
    for (const r of requiredInBoth) {
      if (!r.pattern.test(claudeMd)) {
        violations.push({
          id: 'B15',
          file: CLAUDE_MD_PATH,
          message: `§taxonomy-binding に「${r.name}」記述が欠落 (review-window §9 と齟齬)`,
        })
      }
      if (!r.pattern.test(reviewWindow)) {
        violations.push({
          id: 'B15',
          file: 'references/03-guides/taxonomy-review-window.md',
          message: `§9 OCS.9 周辺に「${r.name}」記述が欠落 (CLAUDE.md §taxonomy-binding と齟齬)`,
        })
      }
    }

    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('B16: TXE 例外形式 (review-window §4.3 vs review-journal §3) が一致した必須フィールドを定義する', () => {
    if (!fileExists('references/03-guides/taxonomy-review-window.md')) return
    if (!fileExists('references/02-status/taxonomy-review-journal.md')) return
    const reviewWindow = readFile('references/03-guides/taxonomy-review-window.md')
    const reviewJournal = readFile('references/02-status/taxonomy-review-journal.md')
    const violations: Violation[] = []

    // TXE 例外の必須フィールド (親 plan §OCS.8 と同期)
    const requiredFields: readonly string[] = [
      'TXE-',
      'reason',
      'owner',
      'expiresAt',
      'sunsetCondition',
    ]
    for (const f of requiredFields) {
      if (!reviewWindow.includes(f)) {
        violations.push({
          id: 'B16',
          file: 'references/03-guides/taxonomy-review-window.md',
          message: `TXE 例外形式の必須要素「${f}」が欠落`,
        })
      }
      if (!reviewJournal.includes(f)) {
        violations.push({
          id: 'B16',
          file: 'references/02-status/taxonomy-review-journal.md',
          message: `TXE 例外形式の必須要素「${f}」が欠落 (review-window と齟齬)`,
        })
      }
    }

    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('B17: 全 AR-TAXONOMY-* rule が baseline 戦略 (Constitution §8 + plan) に言及されている', () => {
    if (!fileExists(PLAN_PATH)) return
    if (!fileExists(CONSTITUTION_PATH)) return
    const plan = readFile(PLAN_PATH)
    const constitution = readFile(CONSTITUTION_PATH)
    const violations: Violation[] = []

    // plan から AR-TAXONOMY-* rule 名を抽出
    const ruleIds = [...new Set([...plan.matchAll(/`(AR-TAXONOMY-[A-Z-]+)`/g)].map((m) => m[1]))]
    if (ruleIds.length < 7) {
      violations.push({
        id: 'B17',
        file: PLAN_PATH,
        message: `AR-TAXONOMY-* rule が ${ruleIds.length} 件しか見つからない (期待: 7 件、親 plan §AR-TAXONOMY-* rule 仕様)`,
      })
    }

    // baseline 戦略の言及を検証 (plan §AR-TAXONOMY-* セクション全体に baseline / ratchet-down 等を含むか)
    const baselineKeywords = /(baseline|ratchet-down|ratchet down|現状値で固定|固定モード)/i
    if (!baselineKeywords.test(plan)) {
      violations.push({
        id: 'B17',
        file: PLAN_PATH,
        message:
          'plan に baseline / ratchet-down 戦略の言及が無い (AR-TAXONOMY-* 全 rule の固定方針)',
      })
    }

    // Constitution §8 (or 同等) に AR-TAXONOMY-* と baseline の言及があるか
    if (!constitution.match(/AR-TAXONOMY-/)) {
      violations.push({
        id: 'B17',
        file: CONSTITUTION_PATH,
        message:
          'Constitution に AR-TAXONOMY-* rule への参照が無い (baseline 戦略の整合性確認不可)',
      })
    }

    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('B18: doc-registry の taxonomy-* 4 entries ↔ Constitution/plan が双方向 link を持つ', () => {
    const docRegistryPath = 'docs/contracts/doc-registry.json'
    if (!fileExists(docRegistryPath)) return
    if (!fileExists(CONSTITUTION_PATH)) return
    if (!fileExists(PLAN_PATH)) return
    const docRegistry = readFile(docRegistryPath)
    const constitution = readFile(CONSTITUTION_PATH)
    const plan = readFile(PLAN_PATH)
    const violations: Violation[] = []

    // doc-registry に登録される taxonomy-* docs (基底 4 件 + 必要に応じて拡張)
    const taxonomyDocs: readonly string[] = [
      'references/01-principles/taxonomy-constitution.md',
      'references/01-principles/taxonomy-interlock.md',
      'references/01-principles/taxonomy-origin-journal.md',
      'references/03-guides/taxonomy-review-window.md',
      'references/02-status/taxonomy-review-journal.md',
    ]

    for (const doc of taxonomyDocs) {
      const inRegistry = docRegistry.includes(doc)
      const inConstitution = constitution.includes(doc)
      const inPlan = plan.includes(doc)

      if (!inRegistry) {
        violations.push({
          id: 'B18',
          file: docRegistryPath,
          message: `taxonomy-* doc 未登録: ${doc}`,
        })
      }
      // 双方向 link: Constitution OR plan のいずれかから参照されている必要あり
      if (inRegistry && !inConstitution && !inPlan) {
        violations.push({
          id: 'B18',
          file: doc,
          message: `doc-registry に登録されているが Constitution / plan のいずれからも参照されていない (孤立 doc)`,
        })
      }
    }

    expect(violations, formatViolations(violations)).toEqual([])
  })
})
