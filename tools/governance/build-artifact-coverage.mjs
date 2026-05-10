#!/usr/bin/env node
// tools/governance/build-artifact-coverage.mjs
//
// Wave 3 / Phase 9 sub-PR 1 — Artifact Coverage Matrix generator
//
// 役割: docs/contracts/src/governance/artifact-coverage.yaml (= classification rules) を入力に、
// repo を walk + 各 artifact を 6 category (declared / generated / archived / external /
// temporary-with-expiry / ignored-with-reason) に分類 + unmanaged artifact を articulate。
// machine truth = artifact-coverage.generated.json、human view = .generated.md。
//
// 不可侵 (ADR-SCP-021 + plan.md Wave 3 / Phase 9 + 不可侵原則 11 整合):
//   - 初期は inventory only (= 全 artifact 分類)、次 phase で new-only gate
//   - pre-write 強制機構なし
//   - exit code 0 維持 (= advisory)
//
// 出力:
//   - docs/contracts/generated/artifact-coverage.generated.json
//   - references/04-tracking/generated/artifact-coverage.generated.md

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')

const require = createRequire(resolve(REPO_ROOT, 'app/package.json'))
const yaml = require('js-yaml')
const Ajv = require('ajv')

const COVERAGE_PATH = resolve(REPO_ROOT, 'docs/contracts/src/governance/artifact-coverage.yaml')
const SCHEMA_PATH = resolve(REPO_ROOT, 'docs/contracts/schema/artifact-coverage.schema.json')
const OUTPUT_JSON = resolve(REPO_ROOT, 'docs/contracts/generated/artifact-coverage.generated.json')
const OUTPUT_MD = resolve(REPO_ROOT, 'references/04-tracking/generated/artifact-coverage.generated.md')

function getCurrentSha() {
  try {
    return execSync('git rev-parse HEAD', { cwd: REPO_ROOT, encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

function deterministicStringify(obj) {
  function sortKeys(value) {
    if (Array.isArray(value)) return value.map(sortKeys)
    if (value && typeof value === 'object') {
      const sorted = {}
      for (const k of Object.keys(value).sort()) sorted[k] = sortKeys(value[k])
      return sorted
    }
    return value
  }
  return JSON.stringify(sortKeys(obj), null, 2) + '\n'
}

// ----------------------------------------------------------------------------
// Step 1: Load + validate authoring source
// ----------------------------------------------------------------------------

const coverageDoc = yaml.load(readFileSync(COVERAGE_PATH, 'utf8'))
const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'))
const ajv = new Ajv({ allErrors: true, strict: false })
const validate = ajv.compile(schema)
if (!validate(coverageDoc)) {
  console.error('coverage authoring source schema validation FAILED:')
  console.error(JSON.stringify(validate.errors, null, 2))
  process.exit(1)
}

// ----------------------------------------------------------------------------
// Step 2: Get all tracked files via git ls-files (= avoid scanning .git, node_modules, etc.)
// ----------------------------------------------------------------------------

const trackedFiles = execSync('git ls-files', { cwd: REPO_ROOT, encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter((f) => f.length > 0)

// ----------------------------------------------------------------------------
// Step 3: Classify each tracked file using rules
// ----------------------------------------------------------------------------

function patternMatches(pattern, path) {
  // Simple matching: directory prefix (trailing /) or exact path or simple glob (*)
  if (pattern.endsWith('/')) {
    return path.startsWith(pattern)
  }
  if (pattern.includes('*')) {
    // wasm/*/pkg/ → match e.g. wasm/foo/pkg/bar
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]+')
    const regex = new RegExp(`^${escaped}`)
    return regex.test(path)
  }
  return path === pattern
}

const classifications = []
const unmanagedFiles = []
const categoryCount = {
  declared: 0,
  generated: 0,
  archived: 0,
  external: 0,
  'temporary-with-expiry': 0,
  'ignored-with-reason': 0,
  unmanaged: 0,
}

for (const file of trackedFiles) {
  let matched = null
  for (const rule of coverageDoc.rules) {
    if (patternMatches(rule.pathPattern, file)) {
      matched = rule
      break
    }
  }
  if (matched) {
    categoryCount[matched.category] += 1
    classifications.push({ path: file, category: matched.category, ruleApplied: matched.pathPattern })
  } else {
    categoryCount.unmanaged += 1
    unmanagedFiles.push(file)
    classifications.push({ path: file, category: 'unmanaged', ruleApplied: null })
  }
}

// ----------------------------------------------------------------------------
// Step 4: Aggregate unmanaged by zone (= top-level dir)
// ----------------------------------------------------------------------------

const unmanagedByZone = {}
for (const f of unmanagedFiles) {
  const zone = f.split('/')[0] ?? '(root)'
  unmanagedByZone[zone] = (unmanagedByZone[zone] ?? 0) + 1
}
const unmanagedByZoneSorted = Object.entries(unmanagedByZone)
  .sort((a, b) => b[1] - a[1])
  .map(([zone, count]) => ({ zone, count }))

// ----------------------------------------------------------------------------
// Step 5: Compute summary
// ----------------------------------------------------------------------------

const summary = {
  totalRules: coverageDoc.rules.length,
  totalTrackedFiles: trackedFiles.length,
  ...categoryCount,
  managedFiles: trackedFiles.length - categoryCount.unmanaged,
  unmanagedFilesPercent: (
    (categoryCount.unmanaged / trackedFiles.length) *
    100
  ).toFixed(1),
}

// ----------------------------------------------------------------------------
// Step 6: Emit .generated.json
// ----------------------------------------------------------------------------

const sha = getCurrentSha()
const generatedAt = new Date().toISOString()

const output = {
  $comment:
    'machine-generated by tools/governance/build-artifact-coverage.mjs — DO NOT EDIT',
  schemaVersion: coverageDoc.schemaVersion,
  stage: coverageDoc.stage,
  generatedAt,
  generatedAtSha: sha,
  inputSources: {
    coverage: 'docs/contracts/src/governance/artifact-coverage.yaml',
  },
  summary,
  unmanagedByZone: unmanagedByZoneSorted,
  // Don't emit full classifications array (too large) — emit unmanaged only
  unmanagedFiles: unmanagedFiles.slice().sort(),
}

mkdirSync(dirname(OUTPUT_JSON), { recursive: true })
writeFileSync(OUTPUT_JSON, deterministicStringify(output))

// ----------------------------------------------------------------------------
// Step 7: Emit .generated.md
// ----------------------------------------------------------------------------

const lines = []
lines.push('# Artifact Coverage Matrix (machine view)')
lines.push('')
lines.push(
  '> 機械生成。手で編集しない。authoring source = `docs/contracts/src/governance/artifact-coverage.yaml`、',
)
lines.push('> generator = `tools/governance/build-artifact-coverage.mjs`。')
lines.push('> Wave 3 advisory: 違反検出は warning のみ、CI fail なし。')
lines.push('')
lines.push(`- 生成: ${generatedAt}`)
lines.push(`- generatedAtSha: \`${sha}\``)
lines.push(`- schemaVersion: \`${coverageDoc.schemaVersion}\``)
lines.push(`- stage: \`${coverageDoc.stage}\``)
lines.push('')

lines.push('## Summary')
lines.push('')
lines.push(`- Total rules: ${summary.totalRules}`)
lines.push(`- Total tracked files (= git ls-files): ${summary.totalTrackedFiles}`)
lines.push(`- Managed files: ${summary.managedFiles}`)
lines.push(`- **Unmanaged files: ${summary.unmanaged}** (= ${summary.unmanagedFilesPercent}%)`)
lines.push('')

lines.push('## By Category')
lines.push('')
lines.push('| category | count |')
lines.push('|---|---|')
for (const cat of [
  'declared',
  'generated',
  'archived',
  'external',
  'temporary-with-expiry',
  'ignored-with-reason',
  'unmanaged',
]) {
  lines.push(`| \`${cat}\` | ${categoryCount[cat]} |`)
}
lines.push('')

lines.push('## Unmanaged by Zone')
lines.push('')
if (unmanagedByZoneSorted.length === 0) {
  lines.push('_(none — all tracked files classified)_')
} else {
  lines.push('| zone | count |')
  lines.push('|---|---|')
  for (const u of unmanagedByZoneSorted) {
    lines.push(`| \`${u.zone}/\` | ${u.count} |`)
  }
}
lines.push('')

if (unmanagedFiles.length > 0 && unmanagedFiles.length <= 100) {
  lines.push('## Unmanaged Files (full list)')
  lines.push('')
  for (const f of unmanagedFiles.slice().sort()) {
    lines.push(`- \`${f}\``)
  }
} else if (unmanagedFiles.length > 100) {
  lines.push('## Unmanaged Files (first 50 + last 50 sample)')
  lines.push('')
  lines.push(`> Full list (${unmanagedFiles.length}) in JSON output.`)
  lines.push('')
  const sorted = unmanagedFiles.slice().sort()
  for (const f of sorted.slice(0, 50)) lines.push(`- \`${f}\``)
  lines.push(`- _...(${unmanagedFiles.length - 100} more)..._`)
  for (const f of sorted.slice(-50)) lines.push(`- \`${f}\``)
}
lines.push('')

mkdirSync(dirname(OUTPUT_MD), { recursive: true })
writeFileSync(OUTPUT_MD, lines.join('\n'))

// ----------------------------------------------------------------------------
// Step 8: Console summary
// ----------------------------------------------------------------------------

console.log(`artifact-coverage.generated.json written: ${OUTPUT_JSON}`)
console.log(`artifact-coverage.generated.md written: ${OUTPUT_MD}`)
console.log('')
console.log('Summary:')
console.log(`  totalRules: ${summary.totalRules}`)
console.log(`  totalTrackedFiles: ${summary.totalTrackedFiles}`)
console.log(`  managedFiles: ${summary.managedFiles}`)
console.log(`  unmanaged: ${summary.unmanaged} (${summary.unmanagedFilesPercent}%)`)
console.log('')
console.log('By category:')
for (const [cat, count] of Object.entries(categoryCount)) {
  console.log(`  ${cat}: ${count}`)
}
console.log('')
console.log('Top unmanaged zones:')
for (const u of unmanagedByZoneSorted.slice(0, 10)) {
  console.log(`  ${u.zone}/: ${u.count}`)
}
