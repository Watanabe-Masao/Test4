/**
 * スコープ整合性ガードテスト
 *
 * 前年日付範囲の独自計算（year - 1 等）を CI で検出する。
 * 前年スコープは ComparisonScope / ComparisonFrame / resolvePrevDate 経由で
 * 一元的に解決すべきであり、消費者が独自に再計算すると
 * 同曜日比較の月跨ぎや閏年境界で不整合が生じる。
 *
 * ## 背景
 * - buildWeatherMap が dowOffset の日番号算術で月跨ぎデータを消失
 * - resolveDayDetailRanges が cumPrevRange を day:1 からハードコードし
 *   同曜日モードで日数超過
 *
 * これらは全て「ヘッダが決定したスコープを使わず独自に再計算した」ことが原因。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC_DIR = path.resolve(__dirname, '..')

// ─── ヘルパー ───────────────────────────────────────────

function collectTsFiles(dir: string): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__')
        continue
      results.push(...collectTsFiles(fullPath))
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) continue
      results.push(fullPath)
    }
  }
  return results
}

function rel(filePath: string): string {
  return path.relative(SRC_DIR, filePath)
}

// ─── INV-SCOPE-01: presentation/ での year - 1 独自計算禁止 ──

describe('INV-SCOPE-01: presentation/ での前年日付の独自計算禁止', () => {
  /**
   * 既存の違反ファイル許可リスト（凍結）。
   * ComparisonScope ベースに移行完了時に削除する。
   */
  const ALLOWLIST = new Set([
    // fallback デフォルト値（ctx.prevYearDateRange ?? ...）
    'presentation/components/widgets/unifiedRegistry.ts',
    // 表示ラベルのみ（スコープ計算ではない）
    'presentation/pages/Dashboard/widgets/types.ts',
    // deriveCompStartDateKey — 天気 map の chartDay 算出用
    'presentation/components/charts/DailySalesChartBodyLogic.ts',
    // 管理画面の前年マッピング設定（ユーザー設定の表示用）
    'presentation/pages/Admin/PrevYearMappingTab.tsx',
    // CTS 前年日付を year-1 + dowOffset の Date 演算で算出（閏年対応済み）
    'presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx',
  ])
  const MAX_ALLOWLIST_SIZE = 5

  it('許可リストのサイズが上限を超えない', () => {
    expect(
      ALLOWLIST.size,
      `許可リストが上限 ${MAX_ALLOWLIST_SIZE} を超えています（現在 ${ALLOWLIST.size}）。` +
        'presentation/ で year - 1 を直接計算しないでください。' +
        'ComparisonFrame / prevYearDateRange を使用してください。',
    ).toBeLessThanOrEqual(MAX_ALLOWLIST_SIZE)
  })

  it('許可リスト外で year - 1 を使用していない', () => {
    const presentationDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presentationDir)
    const violations: string[] = []
    // year - 1, targetYear - 1, ctx.year - 1 等のパターンを検出
    const pattern = /\b\w*[Yy]ear\s*-\s*1\b/

    for (const file of files) {
      const relPath = rel(file)
      if (ALLOWLIST.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // コメント行はスキップ
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue
        if (pattern.test(line)) {
          violations.push(`${relPath}:${i + 1}: ${line.trim()}`)
        }
      }
    }

    expect(
      violations,
      `presentation/ で year - 1 の独自計算が検出されました:\n${violations.join('\n')}\n` +
        'ComparisonFrame.previous または ctx.prevYearDateRange を使用してください。',
    ).toEqual([])
  })
})

// ─── INV-SCOPE-02: application/hooks での day:1 ハードコード禁止 ──

describe('INV-SCOPE-02: 累計前年範囲の day:1 ハードコード禁止', () => {
  it('application/hooks で cumPrevRange を day: 1 から始めていない', () => {
    const hooksDir = path.join(SRC_DIR, 'application', 'hooks')
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []
    // { year: ..., month: ..., day: 1 } のような累計開始パターンを検出
    // ただし前年スコープの文脈でのみ（prevRange, cumPrev 等）
    const pattern = /cum.*[Pp]rev.*day:\s*1\b/

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.trim().startsWith('//')) continue
        if (pattern.test(line)) {
          violations.push(`${rel(file)}:${i + 1}: ${line.trim()}`)
        }
      }
    }

    expect(
      violations,
      `累計前年範囲で day: 1 のハードコードが検出されました:\n${violations.join('\n')}\n` +
        '前年累計は当年の累計日数分だけ prevDate から遡って算出してください。',
    ).toEqual([])
  })
})

// ─── INV-SCOPE-03: DAYS_PER_YEAR ミリ秒演算による前年日付計算禁止 ──

describe('INV-SCOPE-03: DAYS_PER_YEAR * MILLISECONDS_PER_DAY による前年日付計算禁止', () => {
  /**
   * DAYS_PER_YEAR = 365 は閏年（366日）を考慮しない。
   * 前年日付は new Date(year - 1, month - 1, day + offset) の
   * Date 演算で算出すること。
   */
  it('前年日付計算に DAYS_PER_YEAR ミリ秒演算を使用していない', () => {
    const targetDirs = [
      path.join(SRC_DIR, 'domain', 'models'),
      path.join(SRC_DIR, 'application', 'hooks'),
      path.join(SRC_DIR, 'presentation'),
    ]
    const violations: string[] = []
    // DAYS_PER_YEAR * MILLISECONDS_PER_DAY のパターンを検出
    const pattern = /DAYS_PER_YEAR\s*\*\s*MILLISECONDS_PER_DAY/

    for (const dir of targetDirs) {
      const files = collectTsFiles(dir)
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue
          if (pattern.test(line)) {
            violations.push(`${rel(file)}:${i + 1}: ${line.trim()}`)
          }
        }
      }
    }

    expect(
      violations,
      `DAYS_PER_YEAR * MILLISECONDS_PER_DAY による前年日付計算が検出されました:\n${violations.join('\n')}\n` +
        'DAYS_PER_YEAR = 365 は閏年を考慮しません。' +
        '前年日付は new Date(year - 1, month - 1, day + offset) で算出してください。',
    ).toEqual([])
  })
})
