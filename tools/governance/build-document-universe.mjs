#!/usr/bin/env node
// tools/governance/build-document-universe.mjs
//
// Wave 2 / Phase 2.5 — Document Universe Index simple version generator (ADR-SCP-022 整合)
//
// 役割: repo 内 Markdown を 1 枚で articulate した分類済み索引を生成。
//   - 入力: docs/contracts/generated/markdown-inventory.generated.json (Phase 2D)
//           + docs/contracts/doc-registry.json (categories + docs)
//           + docs/contracts/generated/tree-contracts.generated.json (Phase 3-A)
//           + docs/contracts/generated/skeleton-diff.generated.json (Phase 2C/2E)
//   - 出力: docs/contracts/generated/document-universe.generated.json (= machine truth)
//           + references/04-tracking/generated/document-universe.generated.md (= 1 枚 projection)
//
// 不可侵 (ADR-SCP-022 + AAG-SCP-DOC-INDEX-001〜008 整合):
//   - simple version = observed-only / unreviewed 中心 (= Reading Pass 未実施前)
//   - promotionAllowed: false 維持 (= 索引掲載 ≠ contract 化、AAG-SCP-DOC-INDEX-002)
//   - schema (= docs/contracts/schema/document-universe.schema.json) 検証 OK
//   - deterministic (object key alphabetical sort + entry path order ascending + indent 2 + final newline)
//   - hard gate 追加なし (= Wave 2 advisory only、不可侵原則 8 整合は Wave 2 まで継続)
//
// 起動: `node tools/governance/build-document-universe.mjs` (repo root から実行)

import {
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
} from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')

const require = createRequire(resolve(REPO_ROOT, 'app/package.json'))
const Ajv = require('ajv')

const MARKDOWN_INVENTORY_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/generated/markdown-inventory.generated.json',
)
const DOC_REGISTRY_PATH = resolve(REPO_ROOT, 'docs/contracts/doc-registry.json')
const TREE_CONTRACTS_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/generated/tree-contracts.generated.json',
)
const SCHEMA_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/schema/document-universe.schema.json',
)
const JSON_OUTPUT_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/generated/document-universe.generated.json',
)
const MD_OUTPUT_PATH = resolve(
  REPO_ROOT,
  'references/04-tracking/generated/document-universe.generated.md',
)

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

// indexSection mapping (= Phase 2.5 simple version、Reading Pass 後段で articulate に更新)
function deriveIndexSection(path) {
  if (path === 'README.md') return 'repository-entrypoints'
  if (path === 'CLAUDE.md') return 'repository-entrypoints'
  if (path === 'CHANGELOG.md') return 'repository-entrypoints'
  if (path === 'CURRENT_PROJECT.md') return 'repository-entrypoints'

  if (/\.generated\.md$/.test(path)) {
    if (path.startsWith('references/04-tracking/generated/')) {
      return 'tracking-generated'
    }
    return 'generated-other'
  }

  if (path.startsWith('references/01-foundation/')) return 'foundation'
  if (path.startsWith('references/02-design-system/')) return 'design-system'
  if (path.startsWith('references/03-implementation/')) return 'implementation'
  if (path.startsWith('references/04-tracking/')) return 'tracking'
  if (path.startsWith('references/05-aag-interface/')) return 'aag-interface'
  if (path.startsWith('references/99-archive/')) return 'archive'
  if (path === 'references/README.md') return 'tree-readers'

  if (path.startsWith('projects/active/')) return 'active-projects'
  if (path.startsWith('projects/completed/')) return 'completed-projects'
  if (path.startsWith('projects/_template/')) return 'project-templates'
  if (path === 'projects/README.md') return 'tree-readers'

  if (path.startsWith('aag/_internal/')) return 'aag-framework-internal'
  if (path.startsWith('aag/scp-checkers/')) return 'aag-scp-checkers'
  if (path.startsWith('aag/')) return 'aag-framework'

  if (path.startsWith('aag-engine/')) return 'aag-engine'
  if (path.startsWith('docs/contracts/')) return 'contracts'
  if (path.startsWith('docs/')) return 'docs-other'

  if (path.startsWith('app/')) return 'app-internal'
  if (path.startsWith('tools/')) return 'tools'
  if (path.startsWith('wasm/')) return 'wasm'
  if (path.startsWith('roles/')) return 'roles'
  if (path.startsWith('workers/')) return 'workers'
  if (path.startsWith('app-domain/')) return 'app-domain'
  if (path.startsWith('fixtures/')) return 'fixtures'
  if (path.startsWith('scripts/')) return 'scripts'

  return 'unmanaged'
}

// kind heuristic (= Phase 2.5 simple version、Reading Pass + Phase 4 doc-kind-registry で更新)
function deriveKind(path, registryDocs) {
  if (path === 'README.md') return 'repo-entrypoint'
  if (path === 'CLAUDE.md') return 'repo-entrypoint'
  if (path === 'CHANGELOG.md') return 'repo-entrypoint'

  if (/\.generated\.md$/.test(path)) return 'generated-report'

  if (path.startsWith('references/99-archive/')) return 'archive-doc'
  if (path.startsWith('projects/completed/')) return 'archive-doc'

  // projects/<status>/<id>/{plan,checklist,AI_CONTEXT,HANDOFF,decision-audit,projectization,discovery-log}.md
  if (
    /^projects\/(active|completed|_template)\/[^/]+\/(plan|checklist|AI_CONTEXT|HANDOFF|decision-audit|projectization|discovery-log)\.md$/.test(
      path,
    )
  ) {
    return 'project-plan'
  }
  // projects/<status>/<id>/inquiry/*.md / derived/*.md
  if (/^projects\/(active|completed)\/[^/]+\/(inquiry|derived)\//.test(path)) {
    return 'project-plan'
  }

  if (registryDocs.has(path)) return 'canonical-doc'

  return 'unknown'
}

// documentStatus heuristic (= Phase 2.5 simple version)
function deriveDocumentStatus(path, registryDocs) {
  if (/\.generated\.md$/.test(path)) return 'generated'
  if (path.startsWith('references/99-archive/')) return 'archive'
  if (path.startsWith('projects/completed/')) return 'archive'
  if (registryDocs.has(path)) return 'declared'
  return 'observed-only'
}

// temporalScope heuristic (= Phase 2.5 simple version、unreviewed 中心)
function deriveTemporalScope(path) {
  if (/\.generated\.md$/.test(path)) return 'computed-current'
  // Reading Pass 未実施 = unreviewed 維持 (= 温存方針、AAG-SCP-DOC-RESET-002 整合)
  return 'unreviewed'
}

function deriveContractStatus(path, registryDocs) {
  if (registryDocs.has(path)) return 'declared'
  return 'unreviewed'
}

function deriveSource(path, registryDocs) {
  if (registryDocs.has(path)) return 'doc-registry'
  return 'markdown-inventory'
}

// href = path from references/04-tracking/generated/ to entry path
function deriveHref(path) {
  // references/04-tracking/generated/document-universe.generated.md からの相対 = ../../../<path>
  return relative('references/04-tracking/generated', path).replace(/\\/g, '/')
}

function buildEntry(invEntry, registryDocs) {
  const path = invEntry.path
  return {
    path,
    href: deriveHref(path),
    indexSection: deriveIndexSection(path),
    documentStatus: deriveDocumentStatus(path, registryDocs),
    kind: deriveKind(path, registryDocs),
    temporalScope: deriveTemporalScope(path),
    contractStatus: deriveContractStatus(path, registryDocs),
    meaningStatus: 'unknown',
    intentStatus: 'unknown',
    continuityStatus: 'unreviewed',
    source: deriveSource(path, registryDocs),
    promotionAllowed: false,
  }
}

function summarize(entries) {
  const bySection = {}
  const byKind = {}
  const byDocumentStatus = {}
  const byContractStatus = {}
  for (const e of entries) {
    bySection[e.indexSection] = (bySection[e.indexSection] || 0) + 1
    byKind[e.kind] = (byKind[e.kind] || 0) + 1
    byDocumentStatus[e.documentStatus] = (byDocumentStatus[e.documentStatus] || 0) + 1
    byContractStatus[e.contractStatus] = (byContractStatus[e.contractStatus] || 0) + 1
  }
  return {
    totalEntries: entries.length,
    bySection,
    byKind,
    byDocumentStatus,
    byContractStatus,
  }
}

function buildMarkdownProjection(output) {
  const { entries, summary, metadata } = output
  const lines = []
  lines.push('# Document Universe Index (generated)')
  lines.push('')
  lines.push(
    '> **役割**: AAG SCP Wave 2 / Phase 2.5 simple version。repo 内 Markdown を 1 枚で articulate した分類済み索引。Reading Pass 未実施前は observed-only / unreviewed 中心、`promotionAllowed: false` 維持 (= 索引掲載 ≠ contract 化、AAG-SCP-DOC-INDEX-002 整合)。',
  )
  lines.push('>')
  lines.push(
    '> 正本: `docs/contracts/generated/document-universe.generated.json` (= machine truth、本ファイルは projection)',
  )
  lines.push('')
  lines.push(`**generated**: ${metadata.generatedAt} — sourceSha: \`${metadata.sourceSha}\``)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`- Total entries: **${summary.totalEntries}**`)
  lines.push('')
  lines.push('### By Index Section')
  lines.push('')
  lines.push('| Section | Count |')
  lines.push('|---|---|')
  for (const [k, v] of Object.entries(summary.bySection).sort()) {
    lines.push(`| ${k} | ${v} |`)
  }
  lines.push('')
  lines.push('### By Kind (heuristic、Reading Pass 後段で articulate に更新)')
  lines.push('')
  lines.push('| Kind | Count |')
  lines.push('|---|---|')
  for (const [k, v] of Object.entries(summary.byKind).sort()) {
    lines.push(`| ${k} | ${v} |`)
  }
  lines.push('')
  lines.push('### By Document Status')
  lines.push('')
  lines.push('| Status | Count |')
  lines.push('|---|---|')
  for (const [k, v] of Object.entries(summary.byDocumentStatus).sort()) {
    lines.push(`| ${k} | ${v} |`)
  }
  lines.push('')
  lines.push('### By Contract Status')
  lines.push('')
  lines.push('| Status | Count |')
  lines.push('|---|---|')
  for (const [k, v] of Object.entries(summary.byContractStatus).sort()) {
    lines.push(`| ${k} | ${v} |`)
  }
  lines.push('')
  lines.push('## Entries')
  lines.push('')
  lines.push(
    '> **注**: 各 entry の `kind` / `temporalScope` / `meaningStatus` / `intentStatus` / `continuityStatus` は Phase 2.5 simple version では heuristic / unknown / unreviewed が中心。Reading Pass 後段 (Wave 2 内) で articulate に更新される。',
  )
  lines.push('')

  // Group by indexSection
  const bySection = {}
  for (const e of entries) {
    if (!bySection[e.indexSection]) bySection[e.indexSection] = []
    bySection[e.indexSection].push(e)
  }

  for (const section of Object.keys(bySection).sort()) {
    const sectionEntries = bySection[section].sort((a, b) => a.path.localeCompare(b.path))
    lines.push(`### ${section} (${sectionEntries.length})`)
    lines.push('')
    lines.push('| Path | Kind | Status | Contract | Source |')
    lines.push('|---|---|---|---|---|')
    for (const e of sectionEntries) {
      lines.push(
        `| [\`${e.path}\`](${e.href}) | ${e.kind} | ${e.documentStatus} | ${e.contractStatus} | ${e.source} |`,
      )
    }
    lines.push('')
  }

  return lines.join('\n') + '\n'
}

// scope filter: repo 内 Markdown のうち Universe Index に含めるもの (= ADR-SCP-022 D3 整合)
//   - README.md / CHANGELOG.md / CLAUDE.md / CURRENT_PROJECT.md (= top-level)
//   - references/**/*.md
//   - projects/**/*.md
//   - docs/**/*.md (contracts 含む)
//   - aag/**/*.md
//   - aag-engine/**/*.md
//   - roles/**/*.md (out-of-skeleton も含めて articulate)
//   - tools/**/*.md (Phase 2.5 で含める = governance 関連 doc が混在)
//   - workers/**/*.md (out-of-skeleton も articulate)
// 除外:
//   - app/**/*.md (= ADR-SCP-022 D3 で「Wave 2 後段判断」articulate、Phase 2.5 simple version では未対象)
//   - wasm/**/*.md (= internal build output / test fixture が大半、Wave 2 後段で判断)
//   - node_modules / dist 等 (= git ls-files が gitignore 除外)
function isInScope(path) {
  if (!path.endsWith('.md')) return false
  if (path.startsWith('app/')) return false
  if (path.startsWith('wasm/')) return false
  if (path.startsWith('app-domain/')) return false
  if (path.startsWith('fixtures/')) return false
  if (path.startsWith('scripts/')) return false
  return true
}

function listRepoMarkdown() {
  const out = execSync("git ls-files '*.md'", {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
  return out
    .trim()
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && isInScope(p))
}

function main() {
  const sha = getCurrentSha()
  const generatedAt = new Date().toISOString()

  // load inputs
  const inv = JSON.parse(readFileSync(MARKDOWN_INVENTORY_PATH, 'utf8'))
  const reg = JSON.parse(readFileSync(DOC_REGISTRY_PATH, 'utf8'))

  // build registry doc path set
  const registryDocs = new Set()
  for (const cat of Object.values(reg.categories || {})) {
    for (const doc of cat.docs || []) {
      if (doc.path) registryDocs.add(doc.path)
    }
  }

  // markdown-inventory path set (= managed-zone-3 entries で contractStatus / candidateKind 等 articulate 済)
  const inventoryPaths = new Set(inv.entries.map((e) => e.path))

  // repo 全体の Markdown を git ls-files で列挙 (= Universe Index は markdown-inventory より broad scope)
  const allMarkdown = listRepoMarkdown()

  const entries = allMarkdown
    .map((path) => buildEntry({ path, _inInventory: inventoryPaths.has(path) }, registryDocs))
    .sort((a, b) => a.path.localeCompare(b.path))

  const summary = summarize(entries)

  const output = {
    schemaVersion: 'document-universe-v1',
    metadata: {
      generatedAt,
      sourceSha: sha,
      sourcePaths: [
        'docs/contracts/generated/markdown-inventory.generated.json',
        'docs/contracts/doc-registry.json',
        'docs/contracts/generated/tree-contracts.generated.json',
        'git ls-files \'*.md\' (= universe scope は markdown-inventory より broad)',
      ],
    },
    entries,
    summary,
  }

  // schema validate
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'))
  const ajv = new Ajv({ allErrors: true, strict: false })
  const validate = ajv.compile(schema)
  if (!validate(output)) {
    console.error('SCHEMA VALIDATION FAILED:')
    console.error(JSON.stringify(validate.errors, null, 2))
    process.exit(1)
  }

  // write JSON
  if (!existsSync(dirname(JSON_OUTPUT_PATH))) {
    mkdirSync(dirname(JSON_OUTPUT_PATH), { recursive: true })
  }
  writeFileSync(JSON_OUTPUT_PATH, deterministicStringify(output))

  // write Markdown projection
  if (!existsSync(dirname(MD_OUTPUT_PATH))) {
    mkdirSync(dirname(MD_OUTPUT_PATH), { recursive: true })
  }
  writeFileSync(MD_OUTPUT_PATH, buildMarkdownProjection(output))

  // log
  console.log(`Wrote ${toPosixPath(relative(REPO_ROOT, JSON_OUTPUT_PATH))}`)
  console.log(`Wrote ${toPosixPath(relative(REPO_ROOT, MD_OUTPUT_PATH))}`)
  console.log(`  totalEntries: ${summary.totalEntries}`)
  console.log(`  bySection (top 8):`)
  for (const [k, v] of Object.entries(summary.bySection)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)) {
    console.log(`    ${k}: ${v}`)
  }
  console.log(`  byKind:`)
  for (const [k, v] of Object.entries(summary.byKind).sort()) {
    console.log(`    ${k}: ${v}`)
  }
  console.log(`  byDocumentStatus:`)
  for (const [k, v] of Object.entries(summary.byDocumentStatus).sort()) {
    console.log(`    ${k}: ${v}`)
  }
}

main()
