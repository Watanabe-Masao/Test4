/**
 * 粗利計算正本ガード
 *
 * 粗利の計算正本は calculateGrossProfit / calculateGrossProfitWithFallback。
 * conditionSummaryUtils の4関数はこの正本経由に統一済み。
 *
 * @see references/01-principles/gross-profit-definition.md
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

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
    'application/readModels/grossProfit/calculateGrossProfit.ts',
    'application/usecases/calculation/storeAssembler.ts',
    'application/services/grossProfitBridge.ts',
    'domain/calculations/invMethod.ts',
    'domain/calculations/estMethod.ts',
    'domain/calculations/utils.ts',
    // 表示専用の直接アクセスは現状許容（Step 5c で段階的に収束）
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

  // ── 定義書の存在確認 ──

  it('粗利の正本定義書が存在する', () => {
    const defFile = path.resolve(
      SRC_DIR,
      '../../references/01-principles/gross-profit-definition.md',
    )
    expect(fs.existsSync(defFile)).toBe(true)
  })
})
