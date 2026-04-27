/**
 * comparisonProjectionContextImport Guard
 *
 * phase-6-optional-comparison-projection Phase O2:
 * features/comparison/application/ 配下で PeriodSelection を import できるのは
 * buildComparisonProjectionContext.ts の 1 ファイルだけであることを機械的に保証する。
 *
 * これにより「PeriodSelection 知識の集約点は 1 つ」(plan.md 不可侵原則 3) が
 * 再発なく守られる。
 *
 * @see projects/completed/phase-6-optional-comparison-projection/plan.md §不可侵原則 3
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

const COMPARISON_APP_DIR = path.resolve(__dirname, '../../features/comparison/application')

/**
 * PeriodSelection を import してよいファイルの allowlist。
 * builder が唯一の境界点。
 */
const ALLOWLIST: readonly string[] = [
  'features/comparison/application/buildComparisonProjectionContext.ts',
]

/**
 * 移行前 baseline — Phase O4/O5 で 0 に到達済み。
 * comparisonProjections.ts: O4 で import type { PeriodSelection } 削除
 * useComparisonModule.ts: O5 で core/wrapper 分離、PeriodSelection は features/ 外に移動
 */
const MIGRATION_BASELINE: readonly string[] = []

const PERIOD_SELECTION_IMPORT_PATTERN =
  /import\s+(?:type\s+)?{[^}]*\bPeriodSelection\b[^}]*}\s+from\s+['"][^'"]*PeriodSelection['"]/

describe('comparisonProjectionContextImportGuard', () => {
  it('PeriodSelection import は allowlist + migration baseline のファイルのみ許可', () => {
    const files = collectTsFiles(COMPARISON_APP_DIR)
    const violations: string[] = []
    const allowedSet = new Set([...ALLOWLIST, ...MIGRATION_BASELINE])

    for (const file of files) {
      const relPath = rel(file)
      if (relPath.includes('__tests__/') || relPath.includes('.test.')) continue

      const content = fs.readFileSync(file, 'utf-8')
      if (PERIOD_SELECTION_IMPORT_PATTERN.test(content)) {
        if (!allowedSet.has(relPath)) {
          violations.push(relPath)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('migration baseline は Phase O4/O5 完了時に 0 に到達する (ratchet-down)', () => {
    const files = collectTsFiles(COMPARISON_APP_DIR)
    let baselineCount = 0

    for (const file of files) {
      const relPath = rel(file)
      if (relPath.includes('__tests__/') || relPath.includes('.test.')) continue

      const content = fs.readFileSync(file, 'utf-8')
      if (PERIOD_SELECTION_IMPORT_PATTERN.test(content)) {
        if (MIGRATION_BASELINE.includes(relPath)) {
          baselineCount++
        }
      }
    }

    // Phase O4 で comparisonProjections.ts から削除 → 1 に
    // Phase O5 で useComparisonModule.ts から削除 → 0 に
    expect(baselineCount).toBeLessThanOrEqual(MIGRATION_BASELINE.length)
  })

  it('allowlist の builder ファイルが実在する', () => {
    for (const relPath of ALLOWLIST) {
      const absPath = path.resolve(__dirname, '../..', relPath)
      expect(fs.existsSync(absPath)).toBe(true)
    }
  })
})
