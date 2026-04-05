/**
 * Dual-Run Exit Criteria Guard — WASM dual-run 対象に exit criteria が定義されていることを保証
 *
 * frozen-list.md §3 の @deprecated ファイルが exit criteria を持ち、
 * observation test が存在することを検証する。
 *
 * @see references/02-status/frozen-list.md §3.1
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const ROOT_DIR = path.resolve(__dirname, '../../../../')
const SRC_DIR = path.resolve(__dirname, '../..')

/** frozen-list.md §3 の WASM dual-run bridge ファイル */
const DUAL_RUN_BRIDGE_FILES = [
  'domain/calculations/estMethod.ts',
  'domain/calculations/discountImpact.ts',
  'application/services/grossProfitBridge.ts',
] as const

/** 各 bridge に対応する observation test */
const OBSERVATION_TESTS = [
  'test/observation/grossProfitObservation.test.ts',
  'test/observation/forecastObservation.test.ts',
] as const

describe('dual-run exit criteria guard', () => {
  it('frozen-list.md に WASM exit criteria セクションが存在する', () => {
    const frozenListPath = path.join(ROOT_DIR, 'references/02-status/frozen-list.md')
    const content = fs.readFileSync(frozenListPath, 'utf-8')

    expect(content).toContain('Exit Criteria')
    expect(content).toContain('mismatch rate')
    expect(content).toContain('null mismatch')
    expect(content).toContain('fallback rate')
    expect(content).toContain('promotion-criteria.md')
  })

  it('全 dual-run bridge ファイルが @deprecated マーカーを持つ', () => {
    const missing: string[] = []
    for (const relPath of DUAL_RUN_BRIDGE_FILES) {
      const filePath = path.join(SRC_DIR, relPath)
      if (!fs.existsSync(filePath)) continue
      const content = fs.readFileSync(filePath, 'utf-8')
      if (!content.includes('@deprecated')) {
        missing.push(relPath)
      }
    }

    expect(
      missing,
      `以下の dual-run bridge に @deprecated がありません:\n${missing.join('\n')}`,
    ).toEqual([])
  })

  it('observation test が存在する', () => {
    const missing: string[] = []
    for (const relPath of OBSERVATION_TESTS) {
      const filePath = path.join(SRC_DIR, relPath)
      if (!fs.existsSync(filePath)) {
        missing.push(relPath)
      }
    }

    expect(missing, `以下の observation test が存在しません:\n${missing.join('\n')}`).toEqual([])
  })

  it('frozen-list.md §3 の @deprecated エントリ数が上限（5）を超えない', () => {
    const frozenListPath = path.join(ROOT_DIR, 'references/02-status/frozen-list.md')
    const content = fs.readFileSync(frozenListPath, 'utf-8')

    // §3 のテーブル行をカウント（| で始まる行、ヘッダー行を除く）
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
      `@deprecated エントリが上限 ${MAX_DEPRECATED} を超えています (${tableRows.length} 件)`,
    ).toBeLessThanOrEqual(MAX_DEPRECATED)
  })
})
