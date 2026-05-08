#!/usr/bin/env node
// tools/governance/check-tree.mjs
//
// Wave 1 / Phase 3-B — Tree Contract Shadow advisory checker
//
// 役割: `docs/contracts/generated/skeleton-diff.generated.json` (= Phase 2C 6 分類 + Phase 2E
// topLevelDispositionCandidate + 24 reasonCode 拡張版) を入力に、aag-finding-v1 schema
// (= Phase 1 sub-PR 1 で landing) conform な Finding を emit。
//
// Wave 1 advisory only (= 不可侵原則 8 整合):
//   - hard gate / new-only gate 追加なし
//   - 全 Finding は falsePositiveAllowed: true
//   - status: open のみ articulate (= triage は Wave 2+)
//   - severity は info / warn のみ (block 除外、不可侵原則 8 整合)
//
// Finding emit ロジック (ADR-SCP-019 D3 + ADR-SCP-016 D3 整合):
//   - in-skeleton (declared / container-only / platform-config-tolerated)            → no Finding (= correct articulate)
//   - inside-unmanaged-zone (unmanaged-but-tolerated declared)                       → no Finding (= tolerated state)
//   - missing-expected (declared / container-only / platform-config-tolerated)       → valid-finding (severity: warn)
//   - missing-expected (unmanaged-but-tolerated)                                     → no Finding (= tolerated optional)
//   - out-of-skeleton                                                                → valid-finding (severity: info)
//   - drift count == 0                                                               → verified-zero finding emit (= ADR-SCP-016 D3)
//
// suggestedDisposition mapping (skeleton-diff topLevelDispositionCandidate → aag-finding):
//   - move-candidate    → move
//   - archive-candidate → archive
//   - delete-candidate  → needs-triage (aag-finding schema に delete enum なし、Wave 2 で別 PR)
//   - needs-triage      → needs-triage
//   - revise-skeleton   → needs-triage (missing-expected + declared の場合)
//   - container-only-root / declared-root / platform-config-tolerated / tolerate → 該当なし (no Finding)
//
// 出力: docs/contracts/generated/tree-contract-findings.generated.json
//
// 依存: ajv (= app/node_modules から createRequire で resolve)
//
// 起動: `node tools/governance/check-tree.mjs` (repo root から実行)

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

const SKELETON_DIFF_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/generated/skeleton-diff.generated.json',
)
const FINDING_SCHEMA_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/schema/aag-finding.schema.json',
)
const OUTPUT_DIR = resolve(REPO_ROOT, 'docs/contracts/generated')
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'tree-contract-findings.generated.json')

const PHASE = 'Wave 1 / Phase 3'
const DETECTED_BY = 'check-tree'

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

// suggestedDisposition mapping (aag-finding-v1 schema enum: keep-and-contract / split / move /
// archive / generated-register / needs-triage / unmanaged-promote)
function mapSuggestedDisposition(diffEntry) {
  const tld = diffEntry.topLevelDispositionCandidate
  if (tld === 'move-candidate') return 'move'
  if (tld === 'archive-candidate') return 'archive'
  // delete-candidate は aag-finding schema に delete enum なし (= Wave 2 で別 PR + reference scan)
  if (tld === 'delete-candidate') return 'needs-triage'
  // missing-expected (declared) は revise-skeleton 候補だが schema enum なし
  if (diffEntry.skeletonStatus === 'missing-expected') return 'needs-triage'
  // 既定: needs-triage (Wave 1 articulate-only、Wave 2 Reading Pass で確定)
  return 'needs-triage'
}

function shouldEmitFinding(diffEntry) {
  // in-skeleton (declared / container-only / platform-config-tolerated): no Finding
  if (diffEntry.skeletonStatus === 'in-skeleton') return false
  // inside-unmanaged-zone (unmanaged-but-tolerated declared、または parent-of-declared inferred):
  //   tolerated は state として articulate 済 = no Finding
  if (diffEntry.skeletonStatus === 'inside-unmanaged-zone') return false
  // missing-expected かつ tolerate disposition (= unmanaged-but-tolerated declared) は no Finding
  if (
    diffEntry.skeletonStatus === 'missing-expected' &&
    diffEntry.topLevelDispositionCandidate === 'tolerate'
  ) {
    return false
  }
  // out-of-skeleton + missing-expected (non-tolerated): valid-finding emit
  return true
}

function buildValidFinding(diffEntry, idCounter, sha) {
  const isFile = diffEntry.path && !diffEntry.path.endsWith('/')
  // severity: missing-expected (declared) → warn / out-of-skeleton → info (Wave 1 advisory)
  const severity = diffEntry.skeletonStatus === 'missing-expected' ? 'warn' : 'info'

  // problem / expected articulate
  const problem =
    diffEntry.skeletonStatus === 'missing-expected'
      ? `declared in tree-contracts.yaml だが filesystem に存在しない (skeletonStatus: missing-expected, reasonCode: ${diffEntry.reasonCode})`
      : `tree-contracts.yaml に declared / unmanaged-but-tolerated / container-only / platform-config-tolerated のいずれでも articulate されていない (skeletonStatus: out-of-skeleton, reasonCode: ${diffEntry.reasonCode})`

  const expected =
    diffEntry.skeletonStatus === 'missing-expected'
      ? `(a) filesystem に作成 / (b) skeleton から削除 / (c) tolerated に降格 のいずれかを user 判断で確定 (Wave 2 cleanup PR)`
      : `(a) declared として skeleton 昇格 / (b) move-candidate であれば既存 root へ移動 / (c) archive-candidate / (d) needs-triage で精査継続 のいずれかを user 判断で確定 (topLevelDispositionCandidate: ${diffEntry.topLevelDispositionCandidate})`

  return {
    schemaVersion: 'aag-finding-v1',
    id: `FND-SCP-WAVE1-TREE-${String(idCounter).padStart(3, '0')}`,
    phase: PHASE,
    detectedBy: DETECTED_BY,
    detectedAt: sha,
    status: 'open',
    result: 'valid-finding',
    severity,
    subject: diffEntry.path,
    rule: 'ADR-SCP-019 (Skeleton-aware Parse) + ADR-SCP-020 (Top-level Disposition Articulation)',
    problem,
    expected,
    suggestedDisposition: mapSuggestedDisposition(diffEntry),
    confidence: 'high',
    falsePositiveAllowed: true,
  }
}

function buildVerifiedZeroFinding(scannedCount, sha, idCounter) {
  return {
    schemaVersion: 'aag-finding-v1',
    id: `FND-SCP-WAVE1-VERIFIED-ZERO-${String(idCounter).padStart(3, '0')}`,
    phase: PHASE,
    detectedBy: DETECTED_BY,
    detectedAt: sha,
    status: 'open',
    result: 'verified-zero',
    scope:
      'top-level-only (skeleton-diff entries = 8 declared + 1 container-only + 2 platform-config-tolerated + 1 unmanaged-but-tolerated articulate root + observed top-level entries)',
    evidence: {
      scannedFiles: scannedCount,
      drift: 0,
      scannedAt: sha,
    },
    rationale:
      '対象範囲 (top-level skeleton + observed topology) を完全に走査し、declared / unmanaged-but-tolerated / container-only / platform-config-tolerated に articulate されていない structural drift が存在しないことを機械的に確認。Wave 1 advisory checker による verified-zero finding (ADR-SCP-016 D3 整合)。',
  }
}

function main() {
  const sha = getCurrentSha()

  if (!existsSync(SKELETON_DIFF_PATH)) {
    console.error(
      `ERROR: skeleton-diff not found: ${toPosixPath(relative(REPO_ROOT, SKELETON_DIFF_PATH))}`,
    )
    process.exit(1)
  }
  if (!existsSync(FINDING_SCHEMA_PATH)) {
    console.error(
      `ERROR: aag-finding schema not found: ${toPosixPath(relative(REPO_ROOT, FINDING_SCHEMA_PATH))}`,
    )
    process.exit(1)
  }

  const skeletonDiff = JSON.parse(readFileSync(SKELETON_DIFF_PATH, 'utf8'))
  const findingSchema = JSON.parse(readFileSync(FINDING_SCHEMA_PATH, 'utf8'))

  const ajv = new Ajv({ allErrors: true, strict: false })
  const validate = ajv.compile(findingSchema)

  const findings = []
  let idCounter = 1
  let driftCount = 0

  for (const diffEntry of skeletonDiff.entries) {
    if (!shouldEmitFinding(diffEntry)) continue
    const finding = buildValidFinding(diffEntry, idCounter, sha)
    idCounter += 1
    driftCount += 1
    if (!validate(finding)) {
      console.error(`Finding ${finding.id} failed schema validation:`)
      console.error(JSON.stringify(validate.errors, null, 2))
      process.exit(1)
    }
    findings.push(finding)
  }

  // verified-zero finding は drift count == 0 かつ scope 内走査完遂時のみ emit
  if (driftCount === 0) {
    const verifiedZero = buildVerifiedZeroFinding(skeletonDiff.entries.length, sha, idCounter)
    if (!validate(verifiedZero)) {
      console.error(`verified-zero finding failed schema validation:`)
      console.error(JSON.stringify(validate.errors, null, 2))
      process.exit(1)
    }
    findings.push(verifiedZero)
  }

  // sort findings by id (= deterministic output)
  findings.sort((a, b) => a.id.localeCompare(b.id))

  // summary
  const bySeverity = {}
  const byResult = {}
  const bySuggestedDisposition = {}
  for (const f of findings) {
    byResult[f.result] = (byResult[f.result] || 0) + 1
    if (f.severity) {
      bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1
    }
    if (f.suggestedDisposition) {
      bySuggestedDisposition[f.suggestedDisposition] =
        (bySuggestedDisposition[f.suggestedDisposition] || 0) + 1
    }
  }

  const output = {
    schemaVersion: 'tree-contract-findings-v1',
    metadata: {
      generatedAt: new Date().toISOString(),
      sourceSha: sha,
      sourcePaths: [
        'docs/contracts/generated/skeleton-diff.generated.json',
        'docs/contracts/schema/aag-finding.schema.json',
      ],
    },
    findings,
    summary: {
      totalFindings: findings.length,
      byResult,
      bySeverity,
      bySuggestedDisposition,
      driftCount,
    },
  }

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }
  writeFileSync(OUTPUT_PATH, deterministicStringify(output))

  console.log(`Wrote ${toPosixPath(relative(REPO_ROOT, OUTPUT_PATH))}`)
  console.log(`  totalFindings: ${output.summary.totalFindings}`)
  console.log(`  driftCount: ${output.summary.driftCount}`)
  console.log(`  byResult:`)
  for (const [k, v] of Object.entries(byResult).sort()) {
    console.log(`    ${k}: ${v}`)
  }
  if (Object.keys(bySeverity).length > 0) {
    console.log(`  bySeverity:`)
    for (const [k, v] of Object.entries(bySeverity).sort()) {
      console.log(`    ${k}: ${v}`)
    }
  }
  if (Object.keys(bySuggestedDisposition).length > 0) {
    console.log(`  bySuggestedDisposition:`)
    for (const [k, v] of Object.entries(bySuggestedDisposition).sort()) {
      console.log(`    ${k}: ${v}`)
    }
  }
}

main()
