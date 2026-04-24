/**
 * duplicateFileHashGuard —
 * `.tsx` ファイルの byte-identical 複製を ratchet-down 管理
 *
 * projects/architecture-debt-recovery SP-C ADR-C-001 PR1。
 *
 * 現在 3 ペアの widgets.tsx（features/X/ui ↔ presentation/pages/X）が
 * byte-identical で並存。ADR-C-001 PR2 で features 側を barrel re-export 化、
 * PR3 で features 側を物理削除、PR4 で baseline=0 固定モード移行。
 *
 * 検出対象:
 *  - D1: app/src/ 配下の .tsx ファイルで MD5 hash が一致するグループ数 ≤ baseline
 *  - D2: 検出された duplicate group が ALLOWLIST と完全一致（stale / 新規追加検出）
 *
 * Scope:
 *  - .tsx のみ。.ts duplicate（ADR-C-001 scope 外。後続 ADR で扱うかは未定）は
 *    本 guard では追跡しない。
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-C-001
 *  - projects/architecture-debt-recovery/inquiry/03-ui-component-orphans.md §特殊 1
 *
 * @responsibility R:guard
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectTsFiles } from '../guardTestHelpers'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const APP_SRC = path.join(PROJECT_ROOT, 'app/src')

const BASELINE_DUPLICATE_GROUP_COUNT = 0

/**
 * 既知の duplicate group。各 group は byte-identical な .tsx の絶対 path 集合。
 * ADR-C-001 PR2 (2026-04-24) で features 側 widgets.tsx を barrel re-export shim
 * に置換したため 3 group 全て解消。PR3 で shim 物理削除、PR4 で fixed mode。
 */
const KNOWN_DUPLICATE_GROUPS: ReadonlyArray<readonly string[]> = []

const md5 = (content: string): string => createHash('md5').update(content).digest('hex')

const collectDuplicateGroups = (): Map<string, string[]> => {
  const tsxFiles = collectTsFiles(APP_SRC).filter((f) => f.endsWith('.tsx'))
  const byHash = new Map<string, string[]>()
  for (const file of tsxFiles) {
    const content = readFileSync(file, 'utf-8')
    const hash = md5(content)
    const list = byHash.get(hash) ?? []
    list.push(file)
    byHash.set(hash, list)
  }
  // duplicate group = hash with > 1 file
  return new Map([...byHash.entries()].filter(([, files]) => files.length > 1))
}

const normalizeRelative = (absPath: string): string => path.relative(PROJECT_ROOT, absPath)

describe('duplicateFileHashGuard', () => {
  const groups = collectDuplicateGroups()
  const groupCount = groups.size

  it('D1: byte-identical な .tsx duplicate group 数が baseline を超えない（ratchet-down）', () => {
    expect(
      groupCount,
      `duplicate group が baseline=${BASELINE_DUPLICATE_GROUP_COUNT} を超過: ${groupCount}\n` +
        '新規 duplicate を許容する場合は KNOWN_DUPLICATE_GROUPS に追加 + baseline を更新してください。',
    ).toBeLessThanOrEqual(BASELINE_DUPLICATE_GROUP_COUNT)
  })

  it('D2: 検出された duplicate group が ALLOWLIST と一致する（差分検出）', () => {
    const detectedSets = [...groups.values()]
      .map((files) => files.map(normalizeRelative).sort())
      .map((files) => files.join('|'))
      .sort()
    const expectedSets = KNOWN_DUPLICATE_GROUPS.map((g) => [...g].sort().join('|')).sort()

    const newDuplicates = detectedSets.filter((s) => !expectedSets.includes(s))
    const goneDuplicates = expectedSets.filter((s) => !detectedSets.includes(s))

    expect(
      newDuplicates,
      `新規 duplicate group を検出: ${newDuplicates.join(' / ')}\n` +
        '解消するか KNOWN_DUPLICATE_GROUPS に追加してください。',
    ).toEqual([])
    expect(
      goneDuplicates,
      `KNOWN_DUPLICATE_GROUPS 記載の group が解消: ${goneDuplicates.join(' / ')}\n` +
        'baseline を減算し、ALLOWLIST から該当 entry を削除してください（卒業処理）。',
    ).toEqual([])
  })

  it('D3: KNOWN_DUPLICATE_GROUPS の各ファイルが実在する（stale 検出）', () => {
    const missing: string[] = []
    for (const group of KNOWN_DUPLICATE_GROUPS) {
      for (const relPath of group) {
        const absPath = path.join(PROJECT_ROOT, relPath)
        if (!existsSync(absPath)) missing.push(relPath)
      }
    }
    expect(missing, `存在しないファイルが ALLOWLIST に残存: ${missing.join(', ')}`).toEqual([])
  })
})
