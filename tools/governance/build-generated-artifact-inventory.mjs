#!/usr/bin/env node
// tools/governance/build-generated-artifact-inventory.mjs
//
// Wave 1 / Phase 2D — managed-zone generated-artifact inventory generator
//
// 役割: managed zone 3 件 (projects/ + references/04-tracking/ + docs/contracts/) 配下の
// 機械生成 artifact (= `*.generated.*` suffix もしくは `*/generated/` 配下) を **observed-only** で
// articulate する Parse2 file-level inventory generator。
// producerCandidate は **heuristic な candidate** であり、producerDeclared は false (= 生成元 tool の
// 正式宣言は Wave 3 producer-registry で別 PR、user 判断対象)。Phase 3 advisory checker が
// orphan-generated / un-declared-producer を articulate するための入力データを提供する。
//
// 出力: docs/contracts/generated/generated-artifact-inventory.generated.json
//
// 不可侵 (ADR-SCP-019 D6 + AAG-SCP-PARSE2-002 整合):
//   - foul / hard gate 追加しない
//   - finding emit しない (= Parse2 = 入力整備、Phase 3 で消費)
//   - すべての entry に observed: true / inventoryStatus: "observed-only" /
//     contractStatus: "unreviewed" / promotionAllowed: false / preservationAssumed: false /
//     producerDeclared: false
//
// 検出 rule (D8.5 + AAG-SCP-PARSE2-005 整合):
//   - file 名末尾 `.generated.*`
//   - もしくは path に `/generated/` segment を含む
//
// producerCandidate heuristic (Wave 1 MVP):
//   - docs/contracts/generated/repo-topology.generated.json → tools/governance/build-repo-topology.mjs
//   - docs/contracts/generated/skeleton-diff.generated.json → tools/governance/build-skeleton-diff.mjs
//   - docs/contracts/generated/markdown-inventory.generated.json → tools/governance/build-markdown-inventory.mjs
//   - docs/contracts/generated/yaml-inventory.generated.json → tools/governance/build-yaml-inventory.mjs
//   - docs/contracts/generated/generated-artifact-inventory.generated.json →
//       tools/governance/build-generated-artifact-inventory.mjs
//   - references/04-tracking/generated/architecture-health.* / project-health.* /
//     architecture-state-snapshot.* / aag-size-statistics.* / 等 → tools/architecture-health/
//   - 上記いずれにも該当しない → unknown
//
// 起動: `node tools/governance/build-generated-artifact-inventory.mjs` (repo root から実行)
//
// schema integrity (不可侵原則 1 整合):
//   - schemaVersion: 'generated-artifact-inventory-v1'
//   - metadata block (sourceSha / sourcePaths / generatedAt) 必須
//
// deterministic:
//   - object key alphabetical sort + array sort by path (localeCompare)
//   - indent 2 spaces + final newline
//   - generatedAt は再実行で変動

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
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'generated-artifact-inventory.generated.json')

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

// 出力 file 自体を含めると、自己参照の size が再実行ごとに振動 (size→size 増分→size 増分の増分…) し
// determinism が崩れる。Wave 1 MVP では output 自身を inventory から除外する (= self-reference loop break)。
// 他 generator (build-markdown-inventory / build-yaml-inventory) は output が `.generated.json` で別 file
// だが、`generated/` segment 包含により本 inventory には含まれる (= 自己除外は OUTPUT_PATH のみ)。
const OUTPUT_REL_FOR_SELF_EXCLUDE = 'docs/contracts/generated/generated-artifact-inventory.generated.json'

function isGeneratedArtifact(relPath) {
  if (relPath === OUTPUT_REL_FOR_SELF_EXCLUDE) return false
  if (/\.generated\./.test(relPath)) return true
  if (/(^|\/)generated\//.test(relPath)) return true
  return false
}

function detectionReason(relPath) {
  const reasons = []
  if (/\.generated\./.test(relPath)) reasons.push('generated-suffix')
  if (/(^|\/)generated\//.test(relPath)) reasons.push('generated-segment')
  return reasons
}

function classifyProducerCandidate(relPath) {
  const explicitMap = {
    'docs/contracts/generated/repo-topology.generated.json':
      'tools/governance/build-repo-topology.mjs',
    'docs/contracts/generated/skeleton-diff.generated.json':
      'tools/governance/build-skeleton-diff.mjs',
    'docs/contracts/generated/markdown-inventory.generated.json':
      'tools/governance/build-markdown-inventory.mjs',
    'docs/contracts/generated/yaml-inventory.generated.json':
      'tools/governance/build-yaml-inventory.mjs',
    'docs/contracts/generated/generated-artifact-inventory.generated.json':
      'tools/governance/build-generated-artifact-inventory.mjs',
  }
  if (explicitMap[relPath]) return explicitMap[relPath]
  if (relPath.startsWith('references/04-tracking/generated/')) {
    return 'tools/architecture-health'
  }
  if (relPath.startsWith('references/04-tracking/dashboards/') && /\.generated\.md$/.test(relPath)) {
    return 'tools/architecture-health'
  }
  if (
    /^references\/04-tracking\/elements\/.+\.generated\.md$/.test(relPath)
  ) {
    return 'tools/architecture-health'
  }
  if (relPath === 'references/04-tracking/recent-changes.generated.md') {
    return 'tools/architecture-health'
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
  return {
    path: relPath,
    size,
    detectionReason: detectionReason(relPath),
    producerCandidate: classifyProducerCandidate(relPath),
    producerDeclared: false,
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
      const relPath = toPosixPath(relative(REPO_ROOT, abs))
      if (!isGeneratedArtifact(relPath)) continue
      entries.push(buildEntry(abs))
    }
  }
  entries.sort((a, b) => a.path.localeCompare(b.path))

  const producerHistogram = {}
  for (const e of entries) {
    producerHistogram[e.producerCandidate] =
      (producerHistogram[e.producerCandidate] || 0) + 1
  }
  const sortedProducerHistogram = {}
  for (const k of Object.keys(producerHistogram).sort()) {
    sortedProducerHistogram[k] = producerHistogram[k]
  }

  const summary = {
    totalEntries: entries.length,
    producerCandidateHistogram: sortedProducerHistogram,
    unknownProducerCount: producerHistogram['unknown'] || 0,
  }

  const output = {
    schemaVersion: 'generated-artifact-inventory-v1',
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
  console.log(`  unknownProducerCount: ${summary.unknownProducerCount}`)
  for (const [k, v] of Object.entries(sortedProducerHistogram)) {
    console.log(`    ${k}: ${v}`)
  }
}

main()
