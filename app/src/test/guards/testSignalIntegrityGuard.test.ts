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
import * as path from 'path'
import { SRC_DIR, collectTsFiles, collectTestFiles, rel } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage } from '../architectureRules'
import { g3SuppressAllowlist } from '../allowlists'

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

// ─── AR-G3-SUPPRESS-RATIONALE: 構造化 rationale 必須 ──────────────
//
// 上位原則: references/01-principles/test-signal-integrity.md
// 関連項目: TSIG-COMP-01 / TSIG-COMP-02
//
// AR-G3-SUPPRESS の拡張ルール。allowlist 登録された suppression は、
// allowlist エントリ (signalIntegrity.ts) と source code コメントの両方で
// 構造化された reason: / removalCondition: を持つことを必須化する。
//
// 新規 guard ではなく既存 G3 family の拡張として実装することで、
// 「黙らせる手段」を構造化された rationale enforcement に格上げする。

describe('AR-G3-SUPPRESS-RATIONALE: allowlist 登録ファイルの構造化 rationale', () => {
  it('g3SuppressAllowlist 全 entries が reason / removalCondition を持つ (allowlist メタデータ)', () => {
    const violations: string[] = []
    for (const entry of g3SuppressAllowlist) {
      if (!entry.reason || entry.reason.length < 20) {
        violations.push(`${entry.path}: reason が短すぎる (20 文字未満)`)
      }
      if (!entry.removalCondition || entry.removalCondition.length < 20) {
        violations.push(`${entry.path}: removalCondition が短すぎる (20 文字未満)`)
      }
    }
    expect(
      violations,
      `AR-G3-SUPPRESS-RATIONALE: 構造化 rationale が不足しています:\n${violations.join('\n')}\n` +
        '修正: app/src/test/allowlists/signalIntegrity.ts の対象 entry に reason: と' +
        ' removalCondition: を 20 文字以上で追記してください',
    ).toEqual([])
  })

  it('g3SuppressAllowlist 全 entries の source file に reason: / removalCondition: コメントが存在する', () => {
    const violations: string[] = []
    for (const entry of g3SuppressAllowlist) {
      const filePath = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(filePath)) {
        violations.push(`${entry.path}: ファイルが存在しない (allowlist の path が古い可能性)`)
        continue
      }
      const content = fs.readFileSync(filePath, 'utf-8')
      // reason: と removalCondition: の両方がコメント内に存在することを確認
      // (改行を跨ぐ複数行コメントでも検出可能)
      if (!/reason:/i.test(content)) {
        violations.push(
          `${entry.path}: source code に "reason:" コメントが見つからない` +
            ' (allowlist 登録された suppression は構造化 rationale を必須とする)',
        )
      }
      if (!/removalCondition:/i.test(content)) {
        violations.push(
          `${entry.path}: source code に "removalCondition:" コメントが見つからない` +
            ' (allowlist 登録された suppression は削除条件の明示を必須とする)',
        )
      }
    }
    expect(
      violations,
      `AR-G3-SUPPRESS-RATIONALE: source code rationale が不足しています:\n${violations.join('\n')}\n` +
        '修正: 該当ファイルの suppression コメントに以下を追記してください:\n' +
        '  // reason: <なぜ抑制が必要か>\n' +
        '  // removalCondition: <いつ削除可能になるか>\n' +
        '構造化フォーマットは references/01-principles/test-signal-integrity.md EX-03 を参照',
    ).toEqual([])
  })
})

// ─── TSIG-COMP-03: unused suppress escape (multi-underscore) ──────────────
//
// 上位原則: references/01-principles/test-signal-integrity.md
//
// 関数引数で _ プレフィックスを 2 つ以上連続持つパターンを禁止する。
// 単独の _xxx は callback signature 互換性で必要なケースが多いので除外。
// 2 つ以上は「責務整理 or signature 削減」で解決すべき候補。

describe('TSIG-COMP-03: unused suppress escape (multi-underscore)', () => {
  it('関数引数に _ プレフィックスを 2 つ以上連続持つパターンがない', () => {
    const violations: string[] = []

    // 2 つ以上の連続 _ プレフィックス引数を持つ pattern
    const multiUnderscorePattern = /\(\s*_[A-Za-z][A-Za-z0-9_]*\s*[:,][^)]*?,\s*_[A-Za-z]/

    const dirs = ['domain', 'application', 'infrastructure', 'presentation']
    for (const dirName of dirs) {
      const dir = path.join(SRC_DIR, dirName)
      const files = collectTsFiles(dir)
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (multiUnderscorePattern.test(lines[i])) {
            violations.push(`${rel(file)}:${i + 1}: ${lines[i].trim().slice(0, 100)}`)
          }
        }
      }
    }

    expect(
      violations,
      formatViolationMessage(getRuleById('AR-TSIG-COMP-03')!, violations),
    ).toEqual([])
  })
})
