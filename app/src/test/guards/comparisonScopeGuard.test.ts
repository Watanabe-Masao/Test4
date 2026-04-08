/**
 * ComparisonScope 正本ガード
 *
 * buildComparisonScope() が比較解決の唯一入口。
 * presentation 層での独自比較計算を禁止する。
 *
 * @see references/01-principles/free-period-analysis-definition.md
 * @see temporal-scope-semantics.md
 * ルール定義: architectureRules.ts (AR-STRUCT-COMPARISON-SCOPE)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const SRC_DIR = path.resolve(__dirname, '../..')

describe('ComparisonScope 正本ガード', () => {
  const rule = getRuleById('AR-STRUCT-COMPARISON-SCOPE')!

  // ── 正本関数の存在確認 ──

  it('buildComparisonScope が唯一の factory として存在する', () => {
    const file = path.join(SRC_DIR, 'domain/models/ComparisonScope.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('export function buildComparisonScope(')
  })

  it('ComparisonScopeSchema が Zod 契約として存在する', () => {
    const file = path.join(SRC_DIR, 'domain/models/ComparisonScopeSchema.ts')
    expect(fs.existsSync(file), 'ComparisonScopeSchema.ts が存在しない').toBe(true)
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('ComparisonScopeSchema')
    expect(content).toContain('alignmentMode')
    expect(content).toContain('alignmentMap')
  })

  // ── presentation 層での独自比較禁止 ──

  it('presentation 層が buildComparisonScope を直接 import しない', () => {
    const presFiles = collectTsFiles(path.join(SRC_DIR, 'presentation'))
    const violations: string[] = []

    for (const file of presFiles) {
      if (file.includes('__tests__') || file.includes('.test.')) continue
      const content = fs.readFileSync(file, 'utf-8')
      for (const line of content.split('\n')) {
        if (line.trimStart().startsWith('import type')) continue
        if (/buildComparisonScope/.test(line)) {
          violations.push(rel(file))
          break
        }
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('presentation 層で prevYear の年月を独自計算しない', () => {
    const presFiles = collectTsFiles(path.join(SRC_DIR, 'presentation'))
    // targetYear - 1 を使って比較先月を独自に決めるパターンを検出
    // Admin 設定 UI の表示用は除外（PrevYearMappingTab）
    const BANNED = /(?:year|Year)\s*[-]\s*1.*(?:month|Month)/
    const ALLOWED_FILES = [
      'PrevYearMappingTab',
      // 既存: 段階移行対象
      'DailySalesChartBodyLogic',
      'YoYWaterfallChart',
    ]
    const violations: string[] = []

    for (const file of presFiles) {
      if (file.includes('__tests__') || file.includes('.test.')) continue
      if (ALLOWED_FILES.some((a) => file.includes(a))) continue
      const content = fs.readFileSync(file, 'utf-8')
      for (const line of content.split('\n')) {
        if (line.trimStart().startsWith('//')) continue
        if (BANNED.test(line)) {
          violations.push(`${rel(file)}: ${line.trim().slice(0, 80)}`)
          break
        }
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  // ── 無スコープ命名の検出（temporal-scope-semantics 準拠） ──

  it('新規ファイルで prevYearSales のような無スコープ変数名を使わない', () => {
    // temporal-scope-semantics.md: 変数名にスコープを含めること
    // prevYearSales → sameDatePrevYearSales / sameDowPrevYearSales / monthlyTotalPrevYearSales
    const UNSCOPED_PATTERNS = [/\bprevYearSales\b/, /\bprevYearCustomers\b/, /\bprevYearBudget\b/]
    // 既存ファイルは除外（段階移行）
    const GRANDFATHERED = new Set([
      'presentation/pages/Dashboard/widgets/conditionSummaryCardBuilders.ts',
      'presentation/pages/Dashboard/widgets/conditionSummaryUtils.ts',
      // 既存: 段階移行対象
      'application/hooks/useDailySalesData.ts',
      'application/rules/alertSystem.ts',
      'features/sales/application/dailySalesTransform.ts',
      'presentation/components/charts/DailySalesChartBody.builders.ts',
      'presentation/components/charts/DailySalesChartBodyLogic.ts',
    ])

    const allFiles = collectTsFiles(SRC_DIR)
    const violations: string[] = []

    for (const file of allFiles) {
      if (file.includes('__tests__') || file.includes('.test.')) continue
      const relPath = rel(file)
      if (GRANDFATHERED.has(relPath)) continue
      const content = fs.readFileSync(file, 'utf-8')
      for (const line of content.split('\n')) {
        if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue
        if (UNSCOPED_PATTERNS.some((p) => p.test(line))) {
          violations.push(`${relPath}: ${line.trim().slice(0, 80)}`)
          break
        }
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })
})
