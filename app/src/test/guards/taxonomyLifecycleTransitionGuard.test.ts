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
 * 検出ロジック:
 *
 * - **LCT-1: lifecycle が `active` 以外の entry は review-journal entry が必須**
 *   - registry V2 から `lifecycle !== 'active'` の entry を抽出
 *   - 各 entry について `taxonomy-review-journal.md` に対応する採択 entry が存在することを確認
 *   - 検証 pattern: review-journal に entry の tag identifier (`R:foo` / `T:bar`) または
 *     "v1 vocabulary" / "TSIG vocabulary" 等の grouping 言及がある
 *   - 不在 → hard fail（AI 単独で lifecycle 改変した可能性）
 *
 * - **LCT-2: lifecycle 値が valid set に含まれる**
 *   - valid: `proposed` / `active` / `deprecated` / `sunsetting` / `retired` / `archived`
 *   - 不正値は型エラーで検出されるが、guard でも一段確認（runtime safety）
 *
 * @responsibility R:guard
 * @taxonomyKind T:meta-guard
 * @see references/01-principles/taxonomy-constitution.md (原則 3 / 原則 4)
 * @see references/02-status/taxonomy-review-journal.md (lifecycle 遷移の human approval 記録)
 * @see CLAUDE.md §taxonomy-binding (AI Vocabulary Binding rule、本 guard の根拠)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { RESPONSIBILITY_TAG_REGISTRY_V2 } from '../responsibilityTaxonomyRegistryV2'
import { TEST_TAXONOMY_REGISTRY_V2 } from '../testTaxonomyRegistryV2'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const REVIEW_JOURNAL = path.resolve(PROJECT_ROOT, 'references/02-status/taxonomy-review-journal.md')

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

  it('LCT-1: 全 entry の lifecycle が `active` の場合 review-journal 検証は不要 (現状)', () => {
    // Phase 8 retirement 完遂時点では v1 / TSIG は registry V2 自体が削除済 (entry なし)。
    // registry V2 に残っている entry は全て v2 vocabulary で `lifecycle: 'active'`。
    // 将来 active 以外に遷移する entry が出現したら LCT-2 が検証する。
    const nonActive = collectNonActiveEntries()
    if (nonActive.length === 0) {
      expect(nonActive.length).toBe(0) // 現状確認
      return
    }
    // 非 active entry あり → review-journal 必須
    const journalContent = fs.existsSync(REVIEW_JOURNAL)
      ? fs.readFileSync(REVIEW_JOURNAL, 'utf-8')
      : ''
    const missingApproval: string[] = []
    for (const e of nonActive) {
      // entry の tag identifier または grouping 言及で review-journal 採択 entry を確認
      // 簡易検証: tag 文字列が journal §3 「過去の window 記録」section 内に出現する
      const journalTail = journalContent.split('## 3.')[1] ?? ''
      if (!journalTail.includes(e.tag) && !journalTail.includes(`${e.axis}:* vocabulary`)) {
        missingApproval.push(`${e.axis}:${e.tag} (lifecycle=${e.lifecycle})`)
      }
    }
    expect(
      missingApproval,
      `lifecycle が active 以外の entry には taxonomy-review-journal.md §3 に対応する採択 entry が必須:\n${missingApproval.join('\n')}\n` +
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
