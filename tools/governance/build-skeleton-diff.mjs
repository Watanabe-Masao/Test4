#!/usr/bin/env node
// tools/governance/build-skeleton-diff.mjs
//
// Wave 1 / Phase 2C + 2E — skeleton diff generator
//
// 役割: Structural Skeleton (= Phase 2A tree-contracts.yaml) と observed topology (= Phase 2B
// repo-topology.generated.json) を join し、6 分類 + Status / Disposition / Reason / Questions /
// Constraint flags / Context hooks + topLevelDispositionCandidate (Phase 2E、ADR-SCP-020) を
// articulate した skeleton-diff JSON を生成。
//
// Phase 2E (ADR-SCP-020) 拡張:
//   - status enum 4 値対応 (declared / unmanaged-but-tolerated / container-only /
//     platform-config-tolerated)
//   - 各 entry に topLevelDispositionCandidate (8 値) articulate
//   - 12 新 reasonCode 追加 (TOP_LEVEL_OVERPOPULATED / POSSIBLE_ROOT_DUPLICATION /
//     CONTAINER_ONLY_ROOT / PLATFORM_CONFIG_REQUIRED_AT_ROOT / POSSIBLE_MOVE_TO_APP /
//     POSSIBLE_MOVE_TO_TOOLS / POSSIBLE_MOVE_TO_PROJECTS / POSSIBLE_MOVE_TO_AAG /
//     POSSIBLE_MOVE_TO_REFERENCES / POSSIBLE_MOVE_TO_DOCS_CONTRACTS /
//     POSSIBLE_DELETE_CANDIDATE / CURRENT_PROJECT_POINTER_CANDIDATE)
//   - D5 個別 heuristic map (app-domain/ / fixtures/ / roles/ / scripts/ / workers/ /
//     CURRENT_PROJECT.md) articulate
//
// 出力: docs/contracts/generated/skeleton-diff.generated.json
//
// 6 分類 (ADR-SCP-019 D4):
//   - in-skeleton: declared + observed
//   - inside-unmanaged-zone: declared as tolerated + observed、または declared 子を持つ親
//   - missing-expected: declared (declared/tolerated) + NOT observed
//   - out-of-skeleton: observed + NOT declared
//   - unexpected-child: 親 declared + 子 observed（Wave 1 top-level-only scope では検出しない、Wave 2+）
//   - observed-only: meta-status (= 全 entry が inventoryStatus: "observed-only" を持つ)
//
// 各 entry に articulate (ADR-SCP-019 D5 + D8):
//   - Status: meaningStatus / intentStatus / continuityStatus + *Evidence (D8.1 + D8.2)
//   - Disposition: candidateDisposition (Gap 7 分類: fix / revise-skeleton / promote / move / archive / tolerate /
//     delete-candidate / needs-triage)
//   - Reason: reasonCode (D8.4 12 codes、特に CORRECT_LOCATION_BUT_UNEXPLAINED /
//     FUNCTIONING_BUT_INTENT_UNKNOWN)
//   - Questions: contextQuestion / futureQuestion / changeQuestion / requiredQuestion (D8.3)
//   - Constraint flags (一律 false): preservationAssumed / preferenceBasedDecisionAllowed /
//     localConvenienceDecisionAllowed / promotionAllowed
//   - Context hooks (CONTEXT-001〜005、Wave 1 hooks のみ): contextPackRequired / contextDepthHint
//   - meta: observed / inventoryStatus: "observed-only" / contractStatus: "unreviewed"
//
// 不可侵 (Wave 1 / Phase 2C 整合):
//   - foul / hard gate 追加しない
//   - finding emit しない (= 入力データの整備のみ、Phase 3 advisory checker で消費)
//   - すべての entry に observed-only / promotionAllowed=false / preservationAssumed=false
//
// 起動: `node tools/governance/build-skeleton-diff.mjs` (repo root から実行)
// 依存: js-yaml (= app/node_modules から createRequire で resolve、root package.json には未追加 = Wave 1 MVP)
//
// schema integrity (不可侵原則 1 整合):
//   - schemaVersion: 'skeleton-diff-v1'
//   - metadata block (sourceSha / sourcePaths / generatedAt) 必須
//
// deterministic:
//   - object key alphabetical sort + array sort by path (localeCompare)
//   - indent 2 spaces + final newline
//   - generatedAt は再実行で変動

import {
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
} from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')

// js-yaml は app/node_modules から resolve (root package.json には未追加、Wave 1 MVP)
const require = createRequire(resolve(REPO_ROOT, 'app/package.json'))
const yaml = require('js-yaml')

const SKELETON_PATH = resolve(REPO_ROOT, 'docs/contracts/src/repo/tree-contracts.yaml')
const TOPOLOGY_PATH = resolve(REPO_ROOT, 'docs/contracts/generated/repo-topology.generated.json')
const OUTPUT_DIR = resolve(REPO_ROOT, 'docs/contracts/generated')
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'skeleton-diff.generated.json')

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

function loadSkeleton() {
  return yaml.load(readFileSync(SKELETON_PATH, 'utf8'))
}

function loadTopology() {
  return JSON.parse(readFileSync(TOPOLOGY_PATH, 'utf8'))
}

function shortPurpose(purpose) {
  if (!purpose) return ''
  return purpose.split('\n')[0].trim().slice(0, 120)
}

// Constraint flags + context hooks の共通 articulate
const COMMON_FLAGS_INVESTIGATION = {
  contextPackRequired: true,
  preservationAssumed: false,
  preferenceBasedDecisionAllowed: false,
  localConvenienceDecisionAllowed: false,
  promotionAllowed: false,
  contractStatus: 'unreviewed',
  inventoryStatus: 'observed-only',
}

const COMMON_FLAGS_DECLARED = {
  contextPackRequired: false, // already articulated
  preservationAssumed: false,
  preferenceBasedDecisionAllowed: false,
  localConvenienceDecisionAllowed: false,
  promotionAllowed: false, // Parse2 では原則 false (昇格は Wave 2+ 別 PR)
  contractStatus: 'unreviewed', // Wave 2 / Phase 5 で contracted に articulate
  inventoryStatus: 'observed-only',
}

// ADR-SCP-020 D5: 個別 heuristic map (out-of-skeleton entry に対する disposition / reasonCode 推定)。
// path 完全一致 (= top-level directory or file)。Wave 1 では articulate-only、Wave 2 cleanup PR の入力。
const TOP_LEVEL_DISPOSITION_HEURISTICS = {
  'app-domain/': {
    topLevelDispositionCandidate: 'move-candidate',
    extraReasonCodes: ['POSSIBLE_MOVE_TO_APP', 'POSSIBLE_ROOT_DUPLICATION'],
    contextHint:
      'app-domain/ は app/src/domain/ と意味が重複している可能性。promote / move / archive の判断対象',
  },
  'fixtures/': {
    topLevelDispositionCandidate: 'move-candidate',
    extraReasonCodes: ['POSSIBLE_MOVE_TO_APP', 'POSSIBLE_MOVE_TO_TOOLS'],
    contextHint:
      'fixtures/ は app/test/fixtures/ または tools/fixtures/ への移動候補、もしくは廃止候補',
  },
  'roles/': {
    topLevelDispositionCandidate: 'needs-triage',
    extraReasonCodes: [
      'POSSIBLE_ROOT_DUPLICATION',
      'POSSIBLE_MOVE_TO_AAG',
      'POSSIBLE_MOVE_TO_REFERENCES',
    ],
    contextHint:
      'roles/ は aag/ + references/ + .claude/ と責務が重なる可能性。AAG role registry 正本かを再確認',
  },
  'scripts/': {
    topLevelDispositionCandidate: 'move-candidate',
    extraReasonCodes: ['POSSIBLE_MOVE_TO_TOOLS', 'POSSIBLE_ROOT_DUPLICATION'],
    contextHint:
      'scripts/ は tools/ と責務重複の可能性。維持なら意味説明、不要なら tools/ 統合または archive',
  },
  'workers/': {
    topLevelDispositionCandidate: 'needs-triage',
    extraReasonCodes: ['POSSIBLE_MOVE_TO_APP'],
    contextHint:
      'workers/ は product runtime か旧実装か unclear。app/ 配下統合 / archive 判断対象',
  },
  'CURRENT_PROJECT.md': {
    topLevelDispositionCandidate: 'needs-triage',
    extraReasonCodes: ['CURRENT_PROJECT_POINTER_CANDIDATE'],
    contextHint:
      'CURRENT_PROJECT.md は projects/active/ + project-health.generated.md と意味重複の可能性。thin pointer 化候補 (削除候補とは異なる、別 PR で reference scan + consumer 確認後)',
  },
}

// status → topLevelDispositionCandidate の base mapping (declared/tolerated/container-only/platform-config)
const STATUS_TO_DISPOSITION_CANDIDATE = {
  declared: 'declared-root',
  'unmanaged-but-tolerated': 'tolerate',
  'container-only': 'container-only-root',
  'platform-config-tolerated': 'platform-config-tolerated',
}

function buildInSkeletonEntry(skelEntry) {
  return {
    path: skelEntry.path,
    skeletonStatus: 'in-skeleton',
    topLevelDispositionCandidate: STATUS_TO_DISPOSITION_CANDIDATE.declared,
    meaningStatus: 'explained',
    meaningEvidence: [
      `declared in tree-contracts.yaml`,
      `purpose: ${shortPurpose(skelEntry.purpose)}`,
    ],
    intentStatus: 'declared',
    intentEvidence: [
      `owner: ${skelEntry.owner}`,
      ...(skelEntry.childPolicy ? ['childPolicy articulated'] : []),
    ],
    continuityStatus: 'active',
    continuityEvidence: [
      ...(skelEntry.addedSha ? [`declared in commit ${skelEntry.addedSha}`] : []),
      ...(skelEntry.addedAt ? [`addedAt: ${skelEntry.addedAt}`] : []),
    ],
    candidateDisposition: 'keep-and-contract',
    reasonCode: null,
    contextQuestion: null,
    futureQuestion: null,
    changeQuestion: null,
    requiredQuestion: null,
    contextDepthHint: null,
    observed: true,
    ...COMMON_FLAGS_DECLARED,
  }
}

function buildContainerOnlyEntry(skelEntry) {
  // ADR-SCP-020: container-only = top-level に存在するが意味は配下 nested declared root が担う
  const children = (skelEntry.nestedDeclaredChildren || []).join(', ')
  return {
    path: skelEntry.path,
    skeletonStatus: 'in-skeleton',
    topLevelDispositionCandidate: STATUS_TO_DISPOSITION_CANDIDATE['container-only'],
    meaningStatus: 'explained',
    meaningEvidence: [
      `declared as container-only in tree-contracts.yaml`,
      `nestedDeclaredChildren: ${children}`,
      `purpose: ${shortPurpose(skelEntry.purpose)}`,
    ],
    intentStatus: 'declared',
    intentEvidence: [
      `owner: ${skelEntry.owner}`,
      `container-only: 意味は配下 nested declared root が担う`,
    ],
    continuityStatus: 'active',
    continuityEvidence: [
      ...(skelEntry.addedSha ? [`declared in commit ${skelEntry.addedSha}`] : []),
      ...(skelEntry.addedAt ? [`addedAt: ${skelEntry.addedAt}`] : []),
    ],
    candidateDisposition: 'keep-and-contract',
    reasonCode: 'CONTAINER_ONLY_ROOT',
    contextQuestion: null,
    futureQuestion: null,
    changeQuestion: null,
    requiredQuestion: null,
    contextDepthHint: null,
    observed: true,
    ...COMMON_FLAGS_DECLARED,
  }
}

function buildPlatformConfigEntry(skelEntry) {
  // ADR-SCP-020: platform-config-tolerated = 外部 platform 連携上 top-level 必須
  const rationale = skelEntry.topLevelRationale || {}
  return {
    path: skelEntry.path,
    skeletonStatus: 'in-skeleton',
    topLevelDispositionCandidate: STATUS_TO_DISPOSITION_CANDIDATE['platform-config-tolerated'],
    meaningStatus: 'explained',
    meaningEvidence: [
      `declared as platform-config-tolerated in tree-contracts.yaml`,
      ...(rationale.reason ? [`reason: ${rationale.reason}`] : []),
      `purpose: ${shortPurpose(skelEntry.purpose)}`,
    ],
    intentStatus: 'declared',
    intentEvidence: [
      `owner: ${skelEntry.owner}`,
      ...(rationale.continuityNote ? [`continuityNote: ${rationale.continuityNote}`] : []),
    ],
    continuityStatus: 'active',
    continuityEvidence: [
      ...(skelEntry.addedSha ? [`declared in commit ${skelEntry.addedSha}`] : []),
      ...(rationale.cannotMoveBecause
        ? [`cannotMoveBecause: ${rationale.cannotMoveBecause.length} reason(s) articulated`]
        : []),
    ],
    candidateDisposition: 'tolerate',
    reasonCode: 'PLATFORM_CONFIG_REQUIRED_AT_ROOT',
    contextQuestion: null,
    futureQuestion: null,
    changeQuestion: null,
    requiredQuestion: null,
    contextDepthHint: null,
    observed: true,
    ...COMMON_FLAGS_DECLARED,
  }
}

function buildInsideUnmanagedZoneEntryFromTolerated(skelEntry) {
  return {
    path: skelEntry.path,
    skeletonStatus: 'inside-unmanaged-zone',
    topLevelDispositionCandidate: STATUS_TO_DISPOSITION_CANDIDATE['unmanaged-but-tolerated'],
    meaningStatus: 'explained',
    meaningEvidence: [
      `declared as unmanaged-but-tolerated in tree-contracts.yaml`,
      `purpose: ${shortPurpose(skelEntry.purpose)}`,
    ],
    intentStatus: 'declared',
    intentEvidence: [
      `owner: ${skelEntry.owner}`,
      ...(skelEntry.promotionRationale
        ? ['promotionRationale articulated']
        : []),
    ],
    continuityStatus: 'inherited',
    continuityEvidence: [
      `declared as tolerated, declared 昇格は保留`,
      ...(skelEntry.addedSha ? [`declared in commit ${skelEntry.addedSha}`] : []),
    ],
    candidateDisposition: 'tolerate',
    reasonCode: null,
    contextQuestion: null,
    futureQuestion: null,
    changeQuestion: null,
    requiredQuestion: null,
    contextDepthHint: null,
    observed: true,
    ...COMMON_FLAGS_DECLARED,
  }
}

function buildMissingExpectedEntry(skelEntry) {
  const isTolerated = skelEntry.status === 'unmanaged-but-tolerated'
  // missing-expected: declared status だが filesystem に存在しない。disposition は status に応じて articulate
  const baseDisposition = STATUS_TO_DISPOSITION_CANDIDATE[skelEntry.status] || 'needs-triage'
  return {
    path: skelEntry.path,
    skeletonStatus: 'missing-expected',
    topLevelDispositionCandidate: isTolerated ? 'tolerate' : baseDisposition,
    meaningStatus: 'explained',
    meaningEvidence: [`declared in tree-contracts.yaml`],
    intentStatus: 'declared',
    intentEvidence: [`owner: ${skelEntry.owner}`],
    continuityStatus: 'absent',
    continuityEvidence: [
      `declared but not present in filesystem`,
      ...(isTolerated ? ['tolerated entry: 存在しなくても許容'] : []),
    ],
    candidateDisposition: isTolerated ? 'tolerate' : 'revise-skeleton',
    reasonCode: 'MISSING_EXPECTED',
    contextQuestion: 'なぜ declared だが存在しないのか? 過去に存在し削除されたのか、未着手か?',
    futureQuestion: '未来に作成する意思があるか、skeleton から外すか?',
    changeQuestion: 'fix (作成) / revise-skeleton (declared から外す) / tolerate (存在しない状態を許容) のどれ?',
    requiredQuestion: 'このartifactの過去文脈と未来意図を articulate できるか?',
    contextDepthHint: 'L0-L4',
    observed: false,
    ...COMMON_FLAGS_INVESTIGATION,
  }
}

function buildInsideUnmanagedZoneEntryFromParentOfDeclared(obsEntry, declaredChildren) {
  // 親 directory が container-only として declared 済の場合は呼ばれない (= main で先に container-only として
  // articulate される)。本 builder は parent が skeleton 未articulate の場合の fallback (= 暗黙的 parent)
  return {
    path: obsEntry.path,
    skeletonStatus: 'inside-unmanaged-zone',
    topLevelDispositionCandidate: 'needs-triage',
    meaningStatus: 'candidate',
    meaningEvidence: [
      `path is parent of declared root(s): ${declaredChildren.join(', ')}`,
      `type: ${obsEntry.type}`,
    ],
    intentStatus: 'inferred',
    intentEvidence: [
      `contains declared child path(s)、親 directory として暗黙に存在`,
    ],
    continuityStatus: 'inherited',
    continuityEvidence: [`unclear if intentionally a parent or just inherited from filesystem hierarchy`],
    candidateDisposition: 'tolerate',
    reasonCode: 'INHERITED_WITHOUT_RATIONALE',
    contextQuestion: 'この親 directory は declared 子の単なる filesystem 親か、独立した purpose を持つか?',
    futureQuestion: '親自体を declared にすべきか、子のみで十分か?',
    changeQuestion: 'tolerate (子 declared で十分) / promote (親も declared) / revise-skeleton (子 declared を見直し) のどれ?',
    requiredQuestion: '親 directory にも独立した purpose / owner があるか?',
    contextDepthHint: 'L0-L2',
    observed: true,
    ...COMMON_FLAGS_INVESTIGATION,
  }
}

function buildOutOfSkeletonEntry(obsEntry) {
  const isFile = obsEntry.type === 'file'
  const isDotfile = obsEntry.path.startsWith('.')
  const isMarkdown = obsEntry.path.endsWith('.md')
  const isYaml = obsEntry.path.endsWith('.yaml') || obsEntry.path.endsWith('.yml')
  const isPackageManifest = ['package.json', 'package-lock.json', 'go.work', 'Cargo.toml'].some(
    (n) => obsEntry.path === n,
  )

  // ADR-SCP-020 D5: 個別 heuristic map で disposition + 追加 reasonCode を articulate
  const heuristic = TOP_LEVEL_DISPOSITION_HEURISTICS[obsEntry.path] || null

  // reasonCode 構成 (D8.4 + ADR-SCP-020 D4)
  // base: OUT_OF_SKELETON、top-level entry には TOP_LEVEL_OVERPOPULATED を articulate
  // (Wave 1 articulate-only、閾値判定なし、構造的 surface)
  const reasonCodes = ['OUT_OF_SKELETON', 'TOP_LEVEL_OVERPOPULATED']
  if (!isFile) {
    // top-level directory が out-of-skeleton = 構造的に大きな drift candidate
    reasonCodes.push('CORRECT_LOCATION_BUT_UNEXPLAINED')
  }
  if (heuristic) {
    for (const code of heuristic.extraReasonCodes) {
      if (!reasonCodes.includes(code)) reasonCodes.push(code)
    }
  }

  // topLevelDispositionCandidate: heuristic があればそれを採用、なければ needs-triage
  const topLevelDispositionCandidate = heuristic
    ? heuristic.topLevelDispositionCandidate
    : 'needs-triage'

  // candidateKind 推定 (Wave 1 では heuristic only、Wave 2 で精緻化)
  let candidateKind = null
  if (isMarkdown) candidateKind = 'canonical-doc-or-archive-doc'
  else if (isYaml) candidateKind = 'declaration-or-inventory'
  else if (isPackageManifest) candidateKind = 'package-manifest'
  else if (isFile) candidateKind = 'unclassified-file'
  else candidateKind = 'unclassified-directory'

  const meaningEvidence = [
    `path: ${obsEntry.path}`,
    `type: ${obsEntry.type}`,
  ]
  if (isFile && obsEntry.size != null) meaningEvidence.push(`size: ${obsEntry.size} bytes`)
  if (isDotfile) meaningEvidence.push(`dotfile (likely external-tool-managed or convention-based)`)
  if (isPackageManifest) meaningEvidence.push(`recognized package manifest`)
  if (heuristic) meaningEvidence.push(`heuristic context: ${heuristic.contextHint}`)

  // file vs directory で contextDepthHint 調整
  const contextDepthHint = isFile ? 'L0-L2' : 'L0-L4'

  return {
    path: obsEntry.path,
    skeletonStatus: 'out-of-skeleton',
    topLevelDispositionCandidate,
    meaningStatus: 'candidate',
    meaningEvidence,
    intentStatus: 'unknown',
    intentEvidence: [],
    continuityStatus: 'unreviewed',
    continuityEvidence: [],
    candidateKind,
    candidateDisposition: 'needs-triage',
    reasonCode: reasonCodes.join(' + '),
    contextQuestion: 'このartifactは過去のどの文脈から存在しているか?',
    futureQuestion: 'このartifactは未来へ何を継承するために維持するのか?',
    changeQuestion:
      'declared root へ promote / 既存 root へ move / archive / tolerate / delete-candidate / pointer-refine / revise-skeleton のどれが妥当?',
    requiredQuestion: 'このartifactは何の意味を持ち、どのrootに属すべきか?',
    contextDepthHint,
    observed: true,
    ...COMMON_FLAGS_INVESTIGATION,
  }
}

function main() {
  const skeleton = loadSkeleton()
  const topology = loadTopology()

  const skeletonByPath = new Map()
  for (const entry of skeleton.contracts) {
    skeletonByPath.set(entry.path, entry)
  }

  const observedByPath = new Map()
  for (const entry of topology.entries) {
    observedByPath.set(entry.path, entry)
  }

  const diffEntries = []

  // (1) skeleton-driven classification (declared entries)
  for (const skelEntry of skeleton.contracts) {
    const fullPath = resolve(REPO_ROOT, skelEntry.path)
    const exists = existsSync(fullPath)

    if (exists) {
      if (skelEntry.status === 'declared') {
        diffEntries.push(buildInSkeletonEntry(skelEntry))
      } else if (skelEntry.status === 'unmanaged-but-tolerated') {
        diffEntries.push(buildInsideUnmanagedZoneEntryFromTolerated(skelEntry))
      } else if (skelEntry.status === 'container-only') {
        diffEntries.push(buildContainerOnlyEntry(skelEntry))
      } else if (skelEntry.status === 'platform-config-tolerated') {
        diffEntries.push(buildPlatformConfigEntry(skelEntry))
      }
    } else {
      diffEntries.push(buildMissingExpectedEntry(skelEntry))
    }
  }

  // (2) observation-driven classification (entries not yet in diff)
  const classifiedPaths = new Set(diffEntries.map((e) => e.path))

  for (const obsEntry of topology.entries) {
    if (classifiedPaths.has(obsEntry.path)) continue

    // Check if obsEntry is a parent of declared (e.g., docs/ is parent of docs/contracts/)
    const declaredChildren = [...skeletonByPath.keys()].filter(
      (declPath) =>
        declPath !== obsEntry.path && declPath.startsWith(obsEntry.path),
    )

    if (declaredChildren.length > 0) {
      diffEntries.push(
        buildInsideUnmanagedZoneEntryFromParentOfDeclared(obsEntry, declaredChildren),
      )
    } else {
      diffEntries.push(buildOutOfSkeletonEntry(obsEntry))
    }
  }

  // sort entries by path for deterministic output
  diffEntries.sort((a, b) => a.path.localeCompare(b.path))

  // summary
  const bySkeletonStatus = {}
  const byCandidateDisposition = {}
  const byTopLevelDispositionCandidate = {}
  for (const entry of diffEntries) {
    bySkeletonStatus[entry.skeletonStatus] =
      (bySkeletonStatus[entry.skeletonStatus] || 0) + 1
    byCandidateDisposition[entry.candidateDisposition] =
      (byCandidateDisposition[entry.candidateDisposition] || 0) + 1
    if (entry.topLevelDispositionCandidate) {
      byTopLevelDispositionCandidate[entry.topLevelDispositionCandidate] =
        (byTopLevelDispositionCandidate[entry.topLevelDispositionCandidate] || 0) + 1
    }
  }

  const summary = {
    totalEntries: diffEntries.length,
    bySkeletonStatus,
    byCandidateDisposition,
    byTopLevelDispositionCandidate,
  }

  const output = {
    schemaVersion: 'skeleton-diff-v1',
    scope: 'top-level-only',
    metadata: {
      sourceSha: getCurrentSha(),
      sourcePaths: [
        'docs/contracts/src/repo/tree-contracts.yaml',
        'docs/contracts/generated/repo-topology.generated.json',
      ],
      generatedAt: new Date().toISOString(),
    },
    inputs: {
      skeleton: {
        schemaVersion: skeleton.schemaVersion,
        scope: skeleton.scope,
        contractsCount: skeleton.contracts.length,
      },
      topology: {
        schemaVersion: topology.schemaVersion,
        scope: topology.scope,
        entriesCount: topology.entries.length,
      },
    },
    entries: diffEntries,
    summary,
  }

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  writeFileSync(OUTPUT_PATH, deterministicStringify(output))
  console.log(`Wrote docs/contracts/generated/skeleton-diff.generated.json`)
  console.log(`  scope: top-level-only`)
  console.log(`  totalEntries: ${summary.totalEntries}`)
  console.log(`  bySkeletonStatus:`)
  for (const [k, v] of Object.entries(bySkeletonStatus).sort()) {
    console.log(`    ${k}: ${v}`)
  }
  console.log(`  byCandidateDisposition:`)
  for (const [k, v] of Object.entries(byCandidateDisposition).sort()) {
    console.log(`    ${k}: ${v}`)
  }
  console.log(`  byTopLevelDispositionCandidate:`)
  for (const [k, v] of Object.entries(byTopLevelDispositionCandidate).sort()) {
    console.log(`    ${k}: ${v}`)
  }
}

main()
