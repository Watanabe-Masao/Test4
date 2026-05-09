#!/usr/bin/env node
// tools/governance/check-doc-temporal-scope.mjs
//
// Wave 2 / Phase 4 sub-PR C — Document Temporal Scope advisory checker
//
// 役割: docs/contracts/generated/document-universe.generated.json を入力に、
// docs/contracts/generated/temporal-scope-policy.generated.json (= 3 policies) を適用し、
// canonical-doc kind の forbidden heading / pattern を scan して aag-finding-v1 conform finding
// を emit。Wave 2 advisory only (= 不可侵原則 8 整合)、hard gate 追加なし。
//
// Phase 4 simple version 検出範囲:
//   - canonical-doc kind (= document-universe entry の kind=canonical-doc) のみ scan
//   - forbiddenHeadings: line `^##\s+<value>\s*$` (case-sensitive) match
//   - forbiddenPatterns: regex match (= checkbox 等)
//   - acceptanceRule: articulate のみ (= Phase 4 後段 / Wave 3 で実装)
//
// Phase 4 後段 / Wave 3 で追加 (= 本 sub-PR scope 外):
//   - generated-report producer existence check
//   - archive-doc archive-manifest existence check
//   - project-plan kind に対する future-allowed scope check
//
// 出力: docs/contracts/generated/temporal-scope-findings.generated.json
//
// 起動: `node tools/governance/check-doc-temporal-scope.mjs` (repo root から実行)

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

const UNIVERSE_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/generated/document-universe.generated.json',
)
const POLICY_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/generated/temporal-scope-policy.generated.json',
)
const FINDING_SCHEMA_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/schema/aag-finding.schema.json',
)
const OUTPUT_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/generated/temporal-scope-findings.generated.json',
)

const PHASE = 'Wave 2 / Phase 4'
const DETECTED_BY = 'check-doc-temporal-scope'

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
      for (const key of Object.keys(value).sort()) sorted[key] = sortKeys(value[key])
      return sorted
    }
    return value
  }
  return JSON.stringify(sortKeys(obj), null, 2) + '\n'
}

// scan a markdown text for forbiddenHeadings + forbiddenPatterns、return array of match info
function scanForViolations(text, policy) {
  const violations = []
  const lines = text.split('\n')
  const headings = policy.checks?.forbiddenHeadings || []
  const patterns = policy.checks?.forbiddenPatterns || []

  // forbiddenHeadings: full match for `^##\s+<value>\s*$`
  for (const h of headings) {
    const re = new RegExp(`^##\\s+${h.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*$`, 'm')
    let lineIdx = 0
    for (const line of lines) {
      lineIdx += 1
      if (re.test(line)) {
        violations.push({
          kind: 'forbiddenHeading',
          headingValue: h,
          lineNumber: lineIdx,
          lineContent: line.trim(),
        })
      }
    }
  }

  // forbiddenPatterns: regex match
  for (const p of patterns) {
    let re
    try {
      re = new RegExp(p, 'm')
    } catch (e) {
      // invalid regex — articulate as scan-error finding upstream
      violations.push({
        kind: 'invalidPattern',
        pattern: p,
        error: e.message,
      })
      continue
    }
    let lineIdx = 0
    for (const line of lines) {
      lineIdx += 1
      if (re.test(line)) {
        violations.push({
          kind: 'forbiddenPattern',
          pattern: p,
          lineNumber: lineIdx,
          lineContent: line.trim(),
        })
      }
    }
  }

  return violations
}

function makeFindingFromViolation(idCounter, sha, policy, entry, violation) {
  let problem
  let expected
  if (violation.kind === 'forbiddenHeading') {
    problem = `${entry.path}:${violation.lineNumber} に forbidden heading \`${violation.lineContent}\` (= policy: ${policy.id} / kind: ${entry.kind})`
    expected = `${policy.suggestedDisposition} disposition の articulate (= 不可侵原則 3 / ADR-SCP-003 整合): (a) heading content を別 kind 文書 (project-plan / archive-doc) に move / (b) heading 削除 / (c) Phase 2.5 Reading Pass で disposition 確定`
  } else if (violation.kind === 'forbiddenPattern') {
    problem = `${entry.path}:${violation.lineNumber} に forbidden pattern \`${violation.pattern}\` match (= line: ${violation.lineContent.slice(0, 80)}, policy: ${policy.id} / kind: ${entry.kind})`
    expected = `${policy.suggestedDisposition} disposition の articulate (= live task list の正本は projects/<id>/checklist.md のみ、project-checklist-governance 整合): (a) pattern 該当 content を project-plan に move / (b) Phase 2.5 Reading Pass で disposition 確定`
  } else if (violation.kind === 'invalidPattern') {
    problem = `policy ${policy.id} の forbiddenPattern \`${violation.pattern}\` が invalid regex (error: ${violation.error})`
    expected = `temporal-scope-policy.yaml の pattern 文法を修正`
  }
  return {
    schemaVersion: 'aag-finding-v1',
    id: `FND-SCP-WAVE2-TEMPORAL-${String(idCounter).padStart(3, '0')}`,
    phase: PHASE,
    detectedBy: DETECTED_BY,
    detectedAt: sha,
    status: 'open',
    result: 'valid-finding',
    severity: policy.severity,
    subject: entry.path,
    rule: `temporal-scope-policy ${policy.id} (= ADR-SCP-003 + 不可侵原則 3 + ${policy.rationale ? policy.rationale.split('\n')[0].trim() : 'rationale articulate'})`,
    problem,
    expected,
    suggestedDisposition: policy.suggestedDisposition,
    confidence: policy.confidence,
    falsePositiveAllowed: true,
  }
}

function makeVerifiedZero(scannedCount, sha, idCounter) {
  return {
    schemaVersion: 'aag-finding-v1',
    id: `FND-SCP-WAVE2-TEMPORAL-VERIFIED-ZERO-${String(idCounter).padStart(3, '0')}`,
    phase: PHASE,
    detectedBy: DETECTED_BY,
    detectedAt: sha,
    status: 'open',
    result: 'verified-zero',
    scope: `canonical-doc kind ${scannedCount} entries (= document-universe.generated.json から filter、no-temporal-mixing policy 適用)`,
    evidence: { scannedFiles: scannedCount, drift: 0, scannedAt: sha },
    rationale:
      'canonical-doc kind 全 entry に対して forbidden heading + forbidden pattern scan を実施し、structural drift 0 を機械的に確認 (Wave 2 advisory checker、ADR-SCP-016 D3 整合)。',
  }
}

function main() {
  const sha = getCurrentSha()

  const universe = JSON.parse(readFileSync(UNIVERSE_PATH, 'utf8'))
  const policy = JSON.parse(readFileSync(POLICY_PATH, 'utf8'))
  const findingSchema = JSON.parse(readFileSync(FINDING_SCHEMA_PATH, 'utf8'))

  const ajv = new Ajv({ allErrors: true, strict: false })
  const validate = ajv.compile(findingSchema)

  const findings = []
  let idCounter = 1
  let canonicalDocScannedCount = 0
  let driftCount = 0

  // build kind → policies map
  const policiesByKind = {}
  for (const p of policy.policies) {
    for (const k of p.scope) {
      if (!policiesByKind[k]) policiesByKind[k] = []
      policiesByKind[k].push(p)
    }
  }

  // scan each universe entry
  for (const entry of universe.entries) {
    const applicablePolicies = policiesByKind[entry.kind] || []
    if (applicablePolicies.length === 0) continue

    const fsPath = resolve(REPO_ROOT, entry.path)
    if (!existsSync(fsPath)) continue // MISSING-TARGET は別 checker (check-document-universe) で扱う

    let text
    try {
      text = readFileSync(fsPath, 'utf8')
    } catch {
      continue
    }

    if (entry.kind === 'canonical-doc') canonicalDocScannedCount += 1

    for (const p of applicablePolicies) {
      // acceptanceRule のみの policy (= forbiddenHeadings/Patterns が空) は articulate のみ、
      // checker は実装しない (= Phase 4 後段で revisit、generated-must-have-producer +
      // archive-must-have-manifest 等)
      if (
        (!p.checks?.forbiddenHeadings || p.checks.forbiddenHeadings.length === 0) &&
        (!p.checks?.forbiddenPatterns || p.checks.forbiddenPatterns.length === 0)
      ) {
        continue
      }
      const violations = scanForViolations(text, p)
      for (const v of violations) {
        findings.push(makeFindingFromViolation(idCounter++, sha, p, entry, v))
        driftCount += 1
      }
    }
  }

  // verified-zero finding は drift count == 0 のみ emit (= canonical-doc を 1 件以上 scan した場合)
  if (driftCount === 0 && canonicalDocScannedCount > 0) {
    findings.push(makeVerifiedZero(canonicalDocScannedCount, sha, idCounter))
  }

  findings.sort((a, b) => a.id.localeCompare(b.id))

  for (const f of findings) {
    if (!validate(f)) {
      console.error(`Finding ${f.id} failed schema validation:`)
      console.error(JSON.stringify(validate.errors, null, 2))
      process.exit(1)
    }
  }

  // summary
  const bySeverity = {}
  const byResult = {}
  const byPolicy = {}
  for (const f of findings) {
    byResult[f.result] = (byResult[f.result] || 0) + 1
    if (f.severity) bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1
    if (f.rule) {
      const m = f.rule.match(/temporal-scope-policy ([a-z][a-z0-9-]*)/)
      if (m) byPolicy[m[1]] = (byPolicy[m[1]] || 0) + 1
    }
  }

  const output = {
    schemaVersion: 'temporal-scope-findings-v1',
    metadata: {
      generatedAt: new Date().toISOString(),
      sourceSha: sha,
      sourcePaths: [
        'docs/contracts/generated/document-universe.generated.json',
        'docs/contracts/generated/temporal-scope-policy.generated.json',
        'docs/contracts/schema/aag-finding.schema.json',
      ],
    },
    findings,
    summary: {
      totalFindings: findings.length,
      driftCount,
      canonicalDocScannedCount,
      byResult,
      bySeverity,
      byPolicy,
    },
  }

  writeFileSync(OUTPUT_PATH, deterministicStringify(output))

  console.log(`Wrote ${relative(REPO_ROOT, OUTPUT_PATH).replace(/\\/g, '/')}`)
  console.log(`  totalFindings: ${output.summary.totalFindings}`)
  console.log(`  driftCount: ${output.summary.driftCount}`)
  console.log(`  canonicalDocScannedCount: ${output.summary.canonicalDocScannedCount}`)
  console.log(`  byResult:`)
  for (const [k, v] of Object.entries(byResult).sort()) console.log(`    ${k}: ${v}`)
  if (Object.keys(bySeverity).length > 0) {
    console.log(`  bySeverity:`)
    for (const [k, v] of Object.entries(bySeverity).sort()) console.log(`    ${k}: ${v}`)
  }
  if (Object.keys(byPolicy).length > 0) {
    console.log(`  byPolicy:`)
    for (const [k, v] of Object.entries(byPolicy).sort()) console.log(`    ${k}: ${v}`)
  }
}

main()
