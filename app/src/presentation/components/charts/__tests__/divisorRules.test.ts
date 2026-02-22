/**
 * アーキテクチャガードテスト — 除数算出の設計ルール準拠検証
 *
 * このテストはソースコードの**構造**を検査し、設計ルール違反を自動検出する。
 * ロジックの正しさではなく「ルールを守っていれば正しく動作する」ことを保証する。
 *
 * 検出する違反:
 *   RULE-1: computeDivisor を経由しないインライン除数算出
 *   RULE-2: レガシー API (pf.divisor / pf.divideByMode) の使用
 *   RULE-3: カレンダーベース除数 (countDowInRange) の除数用途での使用
 *   RULE-4: computeDivisor 以外での 0除算ガード（二重防御は設計違反の兆候）
 *
 * 知らない人が独自の組み方でコードを書いた場合、このテストが落ちて検出する。
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/* ── テスト対象ファイル定義 ───────────────────────── */

const CHARTS_DIR = path.resolve(__dirname, '..')

/**
 * usePeriodFilter を使用するチャートファイル一覧。
 * 新しいチャートを追加した場合、ここに追加すること。
 */
const CHART_FILES_USING_PERIOD_FILTER = [
  'TimeSlotSalesChart.tsx',
  'TimeSlotYoYComparisonChart.tsx',
  'TimeSlotHeatmapChart.tsx',
  'DeptHourlyPatternChart.tsx',
  'StoreTimeSlotComparisonChart.tsx',
  'CategorySalesBreakdownChart.tsx',
  'CategoryHierarchyExplorer.tsx',
] as const

/** PeriodFilter 本体（ルール定義元なので検査対象外） */
const PERIOD_FILTER_FILE = 'PeriodFilter.tsx'

function readChartFile(filename: string): string {
  return fs.readFileSync(path.join(CHARTS_DIR, filename), 'utf-8')
}

function readAllChartFiles(): { filename: string; content: string }[] {
  return CHART_FILES_USING_PERIOD_FILTER.map((f) => ({
    filename: f,
    content: readChartFile(f),
  }))
}

/* ── RULE-1: 除数は必ず computeDivisor() を経由する ──── */

describe('RULE-1: computeDivisor 経由の強制', () => {
  /**
   * インライン除数パターンの検出。
   * computeDivisor を使わず独自に除数を組み立てている箇所を検出する。
   *
   * 検出パターン:
   *   - `mode === 'total' ? 1 :`  (mode 分岐でインライン除数)
   *   - `days.size > 0 ? days.size : 1`  (safe division inline)
   *   - `.size > 0 ? .size : 1`  (general inline pattern)
   */
  const INLINE_DIVISOR_PATTERNS = [
    /mode\s*===\s*['"]total['"]\s*\?\s*1\s*:/,
    /\.size\s*>\s*0\s*\?\s*\S+\.size\s*:\s*1/,
    /cnt\s*>\s*0\s*\?\s*cnt\s*:\s*1/,
  ]

  for (const file of CHART_FILES_USING_PERIOD_FILTER) {
    it(`${file}: インライン除数パターンが存在しないこと`, () => {
      const content = readChartFile(file)
      // コメント行を除外して検査
      const codeLines = content
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*'))

      for (const pattern of INLINE_DIVISOR_PATTERNS) {
        const violatingLines = codeLines
          .map((line, i) => ({ line: line.trim(), num: i + 1 }))
          .filter(({ line }) => pattern.test(line))

        expect(
          violatingLines,
          `${file} にインライン除数パターンを検出:\n` +
          violatingLines.map((v) => `  L${v.num}: ${v.line}`).join('\n') +
          '\n→ computeDivisor() を使用してください',
        ).toHaveLength(0)
      }
    })
  }

  it('全チャートが computeDivisor を import していること', () => {
    for (const file of CHART_FILES_USING_PERIOD_FILTER) {
      const content = readChartFile(file)
      const hasImport = /import\s+\{[^}]*computeDivisor[^}]*\}\s+from\s+['"]\.\/PeriodFilter['"]/.test(content)
      expect(
        hasImport,
        `${file} が computeDivisor を import していません。\n` +
        '→ import { ..., computeDivisor } from \'./PeriodFilter\' を追加してください',
      ).toBe(true)
    }
  })
})

/* ── RULE-2: レガシー API の使用禁止 ─────────────── */

describe('RULE-2: レガシー API 使用禁止', () => {
  /**
   * pf.divisor / pf.divideByMode のチャートコード内での使用を検出。
   * PeriodFilter.tsx 内の定義・型定義は除外。
   */
  it('チャートコードに pf.divisor の使用がないこと', () => {
    for (const { filename, content } of readAllChartFiles()) {
      const codeLines = content
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*'))

      const violations = codeLines
        .map((line, i) => ({ line: line.trim(), num: i + 1 }))
        .filter(({ line }) => /pf\.divisor\b/.test(line) && !/pf\.divisor\s*,/.test(line))

      expect(
        violations,
        `${filename} に pf.divisor の使用を検出:\n` +
        violations.map((v) => `  L${v.num}: ${v.line}`).join('\n') +
        '\n→ computeDivisor(countDistinctDays(records), mode) を使用してください',
      ).toHaveLength(0)
    }
  })

  it('チャートコードに pf.divideByMode() の使用がないこと', () => {
    for (const { filename, content } of readAllChartFiles()) {
      const codeLines = content
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*'))

      const violations = codeLines
        .map((line, i) => ({ line: line.trim(), num: i + 1 }))
        .filter(({ line }) => /divideByMode\s*\(/.test(line))

      expect(
        violations,
        `${filename} に divideByMode() の使用を検出:\n` +
        violations.map((v) => `  L${v.num}: ${v.line}`).join('\n') +
        '\n→ Math.round(value / computeDivisor(...)) を使用してください',
      ).toHaveLength(0)
    }
  })
})

/* ── RULE-3: カレンダーベース除数の除数用途での使用禁止 ── */

describe('RULE-3: カレンダーベース除数の使用禁止', () => {
  it('チャートコードに countDowInRange の import がないこと', () => {
    for (const { filename, content } of readAllChartFiles()) {
      const hasCountDowImport = /import\s+\{[^}]*countDowInRange[^}]*\}/.test(content)
      expect(
        hasCountDowImport,
        `${filename} が countDowInRange を import しています。\n` +
        '→ 除数算出には computeDivisor / computeDowDivisorMap を使用してください。\n' +
        '   countDowInRange はカレンダーベースのレガシー関数です。',
      ).toBe(false)
    }
  })
})

/* ── RULE-4: 二重 0除算ガードの禁止 ─────────────── */

describe('RULE-4: 二重 0除算ガード禁止', () => {
  /**
   * computeDivisor の返り値に対して再度 Math.max や || 1 でガードしている
   * パターンを検出する。computeDivisor は >= 1 を保証しているため、
   * 二重ガードは設計を理解していない兆候。
   */
  const DOUBLE_GUARD_PATTERNS = [
    /Math\.max\s*\(\s*computeDivisor/,
    /computeDivisor\([^)]*\)\s*\|\|\s*1/,
    /computeDivisor\([^)]*\)\s*>\s*0\s*\?/,
  ]

  for (const file of CHART_FILES_USING_PERIOD_FILTER) {
    it(`${file}: computeDivisor に対する二重ガードがないこと`, () => {
      const content = readChartFile(file)
      for (const pattern of DOUBLE_GUARD_PATTERNS) {
        const match = content.match(pattern)
        expect(
          match,
          `${file} に computeDivisor への二重 0除算ガードを検出:\n` +
          `  "${match?.[0]}"\n` +
          '→ computeDivisor は常に >= 1 を返すため、追加ガードは不要です',
        ).toBeNull()
      }
    })
  }
})

/* ── チャートファイルの網羅性チェック ──────────────── */

describe('網羅性: usePeriodFilter 使用ファイルの管理', () => {
  it('usePeriodFilter を使用する全ファイルが CHART_FILES_USING_PERIOD_FILTER に登録されている', () => {
    // charts ディレクトリの全 .tsx ファイルを走査
    const allFiles = fs.readdirSync(CHARTS_DIR)
      .filter((f) => f.endsWith('.tsx') && f !== PERIOD_FILTER_FILE)

    const unregistered: string[] = []
    for (const file of allFiles) {
      const content = fs.readFileSync(path.join(CHARTS_DIR, file), 'utf-8')
      if (/usePeriodFilter/.test(content)) {
        if (!CHART_FILES_USING_PERIOD_FILTER.includes(file as typeof CHART_FILES_USING_PERIOD_FILTER[number])) {
          unregistered.push(file)
        }
      }
    }

    expect(
      unregistered,
      `以下のファイルが usePeriodFilter を使用していますが、\n` +
      `CHART_FILES_USING_PERIOD_FILTER に登録されていません:\n` +
      unregistered.map((f) => `  - ${f}`).join('\n') +
      '\n→ divisorRules.test.ts の CHART_FILES_USING_PERIOD_FILTER に追加してください。\n' +
      '   除数算出は computeDivisor() を使用し、設計ルールに従ってください。',
    ).toHaveLength(0)
  })

  it('CHART_FILES_USING_PERIOD_FILTER のファイルが全て存在すること', () => {
    for (const file of CHART_FILES_USING_PERIOD_FILTER) {
      const exists = fs.existsSync(path.join(CHARTS_DIR, file))
      expect(
        exists,
        `${file} が存在しません。ファイル名の変更・削除があった場合は\n` +
        'CHART_FILES_USING_PERIOD_FILTER を更新してください。',
      ).toBe(true)
    }
  })
})

/* ── PeriodFilter 本体のルール定義チェック ────────── */

describe('PeriodFilter.tsx: ルール定義元の健全性', () => {
  const pfContent = readChartFile(PERIOD_FILTER_FILE)

  it('computeDivisor が export されていること', () => {
    expect(/export\s+function\s+computeDivisor/.test(pfContent)).toBe(true)
  })

  it('countDistinctDays が export されていること', () => {
    expect(/export\s+function\s+countDistinctDays/.test(pfContent)).toBe(true)
  })

  it('computeDowDivisorMap が export されていること', () => {
    expect(/export\s+function\s+computeDowDivisorMap/.test(pfContent)).toBe(true)
  })

  it('computeDivisor が total モードで常に 1 を返す実装になっていること', () => {
    // computeDivisor 関数の本体を抽出して検証
    const funcMatch = pfContent.match(
      /export\s+function\s+computeDivisor[^{]*\{([\s\S]*?)\n\}/,
    )
    expect(funcMatch).not.toBeNull()
    const body = funcMatch![1]
    // "mode === 'total'" のチェックと "return 1" が含まれること
    expect(body).toMatch(/mode\s*===\s*['"]total['"]/)
    expect(body).toMatch(/return\s+1/)
  })

  it('computeDivisor が >= 1 保証の実装を持つこと', () => {
    const funcMatch = pfContent.match(
      /export\s+function\s+computeDivisor[^{]*\{([\s\S]*?)\n\}/,
    )
    expect(funcMatch).not.toBeNull()
    const body = funcMatch![1]
    // "distinctDayCount > 0" のチェックがあること
    expect(body).toMatch(/>\s*0/)
  })
})
