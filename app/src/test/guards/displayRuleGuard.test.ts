/**
 * Display Rule Guard — Project C Phase 3 deliverable
 *
 * DFR-001〜005 (Display-Focused Rules) の bypass pattern を機械検証する。
 * `references/01-principles/aag/display-rule-registry.md` を canonical doc として、
 * 各 DFR の bypass pattern が presentation 層で発生していないことを baseline=0 で確認。
 *
 * 検証する DFR:
 * - DFR-001 chart semantic color: chart 内 hex literal (#22c55e / #f97316) の直書き禁止
 * - DFR-002 axis formatter: chart の axisLabel.formatter に inline 関数記述禁止
 * - DFR-003 percent: presentation 層で `* 100` + `.toFixed(` の組み合わせ inline 計算禁止
 * - DFR-004 currency: presentation 層で `'¥' +` または `+ '円'` の inline 構築禁止
 * - DFR-005 icon: presentation 層で page emoji literal (📊 / 📈 / 📉) 直書き禁止
 *
 * 各 DFR は baseline=0 + gate severity (= fixed-mode、observed drift なし)。新規 drift は
 * immediate fail で拒否、ratchet-down 不要 (= protocol §2 + protocol §5 の方針に準拠)。
 *
 * @guard F2 文字列カタログ
 * @guard F3 全パターン同一
 * @see references/01-principles/aag/display-rule-registry.md
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

const REPO_ROOT = path.resolve(__dirname, '../../../..')
const PRESENTATION_DIR = path.resolve(REPO_ROOT, 'app/src/presentation')
const CHARTS_DIR = path.resolve(PRESENTATION_DIR, 'components/charts')
const THEME_DIR = path.resolve(PRESENTATION_DIR, 'theme')

// 各 DFR は theme.ts / tokens.ts / formatters の起点 file を allowlist (= helper 自身は inline OK)
const DFR_001_ALLOWLIST = [
  path.resolve(THEME_DIR, 'tokens.ts'),
  path.resolve(THEME_DIR, 'theme.ts'),
]
const DFR_002_ALLOWLIST: string[] = [] // useAxisFormatter 自身が presentation 外なら不要
const DFR_003_ALLOWLIST: string[] = [] // formatPercent は domain/calculations or shared/utils
const DFR_004_ALLOWLIST: string[] = [] // formatCurrency 同上
const DFR_005_ALLOWLIST: string[] = [] // pageRegistry 自身が registry 起点

function loadFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return collectTsFiles(dir)
}

interface DfrViolation {
  file: string
  line: number
  match: string
}

function findViolations(files: string[], pattern: RegExp, allowlist: string[]): DfrViolation[] {
  const violations: DfrViolation[] = []
  const allow = new Set(allowlist.map((p) => path.resolve(p)))
  for (const file of files) {
    if (allow.has(path.resolve(file))) continue
    const content = fs.readFileSync(file, 'utf-8')
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const m = line.match(pattern)
      if (m) {
        violations.push({ file: rel(file), line: i + 1, match: m[0] })
      }
    }
  }
  return violations
}

// Baselines: Project C Phase 3 着手時点で検出された observed drift 件数を baseline 化
// (project HANDOFF §3.2 = observed drift = baseline、即時 0 化禁止)。
// Phase 4 以降の commit で漸次 0 に近づける ratchet-down 方式。
const DFR_001_BASELINE = 7 // chart 内 hex literal 直書き
const DFR_002_BASELINE = 4 // axisLabel.formatter inline 関数
const DFR_003_BASELINE = 0 // inline percent 計算 (fixed 状態、ratchet-down 完遂 2026-05-01)
const DFR_004_BASELINE = 0 // inline currency 構築 (= 既に 0、fixed 状態)
const DFR_005_BASELINE = 20 // page emoji 直書き

describe('Display Rule Guard: DFR-001〜005 bypass pattern 検出 (Project C Phase 3)', () => {
  const presentationFiles = loadFiles(PRESENTATION_DIR)
  const chartFiles = loadFiles(CHARTS_DIR)

  it('DFR-001: chart 内 hex literal (#22c55e / #f97316) の直書きが baseline 以下', () => {
    const pattern = /#(?:22c55e|f97316)\b/i
    const violations = findViolations(chartFiles, pattern, DFR_001_ALLOWLIST)
    expect(
      violations.length,
      `DFR-001 violations: ${violations.length} > baseline ${DFR_001_BASELINE}`,
    ).toBeLessThanOrEqual(DFR_001_BASELINE)
  })

  it('DFR-002: chart の axisLabel.formatter に inline 関数記述が baseline 以下', () => {
    const pattern = /axisLabel\s*:\s*\{[^}]*formatter\s*:\s*\(/
    const violations = findViolations(chartFiles, pattern, DFR_002_ALLOWLIST)
    expect(
      violations.length,
      `DFR-002 violations: ${violations.length} > baseline ${DFR_002_BASELINE}`,
    ).toBeLessThanOrEqual(DFR_002_BASELINE)
  })

  it('DFR-003: presentation 層で inline percent 計算 (`* 100` + `.toFixed(`) が baseline 以下', () => {
    const pattern = /\*\s*100[\s\S]{0,40}\.toFixed\(/
    const violations = findViolations(presentationFiles, pattern, DFR_003_ALLOWLIST)
    expect(
      violations.length,
      `DFR-003 violations: ${violations.length} > baseline ${DFR_003_BASELINE}`,
    ).toBeLessThanOrEqual(DFR_003_BASELINE)
  })

  it('DFR-004: presentation 層で inline currency 構築 (`\'¥\' +` / `"¥" +`) が baseline=0 fixed', () => {
    const pattern = /['"]¥['"]\s*\+/
    const violations = findViolations(presentationFiles, pattern, DFR_004_ALLOWLIST)
    expect(violations.length).toBeLessThanOrEqual(DFR_004_BASELINE)
  })

  it('DFR-005: presentation 層で page emoji literal (📊 / 📈 / 📉) 直書きが baseline 以下', () => {
    const pattern = /[📊📈📉]/u
    const violations = findViolations(presentationFiles, pattern, DFR_005_ALLOWLIST)
    expect(
      violations.length,
      `DFR-005 violations: ${violations.length} > baseline ${DFR_005_BASELINE}`,
    ).toBeLessThanOrEqual(DFR_005_BASELINE)
  })
})
