/**
 * sameInterfaceNameGuard —
 * 異なるファイルで同名の `export interface` が宣言されることを ratchet-down 監視
 *
 * projects/architecture-debt-recovery SP-A ADR-A-003 PR1。
 *
 * 検出する違反:
 *  - **S1**: app/src 配下で同じ interface 名が 2 ファイル以上に存在
 *
 * 設計意図:
 *   2 つの WidgetDef interface が並存し、どちらが本物か文脈に依存する状態を
 *   ratchet-down で固定。PR2 で新型 (DashboardWidgetDef / UnifiedWidgetDef) を
 *   導入、PR3 で 45 registry を切替、PR4 で WidgetDef alias を削除して
 *   baseline=0 + fixed mode 移行。
 *
 * Scope:
 *  - app/src/ 配下の `.ts` / `.tsx` (test / stories / .d.ts 除外)
 *  - `^export interface <Name>` のみ検出（type alias / class は対象外）
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-A-003
 *  - projects/architecture-debt-recovery/inquiry/16-breaking-changes.md §BC-3
 *  - projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-005
 *  - projects/widget-context-boundary/checklist.md Phase 3
 *
 * @responsibility R:guard
 */

import { readFileSync } from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectTsFiles } from '../guardTestHelpers'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const APP_SRC = path.join(PROJECT_ROOT, 'app/src')

// 進捗:
// PR1 (2026-04-24): 当初 baseline=1 (WidgetDef のみ) を計画したが実 audit で 28 件
//                   検出。baseline=28 を現状凍結（うち 1 が ADR-A-003 scope の WidgetDef）
// PR4 (2026-04-24): WidgetDef を UnifiedWidgetDef / DashboardWidgetDef に分離して
//                   alias 削除完了。baseline 28→27 ratchet-down。
//                   残 27 件は ADR-A-003 scope 外の local interface 重複で fixed mode。
const BASELINE_DUPLICATE_INTERFACE_COUNT = 27

/**
 * 既知の duplicate interface name。ADR-A-003 scope は `WidgetDef` のみ。
 * 残 27 件は無関係な local interface name 衝突 (本 guard は新規追加を防ぐ)。
 */
const KNOWN_DUPLICATE_INTERFACES: readonly string[] = [
  'BackupImportResult',
  'BackupMeta',
  'ComparisonPoint',
  'CumulativeEntry',
  'DailyAggregate',
  'DailyQuantityData',
  'DailyYoYRow',
  'DiffResult',
  'DowAggregate',
  'DrillState',
  'DualRunResult',
  'EtrnStation',
  'EtrnStationEntry',
  'FileImportResult',
  'HeatmapData',
  'HierarchyFilter',
  'HierarchyOption',
  'ImportSummary',
  'MonthEntry',
  'MovingAverageEntry',
  // 'PeriodMetrics': ADR-C-003 PR3b 拡張 cascade で infrastructure/duckdb/queries/conditionMatrix.ts 削除済み (2026-04-25) — 重複解消
  'Props',
  'RawFileEntry',
  'StoreAggregationRow',
  'WaterfallItem',
  // ADR-A-003 PR4 (2026-04-24): WidgetDef を分離削除済み (LEG-005/006 達成)
  'WoWWindow',
  'YoYWindow',
]

const collectInterfaceLocations = (): Map<string, string[]> => {
  const tsFiles = collectTsFiles(APP_SRC)
  const byName = new Map<string, string[]>()
  const exportInterfaceRe = /^export\s+interface\s+([A-Z][a-zA-Z0-9_]*)\b/gm
  for (const file of tsFiles) {
    const content = readFileSync(file, 'utf-8')
    const matches = content.matchAll(exportInterfaceRe)
    for (const m of matches) {
      const name = m[1]
      const list = byName.get(name) ?? []
      list.push(file)
      byName.set(name, list)
    }
  }
  return new Map([...byName.entries()].filter(([, files]) => files.length > 1))
}

describe('sameInterfaceNameGuard', () => {
  const duplicates = collectInterfaceLocations()

  it('S1: 同名 interface の重複数が baseline を超えない（ratchet-down）', () => {
    expect(
      duplicates.size,
      `重複 interface 名 ${duplicates.size} 件 が baseline=${BASELINE_DUPLICATE_INTERFACE_COUNT} を超過。\n` +
        '検出された重複: ' +
        [...duplicates.keys()].join(', ') +
        '\n\n' +
        'hint: ADR-A-003 PR2-PR4 で新名導入 + alias 削除して baseline=0 到達してください。',
    ).toBeLessThanOrEqual(BASELINE_DUPLICATE_INTERFACE_COUNT)
  })

  it('S2: 検出された重複が ALLOWLIST と完全一致（差分検出）', () => {
    const detectedNames = [...duplicates.keys()].sort()
    const expectedNames = [...KNOWN_DUPLICATE_INTERFACES].sort()
    const newDuplicates = detectedNames.filter((n) => !expectedNames.includes(n))
    const goneDuplicates = expectedNames.filter((n) => !detectedNames.includes(n))
    expect(
      newDuplicates,
      `新規 duplicate interface を検出: ${newDuplicates.join(', ')}\n` +
        '解消するか KNOWN_DUPLICATE_INTERFACES に追加してください。',
    ).toEqual([])
    expect(
      goneDuplicates,
      `KNOWN_DUPLICATE_INTERFACES 記載の name が解消: ${goneDuplicates.join(', ')}\n` +
        'baseline を減算し、ALLOWLIST から該当 entry を削除してください（卒業処理）。',
    ).toEqual([])
  })
})
