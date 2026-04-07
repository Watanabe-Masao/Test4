/**
 * Dual-Run Retirement Guard — WASM dual-run 退役状態の維持を保証
 *
 * 全 5 engine は authoritative に昇格済み（2026-04-05）。
 * frozen-list.md §3 に exit criteria が記録されていることを確認し、
 * observation test が不変条件テストとして維持されていることを検証する。
 *
 * @see references/02-status/frozen-list.md §3.1
 * @see references/02-status/engine-promotion-matrix.md
 * ルール定義: architectureRules.ts (AR-STRUCT-DUAL-RUN-EXIT)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const ROOT_DIR = path.resolve(__dirname, '../../../../')
const SRC_DIR = path.resolve(__dirname, '../..')

/** 全 5 engine の不変条件テスト（元 observation test） */
const INVARIANT_TESTS = [
  'test/observation/factorDecompositionObservation.test.ts',
  'test/observation/grossProfitObservation.test.ts',
  'test/observation/budgetAnalysisObservation.test.ts',
  'test/observation/forecastObservation.test.ts',
  'test/observation/timeSlotObservation.test.ts',
] as const

describe('dual-run retirement guard', () => {
  const rule = getRuleById('AR-STRUCT-DUAL-RUN-EXIT')!

  it('frozen-list.md に WASM exit criteria セクションが存在する', () => {
    const frozenListPath = path.join(ROOT_DIR, 'references/02-status/frozen-list.md')
    const content = fs.readFileSync(frozenListPath, 'utf-8')

    expect(content).toContain('Exit Criteria')
    expect(content).toContain('mismatch rate')
    expect(content).toContain('promotion-criteria.md')
  })

  it('全 engine の不変条件テストが存在する', () => {
    const missing: string[] = []
    for (const relPath of INVARIANT_TESTS) {
      const filePath = path.join(SRC_DIR, relPath)
      if (!fs.existsSync(filePath)) {
        missing.push(relPath)
      }
    }

    expect(missing, formatViolationMessage(rule, missing)).toEqual([])
  })

  it('frozen-list.md §3 の @deprecated エントリ数が上限（5）を超えない', () => {
    const frozenListPath = path.join(ROOT_DIR, 'references/02-status/frozen-list.md')
    const content = fs.readFileSync(frozenListPath, 'utf-8')

    const section3Match = content.match(/## 3\. 後方互換コードの凍結式管理[\s\S]*?(?=## [34]\.|$)/)
    if (!section3Match) {
      expect.fail('frozen-list.md に §3 が見つかりません')
      return
    }

    const tableRows = section3Match[0]
      .split('\n')
      .filter((line) => line.startsWith('|') && !line.includes('---') && !line.includes('ファイル'))
    const MAX_DEPRECATED = 5

    expect(
      tableRows.length,
      `[${rule.id}] @deprecated エントリが上限 ${MAX_DEPRECATED} を超えています (${tableRows.length} 件)`,
    ).toBeLessThanOrEqual(MAX_DEPRECATED)
  })

  it('engine-promotion-matrix.md に全 5 engine が authoritative と記録されている', () => {
    const matrixPath = path.join(ROOT_DIR, 'references/02-status/engine-promotion-matrix.md')
    const content = fs.readFileSync(matrixPath, 'utf-8')

    const engines = ['factorDecomposition', 'grossProfit', 'budgetAnalysis', 'forecast', 'timeSlot']
    const missing: string[] = []
    for (const engine of engines) {
      const pattern = new RegExp(`${engine}.*authoritative`, 'i')
      if (!pattern.test(content)) {
        missing.push(engine)
      }
    }

    expect(missing, formatViolationMessage(rule, missing)).toEqual([])
  })
})
