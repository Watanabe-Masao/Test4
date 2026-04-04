/**
 * トポロジーガード
 *
 * src/ 直下に許可されていないディレクトリが増殖していないことを検証する。
 * アーキテクチャ層（4層 + features + stories + test）以外の新規ディレクトリを防止。
 *
 * @guard F4 配置はパスで決まる
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import { SRC_DIR } from '../guardTestHelpers'

/** src/ 直下に許可されたディレクトリ */
const APPROVED_DIRECTORIES = new Set([
  'domain',
  'application',
  'infrastructure',
  'presentation',
  'features',
  'stories',
  'test',
])

/** src/ 直下に許可されたファイルパターン */
const APPROVED_ROOT_FILES = [
  /^App\.tsx$/,
  /^App\.test\.tsx$/,
  /^AppProviders\.tsx$/,
  /^appContextDefs\.ts$/,
  /^main\.tsx$/,
  /\.d\.ts$/, // 型宣言ファイル
]

describe('Topology Guard', () => {
  it('src/ 直下に未承認のディレクトリが存在しない', () => {
    const entries = fs.readdirSync(SRC_DIR, { withFileTypes: true })
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)
    const violations: string[] = []

    for (const dir of dirs) {
      if (!APPROVED_DIRECTORIES.has(dir)) {
        violations.push(
          `src/${dir}/ — 未承認ディレクトリ。承認済み: ${[...APPROVED_DIRECTORIES].join(', ')}`,
        )
      }
    }

    expect(violations, `未承認ディレクトリ:\n${violations.join('\n')}`).toEqual([])
  })

  it('src/ 直下のファイルが承認パターンに一致する', () => {
    const entries = fs.readdirSync(SRC_DIR, { withFileTypes: true })
    const files = entries.filter((e) => e.isFile()).map((e) => e.name)
    const violations: string[] = []

    for (const file of files) {
      const approved = APPROVED_ROOT_FILES.some((p) => p.test(file))
      if (!approved) {
        violations.push(`src/${file} — 未承認のルートファイル`)
      }
    }

    expect(violations, `未承認ルートファイル:\n${violations.join('\n')}`).toEqual([])
  })
})
