/**
 * comparisonProjectionContextField Guard
 *
 * phase-6-optional-comparison-projection Phase O2:
 * ComparisonProjectionContext の field creep を機械的に防ぐ。
 *
 * AI_CONTEXT.md に「薄いコピーは失敗」と明記されている通り、
 * PeriodSelection の 20+ fields をそのまま持ち込むと optional phase の
 * 意味が完全に失われる。このガードは以下を検証する:
 *
 * 1. key 数の上限 (最小面の維持)
 * 2. 許可フィールド名の snapshot (意図しない追加の検出)
 * 3. PeriodSelection と同名の大きい塊を持たない (型コピーの防止)
 *
 * @see projects/completed/phase-6-optional-comparison-projection/plan.md §不可侵原則 4
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const CONTEXT_FILE = path.resolve(
  __dirname,
  '../../features/comparison/application/ComparisonProjectionContext.ts',
)

/** 許可されたフィールド名 (snapshot) */
const ALLOWED_FIELDS = ['basisYear', 'basisMonth', 'period2'] as const

/** key 数の上限 — 現在 3。追加には正当な理由と本 guard の更新が必要 */
const MAX_FIELD_COUNT = 3

/**
 * PeriodSelection の型コピーを示唆するフィールド名。
 * これらが ComparisonProjectionContext に含まれていたら設計ミスの兆候。
 */
const PROHIBITED_FIELD_NAMES = [
  'period1',
  'activePreset',
  'comparisonEnabled',
  'period1Adjacent',
  'period2Adjacent',
]

describe('comparisonProjectionContextFieldGuard', () => {
  it('ComparisonProjectionContext.ts が存在する', () => {
    expect(fs.existsSync(CONTEXT_FILE)).toBe(true)
  })

  it(`フィールド数が ${MAX_FIELD_COUNT} 以下 (最小面の維持)`, () => {
    const content = fs.readFileSync(CONTEXT_FILE, 'utf-8')
    // readonly fieldName: type パターンを検出
    const fieldMatches = content.match(/^\s+readonly\s+\w+\s*:/gm) || []
    expect(fieldMatches.length).toBeLessThanOrEqual(MAX_FIELD_COUNT)
  })

  it('許可フィールド名のみが定義されている (snapshot)', () => {
    const content = fs.readFileSync(CONTEXT_FILE, 'utf-8')
    const fieldMatches = content.match(/^\s+readonly\s+(\w+)\s*:/gm) || []
    const fieldNames = fieldMatches.map((m) => {
      const match = m.match(/readonly\s+(\w+)/)
      return match ? match[1] : ''
    })
    expect(fieldNames.sort()).toEqual([...ALLOWED_FIELDS].sort())
  })

  it('PeriodSelection のフィールド名をそのまま持ち込んでいない', () => {
    const content = fs.readFileSync(CONTEXT_FILE, 'utf-8')
    const fieldMatches = content.match(/^\s+readonly\s+(\w+)\s*:/gm) || []
    const fieldNames = fieldMatches.map((m) => {
      const match = m.match(/readonly\s+(\w+)/)
      return match ? match[1] : ''
    })

    for (const prohibited of PROHIBITED_FIELD_NAMES) {
      expect(fieldNames).not.toContain(prohibited)
    }
  })
})
