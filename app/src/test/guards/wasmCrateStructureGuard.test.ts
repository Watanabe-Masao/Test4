/**
 * WASM crate 構造ガード
 *
 * wasm/ 層に特化した構造・品質要件を機械的に強制する。
 * 他の層（app/src/ 等）には適用しない。
 *
 * @guard B1
 * @layer wasm/
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const WASM_DIR = path.resolve(__dirname, '../../../../wasm')

/** candidate crate 一覧（metadata.authority = 'candidate-authoritative'） */
const CANDIDATE_CRATES = [
  'pi-value',
  'customer-gap',
  'remaining-budget-rate',
  'observation-period',
  'pin-intervals',
  'inventory-calc',
]

/** current crate（既存。構造要件は ratchet で段階適用） */
const CURRENT_CRATES = [
  'factor-decomposition',
  'gross-profit',
  'budget-analysis',
  'forecast',
  'time-slot',
  'statistics',
  'core-utils',
]

/** テスト 3 ファイル構成の必須ファイル */
const REQUIRED_TEST_FILES = ['cross_validation.rs', 'edge_cases.rs', 'invariants.rs']

/** ビジネス定数として疑わしい乗算パターン（数学的係数は除外） */
const MAGIC_NUMBER_PATTERN = /\*\s*(100|1000|10000|1_000|10_000|100_000)\.0/

/** Cargo.toml に必須の semantic metadata フィールド */
const REQUIRED_CARGO_METADATA = ['class', 'authority', 'owner']

function listCrateDirs(): string[] {
  if (!fs.existsSync(WASM_DIR)) return []
  return fs
    .readdirSync(WASM_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(WASM_DIR, d.name, 'Cargo.toml')))
    .map((d) => d.name)
}

describe('WASM crate 構造ガード（wasm/ 層限定）', () => {
  // ════════════════════════════════════════════════════════
  // candidate crate: テスト 3 ファイル構成必須
  // ════════════════════════════════════════════════════════

  describe('candidate crate はテスト 3 ファイル構成が必須', () => {
    for (const crate of CANDIDATE_CRATES) {
      it(`${crate}: tests/ に ${REQUIRED_TEST_FILES.join(', ')} が存在する`, () => {
        const testsDir = path.join(WASM_DIR, crate, 'tests')
        const missing: string[] = []
        for (const file of REQUIRED_TEST_FILES) {
          if (!fs.existsSync(path.join(testsDir, file))) {
            missing.push(file)
          }
        }
        expect(
          missing,
          `wasm/${crate}/tests/ に不足: ${missing.join(', ')}\n` +
            '→ cross_validation.rs (golden fixtures) + edge_cases.rs + invariants.rs が必須',
        ).toEqual([])
      })
    }
  })

  // ════════════════════════════════════════════════════════
  // candidate crate: Cargo.toml semantic metadata 必須
  // ════════════════════════════════════════════════════════

  describe('candidate crate は Cargo.toml に semantic metadata が必須', () => {
    for (const crate of CANDIDATE_CRATES) {
      it(`${crate}: [package.metadata.semantic] に class/authority/owner がある`, () => {
        const cargoPath = path.join(WASM_DIR, crate, 'Cargo.toml')
        if (!fs.existsSync(cargoPath)) return
        const content = fs.readFileSync(cargoPath, 'utf-8')
        const missing: string[] = []
        for (const field of REQUIRED_CARGO_METADATA) {
          if (!content.includes(`${field} =`)) {
            missing.push(field)
          }
        }
        expect(
          missing,
          `wasm/${crate}/Cargo.toml に [package.metadata.semantic] フィールド不足: ${missing.join(', ')}`,
        ).toEqual([])
      })
    }
  })

  // ════════════════════════════════════════════════════════
  // candidate crate: src/ にマジックナンバー禁止
  // ════════════════════════════════════════════════════════

  describe('candidate crate の src/ にビジネス定数のハードコード禁止', () => {
    for (const crate of CANDIDATE_CRATES) {
      it(`${crate}: src/*.rs に * 100.0 / * 1000.0 等のマジックナンバーがない`, () => {
        const srcDir = path.join(WASM_DIR, crate, 'src')
        if (!fs.existsSync(srcDir)) return
        const violations: string[] = []

        const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.rs'))
        for (const file of files) {
          const content = fs.readFileSync(path.join(srcDir, file), 'utf-8')
          const lines = content.split('\n')
          let inTestModule = false
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            // #[cfg(test)] 以降はスキップ（テストコード内は許容）
            if (line.includes('#[cfg(test)]')) {
              inTestModule = true
            }
            if (inTestModule) continue
            // コメント行はスキップ
            if (line.trimStart().startsWith('//')) continue
            if (MAGIC_NUMBER_PATTERN.test(line)) {
              violations.push(`wasm/${crate}/src/${file}:${i + 1}: ${line.trim()}`)
            }
          }
        }
        expect(
          violations,
          'ビジネス定数は const で定義してください（例: const PERCENT_MULTIPLIER: f64 = 100.0）\n' +
            `違反:\n${violations.join('\n')}`,
        ).toEqual([])
      })
    }
  })

  // ════════════════════════════════════════════════════════
  // current crate: semantic metadata 存在確認（ratchet）
  // ════════════════════════════════════════════════════════

  it('current crate は Cargo.toml に semantic metadata がある（Phase 4 で追加済み）', () => {
    const cratesToCheck = CURRENT_CRATES.filter((c) => c !== 'core-utils') // core-utils は utility
    const missing: string[] = []
    for (const crate of cratesToCheck) {
      const cargoPath = path.join(WASM_DIR, crate, 'Cargo.toml')
      if (!fs.existsSync(cargoPath)) continue
      const content = fs.readFileSync(cargoPath, 'utf-8')
      if (!content.includes('[package.metadata.semantic]')) {
        missing.push(crate)
      }
    }
    expect(missing, `semantic metadata なし: ${missing.join(', ')}`).toEqual([])
  })

  // ════════════════════════════════════════════════════════
  // 全 crate: contractId が candidate に必須
  // ════════════════════════════════════════════════════════

  it('candidate crate は contractId を Cargo.toml に持つ', () => {
    const missing: string[] = []
    for (const crate of CANDIDATE_CRATES) {
      const cargoPath = path.join(WASM_DIR, crate, 'Cargo.toml')
      if (!fs.existsSync(cargoPath)) continue
      const content = fs.readFileSync(cargoPath, 'utf-8')
      if (!content.includes('contractId')) {
        missing.push(crate)
      }
    }
    expect(missing, `contractId なし: ${missing.join(', ')}`).toEqual([])
  })

  // ════════════════════════════════════════════════════════
  // crate 一覧の網羅性
  // ════════════════════════════════════════════════════════

  it('全 wasm/ crate が CANDIDATE_CRATES または CURRENT_CRATES に分類されている', () => {
    const allKnown = new Set([...CANDIDATE_CRATES, ...CURRENT_CRATES])
    const actualCrates = listCrateDirs()
    const unclassified = actualCrates.filter((c) => !allKnown.has(c))
    expect(
      unclassified,
      `未分類の wasm crate: ${unclassified.join(', ')}\n` +
        '→ wasmCrateStructureGuard.test.ts の CANDIDATE_CRATES または CURRENT_CRATES に追加してください',
    ).toEqual([])
  })
})
