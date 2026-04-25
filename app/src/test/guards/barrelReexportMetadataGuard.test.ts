/**
 * barrelReexportMetadataGuard —
 * barrel re-export file に `@sunsetCondition` / `@expiresAt` / `@reason` JSDoc 必須化 ratchet-down
 *
 * projects/architecture-debt-recovery SP-C ADR-C-004 PR1。
 *
 * F1「barrel 後方互換」原則が「削除判断を不要にする」口実として機能することを抑制するため、
 * barrel re-export 全てに期限と根拠を明示させる。
 *
 * 検出対象:
 *  - B1: barrel file のうち 3 metadata（@sunsetCondition / @expiresAt / @reason）すべて
 *        未記載の file 数 ≤ baseline=38（ratchet-down）
 *
 * Barrel の定義:
 *  - `app/src/` 配下の .ts / .tsx で、1 行以上の `^export \* from ...` を含む file
 *  - test / stories / .d.ts は除外
 *
 * ADR-C-004 進捗:
 *  - PR1 (2026-04-24): baseline=38 で ratchet-down 導入
 *  - PR2 (2026-04-24): 既存 38 barrel 全てに 3 metadata bulk 追記、baseline=0 到達
 *  - PR3: baseline=0 + fixed mode（新規 barrel 追加時は必ず metadata 必須）— 本 commit で反映
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-C-004
 *  - projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-015
 *  - projects/architecture-debt-recovery/inquiry/14-rule-retirement-candidates.md §R-7
 *
 * @responsibility R:guard
 */

import { readFileSync } from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectTsFiles } from '../guardTestHelpers'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const APP_SRC = path.join(PROJECT_ROOT, 'app/src')

const BASELINE_MISSING_METADATA = 0

const REQUIRED_TAGS = ['@sunsetCondition', '@expiresAt', '@reason'] as const

const isBarrelFile = (content: string): boolean => /^export \* from /m.test(content)

const hasAllRequiredTags = (content: string): boolean =>
  REQUIRED_TAGS.every((tag) => content.includes(tag))

describe('barrelReexportMetadataGuard', () => {
  const allFiles = collectTsFiles(APP_SRC)
  const barrelFiles: string[] = []
  const missingMetadata: string[] = []

  for (const file of allFiles) {
    const content = readFileSync(file, 'utf-8')
    if (!isBarrelFile(content)) continue
    barrelFiles.push(file)
    if (!hasAllRequiredTags(content)) {
      missingMetadata.push(path.relative(PROJECT_ROOT, file))
    }
  }

  it('B1: 3 metadata 未記載の barrel 数が baseline を超えない（ratchet-down）', () => {
    expect(
      missingMetadata.length,
      `3 metadata (@sunsetCondition / @expiresAt / @reason) 未記載の barrel 数 ${missingMetadata.length} が baseline=${BASELINE_MISSING_METADATA} を超過。\n` +
        '新規 barrel 追加時は 3 metadata を file 先頭 JSDoc に記載してください。\n' +
        '不足例 (最大 10 件): ' +
        missingMetadata.slice(0, 10).join(', '),
    ).toBeLessThanOrEqual(BASELINE_MISSING_METADATA)
  })

  it('B2: barrel 総数が存在する（collector sanity check）', () => {
    expect(
      barrelFiles.length,
      'barrel 検出が 0 件。collector が壊れている可能性があります。',
    ).toBeGreaterThan(0)
  })
})
