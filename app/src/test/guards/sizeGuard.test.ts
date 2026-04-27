/**
 * サイズ・複雑度ガードテスト — ファイルサイズとフック複雑度の上限検証
 *
 * ルール定義: architectureRules.ts (AR-G5-*, AR-G6-*, AR-C6-*)
 *
 * @guard G5 サイズ上限（hook ≤300行、useMemo ≤7、useState ≤6）
 * @guard G6 コンポーネントサイズ上限（.tsx ≤600行）
 * @guard C6 facade は orchestration のみ
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel, stripComments } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage } from '../architectureRules'
import {
  useMemoLimits,
  useStateLimits,
  hookLineLimits,
  presentationMemoLimits,
  presentationStateLimits,
  combinedHookComplexityLimits,
  domainLargeFiles,
  buildAllowlistSet,
  buildQuantitativeAllowlist,
} from '../allowlists'

// ─── R11: hook ファイルの useMemo カウント上限 ──────────────

describe('R11: hooks/ の useMemo 呼び出しが上限以下', () => {
  const rule = getRuleById('AR-G5-HOOK-MEMO')!
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  const allowlist = buildQuantitativeAllowlist(useMemoLimits)

  it('useMemo 呼び出し数が上限以下', () => {
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      const count = (stripComments(content).match(/\buseMemo\s*\(/g) || []).length
      const limit = allowlist[relPath] ?? rule.thresholds!.memoMax!

      if (count >= limit) {
        violations.push(`${relPath}: useMemo ${count}回 (上限: ${limit})`)
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })
})

// ─── R11: hook ファイルの useState カウント上限 ──────────────

describe('R11: hooks/ の useState 呼び出しが上限以下', () => {
  const rule = getRuleById('AR-G5-HOOK-STATE')!
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  const allowlist = buildQuantitativeAllowlist(useStateLimits)

  it('useState 呼び出し数が上限以下', () => {
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      const count = (stripComments(content).match(/\buseState\b/g) || []).length
      const limit = allowlist[relPath] ?? rule.thresholds!.stateMax!

      if (count >= limit) {
        violations.push(`${relPath}: useState ${count}回 (上限: ${limit})`)
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })
})

// ─── G5 横展開: presentation/ の useMemo / useState 上限 ─────

// G8-P8 の合計 allowlist に載っているファイルは個別チェック免除（重複排除）
const combinedAllowlistPaths = buildQuantitativeAllowlist(combinedHookComplexityLimits)

describe('G5: presentation/ の useMemo 呼び出しが上限以下', () => {
  const memoRule = getRuleById('AR-G5-HOOK-MEMO')!
  const presDir = path.join(SRC_DIR, 'presentation')
  const allowlist = buildQuantitativeAllowlist(presentationMemoLimits)

  it('useMemo 呼び出し数が上限以下', () => {
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    for (const file of files) {
      if (file.includes('.test.')) continue
      const relPath = rel(file)
      if (combinedAllowlistPaths[relPath] != null) continue
      const content = fs.readFileSync(file, 'utf-8')
      const count = (stripComments(content).match(/\buseMemo\s*\(/g) || []).length
      const limit = allowlist[relPath] ?? memoRule.thresholds!.memoMax!

      if (count >= limit) {
        violations.push(`${relPath}: useMemo ${count}回 (上限: ${limit})`)
      }
    }

    expect(violations, formatViolationMessage(memoRule, violations)).toEqual([])
  })
})

describe('G5: presentation/ の useState 呼び出しが上限以下', () => {
  const presDir = path.join(SRC_DIR, 'presentation')
  const allowlist = buildQuantitativeAllowlist(presentationStateLimits)
  // presentation はコンポーネント状態が多いため hooks（6）より緩い上限
  const PRESENTATION_STATE_LIMIT = 8

  it('useState 呼び出し数が上限以下', () => {
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    for (const file of files) {
      if (file.includes('.test.')) continue
      const relPath = rel(file)
      if (combinedAllowlistPaths[relPath] != null) continue
      const content = fs.readFileSync(file, 'utf-8')
      const count = (stripComments(content).match(/\buseState\b/g) || []).length
      const limit = allowlist[relPath] ?? PRESENTATION_STATE_LIMIT

      if (count >= limit) {
        violations.push(`${relPath}: useState ${count}回 (上限: ${limit})`)
      }
    }

    const stateRule = getRuleById('AR-G5-HOOK-STATE')!
    expect(violations, formatViolationMessage(stateRule, violations)).toEqual([])
  })
})

// ─── R11: hook ファイルの汎用行数上限（300行） ──────────────

describe('R11: hooks/ の .ts ファイルが行数上限以下', () => {
  const rule = getRuleById('AR-G5-HOOK-LINES')!
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  const allowlist = buildQuantitativeAllowlist(hookLineLimits)

  it('hook ファイルが行数上限以下', () => {
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      const lineCount = content.split('\n').length
      const limit = allowlist[relPath] ?? rule.thresholds!.lineMax!

      if (lineCount > limit) {
        violations.push(`${relPath}: ${lineCount}行 (上限: ${limit})`)
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })
})

// ─── R12: Presentation コンポーネントの行数制限（汎用600行上限）─

describe('R12: Presentation コンポーネントの行数制限', () => {
  const rule = getRuleById('AR-G6-COMPONENT')!
  const presentationDir = path.join(SRC_DIR, 'presentation')

  const largeComponentExclusions = new Set<string>()

  it('Presentation .tsx は 600 行以下', () => {
    const files = collectTsFiles(presentationDir)
    const violations: string[] = []

    for (const file of files) {
      if (!file.endsWith('.tsx')) continue
      if (file.includes('.styles.') || file.includes('.stories.')) continue
      const relPath = rel(file)
      if (largeComponentExclusions.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lineCount = content.split('\n').length
      if (lineCount > rule.thresholds!.lineMax!) {
        violations.push(`${relPath}: ${lineCount}行 (上限: ${rule.thresholds!.lineMax})`)
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('大型コンポーネント（Tier 2）は個別上限以下', () => {
    const limits: [string, number][] = [['presentation/components/charts/TimeSlotChart.tsx', 660]]
    for (const [relPath, maxLines] of limits) {
      const filePath = path.join(SRC_DIR, relPath)
      if (!fs.existsSync(filePath)) continue
      const content = fs.readFileSync(filePath, 'utf-8')
      const lineCount = content.split('\n').length
      expect(
        lineCount,
        `${relPath} は ${lineCount} 行 (上限: ${maxLines})。分割してから機能追加すること`,
      ).toBeLessThanOrEqual(maxLines)
    }
  })
})

// ─── 層別汎用行数制限 ──────────────────────────────────

describe('Infrastructure 層の行数制限', () => {
  const rule = getRuleById('AR-G5-INFRA-LINES')!

  it('infrastructure .ts ファイルが 400 行以下', () => {
    const infraDir = path.join(SRC_DIR, 'infrastructure')
    const files = collectTsFiles(infraDir)
    const violations: string[] = []

    const excludeFiles = new Set<string>()

    for (const file of files) {
      const relPath = rel(file)
      if (excludeFiles.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lineCount = content.split('\n').length
      if (lineCount > rule.thresholds!.lineMax!) {
        violations.push(`${relPath}: ${lineCount}行 (上限: ${rule.thresholds!.lineMax})`)
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })
})

describe('Domain 層の行数制限', () => {
  const rule = getRuleById('AR-G5-DOMAIN-LINES')!

  it('domain .ts ファイルが 300 行以下', () => {
    const domainDir = path.join(SRC_DIR, 'domain')
    const files = collectTsFiles(domainDir)
    const violations: string[] = []

    const excludeFiles = buildAllowlistSet(domainLargeFiles)

    for (const file of files) {
      const relPath = rel(file)
      if (excludeFiles.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lineCount = content.split('\n').length
      if (lineCount > rule.thresholds!.lineMax!) {
        violations.push(`${relPath}: ${lineCount}行 (上限: ${rule.thresholds!.lineMax})`)
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })
})

describe('Application usecases 層の行数制限', () => {
  const rule = getRuleById('AR-G5-USECASE-LINES')!

  it('application/usecases .ts ファイルが 400 行以下', () => {
    const usecasesDir = path.join(SRC_DIR, 'application/usecases')
    if (!fs.existsSync(usecasesDir)) return
    const files = collectTsFiles(usecasesDir)
    const violations: string[] = []

    const excludeFiles = new Set<string>()

    for (const file of files) {
      const relPath = rel(file)
      if (excludeFiles.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lineCount = content.split('\n').length
      if (lineCount > rule.thresholds!.lineMax!) {
        violations.push(`${relPath}: ${lineCount}行 (上限: ${rule.thresholds!.lineMax})`)
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })
})

// ─── R5: facade ファイルの分岐数制限 ─────────────────────

describe('R5: facade ファイルの分岐が 5 以下', () => {
  const rule = getRuleById('AR-C6-FACADE')!

  it('facade/ファサード コメント付きファイルの if/switch が 5 以下', () => {
    const appDir = path.join(SRC_DIR, 'application')
    const files = collectTsFiles(appDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      if (!content.includes('facade') && !content.includes('ファサード')) continue

      const lines = content.split('\n')
      let branchCount = 0
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*'))
          continue
        if (/\bif\s*\(/.test(trimmed)) branchCount++
        if (/\bswitch\s*\(/.test(trimmed)) branchCount++
      }

      if (branchCount > rule.thresholds!.branchMax!) {
        violations.push(`${rel(file)}: 分岐 ${branchCount}回 (上限: ${rule.thresholds!.branchMax})`)
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })
})
