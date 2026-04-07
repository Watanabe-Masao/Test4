/**
 * 正本化体系 統合ガード
 *
 * 全 readModels / 計算正本の利用経路を構造的に検証する。
 * 旧経路の新規利用を禁止し、正本化体系の維持を保証する。
 *
 * @see references/01-principles/canonicalization-principles.md
 * ルール定義: architectureRules.ts (AR-STRUCT-CANONICALIZATION)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const SRC_DIR = path.resolve(__dirname, '../..')
const REFS_DIR = path.resolve(SRC_DIR, '../../references/01-principles')

describe('正本化体系 統合ガード', () => {
  const rule = getRuleById('AR-STRUCT-CANONICALIZATION')!
  // ── 全 readModels の存在確認 ──

  const REQUIRED_READ_MODELS = [
    'purchaseCost',
    'grossProfit',
    'salesFact',
    'discountFact',
    'factorDecomposition',
    'freePeriod',
  ]

  it('全 readModels ディレクトリが存在する', () => {
    for (const name of REQUIRED_READ_MODELS) {
      const dir = path.join(SRC_DIR, 'application/readModels', name)
      expect(fs.existsSync(dir), `readModels/${name}/ が存在しない`).toBe(true)
    }
  })

  it('各 readModel に Types.ts + 実装.ts + index.ts が揃っている', () => {
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
      // 実装ファイル（read*.ts or calculate*.ts）
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

  // ── 全定義書の存在確認 ──

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
    const missing: string[] = []
    for (const name of REQUIRED_DEFINITIONS) {
      const file = path.join(REFS_DIR, name)
      if (!fs.existsSync(file)) {
        missing.push(name)
      }
    }
    expect(missing, formatViolationMessage(rule, missing)).toEqual([])
  })

  // ── 新規 domain/calculations ファイルがレジストリに登録されていること ──

  it('calculationCanonRegistry が存在する', () => {
    const file = path.join(SRC_DIR, 'test/calculationCanonRegistry.ts')
    expect(fs.existsSync(file)).toBe(true)
  })

  // ── widget orchestrator の存在確認 ──

  it('useWidgetDataOrchestrator が存在する', () => {
    const file = path.join(SRC_DIR, 'application/hooks/useWidgetDataOrchestrator.ts')
    expect(fs.existsSync(file)).toBe(true)
  })

  // ── CLAUDE.md に正本化ルールが記載されていること ──

  it('CLAUDE.md に正本化体系が記載されている', () => {
    const claudeMd = path.resolve(SRC_DIR, '../../CLAUDE.md')
    const content = fs.readFileSync(claudeMd, 'utf-8')
    expect(content).toContain('readPurchaseCost')
    expect(content).toContain('calculateGrossProfit')
    expect(content).toContain('readSalesFact')
    expect(content).toContain('readDiscountFact')
    expect(content).toContain('calculateFactorDecomposition')
    expect(content).toContain('useWidgetDataOrchestrator')
    expect(content).toContain('canonicalization-principles.md')
  })
})
