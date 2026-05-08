#!/usr/bin/env node
// tools/governance/build-repo-topology.mjs
//
// Wave 1 / Phase 2 sub-PR 1 — repo topology inventory generator
//
// 役割: managed zone 4 件 (top-level tree + projects/ + references/04-tracking/ + docs/contracts/) を
// 探索し、各 entry の path / type / size / depth を articulate した JSON を生成。
//
// 出力: docs/contracts/generated/repo-topology.generated.json
//
// 不可侵 (Wave 1 / Phase 2 整合):
//   - foul / hard gate 追加しない
//   - finding emit しない (= 入力データの整備のみ、Phase 3+ で消費)
//   - generated JSON は inventory 系のみ
//
// 起動: `node tools/governance/build-repo-topology.mjs` (repo root から実行)
//
// schema integrity (不可侵原則 1 + ADR-SCP-016 整合):
//   - schemaVersion: 'repo-topology-v1'
//   - metadata block (sourceSha / sourcePaths / generatedAt) 必須
//
// deterministic (= 同 commit で再実行しても content 安定):
//   - object key alphabetical sort
//   - array sort by `path` (lexicographic)
//   - indent 2 spaces
//   - final newline
//   - generatedAt は再実行で変動 (= 不可侵原則 1 metadata 仕様、本 generator では現実時刻を articulate)

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

const ZONES = [
  { id: 'top-level-tree', rootPath: '.', walkPolicy: '1-level' },
  { id: 'projects', rootPath: 'projects', walkPolicy: 'recursive' },
  {
    id: 'references-tracking',
    rootPath: 'references/04-tracking',
    walkPolicy: 'recursive',
  },
  {
    id: 'docs-contracts',
    rootPath: 'docs/contracts',
    walkPolicy: 'recursive',
  },
]

// Skip patterns for recursive walks (build artifacts / VCS / temp dirs)
const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.git',
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

function walkOneLevel(rootPath) {
  const fullRoot = resolve(REPO_ROOT, rootPath)
  const entries = []
  let dirEntries
  try {
    dirEntries = readdirSync(fullRoot, { withFileTypes: true })
  } catch (e) {
    return entries
  }
  for (const entry of dirEntries) {
    if (entry.isSymbolicLink()) continue
    const fullPath = join(fullRoot, entry.name)
    const relPath = toPosixPath(relative(REPO_ROOT, fullPath))
    if (entry.isDirectory()) {
      entries.push({
        path: `${relPath}/`,
        type: 'directory',
        depth: 1,
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
      })
    }
  }
  return entries
}

function walkRecursive(rootPath) {
  const fullRoot = resolve(REPO_ROOT, rootPath)
  const entries = []

  function walk(currentPath, depth) {
    let dirEntries
    try {
      dirEntries = readdirSync(currentPath, { withFileTypes: true })
    } catch (e) {
      return
    }
    for (const entry of dirEntries) {
      if (entry.isSymbolicLink()) continue
      const fullPath = join(currentPath, entry.name)
      const relPath = toPosixPath(relative(REPO_ROOT, fullPath))
      if (entry.isDirectory()) {
        if (shouldSkipDir(entry.name)) continue
        entries.push({
          path: `${relPath}/`,
          type: 'directory',
          depth,
        })
        walk(fullPath, depth + 1)
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
          depth,
          size,
        })
      }
    }
  }

  walk(fullRoot, 1)
  return entries
}

function deterministicStringify(obj) {
  // object key alphabetical sort (array order preserved — caller sorts arrays explicitly)
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

  const zones = ZONES.map((zone) => {
    let entries
    if (zone.walkPolicy === '1-level') {
      entries = walkOneLevel(zone.rootPath)
    } else {
      entries = walkRecursive(zone.rootPath)
    }
    // sort entries by path for deterministic output
    entries.sort((a, b) => a.path.localeCompare(b.path))
    return {
      id: zone.id,
      rootPath: zone.rootPath,
      walkPolicy: zone.walkPolicy,
      entries,
    }
  })

  const summary = {
    totalEntries: zones.reduce((acc, z) => acc + z.entries.length, 0),
    byZone: Object.fromEntries(zones.map((z) => [z.id, z.entries.length])),
  }

  const output = {
    schemaVersion: 'repo-topology-v1',
    scope: 'managed-zone-4',
    metadata: {
      sourceSha,
      sourcePaths: ZONES.map((z) => z.rootPath),
      generatedAt,
    },
    zones,
    summary,
  }

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  writeFileSync(OUTPUT_PATH, deterministicStringify(output))
  console.log(`Wrote ${toPosixPath(relative(REPO_ROOT, OUTPUT_PATH))}`)
  console.log(`  sourceSha: ${sourceSha}`)
  console.log(`  totalEntries: ${summary.totalEntries}`)
  for (const [id, count] of Object.entries(summary.byZone)) {
    console.log(`  ${id}: ${count}`)
  }
}

main()
