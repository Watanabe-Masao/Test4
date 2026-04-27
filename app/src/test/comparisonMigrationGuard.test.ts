/**
 * 比較サブシステム移行ガードテスト
 *
 * 旧 day/offset パターンの再発を CI で検出・禁止する。
 * V2 比較サブシステム（ComparisonScope.alignmentMap + resolveComparisonRows）への
 * 移行中に、旧パターンの新規使用を防ぐ。
 *
 * @guard E3 sourceDate を落とさない
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel } from './guardTestHelpers'
import {
  cmpPrevYearDaily,
  cmpFramePrevious,
  cmpDailyMapping,
  buildAllowlistSet,
} from './allowlists'

// ─── INV-CMP-01: prevYear.daily.get(day) 禁止 ──────────

describe('INV-CMP-01: prevYear.daily.get(day) の新規使用禁止', () => {
  /**
   * 既存の違反ファイル許可リスト（凍結）。
   * 移行完了時に許可リストから削除する。新規追加は禁止。
   */
  const ALLOWLIST = buildAllowlistSet(cmpPrevYearDaily)
  const MAX_ALLOWLIST_SIZE = 0

  it('許可リストのサイズが上限を超えない', () => {
    expect(
      ALLOWLIST.size,
      `許可リストが上限 ${MAX_ALLOWLIST_SIZE} を超えています（現在 ${ALLOWLIST.size}）。` +
        '新規ファイルで prevYear.daily.get() を使わないでください。',
    ).toBeLessThanOrEqual(MAX_ALLOWLIST_SIZE)
  })

  it('許可リスト外で prevYear.daily.get() を使用していない', () => {
    const targetDirs = [
      path.join(SRC_DIR, 'presentation'),
      path.join(SRC_DIR, 'application/hooks'),
      path.join(SRC_DIR, 'application/usecases'),
    ]
    const violations: string[] = []
    const pattern = /prevYear\.daily\.get\(/

    for (const dir of targetDirs) {
      const files = collectTsFiles(dir)
      for (const file of files) {
        const relPath = rel(file)
        if (ALLOWLIST.has(relPath)) continue

        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            violations.push(`${relPath}:${i + 1}: ${lines[i].trim()}`)
          }
        }
      }
    }

    expect(
      violations,
      `prevYear.daily.get() が許可リスト外で検出されました:\n${violations.join('\n')}\n` +
        'getPrevYearDailyValue() または getPrevYearDailySales() を使ってください（@see comparisonAccessors.ts）。',
    ).toEqual([])
  })
})

// ─── INV-CMP-02: origDay - offset パターン禁止 ──────────

describe('INV-CMP-02: day 番号 + offset による前年比較禁止', () => {
  it('origDay - offset / origDay + offset パターンが存在しない', () => {
    const targetDirs = [path.join(SRC_DIR, 'presentation'), path.join(SRC_DIR, 'application/hooks')]
    const violations: string[] = []
    const pattern = /origDay\s*[-+]\s*offset/

    for (const dir of targetDirs) {
      const files = collectTsFiles(dir)
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            violations.push(`${rel(file)}:${i + 1}: ${lines[i].trim()}`)
          }
        }
      }
    }

    expect(
      violations,
      `origDay - offset パターンが検出されました:\n${violations.join('\n')}\n` +
        'V2 では ComparisonScope.alignmentMap を使ってください。',
    ).toEqual([])
  })
})

// ─── INV-CMP-03: comparisonFrame.previous 新規使用禁止 ──

describe('INV-CMP-03: comparisonFrame.previous の新規使用禁止', () => {
  /**
   * 既存の違反ファイル許可リスト（凍結）。
   * ComparisonScope ベースに移行完了時に削除する。
   */
  const ALLOWLIST = buildAllowlistSet(cmpFramePrevious)
  const MAX_ALLOWLIST_SIZE = 0

  it('許可リストのサイズが上限を超えない（全件解消済み）', () => {
    expect(
      ALLOWLIST.size,
      `許可リストが上限 ${MAX_ALLOWLIST_SIZE} を超えています（現在 ${ALLOWLIST.size}）。` +
        '新規ファイルで comparisonFrame.previous を使わないでください。',
    ).toBeLessThanOrEqual(MAX_ALLOWLIST_SIZE)
  })

  it('許可リスト外で comparisonFrame.previous を使用していない', () => {
    const presentationDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presentationDir)
    const violations: string[] = []
    const pattern = /comparisonFrame\.previous/

    for (const file of files) {
      const relPath = rel(file)
      if (ALLOWLIST.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          violations.push(`${relPath}:${i + 1}: ${lines[i].trim()}`)
        }
      }
    }

    expect(
      violations,
      `comparisonFrame.previous が許可リスト外で検出されました:\n${violations.join('\n')}\n` +
        'V2 では ComparisonScope.alignmentMap または effectivePeriod2 を使ってください。',
    ).toEqual([])
  })
})

// ─── INV-CMP-04: aggregateWithOffset 新規使用禁止 ──────

describe('INV-CMP-04: aggregateWithOffset の新規使用禁止', () => {
  it('aggregateWithOffset が使用されていない', () => {
    const targetDirs = [
      path.join(SRC_DIR, 'presentation'),
      path.join(SRC_DIR, 'application'),
      path.join(SRC_DIR, 'domain'),
      path.join(SRC_DIR, 'infrastructure'),
    ]
    const violations: string[] = []
    const pattern = /aggregateWithOffset/

    for (const dir of targetDirs) {
      const files = collectTsFiles(dir)
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            violations.push(`${rel(file)}:${i + 1}: ${lines[i].trim()}`)
          }
        }
      }
    }

    expect(
      violations,
      `aggregateWithOffset が検出されました:\n${violations.join('\n')}\n` +
        'V2 では aggregateKpiByAlignment を使ってください。',
    ).toEqual([])
  })
})

// ─── INV-CMP-08: dailyMapping の独自 Map 変換禁止 ──────

describe('INV-CMP-08: dailyMapping を独自 Map に劣化させる変換の禁止', () => {
  /**
   * dailyMapping をループして Map<number, { sales/customers }> を作る独自変換を禁止。
   *
   * ## 背景
   *
   * buildPrevSameDowMap() が DayMappingRow の sourceDate（prevYear/prevMonth/prevDay）を
   * 落として Map<number, { sales, customers }> に劣化させていた。
   * 月跨ぎ（2026/2/28 → 2025/3/1）で出典が追跡不能になるバグの根本原因。
   *
   * ## ルール
   *
   * 同曜日比較の UI は buildSameDowPoints() を唯一の入口とする。
   * dailyMapping を直接ループして独自 Map を構築してはならない。
   */

  /**
   * PrevYearBudgetDetailPanel は dailyMapping.map() を使うが、
   * ...row でスプレッドし prevYear/prevMonth/prevDay を全て保持している。
   * sourceDate を落とさない正当な使用のため許可。
   */
  const ALLOWLIST = buildAllowlistSet(cmpDailyMapping)
  const MAX_ALLOWLIST_SIZE = 1

  it('許可リストのサイズが上限を超えない', () => {
    expect(
      ALLOWLIST.size,
      `許可リストが上限 ${MAX_ALLOWLIST_SIZE} を超えています。` +
        'dailyMapping を直接使う場合は buildSameDowPoints() に移行してください。',
    ).toBeLessThanOrEqual(MAX_ALLOWLIST_SIZE)
  })

  it('presentation 層で dailyMapping を直接ループする独自変換がない', () => {
    const presentationDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presentationDir)
    const violations: string[] = []

    // dailyMapping をループして .set() する独自変換パターンを検出
    // 例: for (const row of mapping) { map.set(row.currentDay, ...) }
    // 例: dailyMapping.forEach(row => map.set(...))
    // 例: for (const row of kpi.sameDow.dailyMapping) { ... }
    const patterns = [
      /for\s*\([^)]*dailyMapping/,
      /dailyMapping\.forEach/,
      /dailyMapping\.map\(/,
      /dailyMapping\.reduce\(/,
    ]

    for (const file of files) {
      const relPath = rel(file)
      if (ALLOWLIST.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // buildSameDowPoints の import/呼び出しは許可
        if (/buildSameDowPoints/.test(line)) continue
        for (const pattern of patterns) {
          if (pattern.test(line)) {
            violations.push(`${relPath}:${i + 1}: ${line.trim()}`)
          }
        }
      }
    }

    expect(
      violations,
      `dailyMapping の独自変換が検出されました:\n${violations.join('\n')}\n` +
        'buildSameDowPoints() を使ってください（sourceDate を保持するため）。',
    ).toEqual([])
  })

  it('application/hooks 層で dailyMapping を直接ループする独自変換がない', () => {
    const hooksDir = path.join(SRC_DIR, 'application/hooks')
    const files = collectTsFiles(hooksDir)
    const violations: string[] = []

    const patterns = [
      /for\s*\([^)]*dailyMapping/,
      /dailyMapping\.forEach/,
      /dailyMapping\.map\(/,
      /dailyMapping\.reduce\(/,
    ]

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (/buildSameDowPoints/.test(line)) continue
        for (const pattern of patterns) {
          if (pattern.test(line)) {
            violations.push(`${rel(file)}:${i + 1}: ${line.trim()}`)
          }
        }
      }
    }

    expect(
      violations,
      `dailyMapping の独自変換が検出されました:\n${violations.join('\n')}\n` +
        'buildSameDowPoints() を使ってください（sourceDate を保持するため）。',
    ).toEqual([])
  })
})
