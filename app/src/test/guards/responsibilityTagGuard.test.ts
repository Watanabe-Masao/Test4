/**
 * 責務タグガード — 未分類ファイル数の管理と新規ファイルの強制分類
 *
 * - 既存の未分類: SNAPSHOT で管理。減少のみ許可。
 * - 新規ファイル: レジストリ未登録なら CI 失敗。
 * - 複数タグ: AND の可視化（情報出力）。
 *
 * @guard G8 責務分離（責務タグカバレッジ）
 * @guard C8 1文説明テスト（複数タグ = AND = 分離候補）
 * @guard C9 現実把握優先（未分類は正直に残す）
 */
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
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
  const UNCLASSIFIED_SNAPSHOT = 613

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

  it('変更されたファイルの責務が再検証されている（スルー防止）', () => {
    // git diff で変更されたファイルを取得（CI: HEAD~1、ローカル: HEAD）
    let changedFiles: string[] = []
    try {
      const diffTarget = process.env.CI ? 'HEAD~1' : 'HEAD'
      const output = execSync(`git diff --name-only ${diffTarget}`, {
        cwd: path.resolve(SRC_DIR, '..'),
        encoding: 'utf-8',
      }).trim()
      changedFiles = output
        .split('\n')
        .filter(Boolean)
        .map((f) => f.replace(/^app\/src\//, ''))
    } catch {
      // git diff が失敗した場合はスキップ（初回コミット等）
      return
    }

    const today = new Date().toISOString().slice(0, 10)
    const unverified: string[] = []

    const targetSet = new Set(files.map((f) => rel(f)))

    for (const changed of changedFiles) {
      // 対象ディレクトリ外のファイルはスキップ
      if (!targetSet.has(changed)) continue

      const entry = RESPONSIBILITY_REGISTRY[changed]
      if (!entry) {
        // 未分類ファイルが変更された → タグ登録を要求
        unverified.push(`${changed}: 未分類 → R: タグを登録してください`)
      } else if (entry.verifiedAt !== today) {
        // タグ付きファイルが変更されたのに verifiedAt が今日でない → 再検証を要求
        unverified.push(
          `${changed}: verifiedAt=${entry.verifiedAt} → 責務を再検証して今日に更新してください`,
        )
      }
    }

    expect(
      unverified,
      `変更されたファイルの責務が検証されていません。\n` +
        `ファイルの中身を確認し、responsibilityTagRegistry.ts に R: タグを登録（または verifiedAt を更新）してください:\n` +
        `${unverified.join('\n')}`,
    ).toEqual([])
  })
})
