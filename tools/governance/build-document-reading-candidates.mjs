#!/usr/bin/env node
// tools/governance/build-document-reading-candidates.mjs
//
// Wave 2 / Phase 2.5 sub-PR 3 — Document Reading Pass candidates generator
//
// 役割: docs/contracts/generated/document-universe.generated.json + (optional)
// docs/contracts/src/docs/document-reading-decisions.yaml を入力に、Reading Pass で精査すべき
// candidate 集合を articulate 生成。Reading Pass 担当 (= AI / human) はこの candidates list を
// 入力として、優先度順に reading-decisions.yaml entry を append する。
//
// 不可侵 (ADR-SCP-021 D7 + AAG-SCP-DOC-LEARNING-002 整合):
//   - heuristic candidate (= machine inferred、disposition 自体は articulate しない)
//   - 機械分類だけで contract 化しない (= 不可侵原則 7、即 disposition 確定不可)
//   - reading-decisions.yaml に entry が landed されている path は candidate から除外
//   - hot zone 4 件 (references/04-tracking + projects/active + CLAUDE.md + docs/contracts) を
//     priority: HIGH articulate
//
// 出力: docs/contracts/generated/document-reading-candidates.generated.json
//
// candidate 抽出ルール (= Phase 2.5 simple version):
//   - kind == 'canonical-doc' (= doc-registry 掲載) → candidate (= keep-and-contract / split / rewrite-and-contract 候補)
//   - kind == 'unknown' → candidate (= needs-triage 優先)
//   - kind == 'project-plan' → candidate (= 配置 / kind 確認のみ)
//   - kind == 'archive-doc' → skip (= 既に accepted as past、ADR-SCP-008 例外条項候補)
//   - kind == 'generated-report' → skip (= machine inferred accepted)
//   - kind == 'repo-entrypoint' → candidate (= rewrite-and-contract or keep-and-contract、AAG-SCP-DOC-RESET-005 整合)
//
// 起動: `node tools/governance/build-document-reading-candidates.mjs` (repo root から実行)

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
const yaml = require('js-yaml')

const UNIVERSE_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/generated/document-universe.generated.json',
)
const DECISIONS_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/src/docs/document-reading-decisions.yaml',
)
const OUTPUT_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/generated/document-reading-candidates.generated.json',
)

// hot zone path prefixes (= Wave 2 narrowing、ADR-SCP-016 D1 + plan.md L566-L569 整合)
const HOT_ZONE_PREFIXES = [
  'references/04-tracking/',
  'projects/active/',
  'docs/contracts/',
]
const HOT_ZONE_FILES = ['CLAUDE.md']

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

function isHotZone(path) {
  if (HOT_ZONE_FILES.includes(path)) return true
  return HOT_ZONE_PREFIXES.some((p) => path.startsWith(p))
}

function deriveRecommendedDispositionCandidates(entry) {
  // ADR-SCP-021 D3 9 disposition のうち、universe entry の kind / status から候補 disposition を suggest
  // (= 確定ではなく、Reading Pass の input hint)
  switch (entry.kind) {
    case 'canonical-doc':
      // 製本 → keep-and-contract が大半、内容混在なら split / rewrite-and-contract
      return ['keep-and-contract', 'rewrite-and-contract', 'split']
    case 'project-plan':
      // 進行中 project plan → keep-and-contract (= 適切な配置 + project-checklist-governance 整合確認)
      return ['keep-and-contract']
    case 'repo-entrypoint':
      // README / CLAUDE.md / CHANGELOG → rewrite-and-contract or keep-and-contract
      return ['rewrite-and-contract', 'keep-and-contract']
    case 'unknown':
      // unknown → needs-triage 系 (= move / split / archive / delete-candidate / create-missing いずれか)
      return ['move', 'rewrite-and-contract', 'archive', 'delete-candidate']
    default:
      return ['keep-and-contract']
  }
}

function shouldEmitCandidate(entry) {
  // skip kinds (= machine inferred accepted)
  if (entry.kind === 'archive-doc') return false
  if (entry.kind === 'generated-report') return false
  return true
}

function main() {
  const sha = getCurrentSha()
  const generatedAt = new Date().toISOString()

  const universe = JSON.parse(readFileSync(UNIVERSE_PATH, 'utf8'))

  // load existing reading-decisions.yaml (= empty 初版で OK)
  let alreadyReviewedPaths = new Set()
  if (existsSync(DECISIONS_PATH)) {
    const yamlText = readFileSync(DECISIONS_PATH, 'utf8')
    const decisions = yaml.load(yamlText)
    if (decisions?.entries && Array.isArray(decisions.entries)) {
      alreadyReviewedPaths = new Set(decisions.entries.map((e) => e.path))
    }
  }

  const candidates = []
  for (const entry of universe.entries) {
    if (alreadyReviewedPaths.has(entry.path)) continue
    if (!shouldEmitCandidate(entry)) continue

    const priority = isHotZone(entry.path) ? 'HIGH' : 'MEDIUM'

    candidates.push({
      path: entry.path,
      universeKind: entry.kind,
      universeIndexSection: entry.indexSection,
      universeContractStatus: entry.contractStatus,
      universeDocumentStatus: entry.documentStatus,
      priority,
      isHotZone: isHotZone(entry.path),
      recommendedDispositionCandidates: deriveRecommendedDispositionCandidates(entry),
      hint: 'Reading Pass で disposition 確定 (= 9 disposition values + 5 hasX flags + duplicates articulate)',
    })
  }

  candidates.sort((a, b) => {
    // priority HIGH 先、同 priority 内は path 昇順
    if (a.priority !== b.priority) return a.priority === 'HIGH' ? -1 : 1
    return a.path.localeCompare(b.path)
  })

  // summary
  const byPriority = {}
  const byKind = {}
  const bySection = {}
  for (const c of candidates) {
    byPriority[c.priority] = (byPriority[c.priority] || 0) + 1
    byKind[c.universeKind] = (byKind[c.universeKind] || 0) + 1
    bySection[c.universeIndexSection] = (bySection[c.universeIndexSection] || 0) + 1
  }

  const output = {
    schemaVersion: 'document-reading-candidates-v1',
    metadata: {
      generatedAt,
      sourceSha: sha,
      sourcePaths: [
        'docs/contracts/generated/document-universe.generated.json',
        'docs/contracts/src/docs/document-reading-decisions.yaml',
      ],
    },
    candidates,
    summary: {
      totalCandidates: candidates.length,
      alreadyReviewedCount: alreadyReviewedPaths.size,
      byPriority,
      byKind,
      bySection,
    },
  }

  if (!existsSync(dirname(OUTPUT_PATH))) mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, deterministicStringify(output))

  console.log(`Wrote ${relative(REPO_ROOT, OUTPUT_PATH).replace(/\\/g, '/')}`)
  console.log(`  totalCandidates: ${output.summary.totalCandidates}`)
  console.log(`  alreadyReviewedCount: ${output.summary.alreadyReviewedCount}`)
  console.log(`  byPriority:`)
  for (const [k, v] of Object.entries(byPriority).sort()) console.log(`    ${k}: ${v}`)
  console.log(`  byKind:`)
  for (const [k, v] of Object.entries(byKind).sort()) console.log(`    ${k}: ${v}`)
  console.log(`  bySection (top 8):`)
  for (const [k, v] of Object.entries(bySection)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)) {
    console.log(`    ${k}: ${v}`)
  }
}

main()
