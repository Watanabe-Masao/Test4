/**
 * Canonical Input Guard — 複合指標の入力正本一本化を保証
 *
 * PI値・客数GAP が canonical input builder 経由で計算されることを検証し、
 * presentation 層での独自比率計算を禁止する。
 *
 * @see references/01-principles/canonical-input-sets.md
 * @guard G1 テストに書く
 * ルール定義: architectureRules.ts (AR-STRUCT-CANONICAL-INPUT)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const SRC_DIR = path.resolve(__dirname, '../..')

describe('canonical input guard', () => {
  describe('canonical input builder が存在する', () => {
    it('piCanonicalInput.ts が存在する', () => {
      const filePath = path.join(SRC_DIR, 'application/canonicalInputs/piCanonicalInput.ts')
      expect(fs.existsSync(filePath)).toBe(true)
    })

    it('customerGapCanonicalInput.ts が存在する', () => {
      const filePath = path.join(
        SRC_DIR,
        'application/canonicalInputs/customerGapCanonicalInput.ts',
      )
      expect(fs.existsSync(filePath)).toBe(true)
    })
  })

  describe('presentation 層での独自 PI 計算を禁止', () => {
    it('presentation 層で calculateQuantityPI / calculateAmountPI を直接 import しない', () => {
      const presentationDir = path.join(SRC_DIR, 'presentation')
      if (!fs.existsSync(presentationDir)) return

      const files = collectTsFiles(presentationDir)
      const violations: string[] = []

      // presentation 層の .builders.ts と .vm.ts は domain 計算を呼ぶことが許される場合がある
      // ただし PI 値は canonical input builder 経由にすべき
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        if (content.includes('calculateQuantityPI') || content.includes('calculateAmountPI')) {
          // PerformanceIndexChart.builders.ts は既存の利用箇所（allowlist）
          if (rel(file).includes('PerformanceIndexChart.builders')) continue
          violations.push(rel(file))
        }
      }

      expect(
        violations,
        `presentation 層で PI 計算を直接 import しています。` +
          `canonical input builder (buildGrandTotalPI / buildStorePIResults) を使用してください:\n` +
          violations.join('\n'),
      ).toEqual([])
    })
  })

  describe('定義書の相互参照が維持されている', () => {
    it('canonical-input-sets.md が存在する', () => {
      const defPath = path.join(SRC_DIR, '../../references/01-principles/canonical-input-sets.md')
      expect(fs.existsSync(defPath)).toBe(true)
    })

    it('pi-value-definition.md が CustomerFact を参照している', () => {
      const defPath = path.join(SRC_DIR, '../../references/01-principles/pi-value-definition.md')
      const content = fs.readFileSync(defPath, 'utf-8')
      expect(content).toContain('CustomerFact')
    })

    it('customer-gap-definition.md が canonical input set を参照している', () => {
      const defPath = path.join(
        SRC_DIR,
        '../../references/01-principles/customer-gap-definition.md',
      )
      const content = fs.readFileSync(defPath, 'utf-8')
      expect(content).toContain('canonical-input-sets')
    })
  })
})
