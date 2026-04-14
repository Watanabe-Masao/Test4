/**
 * AAG Derived-Only Import Guard
 *
 * consumer が ARCHITECTURE_RULES の正本ルートを facade 経由でのみ参照することを
 * 構造的に強制する。merged 以外の direct import（`architectureRules/rules` や
 * `@project-overlay/execution-overlay`）を禁止する。
 *
 * ルール定義:
 * - AR-AAG-DERIVED-ONLY-IMPORT
 * - AR-AAG-NO-BASE-RULES-CONSUMER-IMPORT
 * - AR-AAG-NO-DIRECT-OVERLAY-IMPORT
 *
 * 許可される例外:
 * - app/src/test/architectureRules/merged.ts（正本合成点）
 * - app/src/test/guards/executionOverlayGuard.test.ts（BaseRule vs overlay 整合検証）
 * - app/src/test/guards/aagDerivedOnlyImportGuard.test.ts（本ファイル自身: 文字列を定数として参照）
 *
 * @guard F1 バレルで後方互換
 * @guard C6 facade は orchestration のみ
 * @see references/03-guides/governance-final-placement-plan.md
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, rel } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage } from '../architectureRules'

/** consumer 側で import してはいけないパスとルール */
const FORBIDDEN_IMPORTS: {
  readonly ruleId: string
  readonly label: string
  readonly patterns: readonly RegExp[]
}[] = [
  {
    ruleId: 'AR-AAG-NO-BASE-RULES-CONSUMER-IMPORT',
    label: 'architectureRules/rules の直 import',
    patterns: [
      /from\s+['"]\.\.\/architectureRules\/rules['"]/,
      /from\s+['"]\.\/architectureRules\/rules['"]/,
      /from\s+['"]@\/test\/architectureRules\/rules['"]/,
    ],
  },
  {
    ruleId: 'AR-AAG-NO-DIRECT-OVERLAY-IMPORT',
    label: '@project-overlay/execution-overlay の直 import',
    patterns: [/from\s+['"]@project-overlay\/execution-overlay['"]/],
  },
]

/**
 * 直接参照を許可する例外ファイル。
 * - architectureRules ディレクトリ全体: 正本の実装点（rules.ts / merged.ts / types.ts 等）
 * - executionOverlayGuard.test.ts: BaseRule vs overlay の整合検証
 * - aagDerivedOnlyImportGuard.test.ts: 本ガードテスト自身（ルール文字列を定数として持つ）
 */
const ALLOWED_FILE_SUFFIXES: readonly string[] = [
  'test/guards/executionOverlayGuard.test.ts',
  'test/guards/aagDerivedOnlyImportGuard.test.ts',
  // Phase 6-3: merge / facade smoke test は 全 4 経路（barrel / index / merged / rules re-export）
  // から import して同値検証するため直参照が必要
  'test/guards/architectureRulesMergeSmokeGuard.test.ts',
  // aag-format-redesign: defaults の完全性検証のため BaseRule を直接参照する
  'test/guards/defaultOverlayCompletenessGuard.test.ts',
]

const ALLOWED_DIR_PREFIXES: readonly string[] = ['test/architectureRules/']

function isException(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, '/')
  if (ALLOWED_FILE_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) return true
  if (ALLOWED_DIR_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true
  return false
}

describe('AAG Derived-Only Import Guard', () => {
  // collect all ts / tsx files under app/src including test files
  const allFiles: string[] = []
  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue
        walk(full)
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        allFiles.push(full)
      }
    }
  }
  walk(SRC_DIR)

  for (const spec of FORBIDDEN_IMPORTS) {
    it(`consumer は ${spec.label} をしてはいけない`, () => {
      const rule = getRuleById(spec.ruleId)
      expect(rule, `ルール ${spec.ruleId} が存在する`).toBeDefined()
      const violations: string[] = []

      for (const file of allFiles) {
        const relPath = rel(file)
        if (isException(relPath)) continue
        const content = fs.readFileSync(file, 'utf-8')
        // コード行だけを対象にする（文字列/コメントでの言及は許可）
        for (const pattern of spec.patterns) {
          if (pattern.test(content)) {
            violations.push(relPath)
            break
          }
        }
      }

      expect(
        violations,
        rule ? formatViolationMessage(rule, violations) : violations.join('\n'),
      ).toEqual([])
    })
  }

  it('AR-AAG-DERIVED-ONLY-IMPORT: facade 経由以外のルート重複がないことを束ねて検証する', () => {
    // このテストは束ねルール AR-AAG-DERIVED-ONLY-IMPORT の最終ゲート。
    // 2 つの具体ルールが通れば derived-only は達成されている。
    const rule = getRuleById('AR-AAG-DERIVED-ONLY-IMPORT')
    expect(rule).toBeDefined()

    // Reuse the collected violations by recomputing（簡潔さ優先）
    const combined: string[] = []
    for (const file of allFiles) {
      const relPath = rel(file)
      if (isException(relPath)) continue
      const content = fs.readFileSync(file, 'utf-8')
      for (const spec of FORBIDDEN_IMPORTS) {
        if (spec.patterns.some((p) => p.test(content))) {
          combined.push(`${relPath} [${spec.ruleId}]`)
          break
        }
      }
    }

    const unique = [...new Set(combined)]
    expect(unique, rule ? formatViolationMessage(rule, unique) : unique.join('\n')).toEqual([])
  })
})
