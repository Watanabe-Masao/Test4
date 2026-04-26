/**
 * registryInlineLogicGuard —
 * Dashboard widget registry 行の inline logic（IIFE / inline JSX 構築 / default hardcode）を
 * ratchet-down 管理
 *
 * projects/widget-registry-simplification SP-B ADR-B-003 PR1 で初期化（IIFE 検出）。
 * ADR-B-004 で inline JSX / default hardcode 検出を追加予定。
 *
 * 検出する違反:
 *  - I1: registry 行に IIFE pattern `(() => { ... })()` の出現数 ≤ baseline
 *
 * 設計意図:
 *   registry 行で `props={(() => { ... })()}` のように inline 派生計算を書くと、
 *   - test しづらい（registry 行から logic を分離できない）
 *   - 同じ計算が複数 widget で再実装される
 *   - 型推論が registry に染み出して registry 行の責務が肥大化
 *   この pattern を ADR-B-003 で `application/readModels/customerFact/selectors.ts`
 *   の pure selector に抽出する。
 *
 * Scope:
 *  - app/src/presentation/pages/Dashboard/widgets/registry*.tsx のみ
 *  - registry の definition 配列内の IIFE のみを対象（render 関数本体内の IIFE は別 issue）
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-B-003
 *  - projects/architecture-debt-recovery/inquiry/10a-wss-concern-link.md §C-06
 *  - projects/widget-registry-simplification/plan.md §ADR-B-003
 *
 * @responsibility R:guard
 */

import { readFileSync, readdirSync } from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const REGISTRY_DIR = path.join(PROJECT_ROOT, 'app/src/presentation/pages/Dashboard/widgets')

// fixed mode (baseline=0)
// - 初期 audit で registry*.tsx 配下の IIFE pattern `(() =>` を 3 件検出
// - ADR-B-003 PR2 で selector を application/readModels/customerFact/selectors.ts に新設
// - ADR-B-003 PR3 (commit 1356ff8) で 4 IIFE call site を selector call に置換
//   ※ IIFE は 3 種だが call site は 4 (同一 IIFE が 2 widget で重複) → 1 selector に統一
// - ADR-B-003 PR4 (本 commit) で baseline 3→0 fixed mode 移行。
//   新規 IIFE は registry に書かず、application/readModels/<source>/selectors.ts に
//   pure selector として抽出する。
// - LEG-009 sunsetCondition 達成（registry 内 inline pure helper の物理排除）
const BASELINE_IIFE_COUNT = 0

const IIFE_PATTERN = /\(\(\)\s*=>/g

/** registry*.tsx を全て列挙する */
function listRegistryFiles(): string[] {
  return readdirSync(REGISTRY_DIR)
    .filter((name) => /^registry.*\.tsx$/.test(name))
    .filter((name) => !name.endsWith('.test.tsx') && !name.endsWith('.stories.tsx'))
    .map((name) => path.join(REGISTRY_DIR, name))
}

/** ファイル content から IIFE 出現数を返す */
function countIifeInContent(content: string): number {
  const matches = content.match(IIFE_PATTERN)
  return matches ? matches.length : 0
}

/** 全 registry file の合計 IIFE 数を返す（per-file 内訳付き） */
function collectIifeCounts(): { totalCount: number; perFile: Map<string, number> } {
  const files = listRegistryFiles()
  const perFile = new Map<string, number>()
  let totalCount = 0
  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    const count = countIifeInContent(content)
    if (count > 0) {
      const rel = path.relative(PROJECT_ROOT, file)
      perFile.set(rel, count)
      totalCount += count
    }
  }
  return { totalCount, perFile }
}

describe('registryInlineLogicGuard (SP-B ADR-B-003)', () => {
  it('I1: registry 行の IIFE 数が baseline を超えない（ratchet-down）', () => {
    const { totalCount, perFile } = collectIifeCounts()
    const breakdown = [...perFile.entries()]
      .map(([rel, count]) => `  - ${rel}: ${count}`)
      .join('\n')
    const message =
      `IIFE pattern 数 = ${totalCount} (baseline = ${BASELINE_IIFE_COUNT}):\n` +
      breakdown +
      '\n\n' +
      'hint: fixed mode (baseline=0) 到達済み。新規 IIFE は registry に書かず、' +
      'application/readModels/<source>/selectors.ts に pure selector として抽出する。' +
      '\n  詳細: projects/widget-registry-simplification/plan.md §ADR-B-003'
    expect(totalCount, message).toBeLessThanOrEqual(BASELINE_IIFE_COUNT)
  })

  it('listRegistryFiles は registry*.tsx のみを返す（test / stories 除外）', () => {
    const files = listRegistryFiles()
    for (const file of files) {
      const base = path.basename(file)
      expect(/^registry.*\.tsx$/.test(base)).toBe(true)
      expect(base.endsWith('.test.tsx')).toBe(false)
      expect(base.endsWith('.stories.tsx')).toBe(false)
    }
    // 少なくとも 1 つ以上の registry file が存在することを保証
    expect(files.length).toBeGreaterThan(0)
  })
})
