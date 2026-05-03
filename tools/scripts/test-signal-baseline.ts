/**
 * Test Signal Integrity — Baseline Collector
 *
 * Phase 3 着手前の baseline 採取スクリプト。
 * TSIG-TEST-01〜03 / TSIG-COMP-01〜03 の現状件数を採取し、
 * ratchet-down baseline を決定するための観測データを生成する。
 *
 * 出力先: references/04-tracking/generated/test-signal-baseline.md
 *
 * 使い方:
 *   cd app && npx tsx ../tools/scripts/test-signal-baseline.ts
 *
 * 設計原則:
 * - read-only スクリプト（実コードを変更しない）
 * - 過剰検知より under-count を優先（false positive を増やさない）
 * - 結果は markdown と JSON の両方に出力（人間 + collector の両方が読める）
 *
 * 関連:
 * - references/01-foundation/test-signal-integrity.md (TSIG-TEST / TSIG-COMP の定義)
 * - projects/test-signal-integrity/checklist.md Phase 3 (本 script は最初の checkbox の実行手段)
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

// ---------------------------------------------------------------------------
// パス設定
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(__dirname, '../..')
const APP_SRC = resolve(REPO_ROOT, 'app/src')
const E2E_DIR = resolve(REPO_ROOT, 'app/e2e')
const OUTPUT_DIR = resolve(REPO_ROOT, 'references/04-tracking/generated')
const OUTPUT_MD = resolve(OUTPUT_DIR, 'test-signal-baseline.md')
const OUTPUT_JSON = resolve(OUTPUT_DIR, 'test-signal-baseline.json')

// ---------------------------------------------------------------------------
// 検出パターン
// ---------------------------------------------------------------------------

interface RuleHit {
  readonly file: string
  readonly line: number
  readonly snippet: string
}

interface RuleResult {
  readonly id: string
  readonly label: string
  readonly hits: readonly RuleHit[]
  readonly scannedFiles: number
}

/**
 * TSIG-TEST-01: existence-only assertion
 * 検出: it() 内で expect(x).toBeDefined() / toBeTruthy() のみで終わるパターン
 *
 * 簡易検出: 1 つの it() ブロック内で assertion が 1 つだけかつそれが
 * toBeDefined / toBeTruthy / toBeNull の場合のみ violation 候補。
 *
 * Note: AST を使わない簡易 line-based scan のため過剰検知を避ける方針。
 *       「明らかに existence-only」のみ拾う。
 */
function detectTSigTest01(content: string, file: string): RuleHit[] {
  const hits: RuleHit[] = []
  const lines = content.split('\n')

  // it('...', () => { expect(x).toBeDefined() }) を 1 行で書くパターン
  const oneLinerPattern =
    /it\([^,]+,\s*\(\)\s*=>\s*\{\s*expect\([^)]+\)\.(toBeDefined|toBeTruthy|toBeNull)\(\)\s*\}\)/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (oneLinerPattern.test(line)) {
      hits.push({ file, line: i + 1, snippet: line.trim() })
    }
  }

  // 複数行版: it() ブロック内で expect が 1 つだけかつ toBeDefined のみ
  // 簡易実装: 1 it ブロック (it( ... }) ) を抽出し中の expect 数を数える
  // false negative より false positive を避けるため、過剰検知しない方向で実装
  const itBlockPattern = /(?:^|\n)\s*(?:it|test)\([^,]+,\s*(?:async\s*)?\(\)\s*=>\s*\{/g
  let match: RegExpExecArray | null
  while ((match = itBlockPattern.exec(content)) !== null) {
    const blockStart = match.index + match[0].length
    // 対応する閉じ } を簡易検出 (depth count)
    let depth = 1
    let end = blockStart
    while (end < content.length && depth > 0) {
      const ch = content[end]
      if (ch === '{') depth++
      else if (ch === '}') depth--
      end++
    }
    const block = content.slice(blockStart, end - 1)
    const expects = block.match(/expect\(/g) ?? []
    if (expects.length !== 1) continue
    if (
      /expect\([^)]+\)\.(toBeDefined|toBeTruthy|toBeNull)\(\)/.test(block) &&
      !/expect\([^)]+\)\.(toBe|toEqual|toMatch|toThrow|toContain|toHaveLength|toHaveBeenCalled)/.test(
        block,
      )
    ) {
      const lineNum = content.slice(0, match.index).split('\n').length
      hits.push({
        file,
        line: lineNum,
        snippet: lines[lineNum - 1]?.trim() ?? '',
      })
    }
  }

  return dedupeHits(hits)
}

/**
 * TSIG-TEST-02: render-only / import-only superficial test
 * 検出: it() 内が render(...).not.toThrow() のみ、import 成功のみ等
 */
function detectTSigTest02(content: string, file: string): RuleHit[] {
  const hits: RuleHit[] = []
  const lines = content.split('\n')

  const renderOnly =
    /it\([^,]+,\s*(?:async\s*)?\(\)\s*=>\s*\{\s*expect\(\(\)\s*=>\s*render\([^)]*\)\)\.not\.toThrow\(\)\s*\}\)/
  const mountOnly =
    /it\([^,]+,\s*(?:async\s*)?\(\)\s*=>\s*\{\s*expect\(\(\)\s*=>\s*mount\([^)]*\)\)\.not\.toThrow\(\)\s*\}\)/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (renderOnly.test(line) || mountOnly.test(line)) {
      hits.push({ file, line: i + 1, snippet: line.trim() })
    }
  }

  return hits
}

/**
 * TSIG-TEST-03: snapshot-only superficial test
 * 検出: it() 内に toMatchSnapshot のみがあり他の expect がない
 */
function detectTSigTest03(content: string, file: string): RuleHit[] {
  const hits: RuleHit[] = []

  const itBlockPattern = /(?:^|\n)\s*(?:it|test)\([^,]+,\s*(?:async\s*)?\(\)\s*=>\s*\{/g
  let match: RegExpExecArray | null
  while ((match = itBlockPattern.exec(content)) !== null) {
    const blockStart = match.index + match[0].length
    let depth = 1
    let end = blockStart
    while (end < content.length && depth > 0) {
      const ch = content[end]
      if (ch === '{') depth++
      else if (ch === '}') depth--
      end++
    }
    const block = content.slice(blockStart, end - 1)
    const expects = block.match(/expect\(/g) ?? []
    const snapshots = block.match(/toMatchSnapshot|toMatchInlineSnapshot/g) ?? []
    if (snapshots.length > 0 && expects.length === snapshots.length) {
      const lineNum = content.slice(0, match.index).split('\n').length
      const lines = content.split('\n')
      hits.push({
        file,
        line: lineNum,
        snippet: lines[lineNum - 1]?.trim() ?? '',
      })
    }
  }

  return hits
}

/**
 * TSIG-COMP-01: rationale-free @ts-ignore / @ts-expect-error
 * 検出: 同一行 / 直前行に "reason:" を含まない suppression
 */
function detectTSigComp01(content: string, file: string): RuleHit[] {
  const hits: RuleHit[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!/@ts-ignore|@ts-expect-error/.test(line)) continue

    // 同一行に reason: を含む or 直前 3 行以内に reason: を含むなら OK
    const sameLineOk = /reason:/i.test(line)
    const prevLines = lines.slice(Math.max(0, i - 3), i).join('\n')
    const prevOk = /reason:/i.test(prevLines)

    if (!sameLineOk && !prevOk) {
      hits.push({ file, line: i + 1, snippet: line.trim() })
    }
  }

  return hits
}

/**
 * TSIG-COMP-02: rationale-free eslint-disable
 * 検出: eslint-disable に reason: が無いケース
 */
function detectTSigComp02(content: string, file: string): RuleHit[] {
  const hits: RuleHit[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!/eslint-disable/.test(line)) continue

    const sameLineOk = /reason:/i.test(line)
    const prevLines = lines.slice(Math.max(0, i - 3), i).join('\n')
    const prevOk = /reason:/i.test(prevLines)

    if (!sameLineOk && !prevOk) {
      hits.push({ file, line: i + 1, snippet: line.trim() })
    }
  }

  return hits
}

/**
 * TSIG-COMP-03: unused suppress escape
 * 検出: function 引数 / destructured 変数で _ プレフィックスのみで rename されたケース
 *
 * 簡易実装: function 定義 / arrow function の引数で _xxx を 2 つ以上含むパターン
 *           (= 「複数の引数を捨てている」=「責務整理 or signature 削減すべき」候補)
 */
function detectTSigComp03(content: string, file: string): RuleHit[] {
  const hits: RuleHit[] = []
  const lines = content.split('\n')

  // function fn(_a, _b, ...) や (_a, _b, ...) => {...} のパターン
  // 単独の _xxx は callback signature 互換性で必要なケースが多いので除外、
  // 2 つ以上の連続 _ プレフィックス引数を持つ場合のみ拾う
  const multiUnderscorePattern = /\(\s*_[A-Za-z][A-Za-z0-9_]*\s*[:,][^)]*?,\s*_[A-Za-z]/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (multiUnderscorePattern.test(line)) {
      hits.push({ file, line: i + 1, snippet: line.trim() })
    }
  }

  return hits
}

// ---------------------------------------------------------------------------
// ファイル走査
// ---------------------------------------------------------------------------

function dedupeHits(hits: RuleHit[]): RuleHit[] {
  const seen = new Set<string>()
  const result: RuleHit[] = []
  for (const h of hits) {
    const key = `${h.file}:${h.line}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(h)
  }
  return result
}

function collectFiles(dir: string, predicate: (file: string) => boolean): string[] {
  if (!existsSync(dir)) return []
  const result: string[] = []
  const stack = [dir]
  while (stack.length > 0) {
    const cur = stack.pop()!
    let entries: ReturnType<typeof readdirSync>
    try {
      entries = readdirSync(cur, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const full = join(cur, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue
        stack.push(full)
      } else if (entry.isFile() && predicate(full)) {
        result.push(full)
      }
    }
  }
  return result
}

/**
 * 除外パス — 検出対象として不適切なファイル
 *
 * これらのファイルは Test Signal Integrity の **検出ルール自体** を実装している
 * ため、文字列リテラルとして "eslint-disable" や "@ts-ignore" を含む。
 * これらは実際の suppression ではないので baseline / hard gate の対象外。
 */
const EXCLUDED_FILES = new Set([
  'app/src/test/guards/codePatternGuard.test.ts',
  'app/src/test/guards/testSignalIntegrityGuard.test.ts',
  'tools/scripts/test-signal-baseline.ts',
])

const isExcluded = (file: string): boolean => {
  const rel = relative(REPO_ROOT, file).replace(/\\/g, '/')
  return EXCLUDED_FILES.has(rel)
}

const isTestFile = (f: string): boolean =>
  (/\.(test|spec)\.(ts|tsx)$/.test(f) || /__tests__\/.+\.(ts|tsx)$/.test(f)) && !isExcluded(f)

const isTsFile = (f: string): boolean =>
  /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts') && !isExcluded(f)

// ---------------------------------------------------------------------------
// 集計
// ---------------------------------------------------------------------------

function runRule(
  id: string,
  label: string,
  files: string[],
  detector: (content: string, file: string) => RuleHit[],
): RuleResult {
  const hits: RuleHit[] = []
  for (const file of files) {
    let content: string
    try {
      content = readFileSync(file, 'utf-8')
    } catch {
      continue
    }
    const fileHits = detector(content, file).map((h) => ({
      ...h,
      file: relative(REPO_ROOT, h.file),
    }))
    hits.push(...fileHits)
  }
  return { id, label, hits, scannedFiles: files.length }
}

function main(): void {
  console.log('[test-signal-baseline] Scanning repository...')

  const testFiles = [
    ...collectFiles(APP_SRC, isTestFile),
    ...collectFiles(E2E_DIR, (f) => /\.spec\.ts$/.test(f)),
  ]
  const allTsFiles = collectFiles(APP_SRC, isTsFile)

  console.log(`[test-signal-baseline] ${testFiles.length} test files, ${allTsFiles.length} ts files`)

  const results: RuleResult[] = [
    runRule('TSIG-TEST-01', 'existence-only assertion', testFiles, detectTSigTest01),
    runRule('TSIG-TEST-02', 'render-only / mount-only smoke', testFiles, detectTSigTest02),
    runRule('TSIG-TEST-03', 'snapshot-only superficial', testFiles, detectTSigTest03),
    runRule(
      'TSIG-COMP-01',
      'rationale-free @ts-ignore / @ts-expect-error',
      allTsFiles,
      detectTSigComp01,
    ),
    runRule('TSIG-COMP-02', 'rationale-free eslint-disable', allTsFiles, detectTSigComp02),
    runRule('TSIG-COMP-03', 'unused suppress escape (multi-underscore)', allTsFiles, detectTSigComp03),
  ]

  // Markdown 出力
  const md = buildMarkdown(results)
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })
  writeFileSync(OUTPUT_MD, md, 'utf-8')

  // JSON 出力
  const json = JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      scannedTestFiles: testFiles.length,
      scannedTsFiles: allTsFiles.length,
      rules: results.map((r) => ({
        id: r.id,
        label: r.label,
        count: r.hits.length,
        sampleHits: r.hits.slice(0, 5),
      })),
    },
    null,
    2,
  )
  writeFileSync(OUTPUT_JSON, json + '\n', 'utf-8')

  console.log(`[test-signal-baseline] Wrote: ${relative(REPO_ROOT, OUTPUT_MD)}`)
  console.log(`[test-signal-baseline] Wrote: ${relative(REPO_ROOT, OUTPUT_JSON)}`)
  console.log()
  console.log('Summary:')
  for (const r of results) {
    console.log(`  ${r.id} ${r.label}: ${r.hits.length} violations`)
  }
}

function buildMarkdown(results: readonly RuleResult[]): string {
  const lines: string[] = []
  lines.push('# Test Signal Integrity — Phase 3 Baseline')
  lines.push('')
  lines.push('> **生成元:** `tools/scripts/test-signal-baseline.ts`')
  lines.push('> **目的:** Phase 3 hard gate 投入前の現状件数採取と ratchet-down baseline 決定')
  lines.push('> **読み方:** 各 ruleId の現在件数 = ratchet-down の起点。新規追加が 0 に向かうように guard を投入する。')
  lines.push('')
  lines.push(`> 生成: ${new Date().toISOString()}`)
  lines.push('')
  lines.push('## サマリ')
  lines.push('')
  lines.push('| ruleId | label | 件数 | 取扱 |')
  lines.push('|---|---|---|---|')
  for (const r of results) {
    const treatment = r.hits.length === 0 ? '✅ baseline 0 (新規も block)' : `⚠ ratchet-down baseline = ${r.hits.length}`
    lines.push(`| \`${r.id}\` | ${r.label} | **${r.hits.length}** | ${treatment} |`)
  }
  lines.push('')
  lines.push('## 詳細')
  lines.push('')
  for (const r of results) {
    lines.push(`### ${r.id}: ${r.label}`)
    lines.push('')
    lines.push(`走査対象ファイル数: ${r.scannedFiles}`)
    lines.push(`検出件数: **${r.hits.length}**`)
    lines.push('')
    if (r.hits.length === 0) {
      lines.push('検出 0 件。hard gate を baseline 0 で投入可能。')
    } else {
      lines.push('代表ファイル（最大 10 件）:')
      lines.push('')
      lines.push('```')
      for (const h of r.hits.slice(0, 10)) {
        lines.push(`${h.file}:${h.line}  ${h.snippet.slice(0, 80)}`)
      }
      lines.push('```')
      if (r.hits.length > 10) {
        lines.push('')
        lines.push(`...他 ${r.hits.length - 10} 件`)
      }
    }
    lines.push('')
  }
  lines.push('## 次のアクション (Phase 3 残作業)')
  lines.push('')
  lines.push('1. ✅ baseline 採取 (本ファイル生成) — 完了')
  lines.push('2. G3 allowlist を `app/src/test/allowlists/signalIntegrity.ts` に切り出し')
  lines.push('3. TSIG-TEST-01 (existence-only) hard gate を実装 + ratchet-down baseline 設定')
  lines.push('4. AR-G3-SUPPRESS rationale enforcement 拡張 (TSIG-COMP-01/02 統合)')
  lines.push('5. TSIG-COMP-03 (multi-underscore) 新規 hard gate 実装')
  lines.push('6. 各 guard を `renderAagResponse()` 経由の固定フォーマットに接続')
  lines.push('')
  return lines.join('\n')
}

main()
