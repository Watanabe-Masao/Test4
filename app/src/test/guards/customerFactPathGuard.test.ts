/**
 * CustomerFact Path Guard — 客数取得の唯一入口性を保証
 *
 * readCustomerFact() が客数の分析用正本の唯一入口であることを検証する。
 * presentation 層からの infra query 直接 import を禁止する。
 *
 * @see references/01-principles/customer-definition.md
 * @guard G1 テストに書く
 * ルール定義: architectureRules.ts (AR-PATH-CUSTOMER)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const SRC_DIR = path.resolve(__dirname, '../..')

describe('CustomerFact path guard', () => {
  it('readCustomerFact の実装が存在する', () => {
    const filePath = path.join(SRC_DIR, 'application/readModels/customerFact/readCustomerFact.ts')
    expect(fs.existsSync(filePath), 'readCustomerFact.ts が存在しません').toBe(true)
  })

  it('CustomerFactTypes に Zod スキーマが定義されている', () => {
    const filePath = path.join(SRC_DIR, 'application/readModels/customerFact/CustomerFactTypes.ts')
    const content = fs.readFileSync(filePath, 'utf-8')
    expect(content).toContain('CustomerFactReadModel')
    expect(content).toContain('CustomerFactDailyRow')
    expect(content).toContain('z.object')
  })

  it('orchestrator が customerFact を配布する', () => {
    const filePath = path.join(SRC_DIR, 'application/hooks/useWidgetDataOrchestrator.ts')
    const content = fs.readFileSync(filePath, 'utf-8')
    expect(content).toContain('customerFact')
    expect(content).toContain('customerFactHandler')
  })

  it('presentation 層が queryCustomerDaily を直接 import しない', () => {
    const presentationDir = path.join(SRC_DIR, 'presentation')
    if (!fs.existsSync(presentationDir)) return

    const files = collectTsFiles(presentationDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      if (content.includes('queryCustomerDaily')) {
        violations.push(rel(file))
      }
    }

    expect(
      violations,
      `presentation 層が queryCustomerDaily を直接 import しています:\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('定義書が存在する', () => {
    const defPath = path.join(SRC_DIR, '../../references/01-principles/customer-definition.md')
    expect(fs.existsSync(defPath), 'customer-definition.md が存在しません').toBe(true)
  })
})
