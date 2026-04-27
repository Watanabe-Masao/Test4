/**
 * No-New-Debt Guard — 進化安全のための新規負債禁止ガード
 *
 * Phase 1-2 で解消した構造負債の再導入を防止する。
 * 新規追加を禁止し、既存の authoritative 構造を保護する。
 *
 * ルール定義: architectureRules.ts (AR-001〜AR-005)
 *
 * @guard G1 テストに書く — 機械的検出手段で再発防止
 * @see references/03-guides/safety-first-architecture-plan.md
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage, checkRatchetDown } from '../architectureRules'

const SRC_DIR = path.resolve(__dirname, '../..')

describe('no-new-debt guard', () => {
  describe('dual-run compare コードの再導入禁止', () => {
    const rule = getRuleById('AR-001')!

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

      expect(violations, formatViolationMessage(rule, violations)).toEqual([])
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

      expect(violations, formatViolationMessage(rule, violations)).toEqual([])
    })

    it('dualRunObserver.ts が存在しない（退役済み）', () => {
      const observerPath = path.join(SRC_DIR, 'application/services/dualRunObserver.ts')
      expect(
        fs.existsSync(observerPath),
        `[${rule.id}] dualRunObserver.ts は退役済み。復活禁止。\n正しいパターン: ${rule.correctPattern.description}`,
      ).toBe(false)
    })
  })

  describe('ExecutionMode の dual-run-compare 再導入禁止', () => {
    const rule = getRuleById('AR-001')!

    it('wasmEngine.ts に dual-run-compare が含まれない', () => {
      const enginePath = path.join(SRC_DIR, 'application/services/wasmEngine.ts')
      const content = fs.readFileSync(enginePath, 'utf-8')
      expect(
        content.includes('dual-run-compare'),
        `[${rule.id}] ${rule.correctPattern.description}`,
      ).toBe(false)
    })
  })

  describe('presentation 層の raw engine field 露出禁止', () => {
    const rule = getRuleById('AR-002')!

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

      expect(violations, formatViolationMessage(rule, violations)).toEqual([])
    })
  })

  describe('comparison plan の provenance 必須化', () => {
    it('prevYearScope/compMode を持つ plan hook は PlanComparisonProvenance を返す', () => {
      const plansDir = path.join(SRC_DIR, 'application/hooks/plans')
      if (!fs.existsSync(plansDir)) return

      const planFiles = collectTsFiles(plansDir).filter((f) => /Plan\.ts$/.test(f))
      const violations: string[] = []

      for (const file of planFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        const hasComparison =
          content.includes('prevYearScope') ||
          content.includes('compMode') ||
          content.includes('isPrevYear')
        if (hasComparison && !content.includes('PlanComparisonProvenance')) {
          violations.push(rel(file))
        }
      }

      expect(
        violations,
        `以下の comparison plan に PlanComparisonProvenance がありません:\n${violations.join('\n')}`,
      ).toEqual([])
    })
  })

  describe('shared hub の肥大化防止', () => {
    const rule = getRuleById('AR-003')!

    it('UnifiedWidgetContext のフィールド数が上限を超えない', () => {
      const typesPath = path.join(SRC_DIR, 'presentation/components/widgets/types.ts')
      const content = fs.readFileSync(typesPath, 'utf-8')

      const ifaceMatch = content.match(/export interface UnifiedWidgetContext \{[\s\S]*?^}/m)
      if (!ifaceMatch) {
        expect.fail('UnifiedWidgetContext interface が見つかりません')
        return
      }

      const fieldCount = (ifaceMatch[0].match(/readonly /g) || []).length
      expect(
        fieldCount,
        `[${rule.id}] ${rule.what}\n` +
          `正しいパターン: ${rule.correctPattern.description}\n` +
          `フィールド数: ${fieldCount} (上限: ${rule.detection.baseline})`,
      ).toBeLessThanOrEqual(rule.detection.baseline!)
      checkRatchetDown(rule, fieldCount, 'fieldCount')
    })
  })

  describe('deprecated wrapper の新規追加禁止', () => {
    const rule = getRuleById('AR-004')!

    it('@deprecated の総数が凍結上限を超えない', () => {
      const servicesDir = path.join(SRC_DIR, 'application/services')
      const domainDir = path.join(SRC_DIR, 'domain')

      let deprecatedCount = 0
      const dirs = [servicesDir, domainDir]
      for (const dir of dirs) {
        const files = collectTsFiles(dir).filter((f) => !f.includes('__tests__'))
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf-8')
          const matches = content.match(/@deprecated/g)
          if (matches) deprecatedCount += matches.length
        }
      }

      expect(
        deprecatedCount,
        `[${rule.id}] ${rule.what}\n` +
          `正しいパターン: ${rule.correctPattern.description}\n` +
          `@deprecated: ${deprecatedCount} (上限: ${rule.detection.baseline})`,
      ).toBeLessThanOrEqual(rule.detection.baseline!)
      checkRatchetDown(rule, deprecatedCount, '@deprecated')
    })
  })

  describe('shared plan hooks の件数凍結', () => {
    const rule = getRuleById('AR-005')!

    it('application/hooks/plans/ の plan ファイル数が凍結上限を超えない', () => {
      const plansDir = path.join(SRC_DIR, 'application/hooks/plans')
      if (!fs.existsSync(plansDir)) return

      const planFiles = collectTsFiles(plansDir).filter((f) => /Plan\.ts$/.test(f))
      expect(
        planFiles.length,
        `[${rule.id}] ${rule.what}\n` +
          `正しいパターン: ${rule.correctPattern.description}\n` +
          `plan 数: ${planFiles.length} (上限: ${rule.detection.baseline})`,
      ).toBeLessThanOrEqual(rule.detection.baseline!)
      checkRatchetDown(rule, planFiles.length, 'planFiles')
    })
  })
})
