// timeSlotLaneSurfaceGuard — 時間帯比較レーンの raw row 露出を ratchet-down で管理
//
// unify-period-analysis Phase 6 Step C pre-work:
// 時間帯比較を `FreePeriodReadModel` に吸収せず、sibling lane として切り出す
// 方針を固定 (projects/unify-period-analysis/step-c-timeslot-lane-policy.md)。
// 本 guard はその方針の軽めの先行防御として、`StoreAggregationRow` (時間帯の
// raw row 型) が presentation 層から直接 import される箇所を固定 baseline で
// 管理する。
//
// 狙い:
//
//   1. 現状 1 件 (`StoreHourlyChartLogic.ts`) の raw row consumer を allowlist
//      化し、新規 widget が同じパターンで raw rows を触るのを防ぐ
//   2. Step C 実装時に `TimeSlotBundle` / `TimeSlotSeries` 経由に載せ替えて
//      baseline を 1 → 0 に到達させる
//
// 本 guard は「禁止」よりも「移行目標の可視化」として機能する。
//
// @see projects/unify-period-analysis/step-c-timeslot-lane-policy.md
// @see app/src/application/hooks/timeSlot/TimeSlotBundle.types.ts
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')

/**
 * `StoreAggregationRow` を presentation 層で import してよいファイルの allowlist。
 *
 * ratchet-down 履歴:
 *   - Phase 6 Step C pre-work (2026-04-15): baseline 1 (StoreHourlyChartLogic.ts)
 *   - Step C 実装時: 1 → 0 (TimeSlotBundle / TimeSlotSeries 経由に移行)
 */
const TIME_SLOT_RAW_ROW_ALLOWLIST: readonly { readonly path: string; readonly reason: string }[] =
  [
    {
      path: 'presentation/components/charts/StoreHourlyChartLogic.ts',
      reason:
        'Step C 実装前の現行 raw row consumer。TimeSlotBundle 経由への移行で allowlist 削除予定',
    },
  ]

const TIME_SLOT_ALLOWLIST_PATHS = new Set(TIME_SLOT_RAW_ROW_ALLOWLIST.map((e) => e.path))

const RAW_ROW_TYPE_PATTERNS: readonly RegExp[] = [/\bStoreAggregationRow\b/]

function isTestOrAuditFile(relPath: string): boolean {
  if (relPath.includes('__tests__')) return true
  if (relPath.includes('.test.')) return true
  if (relPath.includes('.spec.')) return true
  if (relPath.startsWith('test/audits/')) return true
  if (relPath.startsWith('test/fixtures/')) return true
  if (relPath.startsWith('test/guards/')) return true
  return false
}

describe('timeSlotLaneSurfaceGuard (unify-period-analysis Phase 6 Step C pre-work)', () => {
  it('G6-TS: StoreAggregationRow の presentation 層 import は allowlist 内に限定される', () => {
    const presFiles = collectTsFiles(path.join(SRC_DIR, 'presentation'))
    const violations: string[] = []

    for (const file of presFiles) {
      const relPath = rel(file)
      if (isTestOrAuditFile(relPath)) continue
      if (TIME_SLOT_ALLOWLIST_PATHS.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      for (const pattern of RAW_ROW_TYPE_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(relPath + ': matched ' + pattern)
          break
        }
      }
    }

    expect(
      violations,
      violations.length > 0
        ? [
            '[Phase 6 Step C] StoreAggregationRow を presentation 層で直接参照しないでください:',
            ...violations.map((v) => '  - ' + v),
            '',
            '解決方法:',
            '  1. Step C 実装後は ctx.timeSlotLane.bundle.currentSeries / comparisonSeries を消費する',
            '  2. Step C 実装前は TIME_SLOT_RAW_ROW_ALLOWLIST に reason を添えて追加 (ただし既存 1 件以上増やさない)',
            '',
            '詳細: projects/unify-period-analysis/step-c-timeslot-lane-policy.md',
          ].join('\n')
        : undefined,
    ).toEqual([])
  })

  it('baseline: TIME_SLOT_RAW_ROW_ALLOWLIST は 1 件で固定 (Step C 実装時に 0 に到達)', () => {
    // Phase 6 Step C pre-work 時点で 1 件 (StoreHourlyChartLogic.ts)。
    // Step C 実装時に TimeSlotBundle / TimeSlotSeries 経由に移行して 0 に到達する。
    expect(TIME_SLOT_RAW_ROW_ALLOWLIST.length).toBeLessThanOrEqual(1)
  })

  it('TIME_SLOT_RAW_ROW_ALLOWLIST の各 entry が実在ファイルを指している (orphan 検出)', () => {
    const missing: string[] = []
    for (const entry of TIME_SLOT_RAW_ROW_ALLOWLIST) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) missing.push(entry.path)
    }
    expect(missing, '存在しないファイル: ' + missing.join(', ')).toEqual([])
  })

  it('TIME_SLOT_RAW_ROW_ALLOWLIST の各 entry が実際に StoreAggregationRow を import している (stale 検出)', () => {
    const noLonger: string[] = []
    for (const entry of TIME_SLOT_RAW_ROW_ALLOWLIST) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) continue
      const content = fs.readFileSync(abs, 'utf-8')
      const hasImport = RAW_ROW_TYPE_PATTERNS.some((p) => p.test(content))
      if (!hasImport) noLonger.push(entry.path)
    }
    expect(
      noLonger,
      'allowlist に残っているが既に移行済みのファイル (削除推奨): ' + noLonger.join(', '),
    ).toEqual([])
  })

  it('TimeSlotBundle 型契約ファイルが存在する (Step C pre-work の型先行固定)', () => {
    const typeFile = path.join(
      SRC_DIR,
      'application/hooks/timeSlot/TimeSlotBundle.types.ts',
    )
    expect(fs.existsSync(typeFile), 'TimeSlotBundle.types.ts が存在しない').toBe(true)
    const content = fs.readFileSync(typeFile, 'utf-8')
    // 契約面の主要 export を固定する
    expect(content).toContain('export interface TimeSlotFrame')
    expect(content).toContain('export interface TimeSlotBundle')
    expect(content).toContain('export interface TimeSlotSeries')
    expect(content).toContain('export interface TimeSlotLane')
  })

  it('Step C 方針ドキュメントが存在する (意思決定の固定先)', () => {
    const policyFile = path.resolve(
      SRC_DIR,
      '../../projects/unify-period-analysis/step-c-timeslot-lane-policy.md',
    )
    expect(fs.existsSync(policyFile), 'step-c-timeslot-lane-policy.md が存在しない').toBe(true)
    const content = fs.readFileSync(policyFile, 'utf-8')
    // 要点が記載されていることを確認
    expect(content).toContain('sibling lane')
    expect(content).toContain('timeSlotLane')
    expect(content).toContain('TimeSlotBundle')
  })
})
