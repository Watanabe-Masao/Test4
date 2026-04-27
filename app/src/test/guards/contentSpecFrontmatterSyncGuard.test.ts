/**
 * Content Spec Frontmatter Sync Guard — AR-CONTENT-SPEC-FRONTMATTER-SYNC
 *
 * Phase B scope (2026-04-27): 全 45 WID-NNN.md について、
 * `tools/widget-specs/generate.mjs --check` を 1 回 spawn し、source AST から
 * 再生成した frontmatter が on-disk と差分なし（exit 0）であることを検証する。
 * 45 件を 1 spawn にまとめることで実行時間 ~600ms に抑える（per-WID 45 spawn は
 * 30 秒級になるため避ける）。
 *
 * 検出するもの:
 * - registryLine の drift（source の id 行が変わった）
 * - consumedCtxFields の drift（registry entry で touch する ctx field が変わった）
 * - children の drift（render の JSX 子コンポーネントが変わった）
 * - linkTo / group / size / contextType / consumedReadModels / consumedQueryHandlers
 *   の drift
 *
 * 修正方法: `node tools/widget-specs/generate.mjs`（引数なしで全件再生成）
 *
 * 詳細: projects/phased-content-specs-rollout/plan.md §Phase A / §Phase B,
 * references/05-contents/widgets/README.md §「構造軸」。
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { REPO_ROOT } from './contentSpecHelpers'

describe('Content Spec Frontmatter Sync Guard (AR-CONTENT-SPEC-FRONTMATTER-SYNC)', () => {
  it('全 45 WID-NNN.md について generator --check が drift 0 を報告する', () => {
    const generatorPath = resolve(REPO_ROOT, 'tools/widget-specs/generate.mjs')
    const result = spawnSync(process.execPath, [generatorPath, '--check', '--verbose'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 60_000,
    })
    if (result.status === 0) {
      expect(true).toBe(true)
      return
    }
    if (result.status === 1) {
      throw new Error(
        `frontmatter drift detected.\n${result.stdout?.trim() ?? ''}\n` +
          `  → 修正: node tools/widget-specs/generate.mjs`,
      )
    }
    throw new Error(`generator error (exit ${result.status}).\n${result.stderr?.trim() ?? ''}`)
  })
})
