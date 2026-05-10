#!/usr/bin/env node
// tools/governance/check-doc-postwrite.mjs
//
// Wave 3 / Phase 6 sub-PR 2 — Document post-write structural conformance checker
//
// 役割: AI Instruction Pack (= ai-doc-template-rules.yaml) の各 rule に対する Markdown 文書の
// 構造的適合性 (= requiredSections 充足) を post-write で検証。Wave 3 = advisory only
// (= 警告 surface のみ、CI fail なし)。
//
// 不可侵 (ADR-SCP-021 + AAG-SCP-GUIDANCE-003 + 不可侵原則 6 + 11 整合):
//   - post-write validation 限定 (= AI 出力を pre-write で機械的に拘束しない)
//   - guidance であって命令書ではない
//   - 「設計の良し悪し」「表現品質」「比喩の適切さ」は scope 外 (= 構造的観点のみ)
//   - Wave 3 advisory: 違反検出は warning のみ、hard gate 化は別 program 候補
//
// 機械検証 scope:
//   - requiredSections: 各 required section title の prefix が Markdown header (= ^#+\s+...) と
//     部分一致するか。完全一致は要求しない (= 例: 'AI 自己レビュー' は '## AI 自己レビュー (= user 承認の手前)' と
//     match)。
//   - forbiddenContent: 概念的制約のため機械検証困難、advisory hint として list のみ (= 別 sub-PR
//     で AST-level 検証検討)。
//
// 起動:
//   - 全 reviewed docs scan: `node tools/governance/check-doc-postwrite.mjs --all`
//   - 単一 doc check: `node tools/governance/check-doc-postwrite.mjs <path-to-md>`
//   - kind override: `--kind canonical-doc` (= reading-decisions に未 articulate な doc を check)

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')

const require = createRequire(resolve(REPO_ROOT, 'app/package.json'))
const yaml = require('js-yaml')

const RULES_PATH = resolve(REPO_ROOT, 'docs/contracts/src/docs/ai-doc-template-rules.yaml')
const DECISIONS_PATH = resolve(REPO_ROOT, 'docs/contracts/src/docs/document-reading-decisions.yaml')
const OUTPUT_REPORT_PATH = resolve(
  REPO_ROOT,
  'references/04-tracking/generated/doc-postwrite-findings.generated.md',
)

function getCurrentSha() {
  try {
    return execSync('git rev-parse HEAD', { cwd: REPO_ROOT, encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

// ----------------------------------------------------------------------------
// Argument parsing
// ----------------------------------------------------------------------------

const args = process.argv.slice(2)
const isAllMode = args.includes('--all')
const writeReport = args.includes('--report')
const kindOverrideIdx = args.indexOf('--kind')
const kindOverride = kindOverrideIdx >= 0 ? args[kindOverrideIdx + 1] : null
const targetPathArg = args.find(
  (a) => !a.startsWith('--') && a !== kindOverride,
)

// ----------------------------------------------------------------------------
// Load rules + reading-decisions
// ----------------------------------------------------------------------------

const rulesDoc = yaml.load(readFileSync(RULES_PATH, 'utf8'))
const ruleByKind = new Map(rulesDoc.rules.map((r) => [r.kind, r]))

const decisionsDoc = yaml.load(readFileSync(DECISIONS_PATH, 'utf8'))
const kindByPath = new Map()
for (const entry of decisionsDoc.entries) {
  if (entry.proposedKind) kindByPath.set(entry.path, entry.proposedKind)
}

// ----------------------------------------------------------------------------
// Markdown header extraction
// ----------------------------------------------------------------------------

function extractHeaders(content) {
  const lines = content.split('\n')
  const headers = []
  let inFence = false
  for (const line of lines) {
    if (/^\s*(`{3,}|~{3,})/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = line.match(/^(#+)\s+(.+?)\s*$/)
    if (m) headers.push({ level: m[1].length, text: m[2] })
  }
  return headers
}

// ----------------------------------------------------------------------------
// Section requirement check
// ----------------------------------------------------------------------------

function extractSectionPrefix(requiredText) {
  // Extract the leading prefix before any parenthetical or trailing decorations.
  // 'AI 自己レビュー (= user 承認の手前)' → 'AI 自己レビュー'
  // 'priority 表 (= P1 / P2 / P3)' → 'priority 表'
  return requiredText.replace(/\s*\(.*$/, '').replace(/\s*—.*$/, '').trim()
}

function checkRequiredSections(headers, requiredSections) {
  const findings = []
  for (const reqSection of requiredSections) {
    const prefix = extractSectionPrefix(reqSection)
    if (!prefix) continue
    const matched = headers.some((h) => h.text.includes(prefix))
    if (!matched) {
      findings.push({
        kind: 'missing-required-section',
        severity: 'warning',
        section: reqSection,
        prefix,
        message: `requiredSection 不在: '${prefix}' を含む header (= ^#+\\s+...) が見つからない`,
      })
    }
  }
  return findings
}

// ----------------------------------------------------------------------------
// File check
// ----------------------------------------------------------------------------

function checkFile(filePath, kind) {
  const fullPath = resolve(REPO_ROOT, filePath)
  if (!existsSync(fullPath)) {
    return {
      path: filePath,
      kind,
      error: 'file-not-found',
      findings: [],
    }
  }
  const rule = ruleByKind.get(kind)
  if (!rule) {
    return {
      path: filePath,
      kind,
      error: 'kind-not-articulated',
      findings: [
        {
          kind: 'kind-not-articulated',
          severity: 'warning',
          message: `kind '${kind}' が ai-doc-template-rules.yaml に未 articulate`,
        },
      ],
    }
  }
  const content = readFileSync(fullPath, 'utf8')
  const headers = extractHeaders(content)
  const findings = []
  if (rule.requiredSections && rule.requiredSections.length > 0) {
    findings.push(...checkRequiredSections(headers, rule.requiredSections))
  }
  // forbiddenContent: 機械検証困難 (= 概念的制約)、advisory hint としてのみ list
  // 別 sub-PR で AST-level 検証検討
  return {
    path: filePath,
    kind,
    rule: { kind: rule.kind, requiredSectionsCount: (rule.requiredSections || []).length },
    headersCount: headers.length,
    findings,
    forbiddenContentHints: rule.forbiddenContent ?? [],
  }
}

// ----------------------------------------------------------------------------
// Run
// ----------------------------------------------------------------------------

const results = []
let totalFindings = 0

if (isAllMode) {
  // scan all reviewed paths from reading-decisions
  for (const entry of decisionsDoc.entries) {
    if (!entry.proposedKind) continue
    if (!entry.path.endsWith('.md')) continue
    const result = checkFile(entry.path, entry.proposedKind)
    results.push(result)
    totalFindings += result.findings.length
  }
} else if (targetPathArg) {
  // single file mode
  let kind = kindOverride
  if (!kind) {
    kind = kindByPath.get(targetPathArg)
  }
  if (!kind) {
    console.error(
      `ERROR: kind not found for '${targetPathArg}'. Use --kind <kind> to override.`,
    )
    process.exit(1)
  }
  const result = checkFile(targetPathArg, kind)
  results.push(result)
  totalFindings = result.findings.length
} else {
  console.error('Usage: node check-doc-postwrite.mjs [--all|--report] [<path>] [--kind <kind>]')
  process.exit(1)
}

// ----------------------------------------------------------------------------
// Console output (advisory only — exit code 0)
// ----------------------------------------------------------------------------

const sha = getCurrentSha()
const generatedAt = new Date().toISOString()

if (isAllMode) {
  const filesWithFindings = results.filter((r) => r.findings.length > 0)
  const filesWithErrors = results.filter((r) => r.error)
  console.log(`Scanned ${results.length} reviewed Markdown files.`)
  console.log(`Total findings (advisory): ${totalFindings}`)
  console.log(`Files with findings: ${filesWithFindings.length}`)
  console.log(`Files with errors (= file-not-found / kind-not-articulated): ${filesWithErrors.length}`)
  console.log('')
  if (filesWithFindings.length > 0) {
    console.log('## Findings detail (top 20):')
    for (const r of filesWithFindings.slice(0, 20)) {
      console.log(`- ${r.path} [${r.kind}]: ${r.findings.length} findings`)
      for (const f of r.findings.slice(0, 3)) {
        console.log(`    - ${f.kind}: ${f.message}`)
      }
    }
  }
} else {
  const result = results[0]
  console.log(`Path: ${result.path}`)
  console.log(`Kind: ${result.kind}`)
  if (result.error) console.log(`Error: ${result.error}`)
  console.log(`Headers detected: ${result.headersCount ?? 'n/a'}`)
  console.log(`Findings: ${result.findings.length}`)
  for (const f of result.findings) {
    console.log(`  - [${f.severity}] ${f.kind}: ${f.message}`)
  }
  if (result.forbiddenContentHints && result.forbiddenContentHints.length > 0) {
    console.log('')
    console.log(`forbiddenContent hints (advisory, manual review):`)
    for (const h of result.forbiddenContentHints) console.log(`  - ${h}`)
  }
}

// ----------------------------------------------------------------------------
// Optional: write report to .generated.md
// ----------------------------------------------------------------------------

if (writeReport && isAllMode) {
  const lines = []
  lines.push('# Document Post-write Findings (machine view)')
  lines.push('')
  lines.push('> 機械生成。手で編集しない。generator = `tools/governance/check-doc-postwrite.mjs`。')
  lines.push('> Wave 3 advisory: 違反検出は warning のみ、CI fail なし。')
  lines.push('')
  lines.push(`- 生成: ${generatedAt}`)
  lines.push(`- generatedAtSha: \`${sha}\``)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`- Total reviewed Markdown files scanned: ${results.length}`)
  lines.push(`- Total findings (advisory): ${totalFindings}`)
  const withFindings = results.filter((r) => r.findings.length > 0)
  const withErrors = results.filter((r) => r.error)
  lines.push(`- Files with findings: ${withFindings.length}`)
  lines.push(`- Files with errors: ${withErrors.length}`)
  lines.push('')

  // group by kind
  const byKind = new Map()
  for (const r of results) {
    if (!byKind.has(r.kind)) byKind.set(r.kind, { total: 0, withFindings: 0, totalFindings: 0 })
    const slot = byKind.get(r.kind)
    slot.total += 1
    if (r.findings.length > 0) {
      slot.withFindings += 1
      slot.totalFindings += r.findings.length
    }
  }
  lines.push('## By Kind')
  lines.push('')
  lines.push('| kind | total | withFindings | findings |')
  lines.push('|---|---|---|---|')
  for (const [k, s] of [...byKind.entries()].sort((a, b) => b[1].totalFindings - a[1].totalFindings)) {
    lines.push(`| \`${k}\` | ${s.total} | ${s.withFindings} | ${s.totalFindings} |`)
  }
  lines.push('')

  if (withFindings.length > 0) {
    lines.push('## Files with Findings')
    lines.push('')
    for (const r of withFindings.sort((a, b) => b.findings.length - a.findings.length)) {
      lines.push(`### \`${r.path}\` [\`${r.kind}\`]`)
      lines.push('')
      for (const f of r.findings) {
        lines.push(`- **[${f.severity}]** ${f.kind}: ${f.message}`)
      }
      lines.push('')
    }
  }

  mkdirSync(dirname(OUTPUT_REPORT_PATH), { recursive: true })
  writeFileSync(OUTPUT_REPORT_PATH, lines.join('\n'))
  console.log('')
  console.log(`Report written: ${OUTPUT_REPORT_PATH}`)
}

// Wave 3 advisory: always exit 0
process.exit(0)
