/**
 * deprecatedMetadataGuard —
 * `@deprecated` JSDoc annotation の metadata（@expiresAt / @sunsetCondition /
 * @reason）必須化と lifecycle 監視を行う temporal governance guard
 *
 * projects/aag-temporal-governance-hardening SP-D ADR-D-004。
 *
 * 検出する違反:
 *  - DM1 (PR1): 3 metadata（@expiresAt / @sunsetCondition / @reason）全て未記載の
 *               @deprecated 出現数 ≤ baseline
 *  - DM2 (PR4): @expiresAt の日付が現在日を過ぎている @deprecated 出現数 ≤ baseline
 *
 * 設計意図:
 *   `@deprecated` だけ書かれた annotation は temporal governance 上の問題を持つ:
 *   - いつ削除すべきか不明（@expiresAt 欠如）
 *   - どの条件で sunset するか不明（@sunsetCondition 欠如）
 *   - なぜ deprecated になったか不明（@reason 欠如）
 *   ADR-D-004 で全 @deprecated に 3 metadata を bulk 追記し、新規 @deprecated は
 *   3 metadata 必須とする ratchet-down で温存抑制する。さらに @expiresAt 超過を
 *   検出することで「deprecated のまま放置」を時間軸で防ぐ。
 *
 * Scope:
 *  - app/src/ 配下の .ts / .tsx (test ファイルは除外)
 *  - 検出対象は production code 内の @deprecated annotation
 *
 * Metadata 検出ルール:
 *  - 同一 JSDoc ブロック内（@deprecated 周辺 ±100/+400 文字）に
 *    @expiresAt / @sunsetCondition / @reason の 3 つ全てが揃っていれば metadata 充足
 *  - 1 つでも欠けると DM1 違反としてカウント
 *
 * @expiresAt 超過判定ルール (DM2):
 *  - @expiresAt の値を YYYY-MM-DD 形式として parse
 *  - 現在日 (Date.now()) と比較
 *  - 過去の日付なら DM2 違反としてカウント（hard fail）
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-D-004
 *  - projects/aag-temporal-governance-hardening/plan.md §ADR-D-004
 *  - references/03-guides/architecture-rule-system.md（temporal governance）
 *
 * @responsibility R:guard
 *
 * @taxonomyKind T:unclassified
 */

import { readFileSync } from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectTsFiles } from '../guardTestHelpers'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const APP_SRC = path.join(PROJECT_ROOT, 'app/src')

// DM1 fixed mode (baseline=0)
// - 初期 audit (2026-04-26) で production code に 3 metadata 全て未記載の
//   @deprecated を 7 件検出
// - PR2 で全 7 @deprecated に 3 metadata を bulk 追記
// - PR3 で baseline=0 fixed mode 移行
// - PR4 (本 commit) で DM2 (@expiresAt 超過) 検出を追加。新規 @deprecated は
//   3 metadata + 未来の @expiresAt が必須
const BASELINE_DEPRECATED_WITHOUT_METADATA = 0

// DM2 fixed mode (baseline=0)
// - 初期 audit (2026-04-26) で @expiresAt 超過は 0 件
//   (PR2 で追加した metadata の @expiresAt は 2026-12-31 / 2099-12-31 のいずれかで全て未来)
// - 期限が過ぎたら hard fail。ADR の sunset を強制する temporal governance 機構
const BASELINE_EXPIRED_DEPRECATED = 0

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

interface ExpiredDeprecated {
  readonly file: string
  readonly expiresAt: string
  readonly daysOverdue: number
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

/**
 * @deprecated 周辺コンテキストから @expiresAt の値を抽出
 * 例: `@expiresAt 2026-12-31` → "2026-12-31"
 */
function extractExpiresAt(content: string, deprecatedIdx: number): string | null {
  const start = Math.max(0, deprecatedIdx - 100)
  const end = Math.min(content.length, deprecatedIdx + 400)
  const ctx = content.slice(start, end)
  const match = ctx.match(/@expiresAt\s+(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

/**
 * @expiresAt が現在日 (now) より過去ならその超過日数を返す。未来 / 同日 なら null。
 */
function daysOverdueOrNull(expiresAt: string, now: Date): number | null {
  const expiry = new Date(`${expiresAt}T23:59:59.999Z`)
  if (Number.isNaN(expiry.getTime())) return null
  const diffMs = now.getTime() - expiry.getTime()
  if (diffMs <= 0) return null
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function findExpiredDeprecated(now: Date = new Date()): ExpiredDeprecated[] {
  const tsFiles = collectTsFiles(APP_SRC).filter(
    (f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'),
  )
  const expired: ExpiredDeprecated[] = []
  for (const file of tsFiles) {
    const content = readFileSync(file, 'utf-8')
    let idx = 0
    while ((idx = content.indexOf('@deprecated', idx)) !== -1) {
      const expiresAt = extractExpiresAt(content, idx)
      if (expiresAt) {
        const days = daysOverdueOrNull(expiresAt, now)
        if (days !== null) {
          expired.push({ file: path.relative(PROJECT_ROOT, file), expiresAt, daysOverdue: days })
        }
      }
      idx += '@deprecated'.length
    }
  }
  return expired
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

  it('DM2: @expiresAt 超過の @deprecated が 0 件である（lifecycle 監視）', () => {
    const expired = findExpiredDeprecated()
    const breakdown = expired
      .map((e) => `  - ${e.file}: @expiresAt ${e.expiresAt} (${e.daysOverdue} 日超過)`)
      .join('\n')
    const message =
      `@expiresAt 超過 @deprecated 数 = ${expired.length} ` +
      `(baseline = ${BASELINE_EXPIRED_DEPRECATED}):\n` +
      breakdown +
      '\n\n' +
      'hint: @expiresAt は @deprecated の実削除期限。期限を過ぎたら deprecated を ' +
      '物理削除するか、scope に変更があれば期限を再延長して理由を @reason に追記する。' +
      '\n  詳細: projects/aag-temporal-governance-hardening/plan.md §ADR-D-004'
    expect(expired.length, message).toBeLessThanOrEqual(BASELINE_EXPIRED_DEPRECATED)
  })

  it('extractExpiresAt は @expiresAt YYYY-MM-DD を正しく抽出する', () => {
    const sample = `/**
 * @deprecated
 * @expiresAt 2026-12-31
 * @sunsetCondition consumer 0
 * @reason legacy
 */`
    const idx = sample.indexOf('@deprecated')
    expect(extractExpiresAt(sample, idx)).toBe('2026-12-31')

    const sampleNoExpiresAt = `/**
 * @deprecated
 * @sunsetCondition consumer 0
 */`
    const idx2 = sampleNoExpiresAt.indexOf('@deprecated')
    expect(extractExpiresAt(sampleNoExpiresAt, idx2)).toBeNull()
  })

  it('daysOverdueOrNull は過去日付に正の数、未来日付に null を返す', () => {
    const now = new Date('2026-04-26T00:00:00.000Z')
    expect(daysOverdueOrNull('2099-12-31', now)).toBeNull() // 未来
    expect(daysOverdueOrNull('2026-12-31', now)).toBeNull() // 未来
    expect(daysOverdueOrNull('2025-01-01', now)).toBeGreaterThan(0) // 過去
    expect(daysOverdueOrNull('invalid-date', now)).toBeNull() // parse 失敗
  })
})
