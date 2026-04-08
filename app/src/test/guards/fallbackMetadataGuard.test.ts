/**
 * Fallback Metadata Guard — 全 critical readModel に usedFallback が存在することを保証
 *
 * silent fallback を防ぐ。readModel の Zod 契約に usedFallback フィールドが
 * 含まれていない場合、このテストが失敗する。
 *
 * @invariant INV-CANON-17 Fallback Transparency
 * ルール定義: architectureRules.ts (AR-STRUCT-FALLBACK-METADATA)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const READ_MODELS_DIR = path.join(SRC_DIR, 'application/readModels')

/** 検査対象の readModel Types ファイル */
const CRITICAL_READ_MODELS = [
  'purchaseCost/PurchaseCostTypes.ts',
  'salesFact/SalesFactTypes.ts',
  'discountFact/DiscountFactTypes.ts',
  'grossProfit/GrossProfitTypes.ts',
  'factorDecomposition/FactorDecompositionTypes.ts',
  'freePeriod/FreePeriodTypes.ts',
  'customerFact/CustomerFactTypes.ts',
] as const

describe('fallback metadata guard', () => {
  const rule = getRuleById('AR-STRUCT-FALLBACK-METADATA')!

  it.each(CRITICAL_READ_MODELS)('%s の Zod 契約に usedFallback フィールドが存在する', (relPath) => {
    const filePath = path.join(READ_MODELS_DIR, relPath)
    const content = fs.readFileSync(filePath, 'utf-8')

    expect(
      content,
      `[${rule.id}] ${relPath} に usedFallback フィールドがありません。\n正しいパターン: ${rule.correctPattern.description}`,
    ).toContain('usedFallback')
  })

  it('全 critical readModel の builder が usedFallback を設定している', () => {
    const builderFiles = [
      'purchaseCost/readPurchaseCost.ts',
      'salesFact/readSalesFact.ts',
      'discountFact/readDiscountFact.ts',
      'grossProfit/calculateGrossProfit.ts',
      'factorDecomposition/calculateFactorDecomposition.ts',
      'freePeriod/readFreePeriodFact.ts',
    ]

    const missing: string[] = []
    for (const relPath of builderFiles) {
      const filePath = path.join(READ_MODELS_DIR, relPath)
      if (!fs.existsSync(filePath)) continue
      const content = fs.readFileSync(filePath, 'utf-8')
      if (!content.includes('usedFallback')) {
        missing.push(relPath)
      }
    }

    expect(missing, formatViolationMessage(rule, missing)).toEqual([])
  })

  it('新しい readModel ディレクトリが追加されたら検査対象に含まれている', () => {
    if (!fs.existsSync(READ_MODELS_DIR)) return

    const dirs = fs
      .readdirSync(READ_MODELS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)

    const knownDirs = CRITICAL_READ_MODELS.map((p) => p.split('/')[0])
    const knownSet = new Set(knownDirs)
    const untracked = dirs.filter((d) => !knownSet.has(d))

    expect(untracked, formatViolationMessage(rule, untracked)).toEqual([])
  })
})
