#!/usr/bin/env npx tsx
/**
 * EvidencePack テンプレート生成スクリプト
 *
 * registry から対象候補の情報を収集し、AagEvidencePack の JSON テンプレートを出力する。
 * parity / rollback フィールドは placeholder（観測後に埋める前提）。
 *
 * Usage:
 *   npx tsx src/test/generators/generateEvidencePack.ts BIZ-012
 *   npx tsx src/test/generators/generateEvidencePack.ts ANA-003
 *   npx tsx src/test/generators/generateEvidencePack.ts --all
 *
 * 層: Execution（導出ツール）
 * @see app/src/test/aagSchemas.ts — AagEvidencePack 型定義
 */

import { CALCULATION_CANON_REGISTRY } from '../calculationCanonRegistry'
import type { AagEvidencePack } from '../aagSchemas'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const WASM_ENGINE_PATH = path.resolve(__dirname, '../../application/services/wasmEngine.ts')

function extractCandidateContractIds(): string[] {
  const src = fs.readFileSync(WASM_ENGINE_PATH, 'utf-8')
  return [...src.matchAll(/contractId:\s*'([^']+)'/g)].map((m) => m[1])
}

function generateForContract(contractId: string): AagEvidencePack | null {
  const entry = Object.entries(CALCULATION_CANON_REGISTRY).find(
    ([, e]) => e.contractId === contractId,
  )

  if (!entry) {
    console.error(`contractId "${contractId}" が registry に見つかりません`)
    return null
  }

  const [filePath, canon] = entry

  const pack: AagEvidencePack = {
    targetId: contractId,
    targetFile: filePath,
    semanticClass: canon.semanticClass ?? 'utility',
    authorityKind: canon.authorityKind ?? 'non-authoritative',
    track: canon.runtimeStatus === 'candidate' ? 'candidate' : 'current-quality',
    registryDiff: {
      fromStatus: canon.runtimeStatus ?? 'non-target',
      toStatus: 'current',
      fromAuthority: canon.authorityKind ?? 'non-authoritative',
      toAuthority:
        canon.semanticClass === 'business' ? 'business-authoritative' : 'analytic-authoritative',
    },
    bridgeMode: canon.runtimeStatus === 'candidate' ? 'dual-run-compare' : 'current-only',
    parityResult: {
      valueMatch: false,
      nullMatch: false,
      warningMatch: false,
      methodUsedMatch: false,
      scopeMatch: false,
      criticalDiffCount: -1,
      observationDays: 0,
    },
    rollbackEvidence: {
      tested: false,
      canRevertToCurrentOnly: false,
      testedAt: null,
    },
    guardStatus: {
      hardGatePass: false,
      failedRules: ['__PLACEHOLDER__'],
      checkedAt: new Date().toISOString(),
    },
    collectedAt: new Date().toISOString(),
    reviewerSummary: null,
  }

  return pack
}

// ── CLI ──

const arg = process.argv[2]

if (!arg) {
  console.error('Usage: generateEvidencePack.ts <contractId | --all>')
  console.error('  例: generateEvidencePack.ts BIZ-012')
  console.error('  例: generateEvidencePack.ts --all')
  process.exit(1)
}

if (arg === '--all') {
  const contractIds = extractCandidateContractIds()
  const packs: AagEvidencePack[] = []

  for (const id of contractIds) {
    const pack = generateForContract(id)
    if (pack) packs.push(pack)
  }

  console.log(JSON.stringify(packs, null, 2))
  console.error(`\n${packs.length} 件の EvidencePack テンプレートを生成しました`)
} else {
  const pack = generateForContract(arg)
  if (pack) {
    console.log(JSON.stringify(pack, null, 2))
  } else {
    process.exit(1)
  }
}
