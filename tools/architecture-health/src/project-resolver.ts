/**
 * Project Resolver — active project の参照点を 1 箇所に集約する
 *
 * 目的:
 * - collector / health 系ツールが `projects/<project-id>/...` の直書きをやめ、
 *   active project の overlay 位置を resolver 経由で取得する。
 * - project 切替時の修正点をこのファイルに限定する。
 *
 * 解決フロー:
 *   1. `CURRENT_PROJECT.md` から active project id を抽出
 *   2. `projects/<id>/config/project.json` を読む
 *   3. overlayRoot / overlayEntry / projectRoot 等を返す
 *
 * @responsibility R:utility
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface ActiveProject {
  /** プロジェクト識別子（例: "pure-calculation-reorg"） */
  readonly projectId: string
  /** repo root からの相対パス（例: "projects/pure-calculation-reorg"） */
  readonly projectRoot: string
  /** overlay ルート（例: "projects/pure-calculation-reorg/aag"） */
  readonly overlayRoot: string
  /** execution overlay ファイルの相対パス */
  readonly overlayEntry: string
  /** project root の絶対パス */
  readonly absProjectRoot: string
  /** overlay root の絶対パス */
  readonly absOverlayRoot: string
  /** overlay entry ファイルの絶対パス */
  readonly absOverlayEntry: string
}

interface ProjectManifest {
  readonly projectId: string
  readonly projectRoot?: string
  readonly overlayRoot?: string
  readonly overlayEntry?: string
}

const CURRENT_PROJECT_FILE = 'CURRENT_PROJECT.md'

/**
 * CURRENT_PROJECT.md から active project id を抽出する。
 * フォーマット: `active: <project-id>` 行を探す。
 */
function readActiveProjectId(repoRoot: string): string {
  const filePath = resolve(repoRoot, CURRENT_PROJECT_FILE)
  const content = readFileSync(filePath, 'utf-8')
  const match = content.match(/^active:\s*([^\s]+)\s*$/m)
  if (!match) {
    throw new Error(
      `[project-resolver] Failed to parse active project id from ${CURRENT_PROJECT_FILE}. ` +
        `Expected "active: <project-id>" line.`,
    )
  }
  return match[1]
}

/**
 * project.json を読み取り、manifest を返す。
 */
function readProjectManifest(repoRoot: string, projectId: string): ProjectManifest {
  const manifestPath = resolve(repoRoot, 'projects', projectId, 'config', 'project.json')
  const raw = readFileSync(manifestPath, 'utf-8')
  const parsed = JSON.parse(raw) as ProjectManifest
  if (parsed.projectId !== projectId) {
    throw new Error(
      `[project-resolver] projectId mismatch in ${manifestPath}: ` +
        `expected "${projectId}", got "${parsed.projectId}".`,
    )
  }
  return parsed
}

/**
 * active project の参照情報を取得する。
 *
 * collectors / health ツールはこの関数経由で overlay 位置を取得すること。
 * 直接 `projects/pure-calculation-reorg/...` を書いてはならない。
 */
export function resolveActiveProject(repoRoot: string): ActiveProject {
  const projectId = readActiveProjectId(repoRoot)
  const manifest = readProjectManifest(repoRoot, projectId)

  const projectRoot = manifest.projectRoot ?? `projects/${projectId}`
  const overlayRoot = manifest.overlayRoot ?? `${projectRoot}/aag`
  const overlayEntry = manifest.overlayEntry ?? `${overlayRoot}/execution-overlay.ts`

  return {
    projectId,
    projectRoot,
    overlayRoot,
    overlayEntry,
    absProjectRoot: resolve(repoRoot, projectRoot),
    absOverlayRoot: resolve(repoRoot, overlayRoot),
    absOverlayEntry: resolve(repoRoot, overlayEntry),
  }
}
