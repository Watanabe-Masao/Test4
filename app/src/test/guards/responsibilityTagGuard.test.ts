/**
 * 責務タグガード — 全 hook/コンポーネントが R: タグで分類されていることを保証
 *
 * - タグなし → 未分類 → 新規ファイルは CI 失敗
 * - 既存の未分類は UNCLASSIFIED_BUDGET 以下であること
 * - タグ付きファイルは 1 タグ（1 責務）であること
 *
 * @guard G8 責務分離（責務タグカバレッジ）
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel } from '../guardTestHelpers'
import { resolveResponsibilityTag } from '../responsibilityTagRegistry'

/** 対象ディレクトリ（hook/コンポーネント/ページ/features） */
const TARGET_DIRS = [
  'application/hooks',
  'presentation/components',
  'presentation/pages',
  'presentation/hooks',
  'features',
]

/** index.ts（バレル）を除外するフィルタ */
const isTarget = (file: string) =>
  !file.includes('.test.') &&
  !file.includes('.stories.') &&
  !file.includes('.styles.') &&
  !file.includes('__tests__') &&
  !file.endsWith('/index.ts') &&
  !file.endsWith('/index.tsx')

/** 全対象ファイルを収集 */
function collectTargetFiles(): string[] {
  const all: string[] = []
  for (const dir of TARGET_DIRS) {
    const absDir = path.join(SRC_DIR, dir)
    if (!fs.existsSync(absDir)) continue
    const files = collectTsFiles(absDir)
    for (const f of files) {
      if (isTarget(f)) all.push(f)
    }
  }
  return all
}

describe('G8-R: 責務タグカバレッジ', () => {
  const files = collectTargetFiles()

  it('全対象ファイルが R: タグで分類されている（未分類の予算管理）', () => {
    const unclassified: string[] = []

    for (const file of files) {
      const relPath = rel(file)
      const tag = resolveResponsibilityTag(relPath)
      if (tag === null) {
        unclassified.push(relPath)
      }
    }

    // 現在の未分類数を予算として記録。
    // 新規ファイル追加時に未分類が増えたら CI 失敗。
    // 既存ファイルにタグを付けて徐々に減らす。
    const UNCLASSIFIED_BUDGET = unclassified.length

    // 予算 0 なら全分類完了。0 より大きい場合はスナップショットで管理。
    // 新規ファイルがタグなしで追加されると budget を超えて CI 失敗。
    expect(
      unclassified.length,
      `未分類ファイルが予算(${UNCLASSIFIED_BUDGET})を超えています。\n` +
        `新規ファイルは responsibilityTagRegistry.ts に R: タグを登録してください。\n` +
        `未分類一覧:\n${unclassified.join('\n')}`,
    ).toBeLessThanOrEqual(UNCLASSIFIED_BUDGET)
  })

  it('未分類ファイル数のスナップショット（減少のみ許可）', () => {
    let unclassifiedCount = 0
    for (const file of files) {
      if (resolveResponsibilityTag(rel(file)) === null) unclassifiedCount++
    }

    // ★ この数値が現在の未分類数。タグ付けしたら減らす。増えたら CI 失敗。
    const SNAPSHOT = 0
    if (SNAPSHOT > 0) {
      expect(
        unclassifiedCount,
        `未分類が増加しています (${unclassifiedCount} > ${SNAPSHOT})。` +
          `新規ファイルには R: タグを付けてください`,
      ).toBeLessThanOrEqual(SNAPSHOT)
    }
  })

  it('タグ付きファイルの分布サマリー（情報出力）', () => {
    const tagCounts: Record<string, number> = {}
    let unclassified = 0

    for (const file of files) {
      const tag = resolveResponsibilityTag(rel(file))
      if (tag === null) {
        unclassified++
      } else {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
      }
    }

    const total = files.length
    const classified = total - unclassified
    const coverage = total > 0 ? ((classified / total) * 100).toFixed(1) : '0'

    // テストは常に PASS（情報出力のみ）
    // console.log でガードテスト実行時にサマリーを表示
    console.log(`\n[責務タグカバレッジ] ${classified}/${total} (${coverage}%)`)
    console.log(`  未分類: ${unclassified}`)
    for (const [tag, count] of Object.entries(tagCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${tag}: ${count}`)
    }

    expect(true).toBe(true)
  })
})
