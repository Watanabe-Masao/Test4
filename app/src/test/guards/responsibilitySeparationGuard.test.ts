/**
 * 責務分離ガードテスト — 「1 文で説明できるか」を機械的に強制
 *
 * 責務分離カタログ（references/03-guides/responsibility-separation-catalog.md）の
 * 24 パターンのうち、機械的に検出可能なものをガード化する。
 *
 * @guard G8 責務分離（P2/P7/P8/P10/P12/P17/P18）
 * ルール定義: architectureRules.ts
 *   AR-RESP-STORE-COUPLING (P2)
 *   AR-RESP-MODULE-STATE (P7)
 *   AR-RESP-HOOK-COMPLEXITY (P8)
 *   AR-RESP-FEATURE-COMPLEXITY (P10)
 *   AR-RESP-EXPORT-DENSITY (P12)
 *   AR-RESP-NORMALIZATION (P17)
 *   AR-RESP-FALLBACK-SPREAD (P18)
 */
import { describe, it, expect } from 'vitest'
import { getRuleById, formatViolationMessage } from '../architectureRules'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel, isCommentLine, stripComments } from '../guardTestHelpers'

import {
  combinedHookComplexityLimits,
  featuresMemoLimits,
  featuresStateLimits,
  presentationGetStateLimits,
  moduleScopeLetLimits,
  domainModelExportLimits,
  STORE_IDS_NORMALIZATION_MAX_FILES,
  fallbackConstantDensityLimits,
  buildQuantitativeAllowlist,
} from '../allowlists'

// 傘ルール（後方互換）+ 各パターンの個別ルール
const ruleP2 = getRuleById('AR-RESP-STORE-COUPLING')!
const ruleP7 = getRuleById('AR-RESP-MODULE-STATE')!
const ruleP8 = getRuleById('AR-RESP-HOOK-COMPLEXITY')!
const ruleP10Memo = getRuleById('AR-RESP-FEATURE-COMPLEXITY')!
const ruleP10State = getRuleById('AR-RESP-FEATURE-COMPLEXITY')!
const ruleP12 = getRuleById('AR-RESP-EXPORT-DENSITY')!
const ruleP17 = getRuleById('AR-RESP-NORMALIZATION')!
const ruleP18 = getRuleById('AR-RESP-FALLBACK-SPREAD')!

// ─── P2: presentation/ の getState() 直接アクセス禁止 ─────────

describe('G8-P2: presentation/ で getState() を直接呼ばない', () => {
  const presDir = path.join(SRC_DIR, 'presentation')
  const allowlist = buildQuantitativeAllowlist(presentationGetStateLimits)

  it('presentation/ の getState() 呼び出しが上限以下', () => {
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    for (const file of files) {
      if (file.includes('.test.') || file.includes('.stories.')) continue
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      const lines = content.split('\n')
      let count = 0
      for (const line of lines) {
        if (isCommentLine(line)) continue
        if (/getState\s*\(/.test(line)) count++
      }
      const limit = allowlist[relPath] ?? 0
      if (count > limit) {
        violations.push(`${relPath}: getState ${count}回 (上限: ${limit})`)
      }
    }

    expect(violations, formatViolationMessage(ruleP2, violations)).toEqual([])
  })
})

// ─── P7: module-scope let 禁止（グローバル変数） ─────────────

describe('G8-P7: module-scope let を使わない', () => {
  const allowlist = buildQuantitativeAllowlist(moduleScopeLetLimits)

  const scanDir = (dirName: string) => {
    const dir = path.join(SRC_DIR, dirName)
    if (!fs.existsSync(dir)) return []
    const files = collectTsFiles(dir)
    const violations: string[] = []

    for (const file of files) {
      if (file.includes('.test.')) continue
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      const lines = content.split('\n')
      let count = 0
      for (const line of lines) {
        const trimmed = line.trimStart()
        // module-scope let: 行頭（インデントなし）で始まる let 宣言
        if (line === trimmed && /^(export\s+)?let\s+/.test(trimmed)) {
          count++
        }
      }
      const limit = allowlist[relPath] ?? 0
      if (count > limit) {
        violations.push(`${relPath}: module-scope let ${count}個 (上限: ${limit})`)
      }
    }
    return violations
  }

  it('application/ に module-scope let がない', () => {
    const violations = scanDir('application')
    expect(violations, formatViolationMessage(ruleP7, violations)).toEqual([])
  })

  it('presentation/ に module-scope let がない', () => {
    const violations = scanDir('presentation')
    expect(violations, formatViolationMessage(ruleP7, violations)).toEqual([])
  })
})

// ─── P8: useMemo + useCallback 合計上限（内部責務爆発の検出） ──

describe('G8-P8: useMemo + useCallback 合計が上限以下', () => {
  const COMBINED_DEFAULT_LIMIT = 12
  const allowlist = buildQuantitativeAllowlist(combinedHookComplexityLimits)

  const scanDir = (dirName: string) => {
    const dir = path.join(SRC_DIR, dirName)
    if (!fs.existsSync(dir)) return []
    const files = collectTsFiles(dir)
    const violations: string[] = []

    for (const file of files) {
      if (file.includes('.test.')) continue
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      const code = stripComments(content)
      const memoCount = (code.match(/\buseMemo\s*\(/g) || []).length
      const cbCount = (code.match(/\buseCallback\s*\(/g) || []).length
      const total = memoCount + cbCount
      const limit = allowlist[relPath] ?? COMBINED_DEFAULT_LIMIT

      if (total >= limit) {
        violations.push(
          `${relPath}: useMemo ${memoCount} + useCallback ${cbCount} = ${total} (上限: ${limit})`,
        )
      }
    }
    return violations
  }

  it('application/hooks/ の useMemo + useCallback 合計が上限以下', () => {
    const violations = scanDir('application/hooks')
    expect(violations, formatViolationMessage(ruleP8, violations)).toEqual([])
  })

  it('presentation/ の useMemo + useCallback 合計が上限以下', () => {
    const violations = scanDir('presentation')
    expect(violations, formatViolationMessage(ruleP8, violations)).toEqual([])
  })

  it('features/ の useMemo + useCallback 合計が上限以下', () => {
    const violations = scanDir('features')
    expect(violations, formatViolationMessage(ruleP8, violations)).toEqual([])
  })
})

// ─── P10: features/ の useMemo / useState 上限（カバレッジ拡大） ──

describe('G8-P10: features/ の useMemo が上限以下', () => {
  const featDir = path.join(SRC_DIR, 'features')
  const allowlist = buildQuantitativeAllowlist(featuresMemoLimits)

  it('features/ の useMemo 呼び出し数が上限以下', () => {
    if (!fs.existsSync(featDir)) return
    const files = collectTsFiles(featDir)
    const violations: string[] = []

    for (const file of files) {
      if (file.includes('.test.')) continue
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      const count = (stripComments(content).match(/\buseMemo\s*\(/g) || []).length
      const limit = allowlist[relPath] ?? 7

      if (count >= limit) {
        violations.push(`${relPath}: useMemo ${count}回 (上限: ${limit})`)
      }
    }

    expect(violations, formatViolationMessage(ruleP10Memo, violations)).toEqual([])
  })
})

describe('G8-P10: features/ の useState が上限以下', () => {
  const featDir = path.join(SRC_DIR, 'features')
  const allowlist = buildQuantitativeAllowlist(featuresStateLimits)

  it('features/ の useState 呼び出し数が上限以下', () => {
    if (!fs.existsSync(featDir)) return
    const files = collectTsFiles(featDir)
    const violations: string[] = []

    for (const file of files) {
      if (file.includes('.test.')) continue
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      const count = (stripComments(content).match(/\buseState\s*[<(]/g) || []).length
      const limit = allowlist[relPath] ?? 6

      if (count >= limit) {
        violations.push(`${relPath}: useState ${count}回 (上限: ${limit})`)
      }
    }

    expect(violations, formatViolationMessage(ruleP10State, violations)).toEqual([])
  })
})

// ─── P12: domain/models/ の export 過多（型+utility 同居） ─────

describe('G8-P12: domain/models/ の export function/const が上限以下', () => {
  const modelsDir = path.join(SRC_DIR, 'domain/models')
  const allowlist = buildQuantitativeAllowlist(domainModelExportLimits)
  const DEFAULT_EXPORT_LIMIT = 8

  it('domain/models/ の export 数が上限以下', () => {
    if (!fs.existsSync(modelsDir)) return
    const files = collectTsFiles(modelsDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      // export function / export const をカウント（type-only export は除外）
      const count = (content.match(/^export\s+(function|const)\s+/gm) || []).length
      const limit = allowlist[relPath] ?? DEFAULT_EXPORT_LIMIT

      if (count >= limit) {
        violations.push(`${relPath}: export ${count}個 (上限: ${limit})`)
      }
    }

    expect(violations, formatViolationMessage(ruleP12, violations)).toEqual([])
  })
})

// ─── P17: storeIds 正規化パターンの散在（集約カウント） ────────

describe('G8-P17: storeIds 正規化パターンの散在が上限以下', () => {
  it('storeIds.size > 0 パターンの出現ファイル数が増えていない', () => {
    const allDirs = ['application', 'presentation', 'features']
    const filesWithPattern = new Set<string>()

    for (const dirName of allDirs) {
      const dir = path.join(SRC_DIR, dirName)
      if (!fs.existsSync(dir)) continue
      const files = collectTsFiles(dir)

      for (const file of files) {
        if (file.includes('.test.')) continue
        const content = fs.readFileSync(file, 'utf-8')
        if (/StoreIds\.size\s*>/i.test(content)) {
          filesWithPattern.add(rel(file))
        }
      }
    }

    expect(
      filesWithPattern.size,
      `[${ruleP17.id}] storeIds 正規化パターンが ${filesWithPattern.size} ファイルに散在 (上限: ${STORE_IDS_NORMALIZATION_MAX_FILES})。` +
        `normalizeQueryParams() への統合を検討\n` +
        `該当: ${[...filesWithPattern].join(', ')}`,
    ).toBeLessThanOrEqual(STORE_IDS_NORMALIZATION_MAX_FILES)
  })
})

// ─── P18: fallback 定数密度（DUMMY_/EMPTY_/ZERO_/IDLE_） ─────

describe('G8-P18: fallback 定数の密度が上限以下', () => {
  const allowlist = buildQuantitativeAllowlist(fallbackConstantDensityLimits)
  const DEFAULT_FALLBACK_LIMIT = 7

  const scanDir = (dirName: string) => {
    const dir = path.join(SRC_DIR, dirName)
    if (!fs.existsSync(dir)) return []
    const files = collectTsFiles(dir)
    const violations: string[] = []

    for (const file of files) {
      if (file.includes('.test.')) continue
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      const count = (content.match(/\b(DUMMY_|EMPTY_|ZERO_|IDLE_)\w+/g) || []).length
      const limit = allowlist[relPath] ?? DEFAULT_FALLBACK_LIMIT

      if (count > limit) {
        violations.push(`${relPath}: fallback 定数 ${count}個 (上限: ${limit})`)
      }
    }
    return violations
  }

  it('application/ の fallback 定数密度が上限以下', () => {
    const violations = scanDir('application')
    expect(violations, formatViolationMessage(ruleP18, violations)).toEqual([])
  })

  it('presentation/ の fallback 定数密度が上限以下', () => {
    const violations = scanDir('presentation')
    expect(violations, formatViolationMessage(ruleP18, violations)).toEqual([])
  })

  it('features/ の fallback 定数密度が上限以下', () => {
    const violations = scanDir('features')
    expect(violations, formatViolationMessage(ruleP18, violations)).toEqual([])
  })
})

// ─── P20: useMemo body 内行数（SP-D ADR-D-003 ratchet-down） ──────────

/**
 * P20 — useMemo の callback body 内行数を ratchet-down で監視。
 *
 * 設計意図:
 *   `useMemo(() => { ... }, deps)` の body が肥大化すると、
 *   - 1 file に複数責務が同居しやすい（C8 1 文説明テスト失敗）
 *   - test しづらい（hook 経由でしか実行できない pure 計算が混入）
 *   - dependency 配列が広範になり memoization の意味が薄れる
 *   ADR-D-003 で baseline を段階的に削減し、最終的に上限 P20=20 行で固定 fail。
 *
 * 検出方法:
 *   regex で `useMemo(() => {` を見つけ、対応する `}` までの行数をカウント。
 *   AST ではなく depth-tracking で簡易検出。コメント / 文字列内の括弧で誤検出する
 *   可能性があるため、絶対値ではなく ratchet-down 用途。
 *
 * baseline=208: 2026-04-26 時点での実測 max (CategoryPerformanceChart.tsx:127)。
 * plan 値 69 (inquiry/05 時点) よりも増加しているため、現実値で凍結。
 *
 * @see projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-D-003
 * @see projects/aag-temporal-governance-hardening/plan.md §ADR-D-003
 */
const BASELINE_USEMEMO_BODY_LINES = 208

function findMaxUseMemoBodyLines(): { maxLines: number; file: string; startLine: number } {
  const allFiles = collectTsFiles(SRC_DIR).filter(
    (f) => !f.includes('.test.') && !f.includes('.stories.'),
  )
  let max = 0
  let maxFile = ''
  let maxStart = 0
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf-8')
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].match(/useMemo\s*\(\s*\(\s*\)\s*=>\s*\{/)) continue
      let depth = 1
      for (let j = i + 1; j < lines.length; j++) {
        for (const c of lines[j]) {
          if (c === '{') depth++
          else if (c === '}') depth--
          if (depth === 0) {
            const bodyLines = j - i - 1
            if (bodyLines > max) {
              max = bodyLines
              maxFile = rel(file)
              maxStart = i + 1
            }
            break
          }
        }
        if (depth === 0) break
      }
    }
  }
  return { maxLines: max, file: maxFile, startLine: maxStart }
}

describe('G8-P20: useMemo body 行数が baseline 以下（ratchet-down）', () => {
  it('全 useMemo body の最大行数が baseline を超えない', () => {
    const { maxLines, file, startLine } = findMaxUseMemoBodyLines()
    const message =
      `useMemo body 最大行数 = ${maxLines} (baseline = ${BASELINE_USEMEMO_BODY_LINES})\n` +
      `  最大箇所: ${file}:${startLine}\n\n` +
      'hint: useMemo body が肥大化したら pure 計算を domain/calculations や ' +
      'application/usecases に抽出して useMemo の body を簡素化する。' +
      '\n  上限目標: P20=20 行 (ADR-D-003 PR4 で fixed mode 移行予定)' +
      '\n  詳細: projects/aag-temporal-governance-hardening/plan.md §ADR-D-003'
    expect(maxLines, message).toBeLessThanOrEqual(BASELINE_USEMEMO_BODY_LINES)
  })
})
