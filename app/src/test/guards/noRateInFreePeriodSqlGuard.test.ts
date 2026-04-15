// 自由期間 SQL 内 rate 計算禁止ガード
//
// unify-period-analysis Phase 4: 自由期間系の infra query が額のみを返す
// ことを機械的に保証する。率 (gpRate / markupRate / discountRate /
// salesAchievement 等) の計算は必ず JS 側 (pure builder) で行うこと。
//
// 根拠: references/01-principles/data-pipeline-integrity.md
//   「額で持ち回し、率は使用直前に domain 側で算出」
//
// 守る 2 つの invariant:
//
// G4-1: 除算演算子の禁止
//   freePeriod* 配下の SQL テンプレートリテラル内に、NULLIF 付き除算や
//   CASE WHEN 分岐付き除算があると fail する。
//
// G4-2: AS の Rate alias 禁止 (Weighted suffix 必須)
//   freePeriod* 配下の SQL が Rate suffix の alias を返すことを禁止する。
//   率を返すなら JS 側で計算すべき。加重和を返す場合は Weighted suffix を
//   強制することで、alias だけで「これは加重和」と読み取れるようにする。
//
// 対象: app/src/infrastructure/duckdb/queries/freePeriod*.ts
//
// ratchet-down: Phase 4 完了時点で違反 0 件。以後は 0 を維持する。
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { rel } from '../guardTestHelpers'

const INFRA_QUERIES_DIR = path.resolve(__dirname, '../../infrastructure/duckdb/queries')

/** 対象ファイル: infrastructure/duckdb/queries/freePeriod*.ts */
function collectFreePeriodSqlFiles(): readonly string[] {
  if (!fs.existsSync(INFRA_QUERIES_DIR)) return []
  return fs
    .readdirSync(INFRA_QUERIES_DIR)
    .filter((name) => /^freePeriod.*\.ts$/.test(name))
    .map((name) => path.join(INFRA_QUERIES_DIR, name))
}

// 除算パターン: SQL テンプレート内で率計算を示唆する演算子の組み合わせ。
// - slash NULLIF(  — 0 除算回避付きの除算（典型的な率計算）
// - slash CASE WHEN — 条件分岐付きの除算
// 単独の slash はパス区切りなど偽陽性が多いので、上記の組み合わせのみを対象。
const DIVISION_PATTERNS: readonly RegExp[] = [/\/\s*NULLIF\s*\(/, /\/\s*CASE\s+WHEN/i]

// Rate alias 検出パターン。
// - SQL の AS "xxxRate" / AS "xxxrate" を禁止（率を返そうとしている）
// - 加重和を返す場合は Weighted suffix を付ける（AS "xxxRateWeighted" は許可）
// - negative lookahead で Weighted suffix を除外
const RATE_ALIAS_PATTERN = /AS\s+"[A-Za-z_]*Rate(?!Weighted)"/

interface Violation {
  readonly file: string
  readonly line: number
  readonly kind: 'division' | 'rate-alias'
  readonly text: string
}

function scanFile(file: string): readonly Violation[] {
  const content = fs.readFileSync(file, 'utf-8')
  const lines = content.split('\n')
  const violations: Violation[] = []

  // SQL 文字列は通常 template リテラル内にある。コメント行は除外。
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trimStart()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue
    if (trimmed.startsWith('import ')) continue

    for (const pattern of DIVISION_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          file: rel(file),
          line: i + 1,
          kind: 'division',
          text: line.trim().slice(0, 100),
        })
        break
      }
    }
    if (RATE_ALIAS_PATTERN.test(line)) {
      violations.push({
        file: rel(file),
        line: i + 1,
        kind: 'rate-alias',
        text: line.trim().slice(0, 100),
      })
    }
  }

  return violations
}

function formatViolations(violations: readonly Violation[]): string | undefined {
  if (violations.length === 0) return undefined
  const header = '[Phase 4] 自由期間 SQL で率計算 (除算 / AS Rate alias) が検出されました:'
  const details = violations.map(
    (v) => '  - ' + v.file + ':' + v.line + ' [' + v.kind + '] ' + v.text,
  )
  const footer = [
    '',
    '解決方法:',
    '  1. 除算を SQL から剥がし、加重和 (SUM(rate * weight)) のみを返す',
    '  2. alias は Weighted suffix を付ける（例: gpRateBudgetWeighted）',
    '  3. 率への変換は pure builder で weightedAverageRate() を使う',
    '  4. 根拠: references/01-principles/data-pipeline-integrity.md',
  ]
  return [header, ...details, ...footer].join('\n')
}

describe('自由期間 SQL 内 rate 計算禁止ガード (unify-period-analysis Phase 4)', () => {
  it('G4-1: freePeriod* infra query で除算 (/ NULLIF / CASE WHEN) が検出されない', () => {
    const files = collectFreePeriodSqlFiles()
    const allViolations: Violation[] = []
    for (const f of files) {
      const vs = scanFile(f).filter((v) => v.kind === 'division')
      allViolations.push(...vs)
    }
    expect(allViolations, formatViolations(allViolations)).toEqual([])
  })

  it('G4-2: freePeriod* infra query で AS "*Rate" alias が検出されない (Weighted suffix 必須)', () => {
    const files = collectFreePeriodSqlFiles()
    const allViolations: Violation[] = []
    for (const f of files) {
      const vs = scanFile(f).filter((v) => v.kind === 'rate-alias')
      allViolations.push(...vs)
    }
    expect(allViolations, formatViolations(allViolations)).toEqual([])
  })

  it('対象ファイルが 3 本以上ある (走査漏れ検出)', () => {
    // freePeriodFactQueries / freePeriodBudget / freePeriodDeptKPI の 3 本最低
    const files = collectFreePeriodSqlFiles()
    expect(files.length).toBeGreaterThanOrEqual(3)
  })

  it('freePeriodDeptKPI.ts が AS "*Weighted" alias を使っている (Phase 4 移行確認)', () => {
    const file = path.join(INFRA_QUERIES_DIR, 'freePeriodDeptKPI.ts')
    expect(fs.existsSync(file)).toBe(true)
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('gpRateBudgetWeighted')
    expect(content).toContain('gpRateActualWeighted')
    expect(content).toContain('markupRateWeighted')
    expect(content).toContain('discountRateWeighted')
  })

  it('weightedAverageRate helper が pure builder に存在する (移行先の実在確認)', () => {
    const builder = path.resolve(
      __dirname,
      '../../application/readModels/freePeriod/readFreePeriodDeptKPI.ts',
    )
    expect(fs.existsSync(builder)).toBe(true)
    const content = fs.readFileSync(builder, 'utf-8')
    expect(content).toContain('export function weightedAverageRate')
  })
})
