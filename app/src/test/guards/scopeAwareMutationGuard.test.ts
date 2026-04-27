/**
 * Scope-Aware Mutation Guard — スコープ次元を持つテーブルの変更にスコープ指定を強制
 *
 * is_prev_year 列を持つテーブル (classified_sales, category_time_sales, time_slots) への
 * DELETE/UPDATE が is_prev_year 条件を含むことを検証する。
 *
 * 背景:
 *   deleteMonth() が is_prev_year 条件なしで DELETE していたため、
 *   当年データの再ロード時に前年データが巻き込み削除された。
 *
 * @guard G1 テストに書く — 機械的検出手段で再発防止
 * ルール定義: architectureRules.ts (AR-SCOPE-AWARE-MUTATION)
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

const DUCKDB_DIR = path.resolve(__dirname, '../../infrastructure/duckdb')

const FLAGGED_TABLES = ['classified_sales', 'category_time_sales', 'time_slots'] as const

interface Violation {
  readonly file: string
  readonly line: number
  readonly text: string
  readonly table: string
}

function scanForViolations(file: string): readonly Violation[] {
  const content = fs.readFileSync(file, 'utf-8')
  const lines = content.split('\n')
  const relPath = rel(file)
  const violations: Violation[] = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue

    for (const table of FLAGGED_TABLES) {
      const pattern = new RegExp(`(?:DELETE\\s+FROM|UPDATE)\\s+${table}\\b`, 'i')
      if (pattern.test(lines[i])) {
        const blockStart = Math.max(0, i - 5)
        const blockEnd = Math.min(lines.length, i + 10)
        const block = lines.slice(blockStart, blockEnd).join('\n')

        if (!block.includes('is_prev_year')) {
          violations.push({
            file: relPath,
            line: i + 1,
            text: trimmed.slice(0, 120),
            table,
          })
        }
      }
    }

    // 動的テーブル名: DELETE FROM ${name}
    if (/DELETE\s+FROM\s+\$\{name\}/.test(lines[i])) {
      const blockStart = Math.max(0, i - 10)
      const blockEnd = Math.min(lines.length, i + 10)
      const block = lines.slice(blockStart, blockEnd).join('\n')

      if (!block.includes('TABLES_WITH_PREV_YEAR_FLAG') && !block.includes('is_prev_year')) {
        violations.push({
          file: relPath,
          line: i + 1,
          text: trimmed.slice(0, 120),
          table: '${name} (dynamic)',
        })
      }
    }
  }

  return violations
}

describe('AR-SCOPE-AWARE-MUTATION: スコープ次元テーブルの変更にスコープ指定を強制', () => {
  it('infrastructure/duckdb/ の全ソースで flagged table への DELETE/UPDATE が is_prev_year を含む', () => {
    const files = collectTsFiles(DUCKDB_DIR).filter(
      (f) => !f.includes('__tests__') && !f.endsWith('.test.ts'),
    )

    const allViolations: Violation[] = []
    for (const file of files) {
      allViolations.push(...scanForViolations(file))
    }

    expect(
      allViolations.length,
      allViolations.map((v) => `  ${v.file}:${v.line} [${v.table}] ${v.text}`).join('\n'),
    ).toBe(0)
  })

  it('FLAGGED_TABLES が deletePolicy.ts の TABLES_WITH_PREV_YEAR_FLAG と一致する', () => {
    const content = fs.readFileSync(path.join(DUCKDB_DIR, 'deletePolicy.ts'), 'utf-8')
    for (const table of FLAGGED_TABLES) {
      expect(content).toContain(`'${table}'`)
    }
  })

  it('対象ディレクトリに走査対象ファイルが存在する', () => {
    const files = collectTsFiles(DUCKDB_DIR).filter(
      (f) => !f.includes('__tests__') && !f.endsWith('.test.ts'),
    )
    expect(files.length).toBeGreaterThanOrEqual(5)
  })
})
