/**
 * deprecatedMetadataGuard —
 * `@deprecated` JSDoc annotation の metadata（@expiresAt / @sunsetCondition /
 * @reason）必須化を ratchet-down 管理
 *
 * projects/aag-temporal-governance-hardening SP-D ADR-D-004 PR1。
 *
 * 検出する違反:
 *  - DM1: 3 metadata（@expiresAt / @sunsetCondition / @reason）全て未記載の
 *         @deprecated 出現数 ≤ baseline
 *
 * 設計意図:
 *   `@deprecated` だけ書かれた annotation は temporal governance 上の問題を持つ:
 *   - いつ削除すべきか不明（@expiresAt 欠如）
 *   - どの条件で sunset するか不明（@sunsetCondition 欠如）
 *   - なぜ deprecated になったか不明（@reason 欠如）
 *   ADR-D-004 で全 @deprecated に 3 metadata を bulk 追記し、新規 @deprecated は
 *   3 metadata 必須とする ratchet-down で温存抑制する。
 *
 * Scope:
 *  - app/src/ 配下の .ts / .tsx (test ファイルは除外)
 *  - 検出対象は production code 内の @deprecated annotation
 *
 * Metadata 検出ルール:
 *  - 同一 JSDoc ブロック内（@deprecated 周辺 ±100/+400 文字）に
 *    @expiresAt / @sunsetCondition / @reason の 3 つ全てが揃っていれば metadata 充足
 *  - 1 つでも欠けると違反としてカウント
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-D-004
 *  - projects/aag-temporal-governance-hardening/plan.md §ADR-D-004
 *  - references/03-guides/architecture-rule-system.md（temporal governance）
 *
 * @responsibility R:guard
 */

import { readFileSync } from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectTsFiles } from '../guardTestHelpers'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const APP_SRC = path.join(PROJECT_ROOT, 'app/src')

// fixed mode (baseline=0)
// - 初期 audit (2026-04-26) で production code に 3 metadata 全て未記載の
//   @deprecated を 7 件検出
// - ADR-D-004 PR2 (commit 759ef32) で全 7 @deprecated に 3 metadata を bulk 追記
// - ADR-D-004 PR3 (本 commit) で baseline=0 fixed mode 移行。
//   新規 @deprecated は 3 metadata (@expiresAt / @sunsetCondition / @reason) 必須
// - PR4 で @expiresAt 超過 entry を docs:check で fail させる lifecycle 監視追加予定
const BASELINE_DEPRECATED_WITHOUT_METADATA = 0

const REQUIRED_METADATA = ['@expiresAt', '@sunsetCondition', '@reason'] as const

/** @deprecated の周辺コンテキストに 3 metadata 全てが含まれるか */
function hasAllMetadata(content: string, deprecatedIdx: number): boolean {
  const start = Math.max(0, deprecatedIdx - 100)
  const end = Math.min(content.length, deprecatedIdx + 400)
  const ctx = content.slice(start, end)
  return REQUIRED_METADATA.every((tag) => ctx.includes(tag))
}

interface DeprecatedViolation {
  readonly file: string
  readonly count: number
}

function findDeprecatedWithoutMetadata(): DeprecatedViolation[] {
  const tsFiles = collectTsFiles(APP_SRC).filter(
    (f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'),
  )
  const violations: DeprecatedViolation[] = []
  for (const file of tsFiles) {
    const content = readFileSync(file, 'utf-8')
    let count = 0
    let idx = 0
    while ((idx = content.indexOf('@deprecated', idx)) !== -1) {
      if (!hasAllMetadata(content, idx)) count += 1
      idx += '@deprecated'.length
    }
    if (count > 0) {
      violations.push({ file: path.relative(PROJECT_ROOT, file), count })
    }
  }
  return violations
}

describe('deprecatedMetadataGuard (SP-D ADR-D-004)', () => {
  it('DM1: metadata 未記載の @deprecated 数が baseline を超えない（ratchet-down）', () => {
    const violations = findDeprecatedWithoutMetadata()
    const totalCount = violations.reduce((sum, v) => sum + v.count, 0)
    const breakdown = violations.map((v) => `  - ${v.file}: ${v.count}`).join('\n')
    const message =
      `metadata 未記載の @deprecated 数 = ${totalCount} ` +
      `(baseline = ${BASELINE_DEPRECATED_WITHOUT_METADATA}):\n` +
      breakdown +
      '\n\n' +
      '必須 metadata: @expiresAt / @sunsetCondition / @reason の 3 つ全て' +
      '\n  fixed mode (baseline=0) 到達済み。新規 @deprecated には 3 metadata 必須。' +
      '\n  詳細: projects/aag-temporal-governance-hardening/plan.md §ADR-D-004'
    expect(totalCount, message).toBeLessThanOrEqual(BASELINE_DEPRECATED_WITHOUT_METADATA)
  })

  it('hasAllMetadata は 3 metadata 全部揃っている時 true、欠けている時 false', () => {
    const allThree = `/**
 * @deprecated
 * @expiresAt 2026-12-31
 * @sunsetCondition consumer 0 確認後
 * @reason 後方互換ラッパー
 */`
    const missingReason = `/**
 * @deprecated
 * @expiresAt 2026-12-31
 * @sunsetCondition consumer 0 確認後
 */`
    const idx1 = allThree.indexOf('@deprecated')
    const idx2 = missingReason.indexOf('@deprecated')
    expect(hasAllMetadata(allThree, idx1)).toBe(true)
    expect(hasAllMetadata(missingReason, idx2)).toBe(false)
  })
})
