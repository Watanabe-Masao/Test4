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
 */
import { describe, it, expect } from 'vitest'
import * as path from 'path'
import { collectTsFiles } from '../guardTestHelpers'
import { CALCULATION_CANON_REGISTRY } from '../calculationCanonRegistry'
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
      if (entry.runtimeStatus === 'candidate') continue
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
        entry.runtimeStatus !== 'candidate'
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
    // business: 13 current + 3 candidate (BIZ-008, BIZ-012, BIZ-013) = 16
    expect(business).toBe(16)
    expect(analytic).toBe(9)
    expect(utility).toBe(13)
  })
})
