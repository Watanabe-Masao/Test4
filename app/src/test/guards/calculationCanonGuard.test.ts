/**
 * domain/calculations/ 正本化分類ガード
 *
 * 全ファイルが CALCULATION_CANON_REGISTRY に分類されていることを保証する。
 * 未分類のファイルが追加された場合、このテストが失敗する。
 *
 * @see references/01-principles/calculation-canonicalization-map.md
 * ルール定義: architectureRules.ts (AR-STRUCT-CALC-CANON)
 */
import { describe, it, expect } from 'vitest'
import * as path from 'path'
import { collectTsFiles } from '../guardTestHelpers'
import { CALCULATION_CANON_REGISTRY } from '../calculationCanonRegistry'

const SRC_DIR = path.resolve(__dirname, '../..')

const CALC_DIR = path.join(SRC_DIR, 'domain/calculations')

describe('domain/calculations/ 正本化分類ガード', () => {
  it('全ファイルが CALCULATION_CANON_REGISTRY に分類されている（未分類なし）', () => {
    const files = collectTsFiles(CALC_DIR, true)
    const unregistered: string[] = []

    for (const file of files) {
      const relPath = path.relative(CALC_DIR, file)
      if (!CALCULATION_CANON_REGISTRY[relPath]) {
        unregistered.push(relPath)
      }
    }

    expect(
      unregistered,
      `domain/calculations/ に未分類のファイルがあります:\n${unregistered.join('\n')}\n` +
        '→ test/calculationCanonRegistry.ts に登録してください',
    ).toEqual([])
  })

  it('レジストリに存在するが実ファイルがないエントリがない（陳腐化防止）', () => {
    const files = new Set(collectTsFiles(CALC_DIR, true).map((f) => path.relative(CALC_DIR, f)))
    const stale: string[] = []

    for (const key of Object.keys(CALCULATION_CANON_REGISTRY)) {
      if (!files.has(key)) {
        stale.push(key)
      }
    }

    expect(
      stale,
      `レジストリに実ファイルがないエントリ:\n${stale.join('\n')}\n` +
        '→ test/calculationCanonRegistry.ts から削除してください',
    ).toEqual([])
  })

  it('必須分類のファイルは全て Zod 契約が追加されるべき', () => {
    const requiredWithoutZod: string[] = []
    for (const [key, entry] of Object.entries(CALCULATION_CANON_REGISTRY)) {
      if (entry.tag === 'required' && !entry.zodAdded) {
        requiredWithoutZod.push(`${key}: ${entry.reason}`)
      }
    }

    // 現在の未完了数を上限として設定（段階的に 0 に近づける）
    expect(
      requiredWithoutZod.length,
      `必須分類で Zod 未追加:\n${requiredWithoutZod.join('\n')}`,
    ).toBeLessThanOrEqual(3)
  })

  it('分類の合計 = レジストリのエントリ数', () => {
    const entries = Object.values(CALCULATION_CANON_REGISTRY)
    const required = entries.filter((e) => e.tag === 'required').length
    const review = entries.filter((e) => e.tag === 'review').length
    const notNeeded = entries.filter((e) => e.tag === 'not-needed').length

    expect(required + review + notNeeded).toBe(entries.length)
  })
})
