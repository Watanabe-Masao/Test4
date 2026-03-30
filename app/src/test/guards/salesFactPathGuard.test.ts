/**
 * 売上ファクト正本ガード
 *
 * readSalesFact / salesFactHandler が唯一の分析用正本。
 * presentation 層からの旧クエリ直接利用を禁止する。
 *
 * @see references/01-principles/sales-definition.md
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')

describe('売上ファクト正本ガード', () => {
  // ── 正本関数の存在確認 ──

  it('readSalesFact が純関数として存在する', () => {
    const file = path.join(SRC_DIR, 'application/readModels/salesFact/readSalesFact.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('export async function readSalesFact(')
    expect(content).toContain('export const salesFactHandler')
    expect(content).toContain('SalesFactReadModel.parse')
  })

  it('SalesFactTypes に Zod 契約が定義されている', () => {
    const file = path.join(SRC_DIR, 'application/readModels/salesFact/SalesFactTypes.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('SalesFactReadModel')
    expect(content).toContain('SalesFactDailyRow')
    expect(content).toContain('SalesFactHourlyRow')
  })

  // ── presentation 層から旧 category_time_sales クエリへの直接 import 禁止 ──

  /** presentation 層から直接 import してはならない旧クエリモジュール */
  const BANNED_IMPORTS = [
    '@/infrastructure/duckdb/queries/categoryTimeSales',
    '@/infrastructure/duckdb/queries/timeSlots',
  ]

  /**
   * category_time_sales / time_slots の直接 import が許容される presentation ファイル。
   * CategoryDiscountHandler 経由で型だけ参照している等の正当なケース。
   */
  const ALLOWED_PRESENTATION_FILES = new Set<string>([
    // カテゴリ分析チャートは CategoryDiscountHandler 経由であり、
    // 売上ファクトとは別の正本（discountFact）を使用
  ])

  it('presentation 層から旧売上クエリへの直接 import がない', () => {
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
      `presentation 層から旧売上クエリへの直接 import:\n${violations.join('\n')}\n` +
        '→ readSalesFact / useWidgetDataOrchestrator 経由に切り替えてください',
    ).toEqual([])
  })

  // ── useWidgetDataOrchestrator が salesFactHandler を統合していること ──

  it('useWidgetDataOrchestrator が salesFactHandler を統合している', () => {
    const file = path.join(SRC_DIR, 'application/hooks/useWidgetDataOrchestrator.ts')
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('salesFactHandler')
  })

  // ── 定義書の存在確認 ──

  it('売上の正本定義書が存在する', () => {
    const defFile = path.resolve(SRC_DIR, '../../references/01-principles/sales-definition.md')
    expect(fs.existsSync(defFile)).toBe(true)
  })
})
