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
    it('UnifiedWidgetContext のフィールド数が上限を超えない', () => {
      const typesPath = path.join(SRC_DIR, 'presentation/components/widgets/types.ts')
      const content = fs.readFileSync(typesPath, 'utf-8')

      // UnifiedWidgetContext の interface 本体を抽出
      const ifaceMatch = content.match(/export interface UnifiedWidgetContext \{[\s\S]*?^}/m)
      if (!ifaceMatch) {
        expect.fail('UnifiedWidgetContext interface が見つかりません')
        return
      }

      const fieldCount = (ifaceMatch[0].match(/readonly /g) || []).length
      // 2026-04-05 時点の凍結値。これ以上増やさない。
      const MAX_FIELDS = 47
      expect(
        fieldCount,
        `UnifiedWidgetContext のフィールド数が ${MAX_FIELDS} を超えています（${fieldCount} 件）。` +
          'shared hub の肥大化を防ぐため、新規フィールドは feature slice に寄せてください。',
      ).toBeLessThanOrEqual(MAX_FIELDS)
    })
  })

  describe('deprecated wrapper の新規追加禁止', () => {
    it('@deprecated の総数が frozen-list §3 の上限（5）を超えない', () => {
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

      // frozen-list §3 は max 5 だが、JSDoc @deprecated は7箇所（wrapper + adapter）。
      // 2026-04-05 時点の凍結値。これ以上増やさない。
      const MAX_DEPRECATED = 7
      expect(
        deprecatedCount,
        `@deprecated が凍結上限（${MAX_DEPRECATED}）を超えています（${deprecatedCount} 件）。` +
          '新規 deprecated wrapper の追加は禁止です。',
      ).toBeLessThanOrEqual(MAX_DEPRECATED)
    })
  })

  describe('shared plan hooks の件数凍結', () => {
    it('application/hooks/plans/ の plan ファイル数が凍結上限を超えない', () => {
      const plansDir = path.join(SRC_DIR, 'application/hooks/plans')
      if (!fs.existsSync(plansDir)) return

      const planFiles = collectTsFiles(plansDir).filter((f) => /Plan\.ts$/.test(f))
      // category/time-slot/clip-export/weather plans を features/ に移行済み。
      // 残り 13 は generic/cross-cutting。これ以上増やさない。
      const MAX_SHARED_PLANS = 13
      expect(
        planFiles.length,
        `shared plan hooks が凍結上限（${MAX_SHARED_PLANS}）を超えています（${planFiles.length} 件）。` +
          '新規 plan は features/<feature>/application/plans/ に作成してください。',
      ).toBeLessThanOrEqual(MAX_SHARED_PLANS)
    })
  })
})
