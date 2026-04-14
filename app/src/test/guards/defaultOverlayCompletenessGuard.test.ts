/**
 * Default Overlay Completeness Guard
 *
 * `DEFAULT_EXECUTION_OVERLAY` が BaseRule の全 rule をカバーすることを検証する。
 *
 * 目的: 新 project の bootstrap 負荷を下げるため、project overlay が空でも
 * defaults で全 rule が解決される状態を保つ。BaseRule に新しい rule を追加した
 * 際は defaults にも追加する義務を機械的に強制する。
 *
 * 検証項目:
 * 1. BaseRule 全 rule が DEFAULT_EXECUTION_OVERLAY に存在する
 * 2. DEFAULT_EXECUTION_OVERLAY に未知の ruleId（BaseRule に存在しない）がない
 * 3. defaults の effort が有効値である
 * 4. defaults の priority が非負整数である
 * 5. defaults の fixNow が有効値である
 *
 * このガードは executionOverlayGuard の test 1 緩和と表裏一体:
 * - executionOverlayGuard test 1: rule が effective overlay（project ∪ defaults）を持つ
 * - 本ガード: defaults が BaseRule 全 rule をカバーする
 *
 * したがって、project overlay が空でも rule の漏れは発生しない。
 *
 * @responsibility R:utility
 * @see projects/aag-format-redesign/overlay-bootstrap-design.md
 */

import { describe, it, expect } from 'vitest'
import { ARCHITECTURE_RULES as BASE_RULES } from '../architectureRules/rules'
import { DEFAULT_EXECUTION_OVERLAY } from '../architectureRules/defaults'

describe('Default Overlay Completeness Guard', () => {
  it('BaseRule 全 rule が DEFAULT_EXECUTION_OVERLAY に存在する', () => {
    const missing: string[] = []
    for (const rule of BASE_RULES) {
      if (!DEFAULT_EXECUTION_OVERLAY[rule.id]) {
        missing.push(rule.id)
      }
    }
    expect(
      missing,
      'defaults 欠損ルール（app/src/test/architectureRules/defaults.ts に追加してください）',
    ).toEqual([])
  })

  it('DEFAULT_EXECUTION_OVERLAY に未知の ruleId がない（orphan 検出）', () => {
    const knownIds = new Set(BASE_RULES.map((r) => r.id))
    const orphans: string[] = []
    for (const ruleId of Object.keys(DEFAULT_EXECUTION_OVERLAY)) {
      if (!knownIds.has(ruleId)) {
        orphans.push(ruleId)
      }
    }
    expect(
      orphans,
      'defaults に存在するが rules.ts にない ruleId（defaults から削除してください）',
    ).toEqual([])
  })

  it('defaults の effort が有効値', () => {
    const validEfforts = new Set(['trivial', 'small', 'medium'])
    const invalid: string[] = []
    for (const [ruleId, entry] of Object.entries(DEFAULT_EXECUTION_OVERLAY)) {
      if (!validEfforts.has(entry.executionPlan.effort)) {
        invalid.push(`${ruleId}: invalid effort '${entry.executionPlan.effort}'`)
      }
    }
    expect(invalid).toEqual([])
  })

  it('defaults の priority が非負整数', () => {
    const invalid: string[] = []
    for (const [ruleId, entry] of Object.entries(DEFAULT_EXECUTION_OVERLAY)) {
      const p = entry.executionPlan.priority
      if (!Number.isInteger(p) || p < 0) {
        invalid.push(`${ruleId}: invalid priority ${p}`)
      }
    }
    expect(invalid).toEqual([])
  })

  it('defaults の fixNow が有効値', () => {
    const validFixNow = new Set(['now', 'debt', 'review'])
    const invalid: string[] = []
    for (const [ruleId, entry] of Object.entries(DEFAULT_EXECUTION_OVERLAY)) {
      if (!validFixNow.has(entry.fixNow)) {
        invalid.push(`${ruleId}: invalid fixNow '${entry.fixNow}'`)
      }
    }
    expect(invalid).toEqual([])
  })
})
