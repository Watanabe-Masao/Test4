/**
 * Taxonomy Lifecycle Transition Guard — taxonomy-v2 retrospective fix I (2026-04-27)
 *
 * 役割: registry V2 (responsibilityTaxonomyRegistryV2 / testTaxonomyRegistryV2) の
 * `lifecycle` field が `active` 以外（`deprecated` / `sunsetting` / `retired` / `archived`）
 * に **AI 単独で**変更されることを禁止する。
 *
 * 背景（review-journal §3.1 の振り返り）:
 * - `AR-TAXONOMY-AI-VOCABULARY-BINDING` は新タグ追加のみを git diff で検出
 * - 既存タグの retirement / lifecycle 改変（active → deprecated → ...）は
 *   CLAUDE.md §taxonomy-binding のテキストで AI 禁止と書かれていたが **機械検証なし**
 * - Phase 7→8 cooling 撤廃で AI 提案 + user 承認の構造が ad-hoc に確立されたが、
 *   将来的な lifecycle 改変が同じ経路を経るか機械保証なし
 *
 * 検出ロジック (post-review fix #3 で構造化、2026-04-27):
 *
 * - **LCT-1: lifecycle が `active` 以外の entry は review-journal の構造化採択 marker が必須**
 *   - registry V2 から `lifecycle !== 'active'` の entry を抽出
 *   - 各 entry について `taxonomy-review-journal.md` §3 「過去の window 記録」section 内に
 *     **構造化 approval marker** が存在することを機械検証
 *   - approval marker 仕様 (HTML コメントで埋め込む構造化 metadata):
 *     ```
 *     <!-- approval: tag=R:foo from=active to=deprecated approvedBy=user windowId=2026-Q2-1 -->
 *     ```
 *     または table 形式の hierarchy entry:
 *     ```
 *     ##### {R:|T:}{tag-name}
 *     | 種別 | 撤退（active → deprecated） |
 *     | Lifecycle status | deprecated |
 *     ```
 *     のいずれかで対象 tag への **明示的な lifecycle 遷移記載**が必要
 *   - 単純 substring 一致は **false pass**（tag が他文脈で言及されただけで approve 判定）を生むため、
 *     approval marker か `Lifecycle status` field 直近の tag 言及のみを採用する
 *   - 不在 → hard fail（AI 単独で lifecycle 改変した可能性）
 *
 * - **LCT-2: lifecycle 値が valid set に含まれる**
 *   - valid: `proposed` / `active` / `deprecated` / `sunsetting` / `retired` / `archived`
 *   - 不正値は型エラーで検出されるが、guard でも一段確認（runtime safety）
 *
 * @responsibility R:guard
 * @taxonomyKind T:meta-guard
 * @see references/01-foundation/taxonomy-constitution.md (原則 3 / 原則 4)
 * @see references/04-tracking/taxonomy-review-journal.md (lifecycle 遷移の human approval 記録)
 * @see CLAUDE.md §taxonomy-binding (AI Vocabulary Binding rule、本 guard の根拠)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { RESPONSIBILITY_TAG_REGISTRY_V2 } from '../responsibilityTaxonomyRegistryV2'
import { TEST_TAXONOMY_REGISTRY_V2 } from '../testTaxonomyRegistryV2'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const REVIEW_JOURNAL = path.resolve(
  PROJECT_ROOT,
  'references/04-tracking/taxonomy-review-journal.md',
)

const VALID_LIFECYCLE = new Set([
  'proposed',
  'active',
  'deprecated',
  'sunsetting',
  'retired',
  'archived',
])

interface NonActiveEntry {
  readonly axis: 'R' | 'T'
  readonly tag: string
  readonly lifecycle: string
}

/**
 * 構造化 approval marker 検出 (post-review fix #3)
 *
 * 2 形式のいずれかが review-journal §3 内に存在することを検証:
 *
 * 形式 A: HTML コメント marker
 *   <!-- approval: tag=R:foo from=active to=deprecated approvedBy=user windowId=2026-Q2-1 -->
 *   - 機械 parser に最適、構造化が完全
 *
 * 形式 B: section header + Lifecycle status field
 *   ##### R:foo
 *   ...
 *   | Lifecycle status | deprecated |
 *   - 既存 review-journal §5 形式と互換
 *   - tag header 直近 (≤ 30 行) に target lifecycle field があれば採用
 *
 * いずれの形式も不在の場合は false (approval なし)。
 */
function hasStructuredApproval(journalContent: string, entry: NonActiveEntry): boolean {
  // entry.tag は registry key (e.g., "R:bridge")、prefix 重複を避ける
  const tag = entry.tag

  // §3 「過去の window 記録」以降のみを対象
  const journalTail = journalContent.split('## 3.')[1] ?? ''

  // 形式 A: HTML コメント marker
  const markerRegex = new RegExp(
    `<!--\\s*approval:\\s*[^>]*\\btag=${escapeRegExp(tag)}\\b[^>]*\\bto=${escapeRegExp(entry.lifecycle)}\\b[^>]*-->`,
    'i',
  )
  if (markerRegex.test(journalTail)) return true

  // 形式 B: section header (#### or #####) で tag 言及 → その直後 30 行以内に
  // `Lifecycle status` field 行で target lifecycle が記載されている
  const headerRegex = new RegExp(`^#{4,6}\\s+.*\\b${escapeRegExp(tag)}\\b`, 'gm')
  let headerMatch: RegExpExecArray | null
  while ((headerMatch = headerRegex.exec(journalTail)) !== null) {
    const headerOffset = headerMatch.index
    const lookahead = journalTail.slice(headerOffset, headerOffset + 3000) // 30〜50 行相当
    const lifecycleFieldRegex = new RegExp(
      `\\|\\s*Lifecycle status\\s*\\|[^|]*\\b${escapeRegExp(entry.lifecycle)}\\b[^|]*\\|`,
      'i',
    )
    if (lifecycleFieldRegex.test(lookahead)) return true
  }

  return false
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function collectNonActiveEntries(): readonly NonActiveEntry[] {
  const out: NonActiveEntry[] = []
  for (const [tag, entry] of Object.entries(RESPONSIBILITY_TAG_REGISTRY_V2)) {
    if (entry.lifecycle !== 'active') {
      out.push({ axis: 'R', tag, lifecycle: entry.lifecycle })
    }
  }
  for (const [kind, entry] of Object.entries(TEST_TAXONOMY_REGISTRY_V2)) {
    if (entry.lifecycle !== 'active') {
      out.push({ axis: 'T', tag: kind, lifecycle: entry.lifecycle })
    }
  }
  return out
}

describe('Taxonomy Lifecycle Transition Guard (retrospective fix I)', () => {
  it('LCT-0: registry V2 が読み込めて全 entry に lifecycle が設定されている (smoke)', () => {
    const rEntries = Object.values(RESPONSIBILITY_TAG_REGISTRY_V2)
    const tEntries = Object.values(TEST_TAXONOMY_REGISTRY_V2)
    expect(rEntries.length).toBeGreaterThan(0)
    expect(tEntries.length).toBeGreaterThan(0)
    for (const e of [...rEntries, ...tEntries]) {
      expect(e.lifecycle, `entry has invalid lifecycle: ${JSON.stringify(e)}`).toBeDefined()
    }
  })

  it('LCT-1: 全 entry の lifecycle が `active` の場合 review-journal 検証は不要 (現状) / 非 active 時は構造化 approval marker 必須', () => {
    // Phase 8 retirement 完遂時点では v1 / TSIG は registry V2 自体が削除済 (entry なし)。
    // registry V2 に残っている entry は全て v2 vocabulary で `lifecycle: 'active'`。
    // 将来 active 以外に遷移する entry が出現したら以下の構造化検証で approve を確認する。
    const nonActive = collectNonActiveEntries()
    if (nonActive.length === 0) {
      expect(nonActive.length).toBe(0) // 現状確認
      return
    }
    // 非 active entry あり → review-journal §3 内で構造化 approval marker が必須
    const journalContent = fs.existsSync(REVIEW_JOURNAL)
      ? fs.readFileSync(REVIEW_JOURNAL, 'utf-8')
      : ''
    const missingApproval: string[] = []
    for (const e of nonActive) {
      if (!hasStructuredApproval(journalContent, e)) {
        missingApproval.push(`${e.axis}:${e.tag} (lifecycle=${e.lifecycle})`)
      }
    }
    expect(
      missingApproval,
      `lifecycle が active 以外の entry には taxonomy-review-journal.md §3 に **構造化 approval marker** が必須 (post-review fix #3):\n${missingApproval.join('\n')}\n` +
        `marker 形式 (どちらかが必要):\n` +
        `  (1) HTML コメント: <!-- approval: tag=${nonActive[0]?.tag} from=active to=${nonActive[0]?.lifecycle} approvedBy=user windowId=YYYY-Q-N -->\n` +
        `  (2) ##### {tag} entry 内 'Lifecycle status' field に target lifecycle が明記\n` +
        `単純 substring 一致は false pass を生むため採用しない。\n` +
        `AI 単独で lifecycle を改変できない（Constitution 原則 3 + AR-TAXONOMY-AI-VOCABULARY-BINDING）`,
    ).toEqual([])
  })

  it('LCT-2: 全 entry の lifecycle 値が valid set に含まれる', () => {
    const invalid: string[] = []
    for (const [tag, entry] of Object.entries(RESPONSIBILITY_TAG_REGISTRY_V2)) {
      if (!VALID_LIFECYCLE.has(entry.lifecycle)) {
        invalid.push(`R:${tag} → ${entry.lifecycle}`)
      }
    }
    for (const [kind, entry] of Object.entries(TEST_TAXONOMY_REGISTRY_V2)) {
      if (!VALID_LIFECYCLE.has(entry.lifecycle)) {
        invalid.push(`T:${kind} → ${entry.lifecycle}`)
      }
    }
    expect(
      invalid,
      `lifecycle 値が valid set (proposed/active/deprecated/sunsetting/retired/archived) に含まれない:\n${invalid.join('\n')}`,
    ).toEqual([])
  })
})
