#!/usr/bin/env node
/**
 * Phase K Option 1 (2026-04-29): 全 spec の `lastVerifiedCommit` を source file の
 * 最新 commit hash と一致させる。
 *
 * 動作:
 *   1. references/05-contents/{widgets,read-models,calculations,charts,ui-components}/*.md
 *      を走査
 *   2. 各 spec の `sourceRef` (widget は `registrySource`) を読み取り
 *   3. `git log -1 --format=%h -- <source>` で最新 commit の短縮 hash を取得
 *   4. spec の `lastVerifiedCommit:` 行を更新
 *
 * `contentSpecLastVerifiedCommitGuard` (AR-CONTENT-SPEC-LAST-VERIFIED-COMMIT) の
 * 修正経路として動作。
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(__dirname, '../..')
const SPECS_BASE = resolve(REPO_ROOT, 'references/05-contents')
const SPEC_DIRS = ['widgets', 'read-models', 'calculations', 'charts', 'ui-components']

function getSourceFromFrontmatter(frontmatter) {
  // widget kind uses `registrySource:` field; others use `sourceRef:`
  const kindMatch = frontmatter.match(/^kind:\s*(\S+)/m)
  const kind = kindMatch?.[1]?.trim() ?? ''
  if (kind === 'widget') {
    const m = frontmatter.match(/^registrySource:\s*(\S+)/m)
    return m?.[1]?.trim() ?? ''
  }
  const m = frontmatter.match(/^sourceRef:\s*(\S+)/m)
  return m?.[1]?.trim() ?? ''
}

function fetchLatestCommit(sourcePath) {
  if (sourcePath === '') return null
  const fullPath = resolve(REPO_ROOT, sourcePath)
  if (!existsSync(fullPath)) return null
  try {
    // Phase K hotfix v2 (2026-04-29): full SHA (`%H`) を使用。短縮 hash (`%h`) は
    // repo 成長で長さが変動 + prefix 衝突で false-negative リスクがあるため、
    // commit identity の保証には full 40-char SHA を spec frontmatter に記録する。
    const out = execSync(`git log -1 --format=%H -- "${sourcePath}"`, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 10_000,
    })
    return out.trim() || null
  } catch {
    return null
  }
}

let totalChanged = 0
let totalSkipped = 0
const sourceCache = new Map()

for (const dir of SPEC_DIRS) {
  const fullDir = resolve(SPECS_BASE, dir)
  if (!existsSync(fullDir)) continue
  const files = readdirSync(fullDir).filter((f) => /^[A-Z]+(?:-\d{3})\.md$/.test(f))
  for (const f of files) {
    const filePath = resolve(fullDir, f)
    const original = readFileSync(filePath, 'utf-8')
    const fmMatch = original.match(/^---\n([\s\S]*?)\n---/)
    if (!fmMatch) continue
    const frontmatter = fmMatch[1]
    const sourcePath = getSourceFromFrontmatter(frontmatter)
    if (sourcePath === '') {
      totalSkipped++
      continue
    }
    let actual = sourceCache.get(sourcePath)
    if (actual === undefined) {
      actual = fetchLatestCommit(sourcePath)
      sourceCache.set(sourcePath, actual)
    }
    if (actual === null) {
      console.log(`skip ${f.replace(/\.md$/, '')}: source ${sourcePath} に commit 履歴なし`)
      totalSkipped++
      continue
    }
    const declaredMatch = frontmatter.match(/^lastVerifiedCommit:\s*(\S+)/m)
    const declared = declaredMatch?.[1]?.trim() ?? ''
    if (declared === actual) continue
    const updated = original.replace(
      /^lastVerifiedCommit:\s*\S*/m,
      `lastVerifiedCommit: ${actual}`,
    )
    if (updated === original) {
      // lastVerifiedCommit field 自体が無い → frontmatter 末尾に追加するべきだが、
      // 現状の generator は field を必ず生成するので no-op
      console.warn(`warn: ${f}: lastVerifiedCommit field not found, generator 実行を推奨`)
      continue
    }
    writeFileSync(filePath, updated, 'utf-8')
    totalChanged++
    console.log(`update ${f.replace(/\.md$/, '')}: ${declared || '<未設定>'} → ${actual}`)
  }
}

console.log(`\nrefreshed ${totalChanged} spec(s), skipped ${totalSkipped}`)
