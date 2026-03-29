/**
 * 仕入原価取得経路ガード — 3層防御
 *
 * 仕入原価の正本は readPurchaseCost / usePurchaseCost に統一されている。
 * 旧経路からの逸脱を防ぎ、値の不一致再発を防止する。
 *
 * @see references/01-principles/purchase-cost-definition.md
 * @see references/03-guides/purchase-cost-unification-plan.md
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')

describe('仕入原価取得経路ガード', () => {
  // ── Layer 1: import 経路ガード ──
  // presentation 層が旧購買系クエリを直接 import していないこと

  const BANNED_IMPORTS_IN_PRESENTATION = [
    'queryPurchaseDailyBySupplier',
    'querySpecialSalesDaily',
    'queryTransfersDaily',
    'queryPurchaseTotal',
    'querySpecialSalesTotal',
    'queryTransfersTotal',
    'queryPurchaseBySupplier',
    'queryPurchaseByStore',
  ]

  it('presentation/ は旧購買系クエリを直接 import しない', () => {
    const presentationDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presentationDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const banned of BANNED_IMPORTS_IN_PRESENTATION) {
        if (content.includes(banned)) {
          violations.push(`${rel(file)}: ${banned}`)
        }
      }
    }

    expect(
      violations,
      `presentation 層が旧購買系クエリを直接参照:\n${violations.join('\n')}\n` +
        '→ usePurchaseCost() 経由に切り替えてください',
    ).toEqual([])
  })

  // ── Layer 2: 集計経路ガード ──
  // purchaseComparison 系ビルダー以外で仕入原価の合計を組み立てていないこと

  /** 仕入原価を独自集計するパターン（旧経路でよく使われた SUM(cost) パターン） */
  const COST_SUM_PATTERN =
    /(?:totalCost|totalPrice)\s*\+=.*(?:purchase|special|transfer|花|産直|移動)/i

  /** 正当な集計元（これらのファイル内は除外） */
  const ALLOWED_COST_AGGREGATION_FILES = new Set([
    'application/readModels/purchaseCost/readPurchaseCost.ts',
    'application/hooks/duckdb/purchaseComparisonKpi.ts',
    'application/hooks/duckdb/purchaseComparisonDaily.ts',
    'application/hooks/duckdb/purchaseComparisonCategory.ts',
    'application/hooks/duckdb/usePurchaseComparisonQuery.ts',
    'application/usecases/calculation/dailyBuilder.ts',
    'application/usecases/calculation/storeAssembler.ts',
    'domain/models/DailyRecord.ts',
  ])

  it('正当な集計元以外で仕入原価の独自集計パターンがない', () => {
    const appDir = path.join(SRC_DIR, 'application')
    const files = collectTsFiles(appDir)
    const violations: string[] = []

    for (const file of files) {
      const relPath = rel(file)
      if (ALLOWED_COST_AGGREGATION_FILES.has(relPath)) continue
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (COST_SUM_PATTERN.test(lines[i])) {
          violations.push(`${relPath}:${i + 1}: ${lines[i].trim()}`)
        }
      }
    }

    expect(
      violations,
      `正当な集計元以外で仕入原価の独自集計を検出:\n${violations.join('\n')}\n` +
        '→ readPurchaseCost の ReadModel から値を取得してください',
    ).toEqual([])
  })

  // ── Layer 3: 複合正本の一貫性ガード ──
  // readPurchaseCost が3正本を全て取得していること

  it('readPurchaseCost は3つの独立正本（通常仕入・売上納品・移動原価）を全て取得している', () => {
    const readFile = path.join(SRC_DIR, 'application/readModels/purchaseCost/readPurchaseCost.ts')
    const content = fs.readFileSync(readFile, 'utf-8')

    expect(content).toContain('queryPurchaseDailyBySupplier')
    expect(content).toContain('querySpecialSalesDaily')
    expect(content).toContain('queryTransfersDaily')
    expect(content).toContain('PurchaseCostReadModel.parse')
  })

  it('readPurchaseCost は grandTotalCost と inventoryPurchaseCost の両方を導出している', () => {
    const readFile = path.join(SRC_DIR, 'application/readModels/purchaseCost/readPurchaseCost.ts')
    const content = fs.readFileSync(readFile, 'utf-8')

    expect(content).toContain('grandTotalCost')
    expect(content).toContain('inventoryPurchaseCost')
  })

  it('usePurchaseComparisonQuery は purchaseCostHandler を使用している', () => {
    const queryFile = path.join(SRC_DIR, 'application/hooks/duckdb/usePurchaseComparisonQuery.ts')
    const content = fs.readFileSync(queryFile, 'utf-8')

    expect(content).toContain('purchaseCostHandler')
    // 旧経路の直接呼び出しがないこと
    expect(content).not.toContain('queryPurchaseDailyBySupplier')
    expect(content).not.toContain('querySpecialSalesDaily(')
    expect(content).not.toContain('queryTransfersDaily(')
  })

  // ── Layer 4: 正しい手続きの保証 ──
  // 正本が正しく使われ、正しい経路で値が流れていること

  it('usePurchaseComparisonQuery は複合正本の grandTotalCost で KPI を構築している', () => {
    const queryFile = path.join(SRC_DIR, 'application/hooks/duckdb/usePurchaseComparisonQuery.ts')
    const content = fs.readFileSync(queryFile, 'utf-8')

    // 正本の grandTotalCost から直接 KPI を構築（2段階上書きではなく単一フェーズ）
    expect(content).toContain('curModel.grandTotalCost')
    expect(content).toContain('prevModel.grandTotalCost')
    expect(content).toContain('buildKpi')
    // 旧 Total クエリを使用していないこと
    expect(content).not.toContain('queryPurchaseTotal')
    expect(content).not.toContain('querySpecialSalesTotal')
    expect(content).not.toContain('queryTransfersTotal')
    expect(content).not.toContain('computeKpiTotals')
  })

  it('usePurchaseComparisonQuery は ReadModel から変換ヘルパーでビルダーにデータを渡している', () => {
    const queryFile = path.join(SRC_DIR, 'application/hooks/duckdb/usePurchaseComparisonQuery.ts')
    const content = fs.readFileSync(queryFile, 'utf-8')

    expect(content).toContain('toPurchaseDailySupplierRows')
    expect(content).toContain('toCategoryDailyRows')
  })

  it('usePurchaseAnalysis は usePurchaseComparisonQuery を経由している', () => {
    const facadeFile = path.join(SRC_DIR, 'application/hooks/usePurchaseAnalysis.ts')
    const content = fs.readFileSync(facadeFile, 'utf-8')

    expect(content).toContain('usePurchaseComparisonQuery')
  })

  it('PurchaseAnalysisPage は usePurchaseAnalysis を経由している', () => {
    const pageFile = path.join(
      SRC_DIR,
      'presentation/pages/PurchaseAnalysis/PurchaseAnalysisPage.tsx',
    )
    const content = fs.readFileSync(pageFile, 'utf-8')

    expect(content).toContain('usePurchaseAnalysis')
    // 購買系クエリや purchaseCostHandler の直接使用がないこと
    expect(content).not.toContain('purchaseCostHandler')
    expect(content).not.toContain('queryPurchase')
  })
})
