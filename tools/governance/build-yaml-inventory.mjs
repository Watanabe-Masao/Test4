#!/usr/bin/env node
// tools/governance/build-yaml-inventory.mjs
//
// Wave 1 / Phase 2D — managed-zone YAML inventory generator
//
// 役割: managed zone 3 件 (projects/ + references/04-tracking/ + docs/contracts/) 配下の
// YAML ファイルを **observed-only** で articulate する Parse2 file-level inventory generator。
// candidateYamlKind は 5 分類 (declaration / inventory / generated-input / legacy / unknown) で
// **heuristic な candidate** を articulate (= declared / approved を意味しない)。Phase 3 advisory
// checker が doc-kind-registry / authoring source policy と join して role-mismatch を articulate
// するための入力データを提供する。
//
// 出力: docs/contracts/generated/yaml-inventory.generated.json
//
// 不可侵 (ADR-SCP-019 D6 + AAG-SCP-PARSE2-002 整合):
//   - foul / hard gate 追加しない
//   - finding emit しない (= Parse2 = 入力整備、Phase 3 で消費)
//   - すべての entry に observed: true / inventoryStatus: "observed-only" /
//     contractStatus: "unreviewed" / promotionAllowed: false / preservationAssumed: false
//
// candidateYamlKind 5 分類 (D8.5 + AAG-SCP-PARSE2-005 整合):
//   - declaration: docs/contracts/src/** 配下 (= authoring source、Tree Contract / doc-kind-registry 系)
//   - inventory: references/04-tracking/*-inventory.yaml / taxonomy-review-journal.yaml 等
//     (= 観測データの YAML 表現)
//   - generated-input: 後続 generator の input として消費される YAML
//     (Wave 1 では heuristic として `*-input.yaml` のみ。Wave 2+ で精密化)
//   - legacy: archive / legacy marker を含む path
//   - unknown: 上記いずれにも該当しない
//
// 起動: `node tools/governance/build-yaml-inventory.mjs` (repo root から実行)
//
// schema integrity (不可侵原則 1 整合):
//   - schemaVersion: 'yaml-inventory-v1'
//   - metadata block (sourceSha / sourcePaths / generatedAt) 必須
//
// deterministic:
//   - object key alphabetical sort + array sort by path (localeCompare)
//   - indent 2 spaces + final newline
//   - generatedAt は再実行で変動

import {
  readdirSync,
  statSync,
  readFileSync,
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
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'yaml-inventory.generated.json')

const MANAGED_ZONES = ['projects', 'references/04-tracking', 'docs/contracts']

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

function walkRecursive(absRoot) {
  const out = []
  function recurse(absDir) {
    let dirEntries
    try {
      dirEntries = readdirSync(absDir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of dirEntries) {
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) {
        if (shouldSkipDir(entry.name)) continue
        recurse(join(absDir, entry.name))
      } else if (entry.isFile()) {
        out.push(join(absDir, entry.name))
      }
    }
  }
  recurse(absRoot)
  return out
}

function extractTopKey(absPath) {
  let text
  try {
    text = readFileSync(absPath, 'utf8')
  } catch {
    return null
  }
  const lines = text.split(/\r?\n/)
  for (const raw of lines) {
    if (!raw) continue
    if (raw.startsWith('#')) continue
    if (raw.startsWith('---')) continue
    if (raw.startsWith(' ') || raw.startsWith('\t')) continue
    const m = raw.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:/)
    if (m) return m[1]
  }
  return null
}

function classifyYaml(relPath) {
  const p = relPath
  if (p.startsWith('docs/contracts/src/')) return 'declaration'
  if (/-input\.ya?ml$/.test(p)) return 'generated-input'
  if (/(^|\/)(archive|legacy)(\/|-|\.)/.test(p)) return 'legacy'
  if (p.startsWith('references/04-tracking/')) {
    if (/-inventory\.ya?ml$/.test(p)) return 'inventory'
    if (/-journal\.ya?ml$/.test(p)) return 'inventory'
    return 'unknown'
  }
  return 'unknown'
}

function buildEntry(absPath) {
  const relPath = toPosixPath(relative(REPO_ROOT, absPath))
  let size = 0
  try {
    size = statSync(absPath).size
  } catch {
    size = 0
  }
  const topKey = extractTopKey(absPath)
  const candidateYamlKind = classifyYaml(relPath)
  return {
    path: relPath,
    size,
    topKey,
    candidateYamlKind,
    observed: true,
    inventoryStatus: 'observed-only',
    contractStatus: 'unreviewed',
    promotionAllowed: false,
    preservationAssumed: false,
  }
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

  const entries = []
  for (const zone of MANAGED_ZONES) {
    const absZone = resolve(REPO_ROOT, zone)
    if (!existsSync(absZone)) continue
    const files = walkRecursive(absZone)
    for (const abs of files) {
      if (!abs.endsWith('.yaml') && !abs.endsWith('.yml')) continue
      entries.push(buildEntry(abs))
    }
  }
  entries.sort((a, b) => a.path.localeCompare(b.path))

  const kindHistogram = {}
  for (const e of entries) {
    kindHistogram[e.candidateYamlKind] = (kindHistogram[e.candidateYamlKind] || 0) + 1
  }
  const sortedHistogram = {}
  for (const k of Object.keys(kindHistogram).sort()) {
    sortedHistogram[k] = kindHistogram[k]
  }

  const summary = {
    totalEntries: entries.length,
    candidateYamlKindHistogram: sortedHistogram,
  }

  const output = {
    schemaVersion: 'yaml-inventory-v1',
    scope: 'managed-zone-3',
    metadata: {
      sourceSha,
      sourcePaths: MANAGED_ZONES.map((z) => `${z}/`),
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
  console.log(`  scope: managed-zone-3`)
  console.log(`  sourceSha: ${sourceSha}`)
  console.log(`  totalEntries: ${summary.totalEntries}`)
  for (const [k, v] of Object.entries(sortedHistogram)) {
    console.log(`    ${k}: ${v}`)
  }
}

main()
