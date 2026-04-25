/**
 * coreRequiredFieldNullCheckGuard —
 * UnifiedWidgetContext の required field (`result` / `prevYear`) に対する
 * null check pattern を ratchet-down 監視
 *
 * projects/architecture-debt-recovery SP-A ADR-A-004 PR1。
 *
 * 検出する違反:
 *  - **C1**: `if (!ctx.result)` / `ctx.result == null` などの null check が
 *    baseline を超えない（ratchet-down）
 *
 * 設計意図:
 *   `result: StoreResult` / `prevYear: PrevYearData` は型上は required だが、
 *   widget が「念のため」null check する pattern が存在する。これは型設計と
 *   runtime 期待の乖離を示すシグナル。ADR-A-004 で discriminated union 化
 *   して null check を不要にする。本 guard は移行中の状態を凍結。
 *
 * Baseline:
 *   PR1 当初 plan は baseline=2 (WID-031, WID-033) だが、実 audit で
 *   1 件 (Insight/widgets.tsx の insight-budget-simulator render) のみ検出。
 *   baseline=1 で現状凍結。
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-A-004
 *  - projects/architecture-debt-recovery/inquiry/16-breaking-changes.md §BC-4
 *  - projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-007 / §LEG-008
 *  - projects/widget-context-boundary/checklist.md Phase 4
 *
 * @responsibility R:guard
 */

import { readFileSync } from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectTsFiles } from '../guardTestHelpers'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const APP_SRC = path.join(PROJECT_ROOT, 'app/src')

const BASELINE_NULL_CHECK_COUNT = 1

const KNOWN_NULL_CHECK_FILES: readonly string[] = [
  // ADR-A-004 PR4 で discriminated union に移行後 0 到達予定
  'app/src/presentation/pages/Insight/widgets.tsx',
]

// `if (!ctx.result)` `if (!ctx.prevYear)` `ctx.result == null` `ctx.prevYear == null`
// `ctx.result ?? ` `ctx.prevYear ?? ` を検出
const NULL_CHECK_PATTERNS = [
  /if\s*\(\s*!\s*ctx\.result\s*\)/,
  /if\s*\(\s*!\s*ctx\.prevYear\s*\)/,
  /ctx\.result\s*==\s*null/,
  /ctx\.prevYear\s*==\s*null/,
  /ctx\.result\s*\?\?\s/,
  /ctx\.prevYear\s*\?\?\s/,
] as const

describe('coreRequiredFieldNullCheckGuard', () => {
  const detected = new Set<string>()
  const allFiles = collectTsFiles(APP_SRC).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
  for (const file of allFiles) {
    if (file.includes('/__tests__/') || file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
      continue
    }
    const content = readFileSync(file, 'utf-8')
    for (const re of NULL_CHECK_PATTERNS) {
      if (re.test(content)) {
        detected.add(path.relative(PROJECT_ROOT, file))
        break
      }
    }
  }

  it('C1: required field の null check 数が baseline を超えない（ratchet-down）', () => {
    expect(
      detected.size,
      `null check 検出 ${detected.size} 件 が baseline=${BASELINE_NULL_CHECK_COUNT} を超過。\n` +
        '検出ファイル: ' +
        [...detected].join(', ') +
        '\n\n' +
        'hint: ADR-A-004 で StoreResult / PrevYearData を discriminated union 化することで\n' +
        '  null check を不要にする計画。新規 null check は型設計と runtime 期待の乖離を示すため避けてください。',
    ).toBeLessThanOrEqual(BASELINE_NULL_CHECK_COUNT)
  })

  it('C2: 検出 file が ALLOWLIST と一致（差分検出）', () => {
    const detectedSorted = [...detected].sort()
    const expectedSorted = [...KNOWN_NULL_CHECK_FILES].sort()
    const newFiles = detectedSorted.filter((f) => !expectedSorted.includes(f))
    const goneFiles = expectedSorted.filter((f) => !detectedSorted.includes(f))
    expect(
      newFiles,
      `新規 null check file: ${newFiles.join(', ')}\n` +
        '解消するか KNOWN_NULL_CHECK_FILES に追加 + baseline 調整してください。',
    ).toEqual([])
    expect(
      goneFiles,
      `ALLOWLIST 内 file が解消: ${goneFiles.join(', ')}\n` +
        'baseline を減算し ALLOWLIST から削除してください（卒業処理）。',
    ).toEqual([])
  })
})
