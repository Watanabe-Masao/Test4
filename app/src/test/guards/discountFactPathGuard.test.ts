/**
 * 値引きファクト正本ガード
 *
 * readDiscountFact / discountFactHandler が唯一の分析用正本。
 * presentation 層からの旧クエリ直接利用を禁止する。
 *
 * @see references/01-principles/discount-definition.md
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')

describe('値引きファクト正本ガード', () => {
  // ── 正本関数の存在確認 ──

  it('readDiscountFact が純関数として存在する', () => {
    const file = path.join(SRC_DIR, 'application/readModels/discountFact/readDiscountFact.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('export async function readDiscountFact(')
    expect(content).toContain('export const discountFactHandler')
    expect(content).toContain('DiscountFactReadModel.parse')
  })

  it('DiscountFactTypes に Zod 契約が定義されている', () => {
    const file = path.join(SRC_DIR, 'application/readModels/discountFact/DiscountFactTypes.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('DiscountFactReadModel')
    expect(content).toContain('DiscountFactRow')
    expect(content).toContain('discount71')
  })

  // ── presentation 層から旧 classified_sales クエリへの直接 import 禁止 ──

  /** presentation 層から直接 import してはならない旧クエリモジュール */
  const BANNED_IMPORTS = ['@/infrastructure/duckdb/queries/classifiedSales']

  /**
   * classified_sales の直接 import が許容される presentation ファイル。
   * CategoryDiscountHandler 経由の型参照は許容。
   */
  const ALLOWED_PRESENTATION_FILES = new Set([
    // CategoryDiscountChart は categoryDiscountHandler（別の QueryHandler）経由。
    // 値引きファクトとは独立した経路であり、readDiscountFact の責務範囲外。
    'presentation/components/charts/CategoryDiscountChart.tsx',
  ])

  it('presentation 層から旧値引きクエリへの直接 import がない', () => {
    const presentationDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presentationDir)
    const violations: string[] = []

    for (const file of files) {
      const relPath = rel(file)
      if (ALLOWED_PRESENTATION_FILES.has(relPath)) continue
      const content = fs.readFileSync(file, 'utf-8')
      for (const banned of BANNED_IMPORTS) {
        if (content.includes(banned)) {
          violations.push(`${relPath}: ${banned} を直接 import`)
        }
      }
    }

    expect(
      violations,
      `presentation 層から旧値引きクエリへの直接 import:\n${violations.join('\n')}\n` +
        '→ readDiscountFact / useWidgetDataOrchestrator 経由に切り替えてください',
    ).toEqual([])
  })

  // ── useWidgetDataOrchestrator が discountFactHandler を統合していること ──

  it('useWidgetDataOrchestrator が discountFactHandler を統合している', () => {
    const file = path.join(SRC_DIR, 'application/hooks/useWidgetDataOrchestrator.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('discountFactHandler')
  })

  // ── 定義書の存在確認 ──

  it('値引きの正本定義書が存在する', () => {
    const defFile = path.resolve(SRC_DIR, '../../references/01-principles/discount-definition.md')
    expect(fs.existsSync(defFile)).toBe(true)
  })
})
