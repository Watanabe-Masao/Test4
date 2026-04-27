/**
 * hookCanonicalPathGuard —
 * 同一名 hook の複数 path 並存に対し `@canonical` JSDoc 必須化 + 非正本 path の
 * ratchet-down 管理
 *
 * projects/architecture-debt-recovery SP-C ADR-C-002 PR1。
 *
 * 現在 `useCostDetailData` が 2 path に並存:
 *  - features/cost-detail/application/useCostDetailData.ts （正本: `@canonical` 付与済み）
 *  - presentation/pages/CostDetail/useCostDetailData.ts （非正本: PR3 で削除）
 *
 * 検出対象:
 *  - H1: 各 hook の正本 file が `@canonical` JSDoc を持つ
 *  - H2: 非正本 path 数が baseline を超えない（ratchet-down）
 *  - H3: 既知 hook entry の各 path file が実在する（stale 検出）
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-C-002
 *  - projects/completed/duplicate-orphan-retirement/checklist.md Phase 2
 *
 * @responsibility R:guard
 *
 * @taxonomyKind T:unclassified
 */

import { existsSync, readFileSync } from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')

interface HookEntry {
  readonly hookName: string
  readonly canonicalPath: string
  readonly nonCanonicalPaths: readonly string[]
}

const KNOWN_HOOKS: readonly HookEntry[] = [
  {
    hookName: 'useCostDetailData',
    canonicalPath: 'app/src/features/cost-detail/application/useCostDetailData.ts',
    nonCanonicalPaths: [], // ADR-C-002 PR3 (2026-04-24) で pages 版を物理削除
  },
]

const BASELINE_NON_CANONICAL_COUNT = 0

describe('hookCanonicalPathGuard', () => {
  it('H1: 各 hook の canonicalPath が `@canonical` JSDoc を持つ', () => {
    const missing: string[] = []
    for (const entry of KNOWN_HOOKS) {
      const absPath = path.join(PROJECT_ROOT, entry.canonicalPath)
      if (!existsSync(absPath)) continue // H3 で検出
      const content = readFileSync(absPath, 'utf-8')
      if (!content.includes('@canonical')) {
        missing.push(`${entry.hookName} → ${entry.canonicalPath}`)
      }
    }
    expect(
      missing,
      `@canonical JSDoc 未付与: ${missing.join(', ')}\n` +
        '正本ファイルの先頭 JSDoc に `@canonical <module-path>` を追記してください。',
    ).toEqual([])
  })

  it('H2: 非正本 path の総数が baseline を超えない（ratchet-down）', () => {
    const total = KNOWN_HOOKS.reduce((sum, entry) => sum + entry.nonCanonicalPaths.length, 0)
    expect(
      total,
      `非正本 path 総数 ${total} が baseline=${BASELINE_NON_CANONICAL_COUNT} を超過。`,
    ).toBeLessThanOrEqual(BASELINE_NON_CANONICAL_COUNT)
  })

  it('H3: KNOWN_HOOKS の各 path file が実在する（stale 検出）', () => {
    const missing: string[] = []
    for (const entry of KNOWN_HOOKS) {
      for (const relPath of [entry.canonicalPath, ...entry.nonCanonicalPaths]) {
        if (!existsSync(path.join(PROJECT_ROOT, relPath))) missing.push(relPath)
      }
    }
    expect(
      missing,
      `存在しない path が KNOWN_HOOKS に残存: ${missing.join(', ')}\n` +
        '削除完了したならば KNOWN_HOOKS から該当 entry を更新し baseline を減算してください（卒業処理）。',
    ).toEqual([])
  })
})
