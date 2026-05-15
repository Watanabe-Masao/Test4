/**
 * WASM crate 構造ガード
 *
 * wasm/ 層に特化した構造・品質要件を機械的に強制する。
 * 他の層（app/src/ 等）には適用しない。
 *
 * @guard B1
 * @layer wasm/
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const WASM_DIR = path.resolve(__dirname, '../../../../wasm')

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

function listCrateDirs(): string[] {
  if (!fs.existsSync(WASM_DIR)) return []
  return fs
    .readdirSync(WASM_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(WASM_DIR, d.name, 'Cargo.toml')))
    .map((d) => d.name)
}

describe('WASM crate 構造ガード（wasm/ 層限定）', () => {
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
  // crate 一覧の網羅性
  // ════════════════════════════════════════════════════════

  it('全 wasm/ crate が CURRENT_CRATES に分類されている', () => {
    const allKnown = new Set(CURRENT_CRATES)
    const actualCrates = listCrateDirs()
    const unclassified = actualCrates.filter((c) => !allKnown.has(c))
    expect(
      unclassified,
      `未分類の wasm crate: ${unclassified.join(', ')}\n` +
        '→ wasmCrateStructureGuard.test.ts の CURRENT_CRATES に追加してください',
    ).toEqual([])
  })
})
