/**
 * 時間スコープ意味論ガード
 *
 * temporal-scope-semantics.md のルールを機械的に検証する。
 * sameDate / sameDow / monthlyTotal の混用、予算比較への alignment 値使用、
 * elapsedDays cap の誤用を検出する。
 *
 * @see references/01-principles/temporal-scope-semantics.md
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')

describe('時間スコープ意味論ガード', () => {
  const allFiles = collectTsFiles(SRC_DIR).filter(
    (f) => !f.includes('__tests__') && !f.includes('.test.') && !f.includes('.stories.'),
  )

  it('sameDate 値を予算比較の分母に直接使わない', () => {
    // temporal-scope-semantics.md: 予算比較に alignment 値を使うな
    // sameDate.sales / budget のような直接比較は禁止
    // 正しくは monthlyTotal か elapsed-adjusted を使う
    const BANNED = /sameDate\.\w+\s*\/\s*budget|budget\s*\/\s*sameDate\.\w+/
    const violations: string[] = []

    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const line of content.split('\n')) {
        if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue
        if (BANNED.test(line)) {
          violations.push(`${rel(file)}: ${line.trim().slice(0, 80)}`)
        }
      }
    }

    expect(
      violations,
      `sameDate 値を予算の分母/分子に直接使用:\n${violations.join('\n')}\n` +
        `予算比較には monthlyTotal または elapsed-adjusted を使用してください`,
    ).toEqual([])
  })

  it('elapsedDays を月間固定値（daysInMonth）として使わない', () => {
    // elapsedDays はデータ有効範囲の cap。月の日数とは別物。
    const BANNED = /elapsedDays\s*===?\s*daysInMonth|daysInMonth\s*===?\s*elapsedDays/
    const violations: string[] = []

    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const line of content.split('\n')) {
        if (line.trimStart().startsWith('//')) continue
        if (BANNED.test(line)) {
          violations.push(`${rel(file)}: ${line.trim().slice(0, 80)}`)
        }
      }
    }

    expect(
      violations,
      `elapsedDays を daysInMonth と同一視:\n${violations.join('\n')}\n` +
        `elapsedDays は cap であり、月の日数とは別概念です`,
    ).toEqual([])
  })

  it('buildComparisonScope が ComparisonScope の唯一の factory', () => {
    // ComparisonScope を手動構築するパターンを検出
    const BANNED = /ComparisonScope\s*=\s*\{|as\s+ComparisonScope/
    const ALLOWED_FILES = ['ComparisonScope.ts', 'comparisonScopeGuard', 'analysisFrameGuard']
    const violations: string[] = []

    for (const file of allFiles) {
      if (ALLOWED_FILES.some((a) => file.includes(a))) continue
      const content = fs.readFileSync(file, 'utf-8')
      for (const line of content.split('\n')) {
        if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue
        if (line.includes('import type')) continue
        if (BANNED.test(line)) {
          violations.push(`${rel(file)}: ${line.trim().slice(0, 80)}`)
        }
      }
    }

    expect(
      violations,
      `ComparisonScope の手動構築が検出されました:\n${violations.join('\n')}\n` +
        `buildComparisonScope() factory を使用してください`,
    ).toEqual([])
  })
})
