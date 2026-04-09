/**
 * 責務タグガード — @responsibility タグによるファイル分類の強制
 *
 * - 全対象ファイルの @responsibility タグをスキャンして分類状況を管理
 * - 未分類数が前回より増えたら CI 失敗（ratchet-down: 減少のみ許可）
 * - 不正なタグ名を検出
 * - タグと実態の不一致を frozen count で管理
 *
 * @guard G8 責務分離（責務タグカバレッジ）
 * @guard C8 1文説明テスト（複数タグ = AND = 分離候補）
 * @guard C9 現実把握優先（未分類は正直に残す）
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel, stripComments } from '../guardTestHelpers'
import { readResponsibilityTags, validateTags } from '../responsibilityTagRegistry'
import {
  getRuleByResponsibilityTag,
  getRuleById,
  formatViolationMessage,
} from '../architectureRules'
import type { ResponsibilityTag } from '../responsibilityTagRegistry'

/** 対象ディレクトリ */
const TARGET_DIRS = [
  'application/hooks',
  'presentation/components',
  'presentation/pages',
  'presentation/hooks',
  'features',
]

const isTarget = (file: string) =>
  !file.includes('.test.') &&
  !file.includes('.stories.') &&
  !file.includes('.styles.') &&
  !file.includes('__tests__') &&
  !file.endsWith('/index.ts') &&
  !file.endsWith('/index.tsx')

function collectTargetFiles(): string[] {
  const all: string[] = []
  for (const dir of TARGET_DIRS) {
    const absDir = path.join(SRC_DIR, dir)
    if (!fs.existsSync(absDir)) continue
    for (const f of collectTsFiles(absDir)) {
      if (isTarget(f)) all.push(f)
    }
  }
  return all
}

describe('G8-R: 責務タグカバレッジ', () => {
  const files = collectTargetFiles()
  const rule = getRuleById('AR-C9-HONEST-UNCLASSIFIED')!

  // ── ratchet-down ベースライン ──
  // 実測値がこれより減ったら、この数字を下げてコミットする。
  // 増えたら CI 失敗。放置しても悪化しない。
  const UNCLASSIFIED_BASELINE = 402
  const TAG_MISMATCH_BASELINE = 48

  it('未分類ファイル数が増えていない（ratchet-down）', () => {
    const unclassified: string[] = []
    for (const file of files) {
      if (readResponsibilityTags(file) === null) unclassified.push(rel(file))
    }

    // ratchet-down: 減ったらベースラインを更新するよう促す
    if (unclassified.length < UNCLASSIFIED_BASELINE) {
      console.log(
        `\n[ratchet-down] 未分類が ${UNCLASSIFIED_BASELINE} → ${unclassified.length} に減少。` +
          `\nUNCLASSIFIED_BASELINE を ${unclassified.length} に更新してください。`,
      )
    }

    expect(
      unclassified.length,
      formatViolationMessage(rule, unclassified.slice(-10)),
    ).toBeLessThanOrEqual(UNCLASSIFIED_BASELINE)
  })

  it('@responsibility タグに不正なタグ名がない', () => {
    const invalid: string[] = []
    for (const file of files) {
      const tags = readResponsibilityTags(file)
      if (!tags) continue
      const bad = validateTags(tags)
      if (bad.length > 0) {
        invalid.push(`${rel(file)}: 不正タグ ${bad.join(', ')}`)
      }
    }

    expect(invalid, formatViolationMessage(rule, invalid)).toEqual([])
  })

  it('分類状況サマリー（情報出力）', () => {
    const tagCounts: Record<string, number> = {}
    let classified = 0
    let unclassified = 0
    let multiTag = 0

    for (const file of files) {
      const tags = readResponsibilityTags(file)
      if (tags === null) {
        unclassified++
      } else {
        classified++
        if (tags.length > 1) multiTag++
        for (const tag of tags) {
          tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
        }
      }
    }

    const total = files.length
    const coverage = total > 0 ? ((classified / total) * 100).toFixed(1) : '0'

    console.log(
      `\n[責務タグ] 分類済み ${classified}/${total} (${coverage}%) | 未分類 ${unclassified} | 複数タグ(AND) ${multiTag}`,
    )
    if (Object.keys(tagCounts).length > 0) {
      for (const [tag, count] of Object.entries(tagCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${tag}: ${count}`)
      }
    }

    expect(true).toBe(true)
  })

  it('タグと実態の不一致が増えていない（ratchet-down）', () => {
    const mismatches: string[] = []

    for (const file of files) {
      const tags = readResponsibilityTags(file)
      if (!tags || tags.length !== 1) continue

      const tag = tags[0] as ResponsibilityTag
      const rule = getRuleByResponsibilityTag(tag)
      if (!rule?.thresholds) continue

      const t = rule.thresholds
      const content = fs.readFileSync(file, 'utf-8')
      const code = stripComments(content)
      const memo = (code.match(/\buseMemo\s*\(/g) || []).length
      const cb = (code.match(/\buseCallback\s*\(/g) || []).length
      const state = (code.match(/\buseState\b/g) || []).length
      const lineCount = content.split('\n').length

      const issues: string[] = []
      if (t.memoMax !== undefined && memo > t.memoMax) issues.push(`useMemo ${memo}>${t.memoMax}`)
      if (t.callbackMax !== undefined && cb > t.callbackMax)
        issues.push(`useCallback ${cb}>${t.callbackMax}`)
      if (t.stateMax !== undefined && state > t.stateMax)
        issues.push(`useState ${state}>${t.stateMax}`)
      if (t.lineMax !== undefined && lineCount > t.lineMax)
        issues.push(`${lineCount}行>${t.lineMax}`)

      if (issues.length > 0) {
        mismatches.push(`${rel(file)} [${tag}] (${rule.id}): ${issues.join(', ')}`)
      }
    }

    if (mismatches.length > 0) {
      console.log(`\n[タグ不一致] ${mismatches.length} 件:`)
      for (const m of mismatches) console.log(`  ${m}`)
    }

    if (mismatches.length < TAG_MISMATCH_BASELINE) {
      console.log(
        `\n[ratchet-down] タグ不一致が ${TAG_MISMATCH_BASELINE} → ${mismatches.length} に減少。` +
          `\nTAG_MISMATCH_BASELINE を ${mismatches.length} に更新してください。`,
      )
    }

    expect(mismatches.length, formatViolationMessage(rule, mismatches)).toBeLessThanOrEqual(
      TAG_MISMATCH_BASELINE,
    )
  })
})
