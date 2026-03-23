/**
 * サイズ・複雑度ガードテスト — ファイルサイズとフック複雑度の上限検証
 *
 * @guard G5 サイズ上限（hook ≤300行、useMemo ≤7、useState ≤6）
 * @guard G6 コンポーネントサイズ上限（.tsx ≤600行）
 * @guard C6 facade は orchestration のみ
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel } from '../guardTestHelpers'
import {
  useMemoLimits,
  useStateLimits,
  hookLineLimits,
  presentationMemoLimits,
  presentationStateLimits,
  largeComponentTier2,
  infraLargeFiles,
  domainLargeFiles,
  usecasesLargeFiles,
  buildAllowlistSet,
  buildQuantitativeAllowlist,
} from '../allowlists'

// ─── R11: hook ファイルの useMemo カウント上限 ──────────────

describe('R11: hooks/ の useMemo 呼び出しが上限以下', () => {
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  const allowlist = buildQuantitativeAllowlist(useMemoLimits)

  it('useMemo 呼び出し数が上限以下', () => {
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      const count = (content.match(/\buseMemo\s*\(/g) || []).length
      const limit = allowlist[relPath] ?? 7

      if (count >= limit) {
        violations.push(`${relPath}: useMemo ${count}回 (上限: ${limit})`)
      }
    }

    expect(violations, `useMemo 過多のファイルが検出されました:\n${violations.join('\n')}`).toEqual(
      [],
    )
  })
})

// ─── R11: hook ファイルの useState カウント上限 ──────────────

describe('R11: hooks/ の useState 呼び出しが上限以下', () => {
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  const allowlist = buildQuantitativeAllowlist(useStateLimits)

  it('useState 呼び出し数が上限以下', () => {
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
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
      `useState 過多のファイルが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── G5 横展開: presentation/ の useMemo / useState 上限 ─────

describe('G5: presentation/ の useMemo 呼び出しが上限以下', () => {
  const presDir = path.join(SRC_DIR, 'presentation')
  const allowlist = buildQuantitativeAllowlist(presentationMemoLimits)

  it('useMemo 呼び出し数が上限以下', () => {
    const files = collectTsFiles(presDir)
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

    expect(violations, `useMemo 過多:\n${violations.join('\n')}`).toEqual([])
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
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      const count = (content.match(/\buseState\b/g) || []).length
      const limit = allowlist[relPath] ?? PRESENTATION_STATE_LIMIT

      if (count >= limit) {
        violations.push(`${relPath}: useState ${count}回 (上限: ${limit})`)
      }
    }

    expect(violations, `useState 過多:\n${violations.join('\n')}`).toEqual([])
  })
})

// ─── R11: hook ファイルの汎用行数上限（300行） ──────────────

describe('R11: hooks/ の .ts ファイルが行数上限以下', () => {
  const hooksDir = path.join(SRC_DIR, 'application/hooks')

  const allowlist = buildQuantitativeAllowlist(hookLineLimits)

  it('hook ファイルが行数上限以下', () => {
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const relPath = rel(file)
      const lineCount = content.split('\n').length
      const limit = allowlist[relPath] ?? 300

      if (lineCount > limit) {
        violations.push(`${relPath}: ${lineCount}行 (上限: ${limit})`)
      }
    }

    expect(
      violations,
      `行数超過の hook ファイルが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── R12: Presentation コンポーネントの行数制限（汎用600行上限）─

describe('R12: Presentation コンポーネントの行数制限', () => {
  const presentationDir = path.join(SRC_DIR, 'presentation')

  // Tier 2: 600行超の大型コンポーネント — 次回改修時に分割義務
  const largeComponentExclusions = buildAllowlistSet(largeComponentTier2)

  it('Presentation .tsx は 600 行以下', () => {
    const files = collectTsFiles(presentationDir)
    const violations: string[] = []

    for (const file of files) {
      if (!file.endsWith('.tsx')) continue
      // styles, stories ファイルは除外
      if (file.includes('.styles.') || file.includes('.stories.')) continue
      const relPath = rel(file)
      if (largeComponentExclusions.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lineCount = content.split('\n').length
      if (lineCount > 600) {
        violations.push(`${relPath}: ${lineCount}行 (上限: 600)`)
      }
    }

    expect(
      violations,
      `600行超のコンポーネントが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
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
  it('infrastructure .ts ファイルが 400 行以下', () => {
    const infraDir = path.join(SRC_DIR, 'infrastructure')
    const files = collectTsFiles(infraDir)
    const violations: string[] = []

    const excludeFiles = buildAllowlistSet(infraLargeFiles)

    for (const file of files) {
      const relPath = rel(file)
      if (excludeFiles.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lineCount = content.split('\n').length
      if (lineCount > 400) {
        violations.push(`${relPath}: ${lineCount}行 (汎用上限: 400)`)
      }
    }

    expect(
      violations,
      `400行超の infrastructure ファイルが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

describe('Domain 層の行数制限', () => {
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
      if (lineCount > 300) {
        violations.push(`${relPath}: ${lineCount}行 (汎用上限: 300)`)
      }
    }

    expect(
      violations,
      `300行超の domain ファイルが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

describe('Application usecases 層の行数制限', () => {
  it('application/usecases .ts ファイルが 400 行以下', () => {
    const usecasesDir = path.join(SRC_DIR, 'application/usecases')
    if (!fs.existsSync(usecasesDir)) return
    const files = collectTsFiles(usecasesDir)
    const violations: string[] = []

    const excludeFiles = buildAllowlistSet(usecasesLargeFiles)

    for (const file of files) {
      const relPath = rel(file)
      if (excludeFiles.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lineCount = content.split('\n').length
      if (lineCount > 400) {
        violations.push(`${relPath}: ${lineCount}行 (汎用上限: 400)`)
      }
    }

    expect(
      violations,
      `400行超の usecases ファイルが検出されました:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── R5: facade ファイルの分岐数制限 ─────────────────────

describe('R5: facade ファイルの分岐が 5 以下', () => {
  it('facade/ファサード コメント付きファイルの if/switch が 5 以下', () => {
    const appDir = path.join(SRC_DIR, 'application')
    const files = collectTsFiles(appDir)
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      // facade / ファサード をコメントで宣言しているファイルのみ対象
      if (!content.includes('facade') && !content.includes('ファサード')) continue

      const lines = content.split('\n')
      let branchCount = 0
      for (const line of lines) {
        // コメント行は除外
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*'))
          continue
        // if / switch をカウント
        if (/\bif\s*\(/.test(trimmed)) branchCount++
        if (/\bswitch\s*\(/.test(trimmed)) branchCount++
      }

      if (branchCount > 5) {
        violations.push(`${rel(file)}: 分岐 ${branchCount}回 (上限: 5)`)
      }
    }

    expect(violations, `facade に分岐ロジックが混入しています:\n${violations.join('\n')}`).toEqual(
      [],
    )
  })
})
