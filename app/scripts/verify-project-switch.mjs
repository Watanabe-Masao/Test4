/**
 * Verify Project Switch — project 切替後の整合性チェック
 *
 * 目的:
 *   CURRENT_PROJECT.md を書き換えた直後に、resolver / alias / overlay 位置が
 *   整合している状態を機械的に検証する。
 *   P-03「切替の副作用が暗黙」への対処（aag-format-redesign）。
 *
 * 検証項目:
 *   1. CURRENT_PROJECT.md から active project id を抽出できる
 *   2. projects/<id>/config/project.json が実在し projectId が一致する
 *   3. overlay root（aag/execution-overlay.ts）が実在する
 *   4. AI_CONTEXT / HANDOFF / plan / checklist が実在する
 *   5. vite/vitest の alias 解決先（resolve-project-overlay.mjs）と一致する
 *
 * 使い方:
 *   cd app && node scripts/verify-project-switch.mjs
 *   cd app && npm run verify:project
 *
 * 終了コード:
 *   0: PASS
 *   1: FAIL（項目ごとにエラーを表示）
 *
 * @see projects/aag-format-redesign/current-state-survey.md P-03
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveProjectOverlayRoot } from './resolve-project-overlay.mjs'

const __filename = fileURLToPath(import.meta.url)
const APP_DIR = resolve(__filename, '../..')
const REPO_ROOT = resolve(APP_DIR, '..')

const errors = []
const info = []

function fail(msg) {
  errors.push(msg)
}

function note(msg) {
  info.push(msg)
}

// 1. CURRENT_PROJECT.md
const currentProjectPath = resolve(REPO_ROOT, 'CURRENT_PROJECT.md')
if (!existsSync(currentProjectPath)) {
  fail(`CURRENT_PROJECT.md が存在しません: ${currentProjectPath}`)
} else {
  const content = readFileSync(currentProjectPath, 'utf-8')
  const match = content.match(/^active:\s*([^\s]+)\s*$/m)
  if (!match) {
    fail('CURRENT_PROJECT.md から "active: <id>" を抽出できません')
  } else {
    const projectId = match[1]
    note(`active project: ${projectId}`)

    // 2. project.json
    const manifestPath = resolve(REPO_ROOT, 'projects', projectId, 'config', 'project.json')
    if (!existsSync(manifestPath)) {
      fail(`project.json が存在しません: ${manifestPath}`)
    } else {
      let manifest
      try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      } catch (e) {
        fail(`project.json のパースに失敗: ${e.message}`)
      }
      if (manifest) {
        if (manifest.projectId !== projectId) {
          fail(
            `project.json の projectId "${manifest.projectId}" が CURRENT_PROJECT.md の "${projectId}" と一致しません`,
          )
        } else {
          note(`project.json PASS: ${manifest.title ?? '(no title)'}`)
        }

        // 3. overlay entry
        const overlayEntry =
          manifest.overlayEntry ?? `projects/${projectId}/aag/execution-overlay.ts`
        const overlayAbs = resolve(REPO_ROOT, overlayEntry)
        if (!existsSync(overlayAbs)) {
          fail(`overlay entry が存在しません: ${overlayEntry}`)
        } else {
          note(`overlay entry PASS: ${overlayEntry}`)
        }

        // 4. entrypoints
        const entrypoints = manifest.entrypoints ?? {}
        for (const [key, rel] of Object.entries(entrypoints)) {
          const abs = resolve(REPO_ROOT, rel)
          if (!existsSync(abs)) {
            fail(`entrypoint.${key} が存在しません: ${rel}`)
          }
        }
        if (entrypoints.aiContext && entrypoints.handoff && entrypoints.plan && entrypoints.checklist) {
          note(`entrypoints PASS (AI_CONTEXT / HANDOFF / plan / checklist)`)
        }

        // parent field（optional）
        if (manifest.parent) {
          const parentConfig = resolve(
            REPO_ROOT,
            'projects',
            manifest.parent,
            'config',
            'project.json',
          )
          const parentCompletedConfig = resolve(
            REPO_ROOT,
            'projects/completed',
            manifest.parent,
            'config',
            'project.json',
          )
          if (!existsSync(parentConfig) && !existsSync(parentCompletedConfig)) {
            fail(`parent '${manifest.parent}' が実在しません（active / completed いずれにも未配置）`)
          } else {
            note(`subproject parent: ${manifest.parent}`)
          }
        }
      }
    }

    // 5. alias 解決との整合
    try {
      const aliasRoot = resolveProjectOverlayRoot(APP_DIR)
      const expectedRoot = resolve(REPO_ROOT, 'projects', projectId, 'aag')
      if (aliasRoot !== expectedRoot) {
        fail(
          `vite/vitest alias 解決先 '${aliasRoot}' が期待値 '${expectedRoot}' と一致しません`,
        )
      } else {
        note(`alias resolution PASS: @project-overlay → ${aliasRoot}`)
      }
    } catch (e) {
      fail(`alias resolution に失敗: ${e.message}`)
    }
  }
}

// 結果表示
console.log('')
console.log('─── verify:project ───')
for (const line of info) console.log(`  ✓ ${line}`)
if (errors.length > 0) {
  console.log('')
  console.error('─── FAIL ───')
  for (const e of errors) console.error(`  ✗ ${e}`)
  console.error('')
  console.error('P-03 の検証順序を実行してください: `verify:project` → `test:guards` → `docs:check` → `lint` → `build`')
  process.exit(1)
}
console.log('')
console.log('PASS: CURRENT_PROJECT / manifest / overlay / alias 整合性 OK')
process.exit(0)
