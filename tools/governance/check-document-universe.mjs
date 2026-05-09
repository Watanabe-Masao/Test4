#!/usr/bin/env node
// tools/governance/check-document-universe.mjs
//
// Wave 2 / Phase 2.5 sub-PR 2 — Document Universe Index advisory checker (ADR-SCP-022 D4 整合)
//
// 役割: docs/contracts/generated/document-universe.generated.json を入力に、
// DOC-IDX-* finding (= aag-finding-v1 schema conform) を emit。Wave 2 advisory only
// (= 不可侵原則 8 整合)、hard gate 追加なし。
//
// 検出 4 種 (Phase 2.5 simple version、ADR-SCP-022 D4 抜粋):
//   - DOC-IDX-MISSING-TARGET: 索引に載っているが実体ファイルが存在しない (severity: warn)
//   - DOC-IDX-UNINDEXED-MARKDOWN: scope 内 Markdown が索引に未掲載 (severity: info)
//   - DOC-IDX-DUPLICATE-ENTRY: 同一 path が universe entries に複数登録 (severity: warn)
//   - DOC-IDX-BROKEN-LINK: entry.href から resolve した相対 link が存在しない target を指す
//                          (severity: warn)
//
// Phase 2.5 後段 / Phase 4 で追加 (= 本 sub-PR scope 外):
//   - DOC-IDX-BROKEN-ANCHOR: anchor link が存在しない section を指す (= target Markdown の
//                            heading parse 必要)
//   - DOC-IDX-STALE-GENERATED: generated index が markdown-inventory より古い (= freshness
//                              mtime / sourceSha 比較ロジック articulate 必要)
//   - DOC-IDX-KIND-MISMATCH: 索引 kind と doc-kind-registry declared kind 不一致
//                            (= Phase 4 で doc-kind-registry が L5 promotion 後に landing)
//
// 出力: docs/contracts/generated/document-universe-findings.generated.json
//
// 起動: `node tools/governance/check-document-universe.mjs` (repo root から実行)

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
const FINDING_SCHEMA_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/schema/aag-finding.schema.json',
)
const OUTPUT_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/generated/document-universe-findings.generated.json',
)
const UNIVERSE_MD_DIR = 'references/04-tracking/generated' // href の resolution base

const PHASE = 'Wave 2 / Phase 2.5'
const DETECTED_BY = 'check-document-universe'

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

// scope filter: build-document-universe.mjs と同 (= ADR-SCP-022 D3 整合)
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

function makeFinding(idCounter, sha, severity, subject, problem, expected) {
  return {
    schemaVersion: 'aag-finding-v1',
    id: `FND-SCP-WAVE2-DOC-IDX-${String(idCounter).padStart(3, '0')}`,
    phase: PHASE,
    detectedBy: DETECTED_BY,
    detectedAt: sha,
    status: 'open',
    result: 'valid-finding',
    severity,
    subject,
    rule: 'ADR-SCP-022 D4 (Document Universe Index DOC-IDX-* finding namespace)',
    problem,
    expected,
    suggestedDisposition: 'needs-triage',
    confidence: 'high',
    falsePositiveAllowed: true,
  }
}

function makeVerifiedZero(scannedCount, sha, idCounter) {
  return {
    schemaVersion: 'aag-finding-v1',
    id: `FND-SCP-WAVE2-DOC-IDX-VERIFIED-ZERO-${String(idCounter).padStart(3, '0')}`,
    phase: PHASE,
    detectedBy: DETECTED_BY,
    detectedAt: sha,
    status: 'open',
    result: 'verified-zero',
    scope:
      'Document Universe Index entries (= scope: README + CLAUDE.md + CHANGELOG.md + CURRENT_PROJECT.md + references + projects + docs + aag + aag-engine + roles + tools + workers、app/ + wasm/ + app-domain/ + fixtures/ + scripts/ 除外、ADR-SCP-022 D3 整合)',
    evidence: {
      scannedFiles: scannedCount,
      drift: 0,
      scannedAt: sha,
    },
    rationale:
      'Document Universe Index 4 種 check (DOC-IDX-MISSING-TARGET / UNINDEXED-MARKDOWN / DUPLICATE-ENTRY / BROKEN-LINK) を完全実行し、structural drift が存在しないことを機械的に確認 (Wave 2 advisory checker、ADR-SCP-016 D3 整合)。Phase 2.5 後段 / Phase 4 で BROKEN-ANCHOR / STALE-GENERATED / KIND-MISMATCH check が追加される予定。',
  }
}

function main() {
  const sha = getCurrentSha()

  if (!existsSync(UNIVERSE_PATH)) {
    console.error(
      `ERROR: document-universe not found: ${toPosixPath(relative(REPO_ROOT, UNIVERSE_PATH))}`,
    )
    process.exit(1)
  }
  if (!existsSync(FINDING_SCHEMA_PATH)) {
    console.error(
      `ERROR: aag-finding schema not found: ${toPosixPath(relative(REPO_ROOT, FINDING_SCHEMA_PATH))}`,
    )
    process.exit(1)
  }

  const universe = JSON.parse(readFileSync(UNIVERSE_PATH, 'utf8'))
  const findingSchema = JSON.parse(readFileSync(FINDING_SCHEMA_PATH, 'utf8'))

  const ajv = new Ajv({ allErrors: true, strict: false })
  const validate = ajv.compile(findingSchema)

  const findings = []
  let idCounter = 1

  // ----- Check 1: DOC-IDX-MISSING-TARGET -----
  for (const e of universe.entries) {
    const fsPath = resolve(REPO_ROOT, e.path)
    if (!existsSync(fsPath)) {
      findings.push(
        makeFinding(
          idCounter++,
          sha,
          'warn',
          e.path,
          `DOC-IDX-MISSING-TARGET: 索引に entry が登録されているが実体ファイル ${e.path} が存在しない`,
          `(a) build-document-universe.mjs を再実行して index regenerate / (b) 削除済みファイルなら次回 generate で自動消える / (c) git ls-files に追加されていない場合は untracked file の可能性`,
        ),
      )
    }
  }

  // ----- Check 2: DOC-IDX-UNINDEXED-MARKDOWN -----
  const universePathSet = new Set(universe.entries.map((e) => e.path))
  const allMarkdown = listRepoMarkdown()
  for (const path of allMarkdown) {
    if (!universePathSet.has(path)) {
      findings.push(
        makeFinding(
          idCounter++,
          sha,
          'info',
          path,
          `DOC-IDX-UNINDEXED-MARKDOWN: scope 内 Markdown ${path} が索引に未掲載`,
          `(a) build-document-universe.mjs の scope filter を更新 / (b) build-document-universe.mjs を再実行して index regenerate`,
        ),
      )
    }
  }

  // ----- Check 3: DOC-IDX-DUPLICATE-ENTRY -----
  const pathCounts = new Map()
  for (const e of universe.entries) {
    pathCounts.set(e.path, (pathCounts.get(e.path) || 0) + 1)
  }
  for (const [path, count] of pathCounts) {
    if (count > 1) {
      findings.push(
        makeFinding(
          idCounter++,
          sha,
          'warn',
          path,
          `DOC-IDX-DUPLICATE-ENTRY: 同一 path ${path} が universe entries に ${count} 回登録`,
          `(a) build-document-universe.mjs の dedupe ロジック確認 / (b) markdown-inventory に重複 entry がないか確認`,
        ),
      )
    }
  }

  // ----- Check 4: DOC-IDX-BROKEN-LINK -----
  // href は references/04-tracking/generated/ からの相対 link。
  // resolve(UNIVERSE_MD_DIR, href) で repo-relative に変換し、existsSync で確認。
  for (const e of universe.entries) {
    const targetRepoRelative = toPosixPath(
      relative(REPO_ROOT, resolve(REPO_ROOT, UNIVERSE_MD_DIR, e.href)),
    )
    const fsPath = resolve(REPO_ROOT, targetRepoRelative)
    if (!existsSync(fsPath)) {
      findings.push(
        makeFinding(
          idCounter++,
          sha,
          'warn',
          e.path,
          `DOC-IDX-BROKEN-LINK: entry.href ${e.href} (resolved: ${targetRepoRelative}) が存在しない`,
          `(a) build-document-universe.mjs の href derivation logic 確認 / (b) entry.path と href の整合確認`,
        ),
      )
    }
  }

  // sort findings deterministically
  findings.sort((a, b) => a.id.localeCompare(b.id))

  let driftCount = findings.length

  // verified-zero finding は drift count == 0 のみ emit
  if (driftCount === 0) {
    const verifiedZero = makeVerifiedZero(universe.entries.length, sha, idCounter)
    findings.push(verifiedZero)
  }

  // schema validation
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
  const byCheckType = {}
  for (const f of findings) {
    byResult[f.result] = (byResult[f.result] || 0) + 1
    if (f.severity) bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1
    if (f.problem) {
      const m = f.problem.match(/^DOC-IDX-[A-Z-]+/)
      if (m) byCheckType[m[0]] = (byCheckType[m[0]] || 0) + 1
    }
  }

  const output = {
    schemaVersion: 'document-universe-findings-v1',
    metadata: {
      generatedAt: new Date().toISOString(),
      sourceSha: sha,
      sourcePaths: [
        'docs/contracts/generated/document-universe.generated.json',
        'docs/contracts/schema/aag-finding.schema.json',
      ],
    },
    findings,
    summary: {
      totalFindings: findings.length,
      driftCount,
      byResult,
      bySeverity,
      byCheckType,
    },
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
  if (Object.keys(byCheckType).length > 0) {
    console.log(`  byCheckType:`)
    for (const [k, v] of Object.entries(byCheckType).sort()) {
      console.log(`    ${k}: ${v}`)
    }
  }
}

main()
