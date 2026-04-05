/**
 * No-New-Debt Guard — 進化安全のための新規負債禁止ガード
 *
 * Phase 1-2 で解消した構造負債の再導入を防止する。
 * 新規追加を禁止し、既存の authoritative 構造を保護する。
 *
 * @guard G1 テストに書く — 機械的検出手段で再発防止
 * @see references/03-guides/safety-first-architecture-plan.md
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')

describe('no-new-debt guard', () => {
  describe('dual-run compare コードの再導入禁止', () => {
    it('bridge ファイルに getExecutionMode import がない', () => {
      const servicesDir = path.join(SRC_DIR, 'application/services')
      const bridgeFiles = collectTsFiles(servicesDir).filter((f) => /Bridge\.ts$/.test(f))

      const violations: string[] = []
      for (const file of bridgeFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        if (content.includes('getExecutionMode')) {
          violations.push(rel(file))
        }
      }

      expect(
        violations,
        `以下の bridge に dual-run compare コード (getExecutionMode) が残っています:\n${violations.join('\n')}`,
      ).toEqual([])
    })

    it('bridge ファイルに recordCall/recordMismatch import がない', () => {
      const servicesDir = path.join(SRC_DIR, 'application/services')
      const bridgeFiles = collectTsFiles(servicesDir).filter((f) => /Bridge\.ts$/.test(f))

      const violations: string[] = []
      for (const file of bridgeFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        if (content.includes('recordCall') || content.includes('recordMismatch')) {
          violations.push(rel(file))
        }
      }

      expect(
        violations,
        `以下の bridge に dualRunObserver の呼び出しが残っています:\n${violations.join('\n')}`,
      ).toEqual([])
    })

    it('dualRunObserver.ts が存在しない（退役済み）', () => {
      const observerPath = path.join(SRC_DIR, 'application/services/dualRunObserver.ts')
      expect(fs.existsSync(observerPath), 'dualRunObserver.ts は退役済み。復活禁止。').toBe(false)
    })
  })

  describe('ExecutionMode の dual-run-compare 再導入禁止', () => {
    it('wasmEngine.ts に dual-run-compare が含まれない', () => {
      const enginePath = path.join(SRC_DIR, 'application/services/wasmEngine.ts')
      const content = fs.readFileSync(enginePath, 'utf-8')
      expect(
        content.includes('dual-run-compare'),
        'ExecutionMode は ts-only | wasm-only の 2 モードのみ。dual-run-compare は退役済み。',
      ).toBe(false)
    })
  })

  describe('presentation 層の raw engine field 露出禁止', () => {
    it('presentation 層が wasmEngine を直接 import しない', () => {
      const presentationDir = path.join(SRC_DIR, 'presentation')
      if (!fs.existsSync(presentationDir)) return

      const files = collectTsFiles(presentationDir)
      const violations: string[] = []

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        if (content.includes('from') && content.includes('wasmEngine')) {
          violations.push(rel(file))
        }
      }

      expect(
        violations,
        `presentation 層が wasmEngine を直接 import しています:\n${violations.join('\n')}`,
      ).toEqual([])
    })
  })
})
