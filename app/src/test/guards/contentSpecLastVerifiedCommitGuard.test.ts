/**
 * Content Spec Last-Verified Commit Guard — AR-CONTENT-SPEC-LAST-VERIFIED-COMMIT
 *
 * Phase K Option 1 (2026-04-29 着手): 全 spec の `lastVerifiedCommit` が source file の
 * 最新 commit hash (`git log -1 --format=%h -- <sourceRef>`) と一致することを検証。
 *
 * 不一致 = 「source が動いたが spec が動いていない」signal。co-change が active な
 * ため通常は自動 sync、本 guard は co-change が漏らした stale spec を検出する safety
 * net として機能する。date-based cadence (AR-CONTENT-SPEC-FRESHNESS) の儀式に代わる
 * 構造的 mechanism。
 *
 * 修正方法:
 *   `node tools/widget-specs/refresh-last-verified.mjs` で全 spec を一括再計算
 *
 * 詳細: projects/phased-content-specs-rollout/plan.md §Phase K K2,
 * HANDOFF.md §3.9（90 日 cadence の儀式性）.
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { REPO_ROOT, loadAllSpecs } from './contentSpecHelpers'

interface CommitMismatch {
  readonly specId: string
  readonly sourcePath: string
  readonly declared: string | null
  readonly actual: string
}

function getSourcePath(spec: ReturnType<typeof loadAllSpecs>[number]): string {
  return spec.kind === 'widget' ? spec.registrySource : spec.sourceRef
}

function fetchLatestCommitHash(sourcePath: string): string | null {
  if (sourcePath === '') return null
  const fullPath = resolve(REPO_ROOT, sourcePath)
  if (!existsSync(fullPath)) return null
  try {
    const out = execSync(`git log -1 --format=%h -- "${sourcePath}"`, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 10_000,
    })
    const trimmed = out.trim()
    return trimmed === '' ? null : trimmed
  } catch {
    return null
  }
}

describe('Content Spec Last-Verified Commit Guard (AR-CONTENT-SPEC-LAST-VERIFIED-COMMIT)', () => {
  it('全 spec の lastVerifiedCommit が source file の最新 commit hash と一致する', () => {
    const specs = loadAllSpecs()
    const sourceCache = new Map<string, string | null>()
    const mismatches: CommitMismatch[] = []
    const skipped: string[] = []

    for (const spec of specs) {
      const sourcePath = getSourcePath(spec)
      if (sourcePath === '') {
        skipped.push(`${spec.id}: source path 未設定`)
        continue
      }
      let actualHash = sourceCache.get(sourcePath)
      if (actualHash === undefined) {
        actualHash = fetchLatestCommitHash(sourcePath)
        sourceCache.set(sourcePath, actualHash)
      }
      if (actualHash === null) {
        // source が未 commit (新規) → guard skip。新規 source は最初の commit 後に
        // refresh script で sync される
        skipped.push(`${spec.id}: source ${sourcePath} に commit 履歴なし`)
        continue
      }
      const declared = spec.lastVerifiedCommit
      if (!declared || declared.trim() === '') {
        mismatches.push({ specId: spec.id, sourcePath, declared: null, actual: actualHash })
        continue
      }
      if (declared.trim() !== actualHash) {
        mismatches.push({
          specId: spec.id,
          sourcePath,
          declared: declared.trim(),
          actual: actualHash,
        })
      }
    }

    if (skipped.length > 0) {
      console.warn(
        `[content-spec-last-verified-commit] skipped ${skipped.length} spec(s): ${skipped.join(', ')}`,
      )
    }

    const messages = mismatches.map(
      (m) =>
        `${m.specId}: lastVerifiedCommit=${m.declared ?? '<未設定>'} but source ${m.sourcePath} latest=${m.actual}.\n` +
        `    → 修正: node tools/widget-specs/refresh-last-verified.mjs (全 spec を一括再計算)`,
    )
    expect(mismatches.length, messages.join('\n')).toBe(0)
  })
})
