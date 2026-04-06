/**
 * 責務タグガード — @responsibility タグによるファイル分類の強制
 *
 * - 全対象ファイルの @responsibility タグをスキャンして分類状況を管理
 * - 未分類の SNAPSHOT を超えたら CI 失敗（新規ファイルはタグ必須）
 * - 不正なタグ名を検出
 *
 * @guard G8 責務分離（責務タグカバレッジ）
 * @guard C8 1文説明テスト（複数タグ = AND = 分離候補）
 * @guard C9 現実把握優先（未分類は正直に残す）
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel } from '../guardTestHelpers'
import { readResponsibilityTags, validateTags } from '../responsibilityTagRegistry'
import { TAG_EXPECTATIONS } from '../responsibilityTagExpectations'
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

  // ★ 現在の未分類数。タグ付けしたらこの数を減らす。
  // ★ 新規ファイル追加でタグなしなら CI 失敗。
  const UNCLASSIFIED_SNAPSHOT = 400

  it('未分類ファイル数が増えていない（新規ファイルは @responsibility 必須）', () => {
    const unclassified: string[] = []
    for (const file of files) {
      if (readResponsibilityTags(file) === null) unclassified.push(rel(file))
    }

    expect(
      unclassified.length,
      `未分類が増加 (${unclassified.length} > ${UNCLASSIFIED_SNAPSHOT})。\n` +
        `新規ファイルは JSDoc に @responsibility R:xxx を追加してください。\n` +
        `未分類の末尾:\n${unclassified.slice(-10).join('\n')}`,
    ).toBeLessThanOrEqual(UNCLASSIFIED_SNAPSHOT)
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

    expect(
      invalid,
      `不正な @responsibility タグが見つかりました:\n${invalid.join('\n')}\n` +
        'responsibilityTagRegistry.ts の ResponsibilityTag を確認してください',
    ).toEqual([])
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

  it('タグと実態の不一致を検出（単一タグファイルのみ）', () => {
    const mismatches: string[] = []

    for (const file of files) {
      const tags = readResponsibilityTags(file)
      if (!tags || tags.length !== 1) continue // 単一タグのみ対象

      const tag = tags[0] as ResponsibilityTag
      const exp = TAG_EXPECTATIONS[tag]
      if (!exp) continue

      const content = fs.readFileSync(file, 'utf-8')
      const memo = (content.match(/\buseMemo\s*\(/g) || []).length
      const cb = (content.match(/\buseCallback\s*\(/g) || []).length
      const state = (content.match(/\buseState\b/g) || []).length
      const lineCount = content.split('\n').length

      const issues: string[] = []
      if (memo > exp.memoMax) issues.push(`useMemo ${memo}>${exp.memoMax}`)
      if (cb > exp.callbackMax) issues.push(`useCallback ${cb}>${exp.callbackMax}`)
      if (state > exp.stateMax) issues.push(`useState ${state}>${exp.stateMax}`)
      if (lineCount > exp.lineMax) issues.push(`${lineCount}行>${exp.lineMax}`)

      if (issues.length > 0) {
        mismatches.push(`${rel(file)} [${tag}]: ${issues.join(', ')}`)
      }
    }

    // 情報出力（CI は落とさない — 黄色信号として報告）
    if (mismatches.length > 0) {
      console.log(`\n[タグ不一致] ${mismatches.length} 件 — タグの見直しまたは分離を検討:`)
      for (const m of mismatches) console.log(`  ${m}`)
    }

    expect(true).toBe(true)
  })
})
