// useComparisonModule legacy caller ratchet-down guard
//
// unify-period-analysis Phase 6a → Phase 6b 移行保証:
// useComparisonModule は Phase 6a で externalScope パラメータ (4 番目引数)
// を受け取れるようになった。caller は 2 通りの signature を使える:
//
//   // legacy 3 引数 (内部で buildComparisonScope を呼ぶ)
//   useComparisonModule(periodSelection, elapsedDays, averageDailySales)
//
//   // Phase 6a 以降の 4 引数 (externalScope を pass-through、内部構築 skip)
//   useComparisonModule(periodSelection, elapsedDays, averageDailySales, frame.comparison)
//
// 本 guard は「legacy 3 引数 caller」を allowlist で固定 baseline 管理し、
// 以下を強制する:
//
//   1. allowlist に含まれない新規 caller は常に 4 引数版を使うこと
//   2. baseline は減少方向にのみ更新できること (ratchet-down)
//
// これにより後方互換が惰性で残ることを防ぎ、Phase 6b で残 caller を移行した
// 時点で baseline 0 に到達、最終的に legacy 3 引数 signature を削除できる。
//
// Phase 6a 時点 baseline: 2 件
//   - presentation/pages/Mobile/MobileDashboardPage.tsx
//   - presentation/pages/Insight/useInsightData.ts
//
// Phase 6a 新経路 (allowlist 不要):
//   - presentation/hooks/slices/useComparisonSlice.ts
//     → 4 引数で frame.comparison を渡す
//
// 詳細: projects/unify-period-analysis/HANDOFF.md §Phase 6b
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')

// Phase 6a 時点で legacy 3 引数 signature を使っている caller の allowlist。
//
// ratchet-down 履歴:
//   - Phase 6a 時点 (e148b9d): 2 件 (MobileDashboardPage / useInsightData)
//   - Phase 6b: 2 → 0 (両 caller を usePageComparisonModule 経由に移行、
//     内部で buildFreePeriodFrame + 4 引数 useComparisonModule を呼ぶ)
//
// baseline 0 到達。新規 caller は 4 引数版または usePageComparisonModule
// wrapper を使うこと。最終的に useComparisonModule の 3 引数 signature は
// 削除可能な状態になった (後続 commit で optional externalScope を required
// に昇格させる or wrapper を唯一の page-level entry として固定する)。
const LEGACY_CALLER_ALLOWLIST: readonly { readonly path: string; readonly reason: string }[] = []

const LEGACY_ALLOWLIST_PATHS = new Set(LEGACY_CALLER_ALLOWLIST.map((e) => e.path))

/**
 * 4 引数呼び出しを検出するパターン。`useComparisonModule(...,` に続く arg 数を
 * 単純な match で数える代わりに、「useComparisonModule(」を含むブロック内で
 * カンマ数をカウントする。安定性のため、明示的な 4 引数呼び出しは行末コメント
 * ではなく関数呼び出し全体を捕捉する必要がある。ここでは簡易ヒューリスティック:
 * 関数呼び出しが 4 行目以降まで続き、かつ 3 つ以上のカンマがあれば 4 引数版。
 */
interface CallSite {
  readonly file: string
  readonly line: number
  readonly argCount: number
  readonly snippet: string
}

function findUseComparisonModuleCalls(content: string): readonly CallSite[] {
  const lines = content.split('\n')
  const calls: CallSite[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // コメント行は除外
    const trimmed = line.trimStart()
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue
    // useComparisonModule( で始まる呼び出しを検出
    const match = line.match(/\buseComparisonModule\s*\(/)
    if (!match) continue
    // import / export 宣言 / 関数定義行は除外
    if (/\b(import|export|function\s+useComparisonModule)\b/.test(line)) continue

    // call site を行範囲で捕捉。matching ")" までを探す
    let depth = 0
    let commaCountAtDepth0 = 0
    let startCounting = false
    let endLine = i
    // 関数呼び出しの開始位置 (= `useComparisonModule(` の `(` を過ぎた位置) から
    // 末尾までの生テキストを蓄積し、trailing comma を検出できるようにする
    let bodyBuf = ''
    outer: for (let j = i; j < Math.min(i + 20, lines.length); j++) {
      const jLine = lines[j]
      for (const ch of jLine) {
        if (ch === '(') {
          depth++
          if (depth === 1) {
            startCounting = true
            continue
          }
        }
        if (ch === ')') {
          if (depth === 1 && startCounting) {
            depth--
            endLine = j
            break outer
          }
          depth--
          continue
        }
        if (startCounting && depth === 1) {
          bodyBuf += ch
          if (ch === ',') commaCountAtDepth0++
        }
      }
      if (startCounting && depth >= 1) bodyBuf += '\n'
    }
    // trailing comma (depth=1 の最後の非空白文字が `,` ) を検出して減算
    const trimmedBody = bodyBuf.replace(/\s+$/, '')
    const hasTrailingComma = trimmedBody.endsWith(',')
    const commaCount = hasTrailingComma ? commaCountAtDepth0 - 1 : commaCountAtDepth0
    // 引数数 = depth-1 のカンマ数 + 1 (空引数でなければ)
    const nonEmptyBody = trimmedBody.replace(/,$/, '').trim().length > 0
    const argCount = nonEmptyBody ? commaCount + 1 : 0
    const snippet = lines
      .slice(i, endLine + 1)
      .join(' ')
      .slice(0, 120)
    calls.push({ file: '', line: i + 1, argCount, snippet })
  }
  return calls
}

function isExcludedFile(relPath: string): boolean {
  if (relPath.includes('__tests__')) return true
  if (relPath.includes('.test.')) return true
  if (relPath.includes('.spec.')) return true
  return false
}

describe('useComparisonModule legacy 3 引数 caller ratchet-down guard (Phase 6a → 6b)', () => {
  it('G6-LCM: legacy 3 引数 caller は allowlist の範囲内に収まる', () => {
    const srcFiles = collectTsFiles(SRC_DIR)
    const violations: string[] = []

    for (const file of srcFiles) {
      const relPath = rel(file)
      if (isExcludedFile(relPath)) continue
      // 定義ファイル本体は除外
      if (
        relPath === 'features/comparison/application/hooks/useComparisonModule.ts' ||
        relPath === 'application/hooks/useComparisonModule.ts'
      )
        continue

      const content = fs.readFileSync(file, 'utf-8')
      const calls = findUseComparisonModuleCalls(content)
      for (const call of calls) {
        // 3 引数 = legacy, 4 引数 = Phase 6a+
        if (call.argCount <= 3) {
          if (LEGACY_ALLOWLIST_PATHS.has(relPath)) continue
          violations.push(relPath + ':' + call.line + ' (argCount=' + call.argCount + ')')
        }
      }
    }

    expect(
      violations,
      violations.length > 0
        ? [
            '[Phase 6b] useComparisonModule の legacy 3 引数 caller が allowlist 外で検出:',
            ...violations.map((v) => '  - ' + v),
            '',
            '解決方法:',
            '  1. caller が frame (FreePeriodAnalysisFrame) を持てるなら 4 引数版を使う:',
            '     useComparisonModule(periodSelection, elapsed, avgSales, frame.comparison)',
            '  2. page-level で frame がない場合、ctx.freePeriodLane.frame 経由に移行する',
            '  3. どうしても legacy が必要なら LEGACY_CALLER_ALLOWLIST に reason を添えて追加',
            '',
            '詳細: projects/unify-period-analysis/HANDOFF.md §Phase 6b',
          ].join('\n')
        : undefined,
    ).toEqual([])
  })

  it('LEGACY_CALLER_ALLOWLIST baseline: 0 件 (Phase 6b 完了、以後 0 固定)', () => {
    // Phase 6a 時点で 2 件、Phase 6b (本 commit) で全て移行完了。
    // 新規 caller は usePageComparisonModule wrapper または 4 引数版を使う。
    expect(LEGACY_CALLER_ALLOWLIST.length).toBe(0)
  })

  it('LEGACY_CALLER_ALLOWLIST の各 entry が実在ファイルを指している (orphan 検出)', () => {
    const missing: string[] = []
    for (const entry of LEGACY_CALLER_ALLOWLIST) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) missing.push(entry.path)
    }
    expect(missing, '存在しないファイル: ' + missing.join(', ')).toEqual([])
  })

  it('LEGACY_CALLER_ALLOWLIST の各 entry が実際に 3 引数 caller を含む (stale 検出)', () => {
    const noLonger: string[] = []
    for (const entry of LEGACY_CALLER_ALLOWLIST) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) continue
      const content = fs.readFileSync(abs, 'utf-8')
      const calls = findUseComparisonModuleCalls(content)
      const hasLegacy = calls.some((c) => c.argCount <= 3)
      if (!hasLegacy) noLonger.push(entry.path)
    }
    expect(
      noLonger,
      'allowlist に残っているが既に移行済みのファイル (削除推奨): ' + noLonger.join(', '),
    ).toEqual([])
  })

  it('non-legacy caller の代表: useComparisonSlice は 4 引数版を使っている', () => {
    const slice = path.join(SRC_DIR, 'presentation/hooks/slices/useComparisonSlice.ts')
    expect(fs.existsSync(slice)).toBe(true)
    const content = fs.readFileSync(slice, 'utf-8')
    const calls = findUseComparisonModuleCalls(content)
    expect(calls.length).toBeGreaterThan(0)
    // 少なくとも 1 つは 4 引数 (Phase 6a 移行済み)
    expect(calls.some((c) => c.argCount >= 4)).toBe(true)
  })
})
