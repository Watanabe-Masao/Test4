/**
 * noDayOnlyKeyGuard —
 * `(storeId, day)` 2 軸のみで indexing する集約 primitive (`indexByStoreDay` /
 * `aggregateAllStores` / `aggregateForStore`) の **新規利用** を ratchet-down で禁止。
 *
 * 設計意図:
 *   day-only key (1〜31 の day-of-month のみ) は year/month の context を欠落するため、
 *   複数月データを混在させると month-collision が起きる。`DateKey` (YYYY-MM-DD)
 *   または `(year, month, day, storeId)` 形式に置換すべきだが、現状 5 ファイルが
 *   既存の正規利用として残っているため baseline で凍結する。
 *
 * 検出対象:
 *   - identifier: `indexByStoreDay`, `aggregateAllStores`, `aggregateForStore`
 *   - 除外: definition file (`domain/models/ClassifiedSales.ts`,
 *     `domain/models/DataTypes.ts`, `domain/models/record/**`) と test
 *
 * Baseline 推移:
 *   - 2026-04-26 初期: 5 file (presentation 1 + features 1 + application/usecases 3)
 *   - 目標: 0 (DateKey 移行完了時に削除)
 *
 * 例外:
 *   定義ファイル本体は除外。新規 caller を追加するときは:
 *   1. DateKey ベースの primitive に置換できないか検討
 *   2. 不可避なら `KNOWN_DAY_ONLY_KEY_FILES` に追加 + BASELINE を +1 し、理由を JSDoc に書く
 *
 * @see CLAUDE.md §設計原則 — D1/D2 数学的不変条件
 * @responsibility R:guard
 *
 * @taxonomyKind T:unclassified
 */

import * as fs from 'fs'
import * as path from 'path'
import { describe, expect, it } from 'vitest'
import { collectTsFiles } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')

const DAY_ONLY_KEY_IDENTIFIERS = [
  'indexByStoreDay',
  'aggregateAllStores',
  'aggregateForStore',
] as const

// 定義ファイル: これらが primitive を export / re-export する正本。検出対象から除外。
const DEFINITION_FILES = new Set<string>([
  path.join(SRC_DIR, 'domain/models/ClassifiedSales.ts'),
  path.join(SRC_DIR, 'domain/models/DataTypes.ts'),
  path.join(SRC_DIR, 'domain/models/record.ts'),
])

const DEFINITION_DIR_PREFIX = path.join(SRC_DIR, 'domain/models/record')

const BASELINE_DAY_ONLY_KEY_FILES = 5

const KNOWN_DAY_ONLY_KEY_FILES: readonly string[] = [
  'application/usecases/calculation/dailyBuilder.ts',
  'application/usecases/calculation/summaryBuilder.ts',
  'application/usecases/explanation/salesExplanations.ts',
  'features/comparison/application/comparisonDataPrep.ts',
  'presentation/pages/Admin/RawDataTabBuilders.ts',
]

function isDefinitionFile(absPath: string): boolean {
  if (DEFINITION_FILES.has(absPath)) return true
  if (absPath.startsWith(DEFINITION_DIR_PREFIX + path.sep)) return true
  return false
}

function detectViolations(): string[] {
  const detected = new Set<string>()
  for (const file of collectTsFiles(SRC_DIR)) {
    if (isDefinitionFile(file)) continue
    const content = fs.readFileSync(file, 'utf-8')
    if (DAY_ONLY_KEY_IDENTIFIERS.some((id) => content.includes(id))) {
      detected.add(path.relative(SRC_DIR, file).replace(/\\/g, '/'))
    }
  }
  return [...detected].sort()
}

describe('noDayOnlyKeyGuard', () => {
  const detected = detectViolations()

  it('day-only key primitive を使うファイル数が baseline を超えない（ratchet-down）', () => {
    expect(
      detected.length,
      `day-only key 利用 ${detected.length} ファイル が baseline=${BASELINE_DAY_ONLY_KEY_FILES} を超過。\n` +
        '検出: ' +
        detected.join(', ') +
        '\n\n' +
        'hint: 新しい caller を追加する前に DateKey ベースの primitive を検討してください。\n' +
        '  代替: domain/models/record/* の DateKey-keyed index、または\n' +
        '        application/queries/queryInputCanonical.ts の正規化済み input。',
    ).toBeLessThanOrEqual(BASELINE_DAY_ONLY_KEY_FILES)
  })

  it('検出ファイルが ALLOWLIST と一致する（差分検出）', () => {
    const expected = [...KNOWN_DAY_ONLY_KEY_FILES].sort()
    const newFiles = detected.filter((f) => !expected.includes(f))
    const goneFiles = expected.filter((f) => !detected.includes(f))

    expect(
      newFiles,
      `新規の day-only key caller: ${newFiles.join(', ')}\n` +
        '解消するか、KNOWN_DAY_ONLY_KEY_FILES に追加 + BASELINE を +1 してください。',
    ).toEqual([])

    expect(
      goneFiles,
      `ALLOWLIST 内の caller が解消: ${goneFiles.join(', ')}\n` +
        'BASELINE を減算して KNOWN_DAY_ONLY_KEY_FILES から削除してください（卒業処理）。',
    ).toEqual([])
  })

  it('定義ファイルが実在する', () => {
    for (const def of DEFINITION_FILES) {
      expect(fs.existsSync(def), `definition file 不在: ${def}`).toBe(true)
    }
  })
})
