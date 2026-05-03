/**
 * ComparisonResolvedRange Surface Guard
 *
 * unify-period-analysis Phase 3 封じ手: Phase 2b で導入した単一出力契約
 * `ComparisonResolvedRange` を **本当に単一の読み口**にするために、
 * presentation 層が `ComparisonScope` の内部フィールドを直接読むことを
 * 機械的に禁止する。
 *
 * ## 守る不変条件
 *
 * presentation / VM / chart 配下で以下のフィールドを `ComparisonScope` /
 * `scope` / `comparisonScope` から直接読むことを禁止する:
 *
 * - `alignmentMap` — 日付対応表。provenance.sourceDate 経由で参照する
 * - `effectivePeriod2` — scope 全体の比較期。provenance.comparisonRange 経由で参照する
 * - `queryRanges` — 読込対象月。widget が直接読む必要はない
 * - `sourceMonth` — scope の基準月。widget が直接読む必要はない
 *
 * ## 推奨経路
 *
 * presentation が読むべきなのは `ComparisonResolvedRange` の表面だけ:
 *
 * ```ts
 * // ✅ 良い: builder が返す contract を経由
 * const { comparison } = buildDateRanges({ ..., comparisonScope })
 * comparison.range                          // 比較先 DateRange
 * comparison.provenance.mode                // 'wow' | 'yoy'
 * comparison.provenance.mappingKind         // 'sameDate' | 'sameDayOfWeek' | 'previousWeek'
 * comparison.provenance.dowOffset           // number
 * comparison.provenance.fallbackApplied     // boolean
 * comparison.provenance.sourceDate          // scope.alignmentMap[0].sourceDayKey 由来
 * comparison.provenance.comparisonRange     // scope.effectivePeriod2 由来
 *
 * // ❌ 悪い: scope 内部を直接読む
 * ctx.comparisonScope?.alignmentMap[0]?.sourceDayKey
 * ctx.comparisonScope?.effectivePeriod2
 * ```
 *
 * ## 検出方法
 *
 * `scope\?\.alignmentMap` / `comparisonScope\.effectivePeriod2` のような
 * 「scope 変数経由のアクセス」を regex で検出する。ローカル変数名の偶発的
 * 一致（`const effectivePeriod2 = ...`、`sourceMonth: number` 型宣言など）
 * は `scope` / `comparisonScope` prefix を必須にすることで除外する。
 *
 * ## ratchet-down
 *
 * 現状の違反件数はベースラインとして凍結される。新規違反は即 fail。
 * ベースラインから減ったら allowlist を縮小する方向にのみ更新する。
 *
 * @see references/01-foundation/temporal-scope-semantics.md
 * @see app/src/domain/models/comparisonRangeResolver.ts ComparisonResolvedRange
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')

/**
 * scope 内部フィールドを presentation から直接読むことを許容するファイルの
 * allowlist。**Phase 5 完了時点で 0 件**。
 *
 * Phase 3 封じ手時点では `YoYChart.tsx` 1 件を allowlist していたが、
 * Phase 5 で `application/hooks/plans/buildYoyDailyInput.ts` pure builder
 * に scope 内部アクセスを集約し、widget を「存在判定 + builder pass-through」
 * のみに薄化したことで allowlist を空にできた。
 *
 * これが Phase 5 の chart 薄化パターンの見本実装:
 *   1. scope.X 直接アクセスを集めた application pure builder を作る
 *   2. widget は builder を呼ぶだけにする
 *   3. input 構築 + 描画の責務分離を保つ
 *
 * 新規追加は原則禁止。新しい chart を追加するときは最初から
 * builder 経由で実装する。
 */
const ALLOWLIST: readonly { readonly path: string; readonly reason: string }[] = []

const ALLOWLIST_PATHS = new Set(ALLOWLIST.map((e) => e.path))

/**
 * 禁止パターン — `scope` / `comparisonScope` 変数経由の ComparisonScope
 * 内部フィールドアクセス。
 *
 * - `\b(scope|comparisonScope)\s*\??\s*\.\s*(alignmentMap|effectivePeriod2|queryRanges|sourceMonth)\b`
 *
 * 例:
 *   - `scope?.alignmentMap` → 検出
 *   - `ctx.comparisonScope.effectivePeriod2` → 検出
 *   - `comparisonScope?.queryRanges` → 検出
 *
 * 除外:
 *   - `const effectivePeriod2 = ...` → prefix がないので検出されない
 *   - `prevYearMonthlyKpi.sourceMonth` → `scope` / `comparisonScope` ではないので検出されない
 *   - `sourceMonth: number` 型宣言 → 同上
 */
const FORBIDDEN_PATTERN =
  /\b(?:scope|comparisonScope)\s*\??\s*\.\s*(?:alignmentMap|effectivePeriod2|queryRanges|sourceMonth)\b/

function isCommentLine(line: string): boolean {
  const t = line.trimStart()
  return (
    t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('import type')
  )
}

function isExcludedFile(relPath: string): boolean {
  if (relPath.includes('__tests__')) return true
  if (relPath.includes('.test.')) return true
  if (relPath.includes('.spec.')) return true
  if (relPath.endsWith('.stories.ts') || relPath.endsWith('.stories.tsx')) return true
  return false
}

describe('ComparisonResolvedRange Surface Guard (unify-period-analysis Phase 3 封じ手)', () => {
  it('presentation 層で ComparisonScope 内部 (alignmentMap / effectivePeriod2 / queryRanges / sourceMonth) を scope 変数経由で直接読まない', () => {
    const presFiles = collectTsFiles(path.join(SRC_DIR, 'presentation'))
    const violations: string[] = []

    for (const file of presFiles) {
      const relPath = rel(file)
      if (isExcludedFile(relPath)) continue
      if (ALLOWLIST_PATHS.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (isCommentLine(line)) continue
        if (FORBIDDEN_PATTERN.test(line)) {
          violations.push(`${relPath}:${i + 1}: ${line.trim().slice(0, 120)}`)
        }
      }
    }

    expect(
      violations,
      violations.length > 0
        ? [
            '[Phase 3] presentation 層で ComparisonScope 内部フィールドを直接参照しています:',
            ...violations.map((v) => `  - ${v}`),
            '',
            '解決方法:',
            '  1. buildDateRanges() の返り値 comparison.range / comparison.provenance.* を使う',
            '  2. 必要な情報が contract に無ければ resolver 側で enrichResolvedRangeWithScope を拡張',
            '  3. どうしても直接参照が必要なら ALLOWLIST に reason を添えて追加（Phase 5 移行候補として記録）',
          ].join('\n')
        : undefined,
    ).toEqual([])
  })

  it('ALLOWLIST が baseline 0 件である (Phase 5 で縮退完了、以後 0 固定)', () => {
    // Phase 5 で YoYChart.tsx を buildYoyDailyInput 経由に移行し、allowlist を
    // 空にした。新規追加は原則禁止。
    expect(ALLOWLIST.length).toBe(0)
  })

  it('ALLOWLIST の各 entry が実在ファイルかつ実際に禁止パターンを含む (stale 検出)', () => {
    const orphans: string[] = []
    const noLongerMatching: string[] = []
    for (const entry of ALLOWLIST) {
      const abs = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(abs)) {
        orphans.push(entry.path)
        continue
      }
      const content = fs.readFileSync(abs, 'utf-8')
      const matches = content
        .split('\n')
        .some((line) => !isCommentLine(line) && FORBIDDEN_PATTERN.test(line))
      if (!matches) noLongerMatching.push(entry.path)
    }
    expect(orphans, `存在しないファイル: ${orphans.join(', ')}`).toEqual([])
    expect(
      noLongerMatching,
      `既に禁止パターンを含まないファイル (allowlist から削除してベースラインを下げてください): ${noLongerMatching.join(', ')}`,
    ).toEqual([])
  })

  it('ComparisonResolvedRange 型と enrichResolvedRangeWithScope 関数が存在する (contract の実在確認)', () => {
    const resolverPath = path.join(SRC_DIR, 'domain/models/comparisonRangeResolver.ts')
    expect(fs.existsSync(resolverPath), 'comparisonRangeResolver.ts が存在しない').toBe(true)
    const content = fs.readFileSync(resolverPath, 'utf-8')
    expect(content).toContain('export interface ComparisonResolvedRange')
    expect(content).toContain('export function enrichResolvedRangeWithScope')
  })
})
