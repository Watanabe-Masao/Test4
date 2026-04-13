/**
 * Test Signal Integrity Guard — 品質シグナル保全の機械的検出
 *
 * 上位原則: references/01-principles/test-signal-integrity.md
 * 関連 project: projects/test-signal-integrity Phase 3
 *
 * @guard G1 ルールはテストに書く（TSIG-TEST-01: existence-only assertion 禁止）
 *
 * 保護対象:
 * - H1 False Green: 本質的な品質改善がないのに Green に見える状態
 * - H2 Review Misleading: レビュアーが品質確保されたと誤認する状態
 *
 * 検出ロジック:
 * - it() / test() 1 ブロック内で expect が 1 つだけ
 * - その expect が toBeDefined / toBeTruthy / toBeNull のいずれかで終わる
 * - 他の意味的 assertion (toBe, toEqual, toMatch, toThrow 等) を含まない
 *
 * 許容例外 (EX-01: 公開契約 helper existence test):
 * - 同一 file の別 test で挙動検証されている場合は許容（手動レビュー）
 * - 機械的判定が困難なため、初期は allowlist で個別管理する
 *
 * @see app/src/test/allowlists/signalIntegrity.ts
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import { SRC_DIR, collectTestFiles, rel } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage } from '../architectureRules'

// ─── 検出対象から除外するファイル ──────────────────────────
//
// このガード自身 / baseline 採取スクリプトは、検出対象パターンを文字列
// リテラルとして含むため除外する。
const EXCLUDED_FILES = new Set([
  'test/guards/testSignalIntegrityGuard.test.ts',
])

const isExcluded = (relPath: string): boolean => EXCLUDED_FILES.has(relPath)

// ─── TSIG-TEST-01: existence-only assertion 検出 ──────────────

describe('TSIG-TEST-01: existence-only assertion がない', () => {
  it('it() ブロック内が toBeDefined / toBeTruthy / toBeNull のみで終わる test を含まない', () => {
    const testFiles = collectTestFiles(SRC_DIR)
    const violations: string[] = []

    // 構造的検知パターン:
    // 1. 1-liner: it('...', () => { expect(x).toBeDefined() })
    // 2. multi-line: it() ブロック内に expect が 1 つだけ + 上記 matcher のみ
    const oneLinerPattern =
      /(?:it|test)\(\s*['"`][^'"`]+['"`]\s*,\s*(?:async\s*)?\(\)\s*=>\s*\{\s*expect\([^)]+\)\.(?:toBeDefined|toBeTruthy|toBeNull)\(\)\s*\}\s*\)/

    const itBlockPattern = /(?:^|\n)\s*(?:it|test)\(\s*['"`][^'"`]+['"`]\s*,\s*(?:async\s*)?\(\)\s*=>\s*\{/g

    for (const file of testFiles) {
      const relPath = rel(file)
      if (isExcluded(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')

      // Pass 1: 1-liner pattern
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (oneLinerPattern.test(lines[i])) {
          violations.push(`${relPath}:${i + 1}: ${lines[i].trim().slice(0, 100)}`)
        }
      }

      // Pass 2: multi-line it() blocks
      let match: RegExpExecArray | null
      itBlockPattern.lastIndex = 0
      while ((match = itBlockPattern.exec(content)) !== null) {
        const blockStart = match.index + match[0].length
        // 対応する閉じ } を depth count で検出
        let depth = 1
        let end = blockStart
        while (end < content.length && depth > 0) {
          const ch = content[end]
          if (ch === '{') depth++
          else if (ch === '}') depth--
          end++
        }
        const block = content.slice(blockStart, end - 1)
        const expects = block.match(/expect\(/g) ?? []
        if (expects.length !== 1) continue

        // 1 つだけの expect が toBeDefined / toBeTruthy / toBeNull のみか？
        const hasExistenceOnly =
          /expect\([^)]+\)\.(?:toBeDefined|toBeTruthy|toBeNull)\(\)/.test(block)
        const hasMeaningfulMatcher =
          /expect\([^)]+\)\.(?:toBe|toEqual|toMatch|toThrow|toContain|toHaveLength|toHaveBeenCalled|toBeGreaterThan|toBeLessThan|toBeCloseTo)/.test(
            block,
          )

        if (hasExistenceOnly && !hasMeaningfulMatcher) {
          const lineNum = content.slice(0, match.index).split('\n').length
          const lineText = lines[lineNum - 1]?.trim() ?? ''
          // 1-liner pass で既に拾われたものを除外
          const dupKey = `${relPath}:${lineNum}`
          if (!violations.some((v) => v.startsWith(dupKey))) {
            violations.push(`${dupKey}: ${lineText.slice(0, 100)}`)
          }
        }
      }
    }

    expect(
      violations,
      formatViolationMessage(getRuleById('AR-TSIG-TEST-01')!, violations),
    ).toEqual([])
  })
})
