/**
 * Query Pattern Guard — Screen Runtime 規格の構造検証
 *
 * 実装形（callsite の .sort() 有無）ではなく、保証したい性質をテストする。
 *
 * @guard H3 query input 正規化必須 — canonicalize 統合を検証
 * @guard H2 比較は pair/bundle 契約 — isPrevYear handler 数を追跡
 * @guard H4 component に acquisition logic 禁止 — presentation direct query 数を追跡
 * @guard H5 visible-only query は plan でのみ宣言 — collapsible hidden fetch 防止
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel } from '../guardTestHelpers'
import {
  isPrevYearHandlers,
  nonPairableConsumers,
  pairExceptionDesign,
  pairJustifiedSingle,
  presentationDirectQueryAudit,
} from '../allowlists'

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

    // Gate 2: CategoryPerformanceChart (-2), StorePIComparisonChart (-1) が plan 化済み
    // この数値は Gate 4 で 0 にすることが目標。
    console.log(`[INV-RUN-03] presentation direct query files: ${filesWithDirectQuery.length}`)

    // 増加を防ぐために上限を設定。Gate 2: 30→27、Gate 3: HeatmapChart plan 化で 27→26。
    // Gate 4: CategoryBenchmark/BoxPlot plan 化で 26→24、CvTimeSeries/PiCvBubble plan 化で 24→22。
    expect(
      filesWithDirectQuery.length,
      `presentation 層の直接 query 呼び出しが増加しています。\n` +
        `Screen Plan hook 経由に移行してください。\n` +
        `対象:\n${filesWithDirectQuery.join('\n')}`,
    ).toBeLessThanOrEqual(22)
  })
})

// ── INV-RUN-03: Direct Query Audit Coverage ──

describe('INV-RUN-03: presentation direct query 台帳の整合性', () => {
  const presentationDir = path.join(SRC_DIR, 'presentation')
  const featuresDir = path.join(SRC_DIR, 'features')

  it('台帳が実際の検出ファイルと一致する', () => {
    const presentationFiles = collectTsFiles(presentationDir)
    const featureUiFiles = fs.existsSync(featuresDir)
      ? collectTsFiles(featuresDir).filter((f) => f.includes('/ui/'))
      : []

    const allFiles = [...presentationFiles, ...featureUiFiles].filter(
      (f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'),
    )

    const actualFiles = new Set<string>()
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      if (content.includes('useQueryWithHandler')) {
        actualFiles.add(rel(file))
      }
    }

    const auditPaths = new Set(presentationDirectQueryAudit.map((e) => e.path))

    const missingInAudit = [...actualFiles].filter((f) => !auditPaths.has(f))
    const staleInAudit = [...auditPaths].filter((p) => !actualFiles.has(p))

    expect(
      missingInAudit,
      `台帳に未登録のファイルがあります:\n${missingInAudit.join('\n')}`,
    ).toEqual([])

    expect(
      staleInAudit,
      `台帳に存在するが検出されないファイルがあります:\n${staleInAudit.join('\n')}`,
    ).toEqual([])
  })

  it('分類サマリを出力する', () => {
    const debt = presentationDirectQueryAudit.filter((e) => e.classification === 'debt')
    const exception = presentationDirectQueryAudit.filter(
      (e) => e.classification === 'exception-design',
    )
    const planBridge = presentationDirectQueryAudit.filter(
      (e) => e.classification === 'plan-bridge',
    )
    const commentOnly = presentationDirectQueryAudit.filter(
      (e) => e.classification === 'comment-only',
    )

    console.log(
      `[INV-RUN-03 audit] debt: ${debt.length}, exception-design: ${exception.length}, plan-bridge: ${planBridge.length}, comment-only: ${commentOnly.length}`,
    )

    // 分類の合計は台帳のエントリ数と一致する
    expect(debt.length + exception.length + planBridge.length + commentOnly.length).toBe(
      presentationDirectQueryAudit.length,
    )
  })
})

// ── INV-RUN-02: pair handler 消費側の3分類整合性 ──

describe('INV-RUN-02: pair handler 消費側の3分類整合性', () => {
  it('nonPairableConsumers は pairExceptionDesign + pairJustifiedSingle の合算', () => {
    const expected = [...pairExceptionDesign, ...pairJustifiedSingle].map((e) => e.path).sort()
    const actual = [...nonPairableConsumers].map((e) => e.path).sort()
    expect(actual).toEqual(expected)
  })

  it('分類サマリを出力する', () => {
    console.log(
      `[INV-RUN-02 pair] exception-design: ${pairExceptionDesign.length}, justified-single: ${pairJustifiedSingle.length}`,
    )
    expect(pairExceptionDesign.length + pairJustifiedSingle.length).toBe(
      nonPairableConsumers.length,
    )
  })
})

// ── INV-RUN-02: Pair Handler Count Ratchet ──

describe('INV-RUN-02: pair handler count ラチェット', () => {
  const queriesDir = path.join(SRC_DIR, 'application/queries')

  it('createPairedHandler で生成された pair handler が減少していないこと', () => {
    const allFiles = collectTsFiles(queriesDir).filter((f) => !f.endsWith('.test.ts'))

    let pairHandlerCount = 0
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      if (content.includes('createPairedHandler(') && !file.endsWith('createPairedHandler.ts')) {
        pairHandlerCount++
      }
    }

    console.log(`[INV-RUN-02] pair handler count: ${pairHandlerCount}`)

    // Gate 3: 13 pair handler（既存 1 + 新規 12）。MovingAverageHandler は BaseQueryInput 非準拠のためスキップ。
    expect(
      pairHandlerCount,
      `pair handler が減少しています。createPairedHandler で生成された handler を削除しないでください。`,
    ).toBeGreaterThanOrEqual(13)
  })
})

// ── Gate 4: Base Handler Import Guard ──

describe('INV-RUN-02: pair 化済み handler の base import 追跡', () => {
  /**
   * pair handler が存在するのに base handler を直接 import している消費側ファイルを検出する。
   * 許容リスト（nonPairableConsumers）に登録された例外を除き、増加を防止する。
   */
  const pairableHandlerNames = [
    'hourlyAggregationHandler',
    'hourDowMatrixHandler',
    'categoryTimeRecordsHandler',
    'categoryHourlyHandler',
    'categoryDailyTrendHandler',
    'storeCategoryPIHandler',
    'categoryDiscountHandler',
    'storeDaySummaryHandler',
    'aggregatedRatesHandler',
    'distinctDayCountHandler',
    'categoryMixWeeklyHandler',
    'dailyCumulativeHandler',
    'levelAggregationHandler',
  ]

  it('pair 化済み base handler を直接 import する消費側が増加していないこと', () => {
    const dirs = [
      path.join(SRC_DIR, 'presentation'),
      path.join(SRC_DIR, 'features'),
      path.join(SRC_DIR, 'application/hooks'),
    ]

    const allFiles = dirs
      .filter((d) => fs.existsSync(d))
      .flatMap((d) => collectTsFiles(d))
      .filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'))

    const nonPairablePaths = new Set(nonPairableConsumers.map((e) => e.path))

    const violations: string[] = []
    for (const file of allFiles) {
      const relPath = rel(file)
      if (nonPairablePaths.has(relPath)) continue
      if (file.endsWith('PairHandler.ts')) continue

      const content = fs.readFileSync(file, 'utf-8')
      // コメント行を除去してから検査
      const codeOnly = content
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('*') && !line.trimStart().startsWith('//'))
        .join('\n')
      for (const handler of pairableHandlerNames) {
        // import 文の中で base handler を直接 import しているか検出
        // import { handler } from '...' または import { handler, ... } from '...'
        if (
          codeOnly.includes(`import`) &&
          new RegExp(`\\b${handler}\\b`).test(codeOnly) &&
          // from '...Handler' パスからの import を検出（re-export や型 import も含む）
          codeOnly.includes(`Handler`)
        ) {
          violations.push(`${relPath}: ${handler}`)
        }
      }
    }

    console.log(`[Gate 4] base handler 直接 import 消費側: ${violations.length}`)
    if (violations.length > 0) {
      console.log(`  対象:\n  ${violations.join('\n  ')}`)
    }

    // 全消費側が nonPairableConsumers に分類済み。新規の base handler import を防止する。
    expect(
      violations.length,
      `pair 化済み base handler の直接 import が増加しています。\n` +
        `pair handler を使用するか、nonPairableConsumers に登録してください。\n` +
        `対象:\n${violations.join('\n')}`,
    ).toBeLessThanOrEqual(0)
  })
})

// ── INV-RUN-05: Hidden Fetch Guard ──

describe('INV-RUN-05: collapsible ChartCard の hidden fetch 防止', () => {
  const presentationDir = path.join(SRC_DIR, 'presentation')
  const featuresDir = path.join(SRC_DIR, 'features')

  it('collapsible + useQueryWithHandler を持つ component は onVisibilityChange を実装している', () => {
    const presentationFiles = collectTsFiles(presentationDir).filter((f) => f.endsWith('.tsx'))
    const featureUiFiles = fs.existsSync(featuresDir)
      ? collectTsFiles(featuresDir)
          .filter((f) => f.includes('/ui/'))
          .filter((f) => f.endsWith('.tsx'))
      : []

    const allFiles = [...presentationFiles, ...featureUiFiles].filter(
      (f) => !f.endsWith('.test.tsx'),
    )

    const violations: string[] = []
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const hasCollapsible = content.includes('collapsible')
      const hasDirectQuery = content.includes('useQueryWithHandler')

      if (hasCollapsible && hasDirectQuery) {
        const hasVisibilityChange = content.includes('onVisibilityChange')
        if (!hasVisibilityChange) {
          violations.push(rel(file))
        }
      }
    }

    console.log(
      `[INV-RUN-05] collapsible + useQueryWithHandler の component: ${violations.length === 0 ? '全件 onVisibilityChange 実装済み' : violations.length + ' 件の違反'}`,
    )

    expect(
      violations,
      `collapsible ChartCard 内で useQueryWithHandler を呼ぶ component が onVisibilityChange を実装していません。\n` +
        `折りたたみ時のデータ取得抑制（INV-RUN-05）を実装してください。\n` +
        `対象:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})
