#!/usr/bin/env node
// tools/governance/build-required-docs-matrix.mjs
//
// Wave 3 / Phase 7 sub-PR 1 — Required Docs Matrix generator
//
// 役割: docs/contracts/src/docs/required-docs-matrix.yaml (= 4 target-type rules) を入力に、
// repo を scan + 各 target-type の actual targets enumerate + missing required docs を articulate。
// machine truth = required-docs-matrix.generated.json、human view = .generated.md。
//
// 不可侵 (ADR-SCP-021 + plan.md Wave 3 / Phase 7 + 不可侵原則 11 整合):
//   - 初期は advisory + new-only gate のみ foul
//   - pre-write 強制機構なし
//   - exceptions list 経由で governance-articulated 例外を articulate
//   - cross-reference: docKind は ai-doc-template-rules.yaml の kind と一致 (= 検証 advisory)
//
// 出力:
//   - docs/contracts/generated/required-docs-matrix.generated.json
//   - references/04-tracking/generated/required-docs-matrix.generated.md
//
// 起動: `node tools/governance/build-required-docs-matrix.mjs` (repo root から実行)

import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')

const require = createRequire(resolve(REPO_ROOT, 'app/package.json'))
const yaml = require('js-yaml')
const Ajv = require('ajv')

const MATRIX_PATH = resolve(REPO_ROOT, 'docs/contracts/src/docs/required-docs-matrix.yaml')
const SCHEMA_PATH = resolve(REPO_ROOT, 'docs/contracts/schema/required-docs-matrix.schema.json')
const RULES_PATH = resolve(REPO_ROOT, 'docs/contracts/src/docs/ai-doc-template-rules.yaml')
const OUTPUT_JSON = resolve(REPO_ROOT, 'docs/contracts/generated/required-docs-matrix.generated.json')
const OUTPUT_MD = resolve(REPO_ROOT, 'references/04-tracking/generated/required-docs-matrix.generated.md')

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

function listDirsAt(absDir) {
  if (!existsSync(absDir)) return []
  return readdirSync(absDir)
    .filter((name) => {
      const full = resolve(absDir, name)
      try {
        return statSync(full).isDirectory()
      } catch {
        return false
      }
    })
    .sort()
}

// ----------------------------------------------------------------------------
// Step 1: Load + validate authoring source
// ----------------------------------------------------------------------------

const matrixDoc = yaml.load(readFileSync(MATRIX_PATH, 'utf8'))
const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'))
const ajv = new Ajv({ allErrors: true, strict: false })
const validate = ajv.compile(schema)
if (!validate(matrixDoc)) {
  console.error('matrix authoring source schema validation FAILED:')
  console.error(JSON.stringify(validate.errors, null, 2))
  process.exit(1)
}

// ----------------------------------------------------------------------------
// Step 2: Load ai-doc-template-rules for cross-reference
// ----------------------------------------------------------------------------

const rulesDoc = yaml.load(readFileSync(RULES_PATH, 'utf8'))
const ruleKinds = new Set(rulesDoc.rules.map((r) => r.kind))

// ----------------------------------------------------------------------------
// Step 3: Enumerate targets per rule + check required docs
// ----------------------------------------------------------------------------

function enumerateTargetsForPattern(pattern) {
  // Patterns: 'projects/active/<id>/' / 'app/src/features/<feature>/' /
  //           'wasm/<module>/' / 'roles/<tier>/<role>/'
  // Strategy: split into segments, walk each <name> placeholder by scanning dirs.
  const segments = pattern.split('/').filter(Boolean)
  let current = [{ path: '', captures: {} }]
  for (const seg of segments) {
    const m = seg.match(/^<(\w+)>$/)
    if (m) {
      const captureName = m[1]
      const next = []
      for (const node of current) {
        const absDir = resolve(REPO_ROOT, node.path || '.')
        const dirs = listDirsAt(absDir)
        for (const d of dirs) {
          // skip _-prefixed (= _template, _internal, etc — but _template should NOT be scanned for active-project)
          if (d.startsWith('_') && pattern.includes('active')) continue
          next.push({
            path: node.path ? `${node.path}/${d}` : d,
            captures: { ...node.captures, [captureName]: d },
          })
        }
      }
      current = next
    } else {
      current = current.map((n) => ({
        path: n.path ? `${n.path}/${seg}` : seg,
        captures: n.captures,
      }))
    }
  }
  return current
}

function substituteCaptures(template, captures) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => captures[k] ?? `{{${k}}}`)
}

const enrichedRules = matrixDoc.rules.map((rule) => {
  const targets = enumerateTargetsForPattern(rule.pathPattern)
  const exceptionSet = new Set(rule.exceptions ?? [])
  const targetResults = []
  let totalMissing = 0
  let totalRequired = 0
  let totalOptional = 0
  let totalExceptions = 0

  for (const target of targets) {
    if (exceptionSet.has(target.path) || exceptionSet.has(target.path + '/')) {
      totalExceptions += 1
      targetResults.push({
        targetPath: target.path,
        captures: target.captures,
        skipped: 'exception',
        missingRequired: [],
        missingOptional: [],
      })
      continue
    }
    const missingRequired = []
    const missingOptional = []
    for (const reqDoc of rule.requiredDocs) {
      const docPath = substituteCaptures(reqDoc.docPath, target.captures)
      const isOptional = reqDoc.optional === true
      if (isOptional) totalOptional += 1
      else totalRequired += 1
      const exists = existsSync(resolve(REPO_ROOT, docPath))
      if (!exists) {
        const entry = { docPath, docKind: reqDoc.docKind, optional: isOptional }
        if (isOptional) missingOptional.push(entry)
        else {
          missingRequired.push(entry)
          totalMissing += 1
        }
      }
    }
    targetResults.push({
      targetPath: target.path,
      captures: target.captures,
      missingRequired,
      missingOptional,
    })
  }

  // Validate that all docKinds reference existing kinds
  const unknownKinds = []
  for (const reqDoc of rule.requiredDocs) {
    if (!ruleKinds.has(reqDoc.docKind)) unknownKinds.push(reqDoc.docKind)
  }

  return {
    ...rule,
    derived: {
      targetCount: targets.length,
      exceptionCount: totalExceptions,
      requiredDocsCount: totalRequired,
      optionalDocsCount: totalOptional,
      missingRequiredCount: totalMissing,
      unknownDocKinds: unknownKinds,
      targets: targetResults,
    },
  }
})

// ----------------------------------------------------------------------------
// Step 4: Compute summary
// ----------------------------------------------------------------------------

const summary = {
  totalRules: enrichedRules.length,
  totalTargets: enrichedRules.reduce((s, r) => s + r.derived.targetCount, 0),
  totalRequiredDocs: enrichedRules.reduce((s, r) => s + r.derived.requiredDocsCount, 0),
  totalOptionalDocs: enrichedRules.reduce((s, r) => s + r.derived.optionalDocsCount, 0),
  totalMissingRequired: enrichedRules.reduce((s, r) => s + r.derived.missingRequiredCount, 0),
  totalUnknownDocKinds: enrichedRules.reduce(
    (s, r) => s + r.derived.unknownDocKinds.length,
    0,
  ),
}

// ----------------------------------------------------------------------------
// Step 5: Emit .generated.json
// ----------------------------------------------------------------------------

const sha = getCurrentSha()
const generatedAt = new Date().toISOString()

const output = {
  $comment:
    'machine-generated by tools/governance/build-required-docs-matrix.mjs — DO NOT EDIT',
  schemaVersion: matrixDoc.schemaVersion,
  stage: matrixDoc.stage,
  generatedAt,
  generatedAtSha: sha,
  inputSources: {
    matrix: 'docs/contracts/src/docs/required-docs-matrix.yaml',
    rules: 'docs/contracts/src/docs/ai-doc-template-rules.yaml',
  },
  summary,
  rules: enrichedRules,
}

mkdirSync(dirname(OUTPUT_JSON), { recursive: true })
writeFileSync(OUTPUT_JSON, deterministicStringify(output))

// ----------------------------------------------------------------------------
// Step 6: Emit .generated.md (human-readable view)
// ----------------------------------------------------------------------------

const lines = []
lines.push('# Required Docs Matrix (machine view)')
lines.push('')
lines.push(
  '> 機械生成。手で編集しない。authoring source = `docs/contracts/src/docs/required-docs-matrix.yaml`、',
)
lines.push('> generator = `tools/governance/build-required-docs-matrix.mjs`。')
lines.push('> Wave 3 advisory: 違反検出は warning のみ、CI fail なし。')
lines.push('')
lines.push(`- 生成: ${generatedAt}`)
lines.push(`- generatedAtSha: \`${sha}\``)
lines.push(`- schemaVersion: \`${matrixDoc.schemaVersion}\``)
lines.push(`- stage: \`${matrixDoc.stage}\``)
lines.push('')

lines.push('## Summary')
lines.push('')
lines.push(`- Total rules: ${summary.totalRules}`)
lines.push(`- Total targets enumerated: ${summary.totalTargets}`)
lines.push(`- Total required docs (across all targets): ${summary.totalRequiredDocs}`)
lines.push(`- Total optional docs: ${summary.totalOptionalDocs}`)
lines.push(`- **Total missing required docs (advisory): ${summary.totalMissingRequired}**`)
lines.push(`- Unknown docKinds in rules (= ai-doc-template-rules unregistered): ${summary.totalUnknownDocKinds}`)
lines.push('')

for (const rule of enrichedRules) {
  lines.push(`## \`${rule.targetType}\``)
  lines.push('')
  lines.push(`**rationale**: ${rule.rationale.trim().split('\n').join(' ')}`)
  lines.push('')
  lines.push(`- pathPattern: \`${rule.pathPattern}\``)
  lines.push(`- targetCount: ${rule.derived.targetCount}`)
  lines.push(`- exceptionCount: ${rule.derived.exceptionCount}`)
  lines.push(`- requiredDocsCount (per target × N): ${rule.derived.requiredDocsCount}`)
  lines.push(`- optionalDocsCount: ${rule.derived.optionalDocsCount}`)
  lines.push(`- **missingRequiredCount: ${rule.derived.missingRequiredCount}**`)
  if (rule.derived.unknownDocKinds.length > 0) {
    lines.push(`- ⚠️ unknownDocKinds: ${rule.derived.unknownDocKinds.map((k) => `\`${k}\``).join(', ')}`)
  }
  if (rule.derived.missingRequiredCount > 0) {
    lines.push('')
    lines.push('### missing required docs:')
    for (const t of rule.derived.targets) {
      if (t.missingRequired.length === 0) continue
      lines.push(`- \`${t.targetPath}\`:`)
      for (const m of t.missingRequired) {
        lines.push(`  - \`${m.docPath}\` (kind: \`${m.docKind}\`)`)
      }
    }
  }
  lines.push('')
}

mkdirSync(dirname(OUTPUT_MD), { recursive: true })
writeFileSync(OUTPUT_MD, lines.join('\n'))

// ----------------------------------------------------------------------------
// Step 7: Console summary
// ----------------------------------------------------------------------------

console.log(`required-docs-matrix.generated.json written: ${OUTPUT_JSON}`)
console.log(`required-docs-matrix.generated.md written: ${OUTPUT_MD}`)
console.log('')
console.log('Summary:')
console.log(`  totalRules: ${summary.totalRules}`)
console.log(`  totalTargets: ${summary.totalTargets}`)
console.log(`  totalMissingRequired: ${summary.totalMissingRequired} (advisory)`)
console.log(`  totalUnknownDocKinds: ${summary.totalUnknownDocKinds}`)
