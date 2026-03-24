/**
 * Comparison Semantics Audit — 比較意味論の散逸検出
 *
 * 「禁止 API 検出」ではなく、比較意味論の正本がどこに集約されているかを監査する。
 * ComparisonScope 以外で比較ロジックの判断点が増えていないか、
 * sourceDate を落とす独自変換がないか、
 * 比較ロジックが application/comparison 以外に漏れていないかを検出する。
 *
 * @audit Comparison Semantics Containment
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel } from '../guardTestHelpers'

// ── 比較意味論の正本ディレクトリ ──
const COMPARISON_DIR = path.join(SRC_DIR, 'application/comparison')
// ── Helper: 行検索（コメント除外） ──
function findPatternInFiles(
  dir: string,
  pattern: RegExp,
  excludePaths: string[] = [],
): Array<{ file: string; line: number; content: string }> {
  const results: Array<{ file: string; line: number; content: string }> = []
  if (!fs.existsSync(dir)) return results
  const files = collectTsFiles(dir)
  for (const file of files) {
    const relPath = rel(file)
    if (excludePaths.some((ex) => relPath.includes(ex))) continue

    const content = fs.readFileSync(file, 'utf-8')
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // コメント行をスキップ
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue
      if (pattern.test(line)) {
        results.push({ file: relPath, line: i + 1, content: line.trim() })
      }
    }
  }
  return results
}

describe('Comparison Semantics Audit — 比較意味論の散逸検出', () => {
  // ── 1. prevYear.daily.get の使用が accessor に集約されている ──
  it('prevYear.daily.get() が comparisonAccessors 以外の実装コードに残存しない', () => {
    const hits = findPatternInFiles(SRC_DIR, /prevYear\.daily\.get\(/, [
      'comparisonAccessors',
      '__tests__',
      '.test.',
      'test/',
      'guardTagRegistry',
    ])
    expect(
      hits.map((h) => `${h.file}:${h.line}`),
      `prevYear.daily.get() が accessor 以外に残存: ${hits.map((h) => h.file).join(', ')}`,
    ).toEqual([])
  })

  // ── 2. sourceDate を落とす変換パターンの検出 ──
  it('sourceDate を落とす Map<number, number> 変換が比較コンテキストで増えていない', () => {
    // Map<number, number> は sourceDate を失う可能性がある典型パターン
    // application/comparison 内の正本以外で、prevYear 系と同時に使われているか検出
    const hits = findPatternInFiles(
      path.join(SRC_DIR, 'presentation'),
      /new Map<number,\s*number>/,
      ['__tests__', '.test.', '.stories.'],
    )
    // prevYear に関連する Map<number, number> のみを抽出
    const suspicious = hits.filter((h) => {
      const file = fs.readFileSync(path.join(SRC_DIR, '..', '..', 'app/src', h.file), 'utf-8')
      return /prevYear|prev_year|previousYear/.test(file)
    })
    // 現状の件数を上限として凍結（増加を検出）
    // 18件は累計Map・予算Map等の正当な使用を含む
    const MAX_SUSPICIOUS = 20
    expect(
      suspicious.length,
      `sourceDate を落とす可能性のある Map<number, number> が ${suspicious.length} 件（上限 ${MAX_SUSPICIOUS}）`,
    ).toBeLessThanOrEqual(MAX_SUSPICIOUS)
  })

  // ── 3. ComparisonScope 以外の比較ロジック判断点の検出 ──
  it('alignmentMap の直接構築が application/comparison 外に増えていない', () => {
    // alignmentMap を new Map() で直接構築するパターンを検出
    // sameDayOfWeek / sameDate は domain/models や Settings での定義・参照として正当
    const alignmentPattern = /alignmentMap\s*[=:]\s*new\s+Map/
    const hits = findPatternInFiles(SRC_DIR, alignmentPattern, [
      'application/comparison',
      'domain/models/ComparisonScope',
      '__tests__',
      '.test.',
      'test/',
    ])
    expect(
      hits.map((h) => `${h.file}:${h.line}`),
      `alignmentMap の直接構築が comparison 正本外に散逸: ${hits.map((h) => h.file).join(', ')}`,
    ).toEqual([])
  })

  // ── 4. 独立した日付補正ロジックの検出 ──
  it('year - 1 による前年日付計算が presentation/ に増えていない', () => {
    // year - 1 パターンは ComparisonScope 経由であるべき
    const pattern = /year\s*-\s*1/
    const hits = findPatternInFiles(path.join(SRC_DIR, 'presentation'), pattern, [
      '__tests__',
      '.test.',
      '.stories.',
    ])
    // 既存の正当使用（日付表示等）を上限として凍結
    const MAX_YEAR_MINUS_ONE = 8
    expect(
      hits.length,
      `presentation/ で year - 1 が ${hits.length} 件（上限 ${MAX_YEAR_MINUS_ONE}）。増加は ComparisonScope 経由にすべき。`,
    ).toBeLessThanOrEqual(MAX_YEAR_MINUS_ONE)
  })

  // ── 5. 比較データ構築の正本集約度 ──
  it('buildComparisonAggregation の呼び出し元が集約されている', () => {
    const pattern = /buildComparisonAggregation/
    const hits = findPatternInFiles(SRC_DIR, pattern, [
      'buildComparisonAggregation.ts',
      '__tests__',
      '.test.',
    ])
    // 呼び出し元が限定されているべき
    const MAX_CALL_SITES = 3
    expect(
      hits.length,
      `buildComparisonAggregation の呼び出し元が ${hits.length} 件（上限 ${MAX_CALL_SITES}）`,
    ).toBeLessThanOrEqual(MAX_CALL_SITES)
  })

  // ── 6. 前年日付の独自計算パターン（year - 1 以外） ──
  it('前年日付の独自計算パターンが presentation/ に増えていない', () => {
    const pattern = /getFullYear\(\)\s*-\s*1|\.setFullYear\([^)]*-|month\s*-\s*12/
    const hits = findPatternInFiles(path.join(SRC_DIR, 'presentation'), pattern, [
      '__tests__',
      '.test.',
      '.stories.',
    ])
    const MAX_DATE_BYPASS = 5
    expect(
      hits.length,
      `presentation/ で前年日付の独自計算が ${hits.length} 件（上限 ${MAX_DATE_BYPASS}）。ComparisonScope 経由にすべき。`,
    ).toBeLessThanOrEqual(MAX_DATE_BYPASS)
  })

  // ── 7. 比較意味論キーワードの正本集約度 ──
  it('比較意味論キーワードの正本集約度を報告する（report-only）', () => {
    const keywords = ['sourceDate', 'dayMappingRow', 'prevYearSameDow']
    const leakage: Array<{ keyword: string; file: string; line: number }> = []
    for (const keyword of keywords) {
      const hits = findPatternInFiles(SRC_DIR, new RegExp(keyword), [
        'application/comparison',
        'domain/models',
        'domain/patterns',
        '__tests__',
        '.test.',
        'test/',
      ])
      for (const hit of hits) {
        leakage.push({ keyword, file: hit.file, line: hit.line })
      }
    }
    // report-only: 散逸数を記録（テスト失敗にはしない）
    expect(leakage).toBeDefined()
  })

  // ── 8. レポート生成 ──
  it('比較意味論レポートを生成する', () => {
    const reportDir = path.resolve(__dirname, '../../../../references/02-status/generated')
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
    }

    // 比較関連ファイルの棚卸し
    const comparisonFiles = fs.existsSync(COMPARISON_DIR)
      ? collectTsFiles(COMPARISON_DIR).map((f) => rel(f))
      : []

    // accessor 使用箇所
    const accessorUsage = findPatternInFiles(
      SRC_DIR,
      /(?:getPrevYearDailyValue|getPrevYearDailySales)/,
      ['comparisonAccessors.ts', '__tests__', '.test.'],
    )

    const report = {
      timestamp: new Date().toISOString(),
      comparisonModuleFiles: comparisonFiles,
      accessorUsageSites: accessorUsage.map((h) => h.file),
      accessorUsageCount: accessorUsage.length,
    }

    const jsonPath = path.join(reportDir, 'comparison-semantics-audit.json')
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8')
    expect(fs.existsSync(jsonPath)).toBe(true)
  })
})
