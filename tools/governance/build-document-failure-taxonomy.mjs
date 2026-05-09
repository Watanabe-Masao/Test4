#!/usr/bin/env node
// tools/governance/build-document-failure-taxonomy.mjs
//
// Wave 2 / Phase 2.5 sub-PR 9 — Document Failure Taxonomy generator
//
// 役割: docs/contracts/src/docs/document-failure-taxonomy.yaml (= curated 10 patterns) と
// docs/contracts/src/docs/document-reading-decisions.yaml (= Reading Pass 結果) を入力に、
// per-pattern observed count / observed paths を auto-compute、maturityHint の machine 計算版を
// articulate、unregistered DOC-FAIL-* (= reading-decisions で使用されているが taxonomy 未登録) を
// surface する。Failure Learning Loop infrastructure 着地。
//
// 不可侵 (ADR-SCP-021 D7 + AAG-SCP-DOC-LEARNING-002 整合):
//   - 即 Gate 化禁止 (= advisory only、未登録 pattern 検出は warning)
//   - authoring source の input は machine 改変禁止 (= curated taxonomy 維持)
//   - .generated.json に machine-derived block (= derived) を独立 articulate
//   - maturityHint の input 値は preserve、computedMaturity を別 field として併走
//
// 出力:
//   - docs/contracts/generated/document-failure-taxonomy.generated.json
//   - references/04-tracking/generated/document-failure-taxonomy.generated.md
//
// computed maturity promotion ルール (= ratchet-down 自動化、CLAUDE.md G8 整合):
//   - observedCount == 0 → input maturityHint preserve
//   - observedCount 1-4 → max(input, 'observed')
//   - observedCount >= 5 → max(input, 'guardrail-candidate-emitted')
//   - 上記は「promote のみ」(= input より maturity が下がることはない)
//
// 起動: `node tools/governance/build-document-failure-taxonomy.mjs` (repo root から実行)

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

const TAXONOMY_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/src/docs/document-failure-taxonomy.yaml',
)
const TAXONOMY_SCHEMA_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/schema/document-failure-taxonomy.schema.json',
)
const DECISIONS_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/src/docs/document-reading-decisions.yaml',
)
const OUTPUT_JSON_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/generated/document-failure-taxonomy.generated.json',
)
const OUTPUT_MD_PATH = resolve(
  REPO_ROOT,
  'references/04-tracking/generated/document-failure-taxonomy.generated.md',
)

// maturity 順序 (= 5 段階 progression、index で大小比較)
const MATURITY_ORDER = [
  'pattern-articulated',
  'observed',
  'guardrail-candidate-emitted',
  'guardrail-shadow',
  'guardrail-advisory',
]

function maturityRank(m) {
  const i = MATURITY_ORDER.indexOf(m)
  return i >= 0 ? i : 0
}

function maxMaturity(...candidates) {
  return candidates.reduce((acc, c) =>
    maturityRank(c) > maturityRank(acc) ? c : acc,
  )
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
// Step 1: Load + validate taxonomy authoring source
// ----------------------------------------------------------------------------

if (!existsSync(TAXONOMY_PATH)) {
  console.error(`taxonomy authoring source not found: ${TAXONOMY_PATH}`)
  process.exit(1)
}

const taxonomyDoc = yaml.load(readFileSync(TAXONOMY_PATH, 'utf8'))
const taxonomySchema = JSON.parse(readFileSync(TAXONOMY_SCHEMA_PATH, 'utf8'))
const ajv = new Ajv({ allErrors: true, strict: false })
const validateTaxonomy = ajv.compile(taxonomySchema)
if (!validateTaxonomy(taxonomyDoc)) {
  console.error('taxonomy authoring source schema validation FAILED:')
  console.error(JSON.stringify(validateTaxonomy.errors, null, 2))
  process.exit(1)
}

// ----------------------------------------------------------------------------
// Step 2: Load reading-decisions and aggregate per-pattern observations
// ----------------------------------------------------------------------------

const decisionsDoc = yaml.load(readFileSync(DECISIONS_PATH, 'utf8'))
const decisions = decisionsDoc.entries ?? []

// pattern id → { count, paths: Set, dispositions: Set }
const observed = new Map()
for (const entry of decisions) {
  const patterns = entry.failurePatterns ?? []
  for (const pid of patterns) {
    if (!observed.has(pid)) {
      observed.set(pid, {
        count: 0,
        paths: new Set(),
        dispositions: new Set(),
      })
    }
    const slot = observed.get(pid)
    slot.count += 1
    slot.paths.add(entry.path)
    if (entry.disposition) slot.dispositions.add(entry.disposition)
  }
}

// ----------------------------------------------------------------------------
// Step 3: Build derived block per pattern + detect unregistered
// ----------------------------------------------------------------------------

const registeredIds = new Set(taxonomyDoc.patterns.map((p) => p.id))

const enrichedPatterns = taxonomyDoc.patterns.map((p) => {
  const obs = observed.get(p.id)
  const observedCount = obs?.count ?? 0
  const observedPaths = obs ? [...obs.paths].sort() : []
  const observedDispositions = obs ? [...obs.dispositions].sort() : []

  let computedMaturity = p.maturityHint
  if (observedCount >= 5) {
    computedMaturity = maxMaturity(computedMaturity, 'guardrail-candidate-emitted')
  } else if (observedCount >= 1) {
    computedMaturity = maxMaturity(computedMaturity, 'observed')
  }

  return {
    ...p,
    derived: {
      observedCount,
      observedPaths,
      observedDispositions,
      computedMaturity,
      guardCandidateEligible: observedCount >= 5,
      maturityPromoted: computedMaturity !== p.maturityHint,
    },
  }
})

const unregisteredInUse = []
for (const pid of observed.keys()) {
  if (!registeredIds.has(pid)) {
    const obs = observed.get(pid)
    unregisteredInUse.push({
      id: pid,
      observedCount: obs.count,
      observedPaths: [...obs.paths].sort(),
    })
  }
}
unregisteredInUse.sort((a, b) => b.observedCount - a.observedCount)

// ----------------------------------------------------------------------------
// Step 4: Compute summary
// ----------------------------------------------------------------------------

const byComputedMaturity = {}
for (const m of MATURITY_ORDER) byComputedMaturity[m] = 0
for (const p of enrichedPatterns) {
  byComputedMaturity[p.derived.computedMaturity] =
    (byComputedMaturity[p.derived.computedMaturity] ?? 0) + 1
}

const summary = {
  totalPatterns: enrichedPatterns.length,
  totalObservedReferences: [...observed.values()].reduce(
    (sum, o) => sum + o.count,
    0,
  ),
  totalDecisionEntries: decisions.length,
  byComputedMaturity,
  guardCandidateCount: enrichedPatterns.filter(
    (p) => p.derived.guardCandidateEligible,
  ).length,
  observedPatternCount: enrichedPatterns.filter(
    (p) => p.derived.observedCount > 0,
  ).length,
  unobservedPatternCount: enrichedPatterns.filter(
    (p) => p.derived.observedCount === 0,
  ).length,
  unregisteredInUseCount: unregisteredInUse.length,
}

// ----------------------------------------------------------------------------
// Step 5: Emit .generated.json
// ----------------------------------------------------------------------------

const sha = getCurrentSha()
const generatedAt = new Date().toISOString()

const output = {
  $comment:
    'machine-generated by tools/governance/build-document-failure-taxonomy.mjs — DO NOT EDIT',
  schemaVersion: taxonomyDoc.schemaVersion,
  stage: taxonomyDoc.stage,
  generatedAt,
  generatedAtSha: sha,
  inputSources: {
    taxonomy: 'docs/contracts/src/docs/document-failure-taxonomy.yaml',
    decisions: 'docs/contracts/src/docs/document-reading-decisions.yaml',
  },
  summary,
  patterns: enrichedPatterns,
  unregisteredInUse,
}

mkdirSync(dirname(OUTPUT_JSON_PATH), { recursive: true })
writeFileSync(OUTPUT_JSON_PATH, deterministicStringify(output))

// ----------------------------------------------------------------------------
// Step 6: Emit .generated.md (human-readable view)
// ----------------------------------------------------------------------------

function pad(s, n) {
  s = String(s)
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

const guardCandidates = enrichedPatterns
  .filter((p) => p.derived.guardCandidateEligible)
  .sort((a, b) => b.derived.observedCount - a.derived.observedCount)
const emergingPatterns = enrichedPatterns
  .filter(
    (p) => p.derived.observedCount > 0 && !p.derived.guardCandidateEligible,
  )
  .sort((a, b) => b.derived.observedCount - a.derived.observedCount)
const unobservedPatterns = enrichedPatterns
  .filter((p) => p.derived.observedCount === 0)
  .sort((a, b) => a.id.localeCompare(b.id))

const lines = []
lines.push('# Document Failure Taxonomy (machine view)')
lines.push('')
lines.push(
  '> 機械生成。手で編集しない。authoring source = `docs/contracts/src/docs/document-failure-taxonomy.yaml`、',
)
lines.push(
  '> 観測 source = `docs/contracts/src/docs/document-reading-decisions.yaml`、',
)
lines.push('> generator = `tools/governance/build-document-failure-taxonomy.mjs`。')
lines.push('')
lines.push(`- 生成: ${generatedAt}`)
lines.push(`- generatedAtSha: \`${sha}\``)
lines.push(`- schemaVersion: \`${taxonomyDoc.schemaVersion}\``)
lines.push(`- stage: \`${taxonomyDoc.stage}\``)
lines.push('')
lines.push('## Summary')
lines.push('')
lines.push(`- Total registered patterns: ${summary.totalPatterns}`)
lines.push(`- Total observed references in reading-decisions: ${summary.totalObservedReferences}`)
lines.push(`- Reading-decision entries scanned: ${summary.totalDecisionEntries}`)
lines.push(`- Guard candidates (observed >= 5): **${summary.guardCandidateCount}**`)
lines.push(`- Emerging patterns (observed 1-4): ${summary.observedPatternCount - summary.guardCandidateCount}`)
lines.push(`- Unobserved patterns (observed 0): ${summary.unobservedPatternCount}`)
lines.push(`- Unregistered DOC-FAIL-* in use: ${summary.unregisteredInUseCount}`)
lines.push('')
lines.push('### byComputedMaturity')
lines.push('')
lines.push('| maturity | count |')
lines.push('|---|---|')
for (const m of MATURITY_ORDER) {
  lines.push(`| ${m} | ${byComputedMaturity[m] ?? 0} |`)
}
lines.push('')

lines.push('## Guard Candidates (observedCount >= 5)')
lines.push('')
if (guardCandidates.length === 0) {
  lines.push('_(none)_')
} else {
  lines.push('| id | observedCount | inputMaturity | computedMaturity | suggestedRemedy |')
  lines.push('|---|---|---|---|---|')
  for (const p of guardCandidates) {
    lines.push(
      `| \`${p.id}\` | ${p.derived.observedCount} | ${p.maturityHint} | **${p.derived.computedMaturity}** | ${p.suggestedRemedy.replace(/\|/g, '\\|')} |`,
    )
  }
}
lines.push('')

lines.push('## Emerging Patterns (observedCount 1-4)')
lines.push('')
if (emergingPatterns.length === 0) {
  lines.push('_(none)_')
} else {
  lines.push('| id | observedCount | inputMaturity | computedMaturity |')
  lines.push('|---|---|---|---|')
  for (const p of emergingPatterns) {
    lines.push(
      `| \`${p.id}\` | ${p.derived.observedCount} | ${p.maturityHint} | ${p.derived.computedMaturity} |`,
    )
  }
}
lines.push('')

lines.push('## Unobserved Patterns (curated but not yet seen)')
lines.push('')
if (unobservedPatterns.length === 0) {
  lines.push('_(none)_')
} else {
  lines.push('| id | inputMaturity | suggestedRemedy |')
  lines.push('|---|---|---|')
  for (const p of unobservedPatterns) {
    lines.push(
      `| \`${p.id}\` | ${p.maturityHint} | ${p.suggestedRemedy.replace(/\|/g, '\\|')} |`,
    )
  }
}
lines.push('')

lines.push('## Unregistered DOC-FAIL-* In Use (advisory)')
lines.push('')
if (unregisteredInUse.length === 0) {
  lines.push('_(none — all DOC-FAIL-* used in reading-decisions are registered in taxonomy)_')
} else {
  lines.push('> ⚠️ 以下の id が reading-decisions.yaml で使用されているが、taxonomy に未登録。')
  lines.push('> taxonomy への追加または id の typo 修正を検討。Wave 2 では advisory のみ。')
  lines.push('')
  lines.push('| id | observedCount | observedPaths |')
  lines.push('|---|---|---|')
  for (const u of unregisteredInUse) {
    lines.push(`| \`${u.id}\` | ${u.observedCount} | ${u.observedPaths.length} files |`)
  }
}
lines.push('')

lines.push('## Per-Pattern Detail')
lines.push('')
for (const p of [...enrichedPatterns].sort(
  (a, b) => b.derived.observedCount - a.derived.observedCount,
)) {
  lines.push(`### \`${p.id}\``)
  lines.push('')
  lines.push(`- **title**: ${p.title}`)
  lines.push(`- **inputMaturity**: \`${p.maturityHint}\``)
  lines.push(`- **computedMaturity**: \`${p.derived.computedMaturity}\``)
  lines.push(`- **observedCount**: ${p.derived.observedCount}`)
  lines.push(`- **suggestedRemedy**: ${p.suggestedRemedy}`)
  if (p.derived.observedPaths.length > 0) {
    lines.push(`- **observedPaths** (${p.derived.observedPaths.length}):`)
    for (const op of p.derived.observedPaths) lines.push(`  - \`${op}\``)
  }
  if (p.derived.observedDispositions.length > 0) {
    lines.push(`- **observedDispositions**: ${p.derived.observedDispositions.map((d) => `\`${d}\``).join(', ')}`)
  }
  lines.push('')
}

mkdirSync(dirname(OUTPUT_MD_PATH), { recursive: true })
writeFileSync(OUTPUT_MD_PATH, lines.join('\n'))

// ----------------------------------------------------------------------------
// Step 7: Console summary
// ----------------------------------------------------------------------------

console.log(`document-failure-taxonomy.generated.json written: ${OUTPUT_JSON_PATH}`)
console.log(`document-failure-taxonomy.generated.md written: ${OUTPUT_MD_PATH}`)
console.log('')
console.log(`Summary:`)
console.log(`  totalPatterns: ${summary.totalPatterns}`)
console.log(`  totalObservedReferences: ${summary.totalObservedReferences}`)
console.log(`  guardCandidates (>=5): ${summary.guardCandidateCount}`)
console.log(`  observed (>=1): ${summary.observedPatternCount}`)
console.log(`  unobserved: ${summary.unobservedPatternCount}`)
console.log(`  unregisteredInUse: ${summary.unregisteredInUseCount}`)

if (summary.unregisteredInUseCount > 0) {
  console.log('')
  console.log('Unregistered patterns in use (advisory):')
  for (const u of unregisteredInUse) {
    console.log(`  - ${u.id} (observedCount=${u.observedCount})`)
  }
}
