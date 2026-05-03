/**
 * 自由期間部門KPI 正本ガード
 *
 * readFreePeriodDeptKPI が唯一の自由期間部門KPI取得経路。
 *
 * @see references/01-foundation/free-period-budget-kpi-contract.md
 * ルール定義: architectureRules.ts (AR-PATH-FREE-PERIOD-DEPT-KPI)
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const SRC_DIR = path.resolve(__dirname, '../..')

describe('自由期間部門KPI 正本ガード', () => {
  const rule = getRuleById('AR-PATH-FREE-PERIOD-DEPT-KPI')!

  it('readFreePeriodDeptKPI が存在し Zod parse を含む', () => {
    const file = path.join(SRC_DIR, 'application/readModels/freePeriod/readFreePeriodDeptKPI.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('export function buildFreePeriodDeptKPIReadModel(')
    expect(content).toContain('FreePeriodDeptKPIReadModel.parse')
  })

  it('FreePeriodDeptKPITypes に Zod 契約が定義されている', () => {
    const file = path.join(SRC_DIR, 'application/readModels/freePeriod/FreePeriodDeptKPITypes.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('FreePeriodDeptKPIReadModel')
    expect(content).toContain('FreePeriodDeptKPIRow')
  })

  it('presentation 層が readFreePeriodDeptKPI を直接 import しない', () => {
    const presFiles = collectTsFiles(path.join(SRC_DIR, 'presentation'))
    const violations: string[] = []
    for (const file of presFiles) {
      if (file.includes('__tests__') || file.includes('.test.')) continue
      const content = fs.readFileSync(file, 'utf-8')
      if (content.includes('readFreePeriodDeptKPI')) {
        violations.push(rel(file))
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('dateRangeToYearMonths が純粋関数として存在する', () => {
    const file = path.join(SRC_DIR, 'application/readModels/freePeriod/readFreePeriodDeptKPI.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('export function dateRangeToYearMonths(')
  })
})
