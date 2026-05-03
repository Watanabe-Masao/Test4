/**
 * 正本化体系 統合ガード
 *
 * 全 readModels / 計算正本の利用経路を構造的に検証する。
 * 旧経路の新規利用を禁止し、正本化体系の維持を保証する。
 *
 * **Phase D Wave 1 (2026-04-28)**: canonicalization-domain-consolidation Phase D で
 * `app-domain/integrity/` 経由の adapter 化。pathExistence (readModel dir 6 +
 * 定義書 11 + registry 1 + orchestrator 1) + checkInclusionByPredicate
 * (CLAUDE.md token 7) に切替。Types.ts/index.ts/impl trio shape 検査は
 * readModels 専用なので caller side に inline 残置。動作同一性は 5 既存 test で検証済。
 *
 * @see references/01-foundation/canonicalization-principles.md
 * ルール定義: architectureRules.ts (AR-STRUCT-CANONICALIZATION)
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { getRuleById, formatViolationMessage } from '../architectureRules'
import {
  checkPathExistence,
  checkInclusionByPredicate,
  type RegisteredPath,
} from '@app-domain/integrity'

const SRC_DIR = path.resolve(__dirname, '../..')

const REFS_DIR = path.resolve(SRC_DIR, '../../references/01-foundation')

describe('正本化体系 統合ガード', () => {
  const rule = getRuleById('AR-STRUCT-CANONICALIZATION')!

  const REQUIRED_READ_MODELS = [
    'purchaseCost',
    'grossProfit',
    'salesFact',
    'discountFact',
    'factorDecomposition',
    'freePeriod',
  ]

  it('全 readModels ディレクトリが存在する', () => {
    const paths: RegisteredPath[] = REQUIRED_READ_MODELS.map((name) => ({
      absPath: path.join(SRC_DIR, 'application/readModels', name),
      displayPath: `readModels/${name}/`,
    }))
    const violations = checkPathExistence(paths, fs.existsSync, {
      ruleId: rule.id,
      registryLabel: 'REQUIRED_READ_MODELS',
    })
    const missing = violations.map((v) => v.actual.replace(/ \(broken link\)$/, ''))
    expect(missing, formatViolationMessage(rule, missing)).toEqual([])
  })

  it('各 readModel に Types.ts + 実装.ts + index.ts が揃っている', () => {
    // trio shape (Types.ts + index.ts + read*/calculate*.ts) は readModels 専用パターン
    // のため domain primitive で表現せず、本 file 内 inline で残置 (一般化候補は Phase E
    // で再評価)。ratchet-down 採用なし、binary 存在検証。
    const violations: string[] = []
    for (const name of REQUIRED_READ_MODELS) {
      const dir = path.join(SRC_DIR, 'application/readModels', name)
      if (!fs.existsSync(dir)) continue
      const files = fs.readdirSync(dir)
      if (!files.some((f) => f.includes('Types.ts'))) {
        violations.push(`${name}: Types.ts がない`)
      }
      if (!files.some((f) => f === 'index.ts')) {
        violations.push(`${name}: index.ts がない`)
      }
      if (
        !files.some(
          (f) =>
            (f.startsWith('read') || f.startsWith('calculate')) &&
            f.endsWith('.ts') &&
            !f.includes('.test.'),
        )
      ) {
        violations.push(`${name}: 実装ファイル（read*.ts or calculate*.ts）がない`)
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  const REQUIRED_DEFINITIONS = [
    'purchase-cost-definition.md',
    'gross-profit-definition.md',
    'sales-definition.md',
    'discount-definition.md',
    'budget-definition.md',
    'kpi-definition.md',
    'pi-value-definition.md',
    'customer-gap-definition.md',
    'authoritative-calculation-definition.md',
    'canonicalization-principles.md',
    'calculation-canonicalization-map.md',
  ]

  it('全定義書が存在する', () => {
    const paths: RegisteredPath[] = REQUIRED_DEFINITIONS.map((name) => ({
      absPath: path.join(REFS_DIR, name),
      displayPath: name,
    }))
    const violations = checkPathExistence(paths, fs.existsSync, {
      ruleId: rule.id,
      registryLabel: 'REQUIRED_DEFINITIONS',
    })
    const missing = violations.map((v) => v.actual.replace(/ \(broken link\)$/, ''))
    expect(missing, formatViolationMessage(rule, missing)).toEqual([])
  })

  it('calculationCanonRegistry が存在する', () => {
    const paths: RegisteredPath[] = [
      {
        absPath: path.join(SRC_DIR, 'test/calculationCanonRegistry.ts'),
        displayPath: 'test/calculationCanonRegistry.ts',
      },
    ]
    const violations = checkPathExistence(paths, fs.existsSync, {
      ruleId: rule.id,
      registryLabel: 'canonicalizationSystemGuard',
    })
    expect(violations).toEqual([])
  })

  it('useWidgetDataOrchestrator が存在する', () => {
    const paths: RegisteredPath[] = [
      {
        absPath: path.join(SRC_DIR, 'application/hooks/useWidgetDataOrchestrator.ts'),
        displayPath: 'application/hooks/useWidgetDataOrchestrator.ts',
      },
    ]
    const violations = checkPathExistence(paths, fs.existsSync, {
      ruleId: rule.id,
      registryLabel: 'canonicalizationSystemGuard',
    })
    expect(violations).toEqual([])
  })

  it('CLAUDE.md に正本化体系が記載されている', () => {
    const claudeMdPath = path.resolve(SRC_DIR, '../../CLAUDE.md')
    const content = fs.readFileSync(claudeMdPath, 'utf-8')
    const requiredTokens = new Set([
      'readPurchaseCost',
      'calculateGrossProfit',
      'readSalesFact',
      'readDiscountFact',
      'calculateFactorDecomposition',
      'useWidgetDataOrchestrator',
      'canonicalization-principles.md',
    ])
    const violations = checkInclusionByPredicate(
      requiredTokens,
      (token) => content.includes(token),
      {
        ruleId: rule.id,
        subsetLabel: 'CLAUDE.md required tokens',
        supersetLabel: 'CLAUDE.md',
      },
    )
    expect(
      violations.length,
      formatViolationMessage(
        rule,
        violations.map((v) => v.location),
      ),
    ).toBe(0)
  })
})
