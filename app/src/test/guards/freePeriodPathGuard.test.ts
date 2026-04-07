/**
 * 自由期間分析正本ガード
 *
 * readFreePeriodFact / freePeriodHandler が唯一の分析用正本。
 * presentation 層からの独自取得経路を禁止する。
 *
 * @see references/01-principles/free-period-analysis-definition.md
 * ルール定義: architectureRules.ts (AR-PATH-FREE-PERIOD)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const SRC_DIR = path.resolve(__dirname, '../..')

describe('自由期間分析正本ガード', () => {
  // ── 正本関数の存在確認 ──

  it('buildFreePeriodReadModel が存在し Zod parse を含む', () => {
    const file = path.join(SRC_DIR, 'application/readModels/freePeriod/readFreePeriodFact.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('export function buildFreePeriodReadModel(')
    expect(content).toContain('FreePeriodReadModel.parse')
  })

  it('FreePeriodTypes に Zod 契約が定義されている', () => {
    const file = path.join(SRC_DIR, 'application/readModels/freePeriod/FreePeriodTypes.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('FreePeriodReadModel')
    expect(content).toContain('FreePeriodDailyRow')
    expect(content).toContain('FreePeriodSummary')
    expect(content).toContain('FreePeriodQueryInput')
  })

  it('freePeriodHandler が QueryHandler として存在する', () => {
    const file = path.join(SRC_DIR, 'application/queries/freePeriodHandler.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('freePeriodHandler')
    expect(content).toContain('buildFreePeriodReadModel')
  })

  // ── presentation 層からの独自取得経路禁止 ──

  it('presentation 層が readFreePeriodFact を直接 import しない', () => {
    const presFiles = collectTsFiles(path.join(SRC_DIR, 'presentation'))
    const violations: string[] = []

    const BANNED_PATTERNS = [
      'readFreePeriodFact',
      'freePeriodHandler',
      '@/infrastructure/duckdb/queries/freePeriodFactQueries',
    ]

    for (const file of presFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const pattern of BANNED_PATTERNS) {
        if (content.includes(pattern)) {
          const relPath = rel(file)
          if (!relPath.includes('__tests__') && !relPath.includes('.test.')) {
            violations.push(`${relPath}: ${pattern}`)
          }
        }
      }
    }

    expect(
      violations,
      `presentation 層が正本関数を直接 import しています:\n${violations.join('\n')}\n` +
        `useFreePeriodAnalysisBundle hook 経由で使用してください`,
    ).toEqual([])
  })

  // ── ComparisonScope 経由の比較強制 ──

  it('presentation 層で比較先日付を独自計算しない', () => {
    const presFiles = collectTsFiles(path.join(SRC_DIR, 'presentation'))
    const COMPARISON_PATTERNS = [/buildComparisonScope/, /buildFreePeriodFrame/]
    const violations: string[] = []

    for (const file of presFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const line of content.split('\n')) {
        if (line.trimStart().startsWith('import type')) continue
        if (COMPARISON_PATTERNS.some((p) => p.test(line))) {
          const relPath = rel(file)
          if (!relPath.includes('__tests__') && !relPath.includes('.test.')) {
            violations.push(`${relPath}: ${line.trim().slice(0, 80)}`)
          }
        }
      }
    }

    expect(
      violations,
      `presentation 層が比較/分析フレームを直接構築しています:\n${violations.join('\n')}\n` +
        `application 層の hook 経由で構築してください`,
    ).toEqual([])
  })

  // ── 定義文書の存在確認 ──

  it('定義文書が存在する', () => {
    const defFile = path.resolve(
      SRC_DIR,
      '../../references/01-principles/free-period-analysis-definition.md',
    )
    expect(fs.existsSync(defFile), 'free-period-analysis-definition.md が存在しない').toBe(true)
  })

  it('粒度契約文書が存在する', () => {
    const contractFile = path.resolve(
      SRC_DIR,
      '../../references/01-principles/free-period-budget-kpi-contract.md',
    )
    expect(fs.existsSync(contractFile), 'free-period-budget-kpi-contract.md が存在しない').toBe(
      true,
    )
  })
})
