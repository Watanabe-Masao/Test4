/**
 * 責務分離ガードテスト — 「1 文で説明できるか」を機械的に強制
 *
 * 責務分離カタログ（references/03-guides/responsibility-separation-catalog.md）の
 * 24 パターンのうち、機械的に検出可能なものをガード化する。
 *
 * @guard G8 責務分離（useMemo+useCallback 合計 ≤12、features/ カバレッジ）
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel } from '../guardTestHelpers'
import {
  combinedHookComplexityLimits,
  featuresMemoLimits,
  featuresStateLimits,
  buildQuantitativeAllowlist,
} from '../allowlists'

// ─── P8: useMemo + useCallback 合計上限（内部責務爆発の検出） ──

describe('G8-P8: useMemo + useCallback 合計が上限以下', () => {
  const COMBINED_DEFAULT_LIMIT = 12
  const allowlist = buildQuantitativeAllowlist(combinedHookComplexityLimits)

  it('application/hooks/ の useMemo + useCallback 合計が上限以下', () => {
    const hooksDir = path.join(SRC_DIR, 'application/hooks')
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    for (const file of files) {
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

    expect(
      violations,
      `hook 複雑度(useMemo+useCallback)が上限超過 — 責務分離カタログ P8 を参照:\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('presentation/ の useMemo + useCallback 合計が上限以下', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
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

    expect(
      violations,
      `presentation 複雑度(useMemo+useCallback)が上限超過 — 責務分離カタログ P8 を参照:\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('features/ の useMemo + useCallback 合計が上限以下', () => {
    const featDir = path.join(SRC_DIR, 'features')
    if (!fs.existsSync(featDir)) return
    const files = collectTsFiles(featDir)
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

    expect(
      violations,
      `features 複雑度(useMemo+useCallback)が上限超過 — 責務分離カタログ P8 を参照:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})

// ─── P3/P10: features/ の useMemo / useState 上限（カバレッジ拡大） ──

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
