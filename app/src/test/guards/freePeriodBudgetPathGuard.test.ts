/**
 * 自由期間予算 正本ガード
 *
 * readFreePeriodBudgetFact が唯一の自由期間予算取得経路。
 *
 * @see references/01-principles/free-period-budget-kpi-contract.md
 * ルール定義: architectureRules.ts (AR-PATH-FREE-PERIOD-BUDGET)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')

describe('自由期間予算 正本ガード', () => {
  it('readFreePeriodBudgetFact が存在し Zod parse を含む', () => {
    const file = path.join(SRC_DIR, 'application/readModels/freePeriod/readFreePeriodBudgetFact.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('export function buildFreePeriodBudgetReadModel(')
    expect(content).toContain('FreePeriodBudgetReadModel.parse')
  })

  it('FreePeriodBudgetTypes に Zod 契約が定義されている', () => {
    const file = path.join(SRC_DIR, 'application/readModels/freePeriod/FreePeriodBudgetTypes.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('FreePeriodBudgetReadModel')
    expect(content).toContain('FreePeriodBudgetRow')
    expect(content).toContain('FreePeriodBudgetQueryInput')
  })

  it('presentation 層が readFreePeriodBudgetFact を直接 import しない', () => {
    const presFiles = collectTsFiles(path.join(SRC_DIR, 'presentation'))
    const violations: string[] = []
    for (const file of presFiles) {
      if (file.includes('__tests__') || file.includes('.test.')) continue
      const content = fs.readFileSync(file, 'utf-8')
      if (content.includes('readFreePeriodBudgetFact')) {
        violations.push(rel(file))
      }
    }
    expect(violations).toEqual([])
  })

  it('prorateBudgetForPeriod が純粋関数として存在する', () => {
    const file = path.join(SRC_DIR, 'application/readModels/freePeriod/readFreePeriodBudgetFact.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('export function prorateBudgetForPeriod(')
  })

  it('粒度契約文書が存在する', () => {
    const file = path.resolve(
      SRC_DIR,
      '../../references/01-principles/free-period-budget-kpi-contract.md',
    )
    expect(fs.existsSync(file)).toBe(true)
  })
})
