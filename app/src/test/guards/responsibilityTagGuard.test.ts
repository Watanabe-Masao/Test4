/**
 * 責務タグガード — 未分類ファイル数の管理と新規ファイルの強制分類
 *
 * - 既存の未分類: SNAPSHOT で管理。減少のみ許可。
 * - 新規ファイル: レジストリ未登録なら CI 失敗。
 * - 複数タグ: AND の可視化（情報出力）。
 *
 * @guard G8 責務分離（責務タグカバレッジ）
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel } from '../guardTestHelpers'
import {
  isClassified,
  getResponsibilityTags,
  RESPONSIBILITY_REGISTRY,
} from '../responsibilityTagRegistry'

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
  // ★ 新規ファイル追加で増えたら CI 失敗。
  const UNCLASSIFIED_SNAPSHOT = 617

  it('未分類ファイル数が増えていない（新規ファイルは登録必須）', () => {
    const unclassified: string[] = []
    for (const file of files) {
      if (!isClassified(rel(file))) unclassified.push(rel(file))
    }

    expect(
      unclassified.length,
      `未分類が増加 (${unclassified.length} > ${UNCLASSIFIED_SNAPSHOT})。\n` +
        `新規ファイルは responsibilityTagRegistry.ts に R: タグを登録してください。\n` +
        `未登録の新規ファイル（直近追加分を確認）:\n` +
        `${unclassified.slice(-10).join('\n')}`,
    ).toBeLessThanOrEqual(UNCLASSIFIED_SNAPSHOT)
  })

  it('レジストリに存在するが実ファイルがないエントリがない（陳腐化防止）', () => {
    const relPaths = new Set(files.map((f) => rel(f)))
    const stale: string[] = []
    for (const key of Object.keys(RESPONSIBILITY_REGISTRY)) {
      if (!relPaths.has(key)) stale.push(key)
    }

    expect(
      stale,
      `レジストリに実ファイルがないエントリ:\n${stale.join('\n')}\n` +
        '→ responsibilityTagRegistry.ts から削除してください',
    ).toEqual([])
  })

  it('分類状況サマリー（情報出力）', () => {
    const tagCounts: Record<string, number> = {}
    let classified = 0
    let unclassified = 0
    let multiTag = 0

    for (const file of files) {
      const tags = getResponsibilityTags(rel(file))
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
})
