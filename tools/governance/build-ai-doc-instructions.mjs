#!/usr/bin/env node
// tools/governance/build-ai-doc-instructions.mjs
//
// Wave 3 / Phase 6 sub-PR 2 — AI Instruction Pack generator
//
// 役割: docs/contracts/src/docs/ai-doc-template-rules.yaml (= 20 kinds rules) を入力に、
// ai-doc-instructions.generated.json (= machine truth、AI session が consume) +
// ai-doc-instructions.generated.md (= human view) を出力。
//
// Cross-reference 入力:
//   - docs/contracts/src/docs/document-reading-decisions.yaml (= kind usage counts)
//   - docs/contracts/src/docs/document-failure-taxonomy.yaml (= relatedFailurePatterns 整合性検証)
//
// 不可侵 (ADR-SCP-021 + AAG-SCP-GUIDANCE-003 + 不可侵原則 6 + 11 整合):
//   - post-write validation 限定 (= AI 出力を pre-write で機械的に拘束しない)
//   - guidance であって命令書ではない
//   - generated artifact は authoring source の faithful projection (= 機械的 enrichment のみ追加)
//   - relatedFailurePatterns に未登録 DOC-FAIL-* がある場合は warning surface (= advisory)
//
// 出力:
//   - docs/contracts/generated/ai-doc-instructions.generated.json
//   - references/04-tracking/generated/ai-doc-instructions.generated.md
//
// 起動: `node tools/governance/build-ai-doc-instructions.mjs` (repo root から実行)

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

const RULES_PATH = resolve(REPO_ROOT, 'docs/contracts/src/docs/ai-doc-template-rules.yaml')
const RULES_SCHEMA_PATH = resolve(REPO_ROOT, 'docs/contracts/schema/ai-doc-template-rules.schema.json')
const DECISIONS_PATH = resolve(REPO_ROOT, 'docs/contracts/src/docs/document-reading-decisions.yaml')
const TAXONOMY_PATH = resolve(REPO_ROOT, 'docs/contracts/src/docs/document-failure-taxonomy.yaml')
const OUTPUT_JSON_PATH = resolve(REPO_ROOT, 'docs/contracts/generated/ai-doc-instructions.generated.json')
const OUTPUT_MD_PATH = resolve(REPO_ROOT, 'references/04-tracking/generated/ai-doc-instructions.generated.md')

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

if (!existsSync(RULES_PATH)) {
  console.error(`authoring source not found: ${RULES_PATH}`)
  process.exit(1)
}

const rulesDoc = yaml.load(readFileSync(RULES_PATH, 'utf8'))
const rulesSchema = JSON.parse(readFileSync(RULES_SCHEMA_PATH, 'utf8'))
const ajv = new Ajv({ allErrors: true, strict: false })
const validateRules = ajv.compile(rulesSchema)
if (!validateRules(rulesDoc)) {
  console.error('rules authoring source schema validation FAILED:')
  console.error(JSON.stringify(validateRules.errors, null, 2))
  process.exit(1)
}

// ----------------------------------------------------------------------------
// Step 2: Load reading-decisions for kind usage counts
// ----------------------------------------------------------------------------

const decisionsDoc = yaml.load(readFileSync(DECISIONS_PATH, 'utf8'))
const decisions = decisionsDoc.entries ?? []

const kindUsageCount = new Map()
const kindUsagePaths = new Map()
for (const entry of decisions) {
  const k = entry.proposedKind
  if (!k) continue
  kindUsageCount.set(k, (kindUsageCount.get(k) ?? 0) + 1)
  if (!kindUsagePaths.has(k)) kindUsagePaths.set(k, [])
  kindUsagePaths.get(k).push(entry.path)
}

// ----------------------------------------------------------------------------
// Step 3: Load failure-taxonomy for cross-reference validation
// ----------------------------------------------------------------------------

const taxonomyDoc = yaml.load(readFileSync(TAXONOMY_PATH, 'utf8'))
const registeredPatterns = new Set(taxonomyDoc.patterns.map((p) => p.id))

// ----------------------------------------------------------------------------
// Step 4: Build enriched rules + cross-reference checks
// ----------------------------------------------------------------------------

const unregisteredFailurePatterns = new Set()
const enrichedRules = rulesDoc.rules.map((r) => {
  const observedCount = kindUsageCount.get(r.kind) ?? 0
  const observedPaths = kindUsagePaths.get(r.kind) ?? []
  const unregisteredFailures = []
  for (const fp of r.relatedFailurePatterns ?? []) {
    if (!registeredPatterns.has(fp)) {
      unregisteredFailures.push(fp)
      unregisteredFailurePatterns.add(fp)
    }
  }
  return {
    ...r,
    derived: {
      observedCount,
      observedPathsSample: observedPaths.slice(0, 5).sort(),
      observedPathsTotal: observedPaths.length,
      unregisteredRelatedFailures: unregisteredFailures,
    },
  }
})

// ----------------------------------------------------------------------------
// Step 5: Detect kinds in use but not articulated as rule
// ----------------------------------------------------------------------------

const ruleKinds = new Set(rulesDoc.rules.map((r) => r.kind))
const kindsInUseButUnarticulated = []
for (const [k, count] of kindUsageCount.entries()) {
  if (!ruleKinds.has(k)) {
    kindsInUseButUnarticulated.push({ kind: k, observedCount: count })
  }
}
kindsInUseButUnarticulated.sort((a, b) => b.observedCount - a.observedCount)

// ----------------------------------------------------------------------------
// Step 6: Compute summary
// ----------------------------------------------------------------------------

const summary = {
  totalRules: enrichedRules.length,
  totalDecisionEntries: decisions.length,
  totalObservedKinds: kindUsageCount.size,
  unarticulatedKindsCount: kindsInUseButUnarticulated.length,
  unregisteredFailurePatternsCount: unregisteredFailurePatterns.size,
  rulesWithObservations: enrichedRules.filter((r) => r.derived.observedCount > 0).length,
  rulesWithoutObservations: enrichedRules.filter((r) => r.derived.observedCount === 0).length,
}

// ----------------------------------------------------------------------------
// Step 7: Emit .generated.json
// ----------------------------------------------------------------------------

const sha = getCurrentSha()
const generatedAt = new Date().toISOString()

const output = {
  $comment:
    'machine-generated by tools/governance/build-ai-doc-instructions.mjs — DO NOT EDIT',
  schemaVersion: rulesDoc.schemaVersion,
  stage: rulesDoc.stage,
  generatedAt,
  generatedAtSha: sha,
  inputSources: {
    rules: 'docs/contracts/src/docs/ai-doc-template-rules.yaml',
    decisions: 'docs/contracts/src/docs/document-reading-decisions.yaml',
    taxonomy: 'docs/contracts/src/docs/document-failure-taxonomy.yaml',
  },
  summary,
  rules: enrichedRules,
  kindsInUseButUnarticulated,
  unregisteredFailurePatterns: [...unregisteredFailurePatterns].sort(),
}

mkdirSync(dirname(OUTPUT_JSON_PATH), { recursive: true })
writeFileSync(OUTPUT_JSON_PATH, deterministicStringify(output))

// ----------------------------------------------------------------------------
// Step 8: Emit .generated.md (human-readable view)
// ----------------------------------------------------------------------------

const lines = []
lines.push('# AI Instruction Pack (machine view)')
lines.push('')
lines.push(
  '> 機械生成。手で編集しない。authoring source = `docs/contracts/src/docs/ai-doc-template-rules.yaml`、',
)
lines.push('> generator = `tools/governance/build-ai-doc-instructions.mjs`。')
lines.push('')
lines.push(`- 生成: ${generatedAt}`)
lines.push(`- generatedAtSha: \`${sha}\``)
lines.push(`- schemaVersion: \`${rulesDoc.schemaVersion}\``)
lines.push(`- stage: \`${rulesDoc.stage}\``)
lines.push('')

lines.push('## Summary')
lines.push('')
lines.push(`- Total rules articulated: ${summary.totalRules}`)
lines.push(`- Total decision entries scanned: ${summary.totalDecisionEntries}`)
lines.push(`- Total observed kinds: ${summary.totalObservedKinds}`)
lines.push(`- Rules with observations: ${summary.rulesWithObservations}`)
lines.push(`- Rules without observations: ${summary.rulesWithoutObservations}`)
lines.push(`- Unarticulated kinds in use: ${summary.unarticulatedKindsCount}`)
lines.push(`- Unregistered DOC-FAIL-* in rules: ${summary.unregisteredFailurePatternsCount}`)
lines.push('')

if (kindsInUseButUnarticulated.length > 0) {
  lines.push('## ⚠️ Unarticulated Kinds In Use (advisory)')
  lines.push('')
  lines.push('> 以下の proposedKind が reading-decisions.yaml で使用されているが、')
  lines.push('> ai-doc-template-rules.yaml に articulate されていない。articulate を検討。')
  lines.push('')
  lines.push('| kind | observedCount |')
  lines.push('|---|---|')
  for (const u of kindsInUseButUnarticulated) {
    lines.push(`| \`${u.kind}\` | ${u.observedCount} |`)
  }
  lines.push('')
}

if (unregisteredFailurePatterns.size > 0) {
  lines.push('## ⚠️ Unregistered DOC-FAIL-* In Rules (advisory)')
  lines.push('')
  lines.push('> 以下の DOC-FAIL-* が rules で参照されているが、document-failure-taxonomy.yaml に未登録。')
  lines.push('> taxonomy への追加または rule からの削除を検討。')
  lines.push('')
  for (const fp of [...unregisteredFailurePatterns].sort()) {
    lines.push(`- \`${fp}\``)
  }
  lines.push('')
}

lines.push('## Rules (sorted by observedCount desc)')
lines.push('')
const sortedRules = [...enrichedRules].sort(
  (a, b) => b.derived.observedCount - a.derived.observedCount,
)
for (const r of sortedRules) {
  lines.push(`### \`${r.kind}\``)
  lines.push('')
  lines.push(`**purpose**: ${r.purpose.trim().split('\n').join(' ')}`)
  lines.push('')
  lines.push(`- **temporalScope**: \`${r.temporalScope}\``)
  lines.push(`- **referencePolicy**: \`${r.referencePolicy}\``)
  lines.push(`- **observedCount**: ${r.derived.observedCount}`)
  lines.push(`- **readers**: ${r.readers.map((rd) => `\`${rd}\``).join(', ')}`)
  if (r.requiredSections && r.requiredSections.length > 0) {
    lines.push(`- **requiredSections** (${r.requiredSections.length}):`)
    for (const s of r.requiredSections) lines.push(`  - ${s}`)
  } else {
    lines.push(`- **requiredSections**: _(none)_`)
  }
  if (r.forbiddenContent && r.forbiddenContent.length > 0) {
    lines.push(`- **forbiddenContent** (${r.forbiddenContent.length}):`)
    for (const f of r.forbiddenContent) lines.push(`  - ${f}`)
  } else {
    lines.push(`- **forbiddenContent**: _(none)_`)
  }
  if (r.relatedFailurePatterns && r.relatedFailurePatterns.length > 0) {
    lines.push(
      `- **relatedFailurePatterns**: ${r.relatedFailurePatterns.map((p) => `\`${p}\``).join(', ')}`,
    )
  }
  if (r.examples && r.examples.length > 0) {
    lines.push(`- **examples** (${r.examples.length}):`)
    for (const e of r.examples) lines.push(`  - \`${e}\``)
  }
  if (r.derived.observedPathsSample.length > 0) {
    lines.push(
      `- **observedPathsSample** (${r.derived.observedPathsSample.length}/${r.derived.observedPathsTotal}):`,
    )
    for (const p of r.derived.observedPathsSample) lines.push(`  - \`${p}\``)
    if (r.derived.observedPathsTotal > r.derived.observedPathsSample.length) {
      lines.push(`  - _...(+${r.derived.observedPathsTotal - r.derived.observedPathsSample.length} more)_`)
    }
  }
  if (r.additionalGuidance) {
    lines.push('')
    lines.push(`**additionalGuidance**:`)
    lines.push('')
    for (const ln of r.additionalGuidance.split('\n')) lines.push(`> ${ln}`)
  }
  lines.push('')
}

mkdirSync(dirname(OUTPUT_MD_PATH), { recursive: true })
writeFileSync(OUTPUT_MD_PATH, lines.join('\n'))

// ----------------------------------------------------------------------------
// Step 9: Console summary
// ----------------------------------------------------------------------------

console.log(`ai-doc-instructions.generated.json written: ${OUTPUT_JSON_PATH}`)
console.log(`ai-doc-instructions.generated.md written: ${OUTPUT_MD_PATH}`)
console.log('')
console.log(`Summary:`)
console.log(`  totalRules: ${summary.totalRules}`)
console.log(`  totalDecisionEntries: ${summary.totalDecisionEntries}`)
console.log(`  totalObservedKinds: ${summary.totalObservedKinds}`)
console.log(`  rulesWithObservations: ${summary.rulesWithObservations}`)
console.log(`  rulesWithoutObservations: ${summary.rulesWithoutObservations}`)
console.log(`  unarticulatedKindsCount: ${summary.unarticulatedKindsCount}`)
console.log(`  unregisteredFailurePatternsCount: ${summary.unregisteredFailurePatternsCount}`)

if (kindsInUseButUnarticulated.length > 0) {
  console.log('')
  console.log('Unarticulated kinds in use (advisory):')
  for (const u of kindsInUseButUnarticulated) {
    console.log(`  - ${u.kind} (observedCount=${u.observedCount})`)
  }
}
