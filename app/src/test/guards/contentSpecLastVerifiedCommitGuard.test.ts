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
 * 環境前提 (2026-04-29 hotfix):
 *   - 本 guard は full git history を必要とする (`git log -1 -- <file>` で
 *     source file の最新 touch commit を解決するため)。
 *   - shallow clone (`fetch-depth=1` の CI 等) では `git log` が現在 HEAD しか
 *     見えず、merge commit が常に返って false-positive 一括 fail を起こす。
 *   - 本 guard は `git rev-parse --is-shallow-repository` で shallow を検出して
 *     **explicit に skip する**（黙らせない、CI workflow に `fetch-depth: 0` を
 *     指定する義務を明示する）。CI 関連 workflow は既に修正済 (.github/workflows/ci.yml)。
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

function isShallowClone(): boolean {
  try {
    const out = execSync('git rev-parse --is-shallow-repository', {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 5_000,
    })
    return out.trim() === 'true'
  } catch {
    return false
  }
}

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
    if (isShallowClone()) {
      // CI workflow が fetch-depth: 0 を指定していない場合に shallow clone となり、
      // git log -1 が merge commit のみを返して false-positive 一括 fail を起こす。
      // 本 guard はこの状態を skip し、CI workflow 修正を促す。
      // 修正: .github/workflows/ci.yml の各 actions/checkout@v4 step に
      //   `with: fetch-depth: 0` を追加する（fast-gate / docs-health / test-coverage が必須）
      console.warn(
        '[content-spec-last-verified-commit] shallow clone detected — guard skipped. ' +
          'CI workflow must specify `fetch-depth: 0` on actions/checkout@v4 ' +
          '(see .github/workflows/ci.yml fast-gate / docs-health / test-coverage steps)',
      )
      return
    }
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
      // Phase K hotfix (2026-04-29): prefix match による比較
      // git の `%h` は最小 unique abbreviation を返す。リポジトリ成長で同じ commit でも
      // 必要文字数が増える (例: 7 chars `50018d3` → 8 chars `50018d33`)。spec 生成時に
      // unique だった declared は actual の prefix であり続けるので、prefix 一致で「同じ
      // commit」と判定する。完全一致比較だと repo 成長のたびに false-positive が出る。
      const declaredTrimmed = declared.trim()
      const isSameCommit =
        actualHash.startsWith(declaredTrimmed) || declaredTrimmed.startsWith(actualHash)
      if (!isSameCommit) {
        mismatches.push({
          specId: spec.id,
          sourcePath,
          declared: declaredTrimmed,
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
