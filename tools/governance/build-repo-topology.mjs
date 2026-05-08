#!/usr/bin/env node
// tools/governance/build-repo-topology.mjs
//
// Wave 1 / Phase 2B — repo topology parser (refactored, top-level-only)
//
// 役割: repo の top-level entries (directories + files) を **observed-only** として articulate する Parse2 generator。
// Structural Skeleton (= docs/contracts/src/repo/tree-contracts.yaml) との差分 (= skeleton-diff) は Phase 2C で
// 別 generator (build-skeleton-diff.mjs) が articulate する。本 generator は **生 observation のみ** を responsability。
//
// 出力: docs/contracts/generated/repo-topology.generated.json
//
// 不可侵 (Wave 1 / Phase 2 + ADR-SCP-019 整合):
//   - foul / hard gate 追加しない
//   - finding emit しない (= 入力データの整備のみ、Phase 2C+ で消費)
//   - すべての entry に observed: true / inventoryStatus: "observed-only" を articulate
//   - declared / contracted / approved を意味する field を含めない (AAG-SCP-MEANING-002 + AAG-SCP-PARSE2-002 整合)
//   - generated JSON は inventory 系のみ
//
// Phase 2B refactor (ADR-SCP-019 D6 整合):
//   - 旧 scope = managed-zone-4 (top-level + projects/ + references/04-tracking/ + docs/contracts/、4 zone 横断、881 entries) を
//     scope = top-level-only (top-level 1-level walk のみ、~30 entries 想定) に narrow
//   - 再帰 zone (projects/ + references/04-tracking/ + docs/contracts/) は削除、Phase 2D で file-level inventory として再実装
//   - entry に observed: true / inventoryStatus: "observed-only" field 追加 (approval 誤認 + 現状維持誤認 構造的排除)
//   - 旧 zones[] structure (= 4 zone 配列) を flat entries[] に simplify (Phase 2C skeleton-diff の comparison 入力として最適化)
//
// 起動: `node tools/governance/build-repo-topology.mjs` (repo root から実行)
//
// schema integrity (不可侵原則 1 + ADR-SCP-016 整合):
//   - schemaVersion: 'repo-topology-v1' (schema 自体は同一、scope 値変更 + entry shape 拡張)
//   - metadata block (sourceSha / sourcePaths / generatedAt) 必須
//
// deterministic (= 同 commit で再実行しても content 安定):
//   - object key alphabetical sort
//   - array sort by `path` (lexicographic)
//   - indent 2 spaces
//   - final newline
//   - generatedAt は再実行で変動 (= 不可侵原則 1 metadata 仕様)

import {
  readdirSync,
  statSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from 'node:fs'
import { resolve, relative, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')
const OUTPUT_DIR = resolve(REPO_ROOT, 'docs/contracts/generated')
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'repo-topology.generated.json')

// Skip patterns (build artifacts / VCS、top-level walk でも除外)
const SKIP_DIR_NAMES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.cache',
  '.parcel-cache',
  'target',
  '.turbo',
  '.wasm-pack',
])

function shouldSkipDir(name) {
  return SKIP_DIR_NAMES.has(name)
}

function getCurrentSha() {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'unknown'
  }
}

function toPosixPath(p) {
  return p.replace(/\\/g, '/')
}

function walkTopLevel() {
  const entries = []
  let dirEntries
  try {
    dirEntries = readdirSync(REPO_ROOT, { withFileTypes: true })
  } catch (e) {
    return entries
  }
  for (const entry of dirEntries) {
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory() && shouldSkipDir(entry.name)) continue
    const fullPath = join(REPO_ROOT, entry.name)
    const relPath = toPosixPath(relative(REPO_ROOT, fullPath))
    if (entry.isDirectory()) {
      entries.push({
        path: `${relPath}/`,
        type: 'directory',
        depth: 1,
        observed: true,
        inventoryStatus: 'observed-only',
      })
    } else if (entry.isFile()) {
      let size = 0
      try {
        size = statSync(fullPath).size
      } catch {
        size = 0
      }
      entries.push({
        path: relPath,
        type: 'file',
        depth: 1,
        size,
        observed: true,
        inventoryStatus: 'observed-only',
      })
    }
  }
  return entries
}

function deterministicStringify(obj) {
  function sortKeys(value) {
    if (Array.isArray(value)) {
      return value.map(sortKeys)
    }
    if (value && typeof value === 'object') {
      const sorted = {}
      for (const key of Object.keys(value).sort()) {
        sorted[key] = sortKeys(value[key])
      }
      return sorted
    }
    return value
  }
  return JSON.stringify(sortKeys(obj), null, 2) + '\n'
}

function main() {
  const sourceSha = getCurrentSha()
  const generatedAt = new Date().toISOString()

  const entries = walkTopLevel()
  // sort entries by path for deterministic output
  entries.sort((a, b) => a.path.localeCompare(b.path))

  const summary = {
    totalEntries: entries.length,
    observedDirectories: entries.filter((e) => e.type === 'directory').length,
    observedFiles: entries.filter((e) => e.type === 'file').length,
  }

  const output = {
    schemaVersion: 'repo-topology-v1',
    scope: 'top-level-only',
    metadata: {
      sourceSha,
      sourcePaths: ['.'],
      generatedAt,
    },
    entries,
    summary,
  }

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  writeFileSync(OUTPUT_PATH, deterministicStringify(output))
  console.log(`Wrote ${toPosixPath(relative(REPO_ROOT, OUTPUT_PATH))}`)
  console.log(`  scope: top-level-only`)
  console.log(`  sourceSha: ${sourceSha}`)
  console.log(`  totalEntries: ${summary.totalEntries}`)
  console.log(`    observedDirectories: ${summary.observedDirectories}`)
  console.log(`    observedFiles: ${summary.observedFiles}`)
}

main()
