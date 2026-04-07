/**
 * 要因分解正本ガード
 *
 * calculateFactorDecomposition が唯一の要因分解計算正本。
 * domain/calculations/factorDecomposition.ts の直接利用を
 * 許可リスト以外で禁止する。
 *
 * @see references/01-principles/authoritative-calculation-definition.md
 * ルール定義: architectureRules.ts (AR-PATH-FACTOR-DECOMPOSITION)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel, extractValueImports } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const SRC_DIR = path.resolve(__dirname, '../..')

describe('要因分解正本ガード', () => {
  // ── 正本関数の存在確認 ──

  it('calculateFactorDecomposition が存在する', () => {
    const file = path.join(
      SRC_DIR,
      'application/readModels/factorDecomposition/calculateFactorDecomposition.ts',
    )
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('export function calculateFactorDecomposition(')
    expect(content).toContain('FactorDecompositionReadModel.parse')
  })

  it('FactorDecompositionTypes に Zod 契約が定義されている', () => {
    const file = path.join(
      SRC_DIR,
      'application/readModels/factorDecomposition/FactorDecompositionTypes.ts',
    )
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('FactorDecompositionReadModel')
    expect(content).toContain('DecomposeLevel')
  })

  // ── domain/calculations/factorDecomposition の直接利用制限 ──

  /**
   * decompose2/3/5 の直接 import が許容されるファイル。
   *
   * 計算層（bridge + readModel）と観測層（observation）のみ許可。
   * application/analysis 層は将来的に正本経由に移行すべき。
   */
  const ALLOWED_DIRECT_IMPORT_FILES = new Set([
    // 計算正本自身
    'application/readModels/factorDecomposition/calculateFactorDecomposition.ts',
    // bridge 層（Rust/WASM dispatch）
    'application/services/factorDecompositionBridge.ts',
    // bridge re-export バレル
    'application/hooks/calculation.ts',
    // 観測テスト基盤（WASM 二重実行）
    'application/services/observationEntry.ts',
    // causalChain は calculateFactorDecomposition 経由に移行済み
  ])

  it('domain/calculations/factorDecomposition の直接利用が許可リストに制限されている', () => {
    const allFiles = collectTsFiles(SRC_DIR)
    const violations: string[] = []

    for (const file of allFiles) {
      const relPath = rel(file)
      if (ALLOWED_DIRECT_IMPORT_FILES.has(relPath)) continue
      const imports = extractValueImports(file)
      for (const imp of imports) {
        if (imp.includes('domain/calculations/factorDecomposition')) {
          violations.push(`${relPath}: ${imp} を直接 import`)
        }
      }
    }

    expect(
      violations,
      `factorDecomposition 直接 import の許可リスト外使用:\n${violations.join('\n')}\n` +
        '→ calculateFactorDecomposition() 経由に切り替えるか、許可リストに追加してください',
    ).toEqual([])
  })

  // ── presentation 層の要因分解利用が bridge 経由であること ──

  it('presentation 層は calculation バレル経由で要因分解を利用している', () => {
    const presentationDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presentationDir)
    const violations: string[] = []

    for (const file of files) {
      const relPath = rel(file)
      const imports = extractValueImports(file)
      for (const imp of imports) {
        // domain/calculations/factorDecomposition への直接 import は禁止
        if (imp.includes('domain/calculations/factorDecomposition')) {
          violations.push(`${relPath}: ${imp} を直接 import（bridge 経由にしてください）`)
        }
      }
    }

    expect(
      violations,
      `presentation 層から domain/calculations/factorDecomposition への直接 import:\n${violations.join('\n')}`,
    ).toEqual([])
  })

  // ── 定義書の存在確認 ──

  it('authoritative 計算の定義書が存在する', () => {
    const defFile = path.resolve(
      SRC_DIR,
      '../../references/01-principles/authoritative-calculation-definition.md',
    )
    expect(fs.existsSync(defFile)).toBe(true)
  })
})
