/**
 * domain/calculations/ 正本化分類ガード
 *
 * 全ファイルが CALCULATION_CANON_REGISTRY に分類されていることを保証する。
 * 未分類のファイルが追加された場合、このテストが失敗する。
 *
 * @see references/01-principles/calculation-canonicalization-map.md
 * @see references/01-principles/semantic-classification-policy.md
 * ルール定義: architectureRules.ts (AR-STRUCT-CALC-CANON)
 * @guard I2 @guard I3 @guard I4
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import { collectTsFiles } from '../guardTestHelpers'
import { CALCULATION_CANON_REGISTRY } from '../calculationCanonRegistry'
import { GUARD_CATEGORY_MAP } from '../guardCategoryMap'
import {
  BUSINESS_SEMANTIC_VIEW,
  ANALYTIC_KERNEL_VIEW,
  MIGRATION_CANDIDATE_VIEW,
} from '../semanticViews'

const SRC_DIR = path.resolve(__dirname, '../..')

const CALC_DIR = path.join(SRC_DIR, 'domain/calculations')

describe('domain/calculations/ 正本化分類ガード', () => {
  it('全ファイルが CALCULATION_CANON_REGISTRY に分類されている（未分類なし）', () => {
    const files = collectTsFiles(CALC_DIR, true)
    const unregistered: string[] = []

    for (const file of files) {
      const relPath = path.relative(CALC_DIR, file)
      if (!CALCULATION_CANON_REGISTRY[relPath]) {
        unregistered.push(relPath)
      }
    }

    expect(
      unregistered,
      `domain/calculations/ に未分類のファイルがあります:\n${unregistered.join('\n')}\n` +
        '→ test/calculationCanonRegistry.ts に登録してください',
    ).toEqual([])
  })

  it('レジストリに存在するが実ファイルがないエントリがない（陳腐化防止）', () => {
    const files = new Set(collectTsFiles(CALC_DIR, true).map((f) => path.relative(CALC_DIR, f)))
    const stale: string[] = []

    for (const key of Object.keys(CALCULATION_CANON_REGISTRY)) {
      // candidate/ prefix は WASM crate（wasm/ 配下）のため domain/calculations/ に物理ファイルがない
      if (key.startsWith('candidate/')) continue
      if (!files.has(key)) {
        stale.push(key)
      }
    }

    expect(
      stale,
      `レジストリに実ファイルがないエントリ:\n${stale.join('\n')}\n` +
        '→ test/calculationCanonRegistry.ts から削除してください',
    ).toEqual([])
  })

  it('必須分類のファイルは全て Zod 契約が追加されるべき', () => {
    const requiredWithoutZod: string[] = []
    for (const [key, entry] of Object.entries(CALCULATION_CANON_REGISTRY)) {
      if (entry.tag === 'required' && !entry.zodAdded) {
        requiredWithoutZod.push(`${key}: ${entry.reason}`)
      }
    }

    // 現在の未完了数を上限として設定（段階的に 0 に近づける）
    expect(
      requiredWithoutZod.length,
      `必須分類で Zod 未追加:\n${requiredWithoutZod.join('\n')}`,
    ).toBeLessThanOrEqual(3)
  })

  it('分類の合計 = レジストリのエントリ数', () => {
    const entries = Object.values(CALCULATION_CANON_REGISTRY)
    const required = entries.filter((e) => e.tag === 'required').length
    const review = entries.filter((e) => e.tag === 'review').length
    const notNeeded = entries.filter((e) => e.tag === 'not-needed').length

    expect(required + review + notNeeded).toBe(entries.length)
  })
})

describe('意味分類ガード（Phase 2）', () => {
  it('required エントリは semanticClass 必須', () => {
    const violations: string[] = []
    for (const [key, entry] of Object.entries(CALCULATION_CANON_REGISTRY)) {
      if (entry.tag === 'required' && !entry.semanticClass) {
        violations.push(`${key}: required なのに semanticClass 未設定`)
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('semanticClass: business ⇔ authorityKind: business-authoritative 整合', () => {
    const violations: string[] = []
    for (const [key, entry] of Object.entries(CALCULATION_CANON_REGISTRY)) {
      // candidate エントリは candidate-authoritative が正当（Phase 5/6）
      if (entry.runtimeStatus === 'candidate') {
        if (entry.authorityKind !== 'candidate-authoritative') {
          violations.push(`${key}: candidate なのに authorityKind=${entry.authorityKind}`)
        }
        continue
      }
      if (entry.semanticClass === 'business' && entry.authorityKind !== 'business-authoritative') {
        violations.push(`${key}: business なのに authorityKind=${entry.authorityKind}`)
      }
      if (entry.authorityKind === 'business-authoritative' && entry.semanticClass !== 'business') {
        violations.push(
          `${key}: business-authoritative なのに semanticClass=${entry.semanticClass}`,
        )
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('semanticClass: analytic ⇔ authorityKind: analytic-authoritative 整合', () => {
    const violations: string[] = []
    for (const [key, entry] of Object.entries(CALCULATION_CANON_REGISTRY)) {
      if (
        entry.semanticClass === 'analytic' &&
        entry.authorityKind !== 'analytic-authoritative' &&
        entry.runtimeStatus !== 'candidate' &&
        entry.runtimeStatus !== 'non-target'
      ) {
        violations.push(`${key}: analytic なのに authorityKind=${entry.authorityKind}`)
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('derived view が master と一致する（business view に analytic が混入していない）', () => {
    const violations: string[] = []
    for (const entry of BUSINESS_SEMANTIC_VIEW) {
      if (entry.semanticClass !== 'business') {
        violations.push(`business view に非 business エントリ: ${entry.path}`)
      }
    }
    for (const entry of ANALYTIC_KERNEL_VIEW) {
      if (entry.semanticClass !== 'analytic') {
        violations.push(`analytic view に非 analytic エントリ: ${entry.path}`)
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('candidate エントリが current view に含まれていない', () => {
    const violations: string[] = []
    for (const entry of BUSINESS_SEMANTIC_VIEW) {
      if (entry.runtimeStatus === 'candidate') {
        violations.push(`business current view に candidate: ${entry.path}`)
      }
    }
    for (const entry of ANALYTIC_KERNEL_VIEW) {
      if (entry.runtimeStatus === 'candidate') {
        violations.push(`analytic current view に candidate: ${entry.path}`)
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('non-target エントリが current view に含まれていない', () => {
    const violations: string[] = []
    for (const entry of BUSINESS_SEMANTIC_VIEW) {
      if (entry.runtimeStatus === 'non-target') {
        violations.push(`business current view に non-target: ${entry.path}`)
      }
    }
    for (const entry of ANALYTIC_KERNEL_VIEW) {
      if (entry.runtimeStatus === 'non-target') {
        violations.push(`analytic current view に non-target: ${entry.path}`)
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('candidate view に current エントリが含まれていない', () => {
    const violations: string[] = []
    for (const entry of MIGRATION_CANDIDATE_VIEW) {
      if (entry.runtimeStatus === 'current') {
        violations.push(`candidate view に current: ${entry.path}`)
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('意味分類の集計が正しい', () => {
    const entries = Object.values(CALCULATION_CANON_REGISTRY)
    const business = entries.filter((e) => e.semanticClass === 'business').length
    const analytic = entries.filter((e) => e.semanticClass === 'analytic').length
    const utility = entries.filter((e) => e.semanticClass === 'utility').length

    expect(business + analytic + utility).toBe(entries.length)
    // ratchet: 意味分類の内訳が変わったら意図的に更新する
    // business: 13 current + 6 candidate (BIZ-008〜013) = 19
    expect(business).toBe(19)
    // analytic: 11 current (ANA-001 + ANA-010 budgetSimulator + budgetSimulatorAggregations + 8 algorithms) + 5 candidate (ANA-003, ANA-004, ANA-005, ANA-007, ANA-009) + 1 ANA-005-related (ANA-005 prevYearCostApprox SP-B ADR-B-004 PR2) = 17
    expect(analytic).toBe(17)
    expect(utility).toBe(13)
  })

  it('統合 drift 検出: registry → view → wasmEngine → bridge 全層が同じ truth を見ている', () => {
    const wasmEnginePath = path.resolve(SRC_DIR, 'application/services/wasmEngine.ts')
    const wasmEngineSource = fs.readFileSync(wasmEnginePath, 'utf-8') as string

    // wasmEngine.ts からモジュール名リストを静的に抽出
    const extractArray = (varName: string): string[] => {
      const re = new RegExp(`${varName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as\\s*const`)
      const match = wasmEngineSource.match(re)
      if (!match) return []
      return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
    }

    const currentModules = extractArray('WASM_MODULE_NAMES')
    const candidateModules = extractArray('WASM_CANDIDATE_MODULE_NAMES')

    // wasmEngine.ts から WASM_CANDIDATE_MODULE_METADATA の contractId を抽出
    const candidateContractIds: string[] = []
    const contractIdMatches = wasmEngineSource.matchAll(/contractId:\s*'([^']+)'/g)
    for (const m of contractIdMatches) {
      candidateContractIds.push(m[1])
    }

    const violations: string[] = []

    // --- Layer 1: registry truth ---

    const registryCandidate = Object.entries(CALCULATION_CANON_REGISTRY).filter(
      ([, e]) => e.runtimeStatus === 'candidate',
    )
    const registryNonTarget = Object.entries(CALCULATION_CANON_REGISTRY).filter(
      ([, e]) => e.runtimeStatus === 'non-target',
    )

    // --- Layer 2: view truth ---

    for (const entry of BUSINESS_SEMANTIC_VIEW) {
      if (entry.runtimeStatus !== 'current') {
        violations.push(`BUSINESS view に非 current: ${entry.path} (${entry.runtimeStatus})`)
      }
    }
    for (const entry of ANALYTIC_KERNEL_VIEW) {
      if (entry.runtimeStatus !== 'current') {
        violations.push(`ANALYTIC view に非 current: ${entry.path} (${entry.runtimeStatus})`)
      }
    }
    for (const entry of MIGRATION_CANDIDATE_VIEW) {
      if (entry.runtimeStatus !== 'candidate') {
        violations.push(`CANDIDATE view に非 candidate: ${entry.path} (${entry.runtimeStatus})`)
      }
    }

    if (MIGRATION_CANDIDATE_VIEW.length !== registryCandidate.length) {
      violations.push(
        `CANDIDATE view(${MIGRATION_CANDIDATE_VIEW.length}) != registry candidate(${registryCandidate.length})`,
      )
    }

    // --- Layer 3: wasmEngine truth ---

    if (currentModules.length === 0) {
      violations.push('wasmEngine に current module が登録されていない')
    }

    if (candidateModules.length !== registryCandidate.length) {
      violations.push(
        `wasmEngine candidate(${candidateModules.length}) != registry candidate(${registryCandidate.length})`,
      )
    }

    // wasmEngine candidate の contractId が registry に存在するか
    const registryContractIds = registryCandidate
      .map(([, e]) => e.contractId)
      .filter((id): id is string => !!id)
    for (const contractId of candidateContractIds) {
      if (!registryContractIds.includes(contractId)) {
        violations.push(
          `wasmEngine の contractId="${contractId}" が registry candidate に存在しない`,
        )
      }
    }

    // --- Layer 4: bridge ファイル存在チェック ---

    const bridgeDir = path.resolve(SRC_DIR, 'application/services')

    for (const candidateName of candidateModules) {
      const bridgeFile = `${candidateName}Bridge.ts`
      const bridgePath = path.join(bridgeDir, bridgeFile)
      if (!fs.existsSync(bridgePath)) {
        violations.push(
          `wasmEngine candidate "${candidateName}" の bridge ファイルがない: ${bridgeFile}`,
        )
      }
    }

    // --- non-target（business/analytic）が wasmEngine に登録されていないか ---
    // utility の non-target（barrel 等）は WASM module と名前が被っても問題ない

    for (const [filePath, entry] of registryNonTarget) {
      if (entry.semanticClass === 'utility') continue
      const basename = path.basename(filePath, '.ts')
      if (currentModules.includes(basename) || candidateModules.includes(basename)) {
        violations.push(
          `non-target "${filePath}" (${entry.semanticClass}) が wasmEngine に登録されている`,
        )
      }
    }

    expect(violations, violations.join('\n')).toEqual([])
  })

  it('wasmEngine candidate の contractId が registry と 1:1 で対応する', () => {
    const wasmEnginePath = path.resolve(SRC_DIR, 'application/services/wasmEngine.ts')
    const wasmEngineSource = fs.readFileSync(wasmEnginePath, 'utf-8')

    // wasmEngine から contractId + semanticClass を抽出
    const candidateBlock = wasmEngineSource.match(
      /WASM_CANDIDATE_MODULE_METADATA[\s\S]*?\}\s*\}/,
    )?.[0]
    if (!candidateBlock) {
      expect.fail('WASM_CANDIDATE_MODULE_METADATA が見つかりません')
      return
    }

    const engineEntries: { name: string; contractId: string; semanticClass: string }[] = []
    const entryRe = /(\w+):\s*\{[^}]*contractId:\s*'([^']+)'[^}]*semanticClass:\s*'([^']+)'/g
    let m: RegExpExecArray | null
    while ((m = entryRe.exec(candidateBlock)) !== null) {
      engineEntries.push({ name: m[1], contractId: m[2], semanticClass: m[3] })
    }
    // semanticClass が contractId の前に来るパターンも対応
    const entryRe2 = /(\w+):\s*\{[^}]*semanticClass:\s*'([^']+)'[^}]*contractId:\s*'([^']+)'/g
    while ((m = entryRe2.exec(candidateBlock)) !== null) {
      const match = m
      if (!engineEntries.some((e) => e.name === match[1])) {
        engineEntries.push({ name: match[1], contractId: match[3], semanticClass: match[2] })
      }
    }

    const violations: string[] = []

    for (const eng of engineEntries) {
      const registryEntry = Object.entries(CALCULATION_CANON_REGISTRY).find(
        ([, e]) => e.contractId === eng.contractId,
      )
      if (!registryEntry) {
        violations.push(
          `wasmEngine "${eng.name}" の contractId="${eng.contractId}" が registry にない`,
        )
        continue
      }
      const [, canon] = registryEntry
      if (canon.semanticClass !== eng.semanticClass) {
        violations.push(
          `contractId="${eng.contractId}": semanticClass 不一致 (engine=${eng.semanticClass}, registry=${canon.semanticClass})`,
        )
      }
    }

    expect(violations, violations.join('\n')).toEqual([])
  })

  it('guardCategoryMap のカテゴリ分布（info）', () => {
    const distribution: Record<string, number> = {}
    for (const entry of Object.values(GUARD_CATEGORY_MAP)) {
      const key = entry.category
      distribution[key] = (distribution[key] || 0) + 1
    }

    // info レベル: 分布を可視化するだけ。ratchet ではない
    const sorted = Object.entries(distribution).sort(([, a], [, b]) => b - a)
    const summary = sorted.map(([cat, count]) => `${cat}: ${count}`).join(', ')

    // 全カテゴリに少なくとも 1 ルールがあることを確認
    const expectedCategories = [
      'terminology',
      'semantic-boundary',
      'registry-integrity',
      'bridge-runtime-boundary',
      'current-candidate-lifecycle',
      'docs-synchronization',
      'promote-retire-lifecycle',
      'ratchet-legacy-control',
    ]
    const missingCategories = expectedCategories.filter((c) => !distribution[c])
    expect(
      missingCategories,
      `カテゴリにルールがない: ${missingCategories.join(', ')}\n分布: ${summary}`,
    ).toEqual([])
  })
})
