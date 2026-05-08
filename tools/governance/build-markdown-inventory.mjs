#!/usr/bin/env node
// tools/governance/build-markdown-inventory.mjs
//
// Wave 1 / Phase 2D — managed-zone Markdown inventory generator
//
// 役割: managed zone 3 件 (projects/ + references/04-tracking/ + docs/contracts/) 配下の
// Markdown ファイルを **observed-only** で articulate する Parse2 file-level inventory generator。
// Phase 2B (top-level-only repo-topology) では届かない file-level の現実を表面化させ、Phase 3 advisory
// checker が doc-kind-registry と join して missing-doc / orphan-doc / kind-mismatch を articulate
// するための入力データを提供する。
//
// 出力: docs/contracts/generated/markdown-inventory.generated.json
//
// 不可侵 (ADR-SCP-019 D6 + AAG-SCP-PARSE2-002 整合):
//   - foul / hard gate 追加しない
//   - finding emit しない (= Parse2 = 入力整備、Phase 3 で消費)
//   - すべての entry に observed: true / inventoryStatus: "observed-only" /
//     contractStatus: "unreviewed" / promotionAllowed: false / preservationAssumed: false
//   - candidateKind は **heuristic な candidate** であり、declared / approved を意味しない
//     (= 実 doc-kind 宣言は doc-kind-registry.yaml で別 PR、user 判断対象)
//
// candidateKind heuristic (D8.5 + AAG-SCP-MEANING-002 整合):
//   - generated-report: file 名末尾 `.generated.md`
//   - archive-doc: projects/completed/** 配下
//   - project-plan / project-checklist / project-decision-audit / project-projectization /
//     project-handoff / project-ai-context / project-discovery-log: projects/active/<id>/
//     直下の規約 file 名 (= projects/_template/ にも同様パターン)
//   - project-derived: projects/<state>/<id>/derived/** 配下
//   - project-inquiry: projects/<state>/<id>/inquiry/** 配下
//   - project-archive-summary: projects/completed/<id>/ARCHIVE.md or SUMMARY.md
//   - project-template: projects/_template/** 配下
//   - tracking-report: references/04-tracking/ 配下 (非 generated)
//   - contract-doc: docs/contracts/ 配下 (= 既存 Layer 4 contract doc)
//   - unknown: 上記いずれにも該当しない
//
// 起動: `node tools/governance/build-markdown-inventory.mjs` (repo root から実行)
//
// schema integrity (不可侵原則 1 整合):
//   - schemaVersion: 'markdown-inventory-v1'
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
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'markdown-inventory.generated.json')

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

function extractTopHeading(absPath) {
  let text
  try {
    text = readFileSync(absPath, 'utf8')
  } catch {
    return null
  }
  // first ATX H1 (^# ) — ignore code blocks, but Wave 1 MVP では fence 厳密検出はしない
  const lines = text.split(/\r?\n/)
  let inFence = false
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = line.match(/^#\s+(.+?)\s*$/)
    if (m) return m[1].trim()
  }
  return null
}

function classifyMarkdown(relPath) {
  const p = relPath
  if (/\.generated\.md$/.test(p)) return 'generated-report'
  if (p.startsWith('projects/_template/')) {
    if (p === 'projects/_template/plan.md') return 'project-template'
    if (p === 'projects/_template/checklist.md') return 'project-template'
    return 'project-template'
  }
  if (p.startsWith('projects/completed/')) {
    if (/\/ARCHIVE\.md$/.test(p) || /\/SUMMARY\.md$/.test(p)) {
      return 'project-archive-summary'
    }
    return 'archive-doc'
  }
  const activeMatch = p.match(/^projects\/active\/([^/]+)\/(.+)$/)
  if (activeMatch) {
    const tail = activeMatch[2]
    if (tail === 'plan.md') return 'project-plan'
    if (tail === 'checklist.md') return 'project-checklist'
    if (tail === 'decision-audit.md') return 'project-decision-audit'
    if (tail === 'projectization.md') return 'project-projectization'
    if (tail === 'HANDOFF.md') return 'project-handoff'
    if (tail === 'AI_CONTEXT.md') return 'project-ai-context'
    if (tail === 'discovery-log.md') return 'project-discovery-log'
    if (tail === 'DERIVED.md') return 'project-derived-index'
    if (tail.startsWith('derived/')) return 'project-derived'
    if (tail.startsWith('inquiry/')) return 'project-inquiry'
    return 'project-other'
  }
  if (p === 'projects/README.md') return 'tree-readme'
  if (/^projects\/[^/]+\/README\.md$/.test(p)) return 'tree-readme'
  if (p.startsWith('references/04-tracking/')) {
    if (/\/README\.md$/.test(p)) return 'tree-readme'
    return 'tracking-report'
  }
  if (p.startsWith('docs/contracts/')) {
    if (/\/README\.md$/.test(p)) return 'tree-readme'
    return 'contract-doc'
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
  const topHeading = extractTopHeading(absPath)
  const candidateKind = classifyMarkdown(relPath)
  return {
    path: relPath,
    size,
    topHeading,
    candidateKind,
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
      if (!abs.endsWith('.md')) continue
      entries.push(buildEntry(abs))
    }
  }
  entries.sort((a, b) => a.path.localeCompare(b.path))

  // candidateKind 集計 (deterministic order)
  const kindHistogram = {}
  for (const e of entries) {
    kindHistogram[e.candidateKind] = (kindHistogram[e.candidateKind] || 0) + 1
  }
  const sortedHistogram = {}
  for (const k of Object.keys(kindHistogram).sort()) {
    sortedHistogram[k] = kindHistogram[k]
  }

  const summary = {
    totalEntries: entries.length,
    candidateKindHistogram: sortedHistogram,
  }

  const output = {
    schemaVersion: 'markdown-inventory-v1',
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
