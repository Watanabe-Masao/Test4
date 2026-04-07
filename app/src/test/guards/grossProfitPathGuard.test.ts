/**
 * 粗利計算正本ガード
 *
 * 粗利の計算正本は calculateGrossProfit / calculateGrossProfitWithFallback。
 * conditionSummaryUtils の4関数はこの正本経由に統一済み。
 *
 * @see references/01-principles/gross-profit-definition.md
 * ルール定義: architectureRules.ts (AR-PATH-GROSS-PROFIT)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const SRC_DIR = path.resolve(__dirname, '../..')

describe('粗利計算正本ガード', () => {
  // ── 正本関数の存在確認 ──

  it('calculateGrossProfit が純関数として存在する', () => {
    const file = path.join(SRC_DIR, 'application/readModels/grossProfit/calculateGrossProfit.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('export function calculateGrossProfit(')
    expect(content).toContain('export function calculateGrossProfitWithFallback(')
    expect(content).toContain('export function grossProfitFromStoreResult(')
    expect(content).toContain('GrossProfitReadModel.parse')
  })

  it('GrossProfitTypes に Zod 契約が定義されている', () => {
    const file = path.join(SRC_DIR, 'application/readModels/grossProfit/GrossProfitTypes.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('GrossProfitInput')
    expect(content).toContain('GrossProfitResult')
    expect(content).toContain('GrossProfitMeta')
    expect(content).toContain('GrossProfitReadModel')
  })

  // ── conditionSummaryUtils が正本経由であること ──

  it('conditionSummaryUtils は grossProfitFromStoreResult 経由で粗利を計算する', () => {
    const file = path.join(SRC_DIR, 'presentation/pages/Dashboard/widgets/conditionSummaryUtils.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('grossProfitFromStoreResult')
    // 旧ロジックが残っていないこと
    expect(content).not.toContain('invMethodGrossProfit!')
    expect(content).not.toContain('sr.estMethodMarginRate')
    expect(content).not.toContain('getEffectiveGrossProfitRate')
  })

  // ── presentation 層で粗利の独自計算がないこと ──

  const GP_INLINE_CALC_PATTERN = /invMethodGrossProfit\s*[-+*/]|invMethodGrossProfit\s*!\s*[-+*/]/

  /** 粗利の独自計算が許容されるファイル */
  const ALLOWED_GP_CALC_FILES = new Set([
    // 計算層: 両方法を独立に実行し StoreResult に格納（意図的な直接アクセス）
    'application/readModels/grossProfit/calculateGrossProfit.ts',
    'application/usecases/calculation/storeAssembler.ts',
    'application/usecases/calculation/aggregateResults.ts',
    'application/usecases/calculation/collectionAggregator.ts',
    'application/usecases/explanation/budgetExplanations.ts',
    'application/services/grossProfitBridge.ts',
    'domain/calculations/invMethod.ts',
    'domain/calculations/estMethod.ts',
    'domain/calculations/utils.ts',
    // 在庫法/推定法の詳細分岐を意図的に表示するビュー（正本関数では情報が足りない）
    // これらは「フォールバック後の単一値」ではなく「両方法の内部構造」を表示する
    'presentation/pages/Dashboard/widgets/ExecSummaryBarWidget.tsx',
    'presentation/pages/Dashboard/widgets/PlanActualForecast.tsx',
    'presentation/pages/Dashboard/widgets/conditionSummaryDailyBuilders.ts',
  ])

  it('presentation 層で粗利のインライン計算パターンが制限されている', () => {
    const presentationDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presentationDir)
    const violations: string[] = []

    for (const file of files) {
      const relPath = rel(file)
      if (ALLOWED_GP_CALC_FILES.has(relPath)) continue
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (GP_INLINE_CALC_PATTERN.test(lines[i])) {
          violations.push(`${relPath}:${i + 1}: ${lines[i].trim()}`)
        }
      }
    }

    expect(
      violations,
      `presentation 層で粗利のインライン計算を検出:\n${violations.join('\n')}\n` +
        '→ grossProfitFromStoreResult() 経由に切り替えてください',
    ).toEqual([])
  })

  // ── getEffectiveGrossProfitRate の利用箇所凍結 ──

  /**
   * getEffectiveGrossProfitRate は domain 層の単純アクセサ（2層構造の利用層）。
   * 既存の利用は許容するが、新規の追加は grossProfitFromStoreResult 経由を推奨する。
   * 上限を超えた場合は新規利用を正本経由に切り替えること。
   */
  const GET_EFFECTIVE_GP_RATE_MAX_FILES = 13

  it('getEffectiveGrossProfitRate の利用ファイル数が凍結上限を超えていない', () => {
    const allFiles = collectTsFiles(path.join(SRC_DIR))
    let count = 0
    for (const file of allFiles) {
      const relPath = rel(file)
      // 定義元と正本ガード自身は除外
      if (relPath === 'domain/calculations/utils.ts') continue
      if (relPath.startsWith('test/guards/')) continue
      const content = fs.readFileSync(file, 'utf-8')
      if (content.includes('getEffectiveGrossProfitRate')) count++
    }
    expect(
      count,
      `getEffectiveGrossProfitRate の利用ファイル数が ${GET_EFFECTIVE_GP_RATE_MAX_FILES} を超過（現在 ${count}）\n` +
        '→ 新規利用は grossProfitFromStoreResult() 経由に切り替えてください',
    ).toBeLessThanOrEqual(GET_EFFECTIVE_GP_RATE_MAX_FILES)
  })

  // ── getEffectiveGrossProfit（額）の利用箇所凍結 ──

  const GET_EFFECTIVE_GP_AMOUNT_MAX_FILES = 7

  it('getEffectiveGrossProfit の利用ファイル数が凍結上限を超えていない', () => {
    const allFiles = collectTsFiles(path.join(SRC_DIR))
    let count = 0
    for (const file of allFiles) {
      const relPath = rel(file)
      if (relPath === 'domain/calculations/utils.ts') continue
      if (relPath.startsWith('test/guards/')) continue
      const content = fs.readFileSync(file, 'utf-8')
      if (content.includes('getEffectiveGrossProfit(')) count++
    }
    expect(
      count,
      `getEffectiveGrossProfit の利用ファイル数が ${GET_EFFECTIVE_GP_AMOUNT_MAX_FILES} を超過（現在 ${count}）\n` +
        '→ 新規利用は grossProfitFromStoreResult() 経由に切り替えてください',
    ).toBeLessThanOrEqual(GET_EFFECTIVE_GP_AMOUNT_MAX_FILES)
  })

  // ── raw fallback パターン禁止 ──

  /**
   * invMethodGrossProfit ?? estMethodMargin の直接 fallback パターンを禁止。
   * getEffectiveGrossProfit() を使用すること。
   */
  const RAW_GP_FALLBACK_ALLOWED = new Set([
    // 定義元
    'domain/calculations/utils.ts',
  ])

  it('invMethodGrossProfit ?? estMethodMargin の raw パターンが許可リスト外にない', () => {
    const allFiles = collectTsFiles(path.join(SRC_DIR))
    const violations: string[] = []
    for (const file of allFiles) {
      const relPath = rel(file)
      if (RAW_GP_FALLBACK_ALLOWED.has(relPath)) continue
      if (relPath.startsWith('test/')) continue
      const content = fs.readFileSync(file, 'utf-8')
      if (/invMethodGrossProfit\s*\?\?\s*[\w.]*estMethodMargin/.test(content)) {
        violations.push(relPath)
      }
    }
    expect(
      violations,
      `raw GP fallback パターン検出:\n${violations.join('\n')}\n` +
        '→ getEffectiveGrossProfit() を使用してください',
    ).toEqual([])
  })

  // ── 定義書の存在確認 ──

  it('粗利の正本定義書が存在する', () => {
    const defFile = path.resolve(
      SRC_DIR,
      '../../references/01-principles/gross-profit-definition.md',
    )
    expect(fs.existsSync(defFile)).toBe(true)
  })
})
