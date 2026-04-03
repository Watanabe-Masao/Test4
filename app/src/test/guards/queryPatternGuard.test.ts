/**
 * Query Pattern Guard — Screen Runtime 規格の構造検証
 *
 * 実装形（callsite の .sort() 有無）ではなく、保証したい性質をテストする。
 *
 * @guard H3 query input 正規化必須 — canonicalize 統合を検証
 * @guard H2 比較は pair/bundle 契約 — isPrevYear handler 数を追跡
 * @guard H4 component に acquisition logic 禁止 — presentation direct query 数を追跡
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel } from '../guardTestHelpers'
import { isPrevYearHandlers } from '../allowlists'

// ── INV-RUN-01: Canonical Integration ──

describe('INV-RUN-01: useQueryWithHandler は canonicalizeQueryInput を経由する', () => {
  const hookFile = path.join(SRC_DIR, 'application/hooks/useQueryWithHandler.ts')

  it('canonicalizeQueryInput を import している', () => {
    const content = fs.readFileSync(hookFile, 'utf-8')
    expect(content).toContain('import { canonicalizeQueryInput }')
  })

  it('inputKey 算出で canonicalizeQueryInput を使用している', () => {
    const content = fs.readFileSync(hookFile, 'utf-8')
    expect(content).toContain('canonicalizeQueryInput(input)')
  })
})

// ── INV-RUN-02: isPrevYear Handler Audit ──

describe('INV-RUN-02: isPrevYear handler 棚卸し', () => {
  const queriesDir = path.join(SRC_DIR, 'application/queries')

  it('isPrevYear を含む handler は許容リストと一致する', () => {
    const handlerFiles = collectTsFiles(queriesDir).filter(
      (f) => f.endsWith('Handler.ts') && !f.endsWith('.test.ts'),
    )

    const filesWithIsPrevYear: string[] = []
    for (const file of handlerFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      // isPrevYear をインターフェースや型で定義している handler を検出
      if (/isPrevYear\??:\s*(boolean|true|false)/.test(content)) {
        filesWithIsPrevYear.push(rel(file))
      }
    }

    const allowedPaths = new Set(isPrevYearHandlers.map((e) => e.path))
    const unexpected = filesWithIsPrevYear.filter((f) => !allowedPaths.has(f))

    expect(
      unexpected,
      `許容リストにない isPrevYear handler が検出されました:\n${unexpected.join('\n')}`,
    ).toEqual([])
  })

  it('許容リストの handler は実在する', () => {
    const missing: string[] = []
    for (const entry of isPrevYearHandlers) {
      const fullPath = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(fullPath)) {
        missing.push(entry.path)
      }
    }
    expect(missing, `許容リストに存在しないファイルがあります:\n${missing.join('\n')}`).toEqual([])
  })
})

// ── INV-RUN-03: Presentation Direct Query Count ──

describe('INV-RUN-03: presentation 層の useQueryWithHandler 直接呼び出し（追跡）', () => {
  const presentationDir = path.join(SRC_DIR, 'presentation')
  const featuresDir = path.join(SRC_DIR, 'features')

  it('presentation/ と features/*/ui/ の直接呼び出し数を記録する', () => {
    const presentationFiles = collectTsFiles(presentationDir)
    const featureUiFiles = fs.existsSync(featuresDir)
      ? collectTsFiles(featuresDir).filter((f) => f.includes('/ui/'))
      : []

    const allFiles = [...presentationFiles, ...featureUiFiles].filter(
      (f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'),
    )

    const filesWithDirectQuery: string[] = []
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      if (content.includes('useQueryWithHandler')) {
        filesWithDirectQuery.push(rel(file))
      }
    }

    // Gate 1 時点: 現状の数を記録。Gate 2 以降で減少を追跡。
    // この数値は Gate 4 で 0 にすることが目標。
    console.log(`[INV-RUN-03] presentation direct query files: ${filesWithDirectQuery.length}`)

    // 現時点では violation ではなく tracking。増加を防ぐために上限を設定。
    expect(
      filesWithDirectQuery.length,
      `presentation 層の直接 query 呼び出しが増加しています。\n` +
        `Screen Plan hook 経由に移行してください。\n` +
        `対象:\n${filesWithDirectQuery.join('\n')}`,
    ).toBeLessThanOrEqual(30)
  })
})
