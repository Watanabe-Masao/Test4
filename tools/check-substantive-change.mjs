#!/usr/bin/env node
/**
 * check-substantive-change.mjs
 *
 * Phase K Option 1 後続の F (obligation false-positive 改善、2026-04-29):
 * pre-push hook の `check_principles_json` 等で、generated section のみの変更を
 * obligation トリガーから除外するための CLI helper。
 *
 * 動作:
 *   入力 (CLI 引数):
 *     <file-path> <push-range>
 *   出力 (exit code):
 *     0 = substantive change なし (= GENERATED:START/END 内の変更だけ、obligation skip 推奨)
 *     1 = substantive change あり (= 手書き部分が変わった、obligation 必要)
 *     2 = 取得失敗 (新規ファイル等、安全側で 1 と同等扱いを推奨)
 *
 * 例:
 *   node tools/check-substantive-change.mjs references/01-principles/foo.md HEAD~1..HEAD
 *
 * 共有 logic:
 *   tools/architecture-health/src/collectors/obligation-collector.ts の
 *   `stripGeneratedSections` / `isGeneratedSectionOnlyChange` と同じ判定。
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

function stripGeneratedSections(content) {
  return content.replace(/<!-- GENERATED:START [^>]*-->[\s\S]*?<!-- GENERATED:END [^>]*-->/g, '')
}

function getOldContent(filePath, range) {
  // range が "A..B" / "A...B" 形式なら base 側の SHA を使用
  const baseMatch = range.match(/^([^.]+)\.{2,3}/)
  const baseRef = baseMatch ? baseMatch[1] : range
  try {
    return execSync(`git show ${baseRef}:${filePath}`, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 10_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    return null
  }
}

const [, , filePath, range] = process.argv
if (!filePath || !range) {
  process.stderr.write('usage: check-substantive-change.mjs <file-path> <push-range>\n')
  process.exit(2)
}

const fullPath = resolve(REPO_ROOT, filePath)
if (!existsSync(fullPath)) {
  // 新規/削除等。安全側で「substantive change あり」扱い。
  process.exit(1)
}

const newContent = readFileSync(fullPath, 'utf-8')

// generated section マーカーがなければ「全体が手書き」扱い → substantive change
if (!newContent.includes('<!-- GENERATED:START ')) {
  process.exit(1)
}

const oldContent = getOldContent(filePath, range)
if (oldContent === null) {
  // 旧 version 取得失敗 (新規ファイル等)。安全側で substantive change あり扱い。
  process.exit(2)
}

const oldStripped = stripGeneratedSections(oldContent).trim()
const newStripped = stripGeneratedSections(newContent).trim()

// 手書き部分が同じ = generated section のみの変更 = obligation skip 可
if (oldStripped === newStripped) {
  process.exit(0)
}
process.exit(1)
