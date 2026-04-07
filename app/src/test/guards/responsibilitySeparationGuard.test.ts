/**
 * 責務分離ガードテスト — 「1 文で説明できるか」を機械的に強制
 *
 * 責務分離カタログ（references/03-guides/responsibility-separation-catalog.md）の
 * 24 パターンのうち、機械的に検出可能なものをガード化する。
 *
 * @guard G8 責務分離（P2/P7/P8/P10/P12/P17/P18）
 * ルール定義: architectureRules.ts (AR-STRUCT-RESP-SEPARATION)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel, isCommentLine } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage } from '../architectureRules'
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

    expect(
      violations,
      `presentation で getState() を直接呼んでいます — 責務分離カタログ P2 を参照。callback props 経由に移行してください:\n${violations.join('\n')}`,
    ).toEqual([])
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
    expect(
      violations,
      `module-scope let を検出 — 責務分離カタログ P7 を参照。WeakMap/クラス/DI に移行してください:\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('presentation/ に module-scope let がない', () => {
    const violations = scanDir('presentation')
    expect(
      violations,
      `module-scope let を検出 — 責務分離カタログ P7 を参照:\n${violations.join('\n')}`,
    ).toEqual([])
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
      const memoCount = (content.match(/\buseMemo\s*\(/g) || []).length
      const cbCount = (content.match(/\buseCallback\s*\(/g) || []).length
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
    expect(
      violations,
      `hook 複雑度(useMemo+useCallback)が上限超過 — 責務分離カタログ P8 を参照:\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('presentation/ の useMemo + useCallback 合計が上限以下', () => {
    const violations = scanDir('presentation')
    expect(
      violations,
      `presentation 複雑度(useMemo+useCallback)が上限超過 — 責務分離カタログ P8 を参照:\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('features/ の useMemo + useCallback 合計が上限以下', () => {
    const violations = scanDir('features')
    expect(
      violations,
      `features 複雑度(useMemo+useCallback)が上限超過 — 責務分離カタログ P8 を参照:\n${violations.join('\n')}`,
    ).toEqual([])
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
      const count = (content.match(/\buseMemo\s*\(/g) || []).length
      const limit = allowlist[relPath] ?? 7

      if (count >= limit) {
        violations.push(`${relPath}: useMemo ${count}回 (上限: ${limit})`)
      }
    }

    expect(
      violations,
      `features useMemo 過多 — 責務分離カタログ P3/P10 を参照:\n${violations.join('\n')}`,
    ).toEqual([])
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
      const count = (content.match(/\buseState\b/g) || []).length
      const limit = allowlist[relPath] ?? 6

      if (count >= limit) {
        violations.push(`${relPath}: useState ${count}回 (上限: ${limit})`)
      }
    }

    expect(
      violations,
      `features useState 過多 — 責務分離カタログ P3/P10 を参照:\n${violations.join('\n')}`,
    ).toEqual([])
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

    expect(
      violations,
      `domain/models で型と utility が同居 — 責務分離カタログ P12 を参照。関数を別ファイルに分離してください:\n${violations.join('\n')}`,
    ).toEqual([])
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
      `storeIds 正規化パターンが ${filesWithPattern.size} ファイルに散在 (上限: ${STORE_IDS_NORMALIZATION_MAX_FILES})。` +
        `normalizeQueryParams() への統合を検討 — 責務分離カタログ P17 を参照\n` +
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
    expect(
      violations,
      `fallback 定数が過密 — 責務分離カタログ P18 を参照。共通モジュールに集約するか、型のデフォルト値に統合してください:\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('presentation/ の fallback 定数密度が上限以下', () => {
    const violations = scanDir('presentation')
    expect(
      violations,
      `fallback 定数が過密 — 責務分離カタログ P18 を参照:\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('features/ の fallback 定数密度が上限以下', () => {
    const violations = scanDir('features')
    expect(
      violations,
      `fallback 定数が過密 — 責務分離カタログ P18 を参照:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})
