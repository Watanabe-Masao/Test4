/**
 * 旧パス import 残存防止ガード
 *
 * features/ に移行済みのモジュールへの旧パス import を追跡し、
 * 新規追加を禁止する。
 *
 * @guard F4 配置はパスで決まる
 * @guard F1 バレルで後方互換
 * ルール定義: architectureRules.ts (AR-MIG-OLD-PATH)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import { SRC_DIR, collectTsFiles, rel } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage } from '../architectureRules'

/**
 * 移行済み feature と旧パスのマッピング。
 * maxImports は現在の残存数を凍結し、新規追加を禁止する。
 */
const MIGRATED_FEATURES: {
  feature: string
  oldPathPrefix: string
  maxImports: number
}[] = [
  {
    feature: 'comparison',
    oldPathPrefix: '@/application/comparison',
    maxImports: 49,
  },
]

/** 旧パスの import を除外するファイル（re-export ハブ自身） */
const RE_EXPORT_DIRS = ['application/comparison/']

describe('Old Path Import Guard', () => {
  const rule = getRuleById('AR-MIG-OLD-PATH')!

  for (const feature of MIGRATED_FEATURES) {
    it(`${feature.feature}: 旧パス (${feature.oldPathPrefix}) の import 数が ${feature.maxImports} 以下`, () => {
      const allFiles = collectTsFiles(SRC_DIR)
      const violations: string[] = []
      let count = 0

      const pattern = new RegExp(
        `from '${feature.oldPathPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
      )

      for (const file of allFiles) {
        const relPath = rel(file)
        // re-export ハブ自身は除外
        if (RE_EXPORT_DIRS.some((d) => relPath.startsWith(d))) continue
        // features/ 内部は除外（barrel 経由の内部 import）
        if (relPath.startsWith(`features/${feature.feature}/`)) continue
        // テストは除外
        if (relPath.includes('__tests__/') || relPath.startsWith('test/')) continue

        const content = fs.readFileSync(file, 'utf-8')
        if (pattern.test(content)) {
          count++
          violations.push(relPath)
        }
      }

      expect(count, formatViolationMessage(rule, violations)).toBeLessThanOrEqual(
        feature.maxImports,
      )
    })
  }

  it('移行済み feature の re-export ファイルに @temporary マーカーがある', () => {
    const violations: string[] = []

    for (const dir of RE_EXPORT_DIRS) {
      const dirPath = `${SRC_DIR}/${dir}`
      if (!fs.existsSync(dirPath)) continue
      const files = collectTsFiles(dirPath)
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        if (!content.includes('@temporary')) {
          violations.push(`${rel(file)}: re-export ファイルに @temporary マーカーがありません`)
        }
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })
})
