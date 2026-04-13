/**
 * FileTypeDetector.ts — file type detection test
 *
 * 検証対象:
 * - FILE_TYPE_REGISTRY: 11 件のエントリ + 必須フィールド
 * - detectFileType:
 *   - filenamePatterns による判定 (priority 1)
 *   - filenameRegex による判定
 *   - prefix fallback
 *   - headerPatterns による判定 (priority 2)
 *   - 何もマッチしない → type=null, confidence='none'
 * - getDataTypeName: type → name 解決
 * - getStructuralRules: 全 DataType の minRows/minCols/label
 */
import { describe, it, expect } from 'vitest'
import {
  detectFileType,
  getDataTypeName,
  getStructuralRules,
  FILE_TYPE_REGISTRY,
} from '../FileTypeDetector'

// ─── FILE_TYPE_REGISTRY ─────────────────

describe('FILE_TYPE_REGISTRY', () => {
  it('11 件のエントリを持つ', () => {
    expect(FILE_TYPE_REGISTRY.length).toBe(11)
  })

  it('全エントリが name / minRows / minCols を持つ', () => {
    for (const entry of FILE_TYPE_REGISTRY) {
      expect(typeof entry.name).toBe('string')
      expect(entry.name.length).toBeGreaterThan(0)
      expect(entry.minRows).toBeGreaterThan(0)
      expect(entry.minCols).toBeGreaterThan(0)
    }
  })

  it("'flowers' が先頭 (産直と同ヘッダーで名前優先判定)", () => {
    expect(FILE_TYPE_REGISTRY[0].type).toBe('flowers')
  })
})

// ─── detectFileType — filename match ────

describe('detectFileType - filename', () => {
  it("'仕入_2026-04.xlsx' → purchase", () => {
    const result = detectFileType('仕入_2026-04.xlsx', [])
    expect(result.type).toBe('purchase')
    expect(result.confidence).toBe('filename')
    expect(result.ruleName).toBe('仕入')
  })

  it("'売上納品_花_A.xlsx' → flowers", () => {
    const result = detectFileType('売上納品_花_A.xlsx', [])
    expect(result.type).toBe('flowers')
  })

  it("'売上納品_産直.xlsx' → directProduce", () => {
    const result = detectFileType('売上納品_産直.xlsx', [])
    expect(result.type).toBe('directProduce')
  })

  it("'売上予算_2026.xlsx' → budget", () => {
    const result = detectFileType('売上予算_2026.xlsx', [])
    expect(result.type).toBe('budget')
  })

  it("'分類別売上.xlsx' → classifiedSales", () => {
    const result = detectFileType('分類別売上.xlsx', [])
    expect(result.type).toBe('classifiedSales')
  })

  it("'店間入_2026.xlsx' → interStoreIn", () => {
    const result = detectFileType('店間入_2026.xlsx', [])
    expect(result.type).toBe('interStoreIn')
  })

  it("'店間出_2026.xlsx' → interStoreOut", () => {
    const result = detectFileType('店間出_2026.xlsx', [])
    expect(result.type).toBe('interStoreOut')
  })

  it("filenameRegex: '1.分類別時間帯売上.xlsx' → categoryTimeSales", () => {
    const result = detectFileType('1.分類別時間帯売上.xlsx', [])
    expect(result.type).toBe('categoryTimeSales')
  })

  it("prefix '5_' → interStoreIn (fallback)", () => {
    const result = detectFileType('5_unknown.xlsx', [])
    expect(result.type).toBe('interStoreIn')
  })

  it('path 含み: basename で判定', () => {
    const result = detectFileType('/foo/bar/仕入.xlsx', [])
    expect(result.type).toBe('purchase')
  })
})

// ─── detectFileType — header match ──────

describe('detectFileType - header', () => {
  it("ヘッダー '取引先コード' → purchase (ファイル名不明時)", () => {
    const rows = [['取引先コード', '原価金額', '売価金額']]
    const result = detectFileType('unknown.xlsx', rows)
    expect(result.type).toBe('purchase')
    expect(result.confidence).toBe('header')
  })

  it("ヘッダー 'グループ名称' → classifiedSales", () => {
    const rows = [['グループ名称', '部門名称', 'ライン名称', 'クラス名称']]
    const result = detectFileType('unknown.xlsx', rows)
    expect(result.type).toBe('classifiedSales')
  })

  it("ヘッダー '店コードIN' → interStoreIn", () => {
    const rows = [['店コードIN', 'x']]
    const result = detectFileType('unknown.xlsx', rows)
    expect(result.type).toBe('interStoreIn')
  })

  it('最初 3 行をスキャン', () => {
    const rows = [['メタ行'], ['空行'], ['取引先コード', '原価金額']]
    const result = detectFileType('unknown.xlsx', rows)
    expect(result.type).toBe('purchase')
  })

  it('headerPatterns 空のエントリは skip', () => {
    // consumables has empty headerPatterns
    const rows = [['arbitrary', 'header']]
    const result = detectFileType('unknown.xlsx', rows)
    expect(result.type).not.toBe('consumables')
  })
})

// ─── detectFileType — no match ──────────

describe('detectFileType - no match', () => {
  it('ファイル名・ヘッダー共に不明 → null', () => {
    const result = detectFileType('arbitrary.xlsx', [['foo', 'bar']])
    expect(result.type).toBeNull()
    expect(result.confidence).toBe('none')
    expect(result.ruleName).toBeNull()
  })

  it('空 rows → null (ヘッダー判定できない)', () => {
    const result = detectFileType('arbitrary.xlsx', [])
    expect(result.type).toBeNull()
  })
})

// ─── getDataTypeName ────────────────────

describe('getDataTypeName', () => {
  it("'purchase' → '仕入'", () => {
    expect(getDataTypeName('purchase')).toBe('仕入')
  })

  it("'classifiedSales' → '分類別売上'", () => {
    expect(getDataTypeName('classifiedSales')).toBe('分類別売上')
  })

  it("'flowers' → '売上納品_花'", () => {
    expect(getDataTypeName('flowers')).toBe('売上納品_花')
  })

  it("'budget' → '売上予算'", () => {
    expect(getDataTypeName('budget')).toBe('売上予算')
  })
})

// ─── getStructuralRules ──────────────────

describe('getStructuralRules', () => {
  it('全 DataType のルールを返す', () => {
    const rules = getStructuralRules()
    expect(rules.purchase).toBeDefined()
    expect(rules.classifiedSales).toBeDefined()
    expect(rules.flowers).toBeDefined()
  })

  it('each rule: minRows / minCols / label', () => {
    const rules = getStructuralRules()
    expect(rules.purchase.minRows).toBe(3)
    expect(rules.purchase.minCols).toBe(4)
    expect(rules.purchase.label).toBe('仕入')
  })

  it('classifiedSales: minRows=2, minCols=7', () => {
    const rules = getStructuralRules()
    expect(rules.classifiedSales.minRows).toBe(2)
    expect(rules.classifiedSales.minCols).toBe(7)
  })
})
