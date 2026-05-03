/**
 * Resolve Project Overlay — vite / vitest alias 解決用
 *
 * 目的:
 *   `@project-overlay/*` alias のターゲットを静的に書かず、
 *   CURRENT_PROJECT.md + projects/<id>/config/project.json から解決する。
 *
 * なぜ必要か:
 *   project 切替時の修正点を「CURRENT_PROJECT.md の 1 行」に閉じる。
 *   vite.config.ts / vitest.config.ts / tools/architecture-health は
 *   すべてこの解決点を経由する。
 *
 * 使い方:
 *   import { resolveProjectOverlayRoot } from './scripts/resolve-project-overlay.mjs'
 *   const overlayRoot = resolveProjectOverlayRoot(__dirname)
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * CURRENT_PROJECT.md から active project id を抽出する。
 * @param {string} repoRoot repo root の絶対パス
 * @returns {string} active project id
 */
function readActiveProjectId(repoRoot) {
  const filePath = resolve(repoRoot, 'CURRENT_PROJECT.md')
  const content = readFileSync(filePath, 'utf-8')
  const match = content.match(/^active:\s*([^\s]+)\s*$/m)
  if (!match) {
    throw new Error(
      '[resolve-project-overlay] Failed to parse active project id from CURRENT_PROJECT.md. ' +
        'Expected "active: <project-id>" line.',
    )
  }
  return match[1]
}

/**
 * @param {string} appDir app/ ディレクトリの絶対パス
 * @returns {string} overlay root の絶対パス
 */
export function resolveProjectOverlayRoot(appDir) {
  const repoRoot = resolve(appDir, '..')
  const projectId = readActiveProjectId(repoRoot)
  // R6b (DA-α-007b、2026-05-03): projects/active/<id>/ split に対応。
  // active/ 配下を優先 lookup、なければ旧 projects/<id>/ (backward compat)。
  const activeManifestPath = resolve(repoRoot, 'projects', 'active', projectId, 'config', 'project.json')
  const legacyManifestPath = resolve(repoRoot, 'projects', projectId, 'config', 'project.json')
  const manifestPath = existsSync(activeManifestPath) ? activeManifestPath : legacyManifestPath
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  const overlayRoot = manifest.overlayRoot ?? `projects/active/${projectId}/aag`
  return resolve(repoRoot, overlayRoot)
}

/**
 * tsconfig.app.json の "include" 用に、overlay ディレクトリ配下の全 ts を
 * 指す glob を返す（app/ ディレクトリからの相対パス）。
 * @param {string} appDir
 * @returns {string}
 */
export function resolveProjectOverlayInclude(appDir) {
  const abs = resolveProjectOverlayRoot(appDir)
  const appAbs = resolve(appDir)
  // Path relative from appDir (e.g. "../projects/<id>/aag")
  let rel = abs.startsWith(appAbs)
    ? abs.slice(appAbs.length + 1)
    : `../${abs.slice(resolve(appDir, '..').length + 1)}`
  return `${rel}/**/*.ts`
}
