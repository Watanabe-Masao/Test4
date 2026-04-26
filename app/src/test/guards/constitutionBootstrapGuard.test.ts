/**
 * Constitution Bootstrap Guard — taxonomy-v2 family の Constitution 5 deliverables
 * の存在 + 相互参照整合を検証する。
 *
 * 親 plan §8 昇華メカニズム #8「Constitution Bootstrap Test」の正本。
 * `taxonomy-constitution.md` 原則 5 + 親 plan §AR-TAXONOMY-* で参照される。
 *
 * 検出する違反:
 *
 * - **B1: 必須ファイル欠落** — Phase 1 の 5 deliverables のいずれかが存在しない
 * - **B2: Constitution 必須セクション欠落** — 7 不可侵原則 / OCS 統合 / 制度成立 5 要件
 * - **B3: Interlock マトリクス欠落** — R ⇔ T マトリクス節と AR-TAXONOMY-INTERLOCK
 * - **B4: Origin Journal 形式欠落** — 形式定義節と必須フィールド列挙
 * - **B5: CLAUDE.md §taxonomy-binding 欠落** — AI Vocabulary Binding 節
 * - **B6: 相互参照欠落** — 各文書が canonical source へのリンクを持っていない
 *
 * 本 guard は Phase 1 Constitution の bootstrap が完了していることを保証する
 * **structural** check。AR-TAXONOMY-* rule の active 化は子 Phase 3（Guard 実装）が担う。
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
      { name: 'AR-TAXONOMY-AI-VOCABULARY-BINDING 参照', pattern: /AR-TAXONOMY-AI-VOCABULARY-BINDING/ },
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
})
