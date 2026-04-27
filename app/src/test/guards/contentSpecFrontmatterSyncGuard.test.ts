/**
 * Content Spec Frontmatter Sync Guard — AR-CONTENT-SPEC-FRONTMATTER-SYNC
 *
 * Phase A scope: Anchor Slice 5 widget について、`tools/widget-specs/generate.mjs`
 * を `--check` モードで再実行し、source AST から再生成した frontmatter が
 * on-disk の WID-NNN.md と差分なし（exit 0）であることを検証する。
 *
 * 検出するもの:
 * - registryLine の drift（source の id 行が変わった）
 * - consumedCtxFields の drift（registry entry で touch する ctx field が変わった）
 * - children の drift（render の JSX 子コンポーネントが変わった）
 * - linkTo / group / size / contextType / consumedReadModels / consumedQueryHandlers
 *   の drift
 *
 * 修正方法: `node tools/widget-specs/generate.mjs --wid WID-NNN`（または引数なしで全件）
 *
 * 詳細: projects/phased-content-specs-rollout/plan.md §Phase A,
 * references/05-contents/widgets/README.md §「構造軸」。
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { PHASE_A_ANCHOR_WIDS, REPO_ROOT } from './contentSpecHelpers'

describe('Content Spec Frontmatter Sync Guard (AR-CONTENT-SPEC-FRONTMATTER-SYNC)', () => {
  it('Anchor Slice 5 件で generator --check が drift 0 を報告する', () => {
    const generatorPath = resolve(REPO_ROOT, 'tools/widget-specs/generate.mjs')
    const violations: string[] = []
    for (const wid of PHASE_A_ANCHOR_WIDS) {
      const result = spawnSync(
        process.execPath,
        [generatorPath, '--wid', wid, '--check', '--verbose'],
        {
          cwd: REPO_ROOT,
          encoding: 'utf-8',
          timeout: 30_000,
        },
      )
      if (result.status === 1) {
        violations.push(
          `${wid}: frontmatter drift detected.\n${result.stdout?.trim() ?? ''}` +
            `\n  → 修正: node tools/widget-specs/generate.mjs --wid ${wid}`,
        )
      } else if (result.status !== 0) {
        violations.push(
          `${wid}: generator error (exit ${result.status}).\n${result.stderr?.trim() ?? ''}`,
        )
      }
    }
    expect(violations, violations.join('\n\n')).toEqual([])
  })
})
