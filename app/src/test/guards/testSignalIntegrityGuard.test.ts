/**
 * Test Signal Integrity Guard — 品質シグナル保全の機械的検出
 *
 * 上位原則: references/01-principles/test-signal-integrity.md
 * 関連 project: projects/test-signal-integrity Phase 3
 *
 * @guard G1 ルールはテストに書く（TSIG-TEST-01: existence-only assertion 禁止）
 *
 * 保護対象:
 * - H1 False Green: 本質的な品質改善がないのに Green に見える状態
 * - H2 Review Misleading: レビュアーが品質確保されたと誤認する状態
 *
 * 検出ロジック:
 * - it() / test() 1 ブロック内で expect が 1 つだけ
 * - その expect が toBeDefined / toBeTruthy / toBeNull のいずれかで終わる
 * - 他の意味的 assertion (toBe, toEqual, toMatch, toThrow 等) を含まない
 *
 * 許容例外 (EX-01: 公開契約 helper existence test):
 * - 同一 file の別 test で挙動検証されている場合は許容（手動レビュー）
 * - 機械的判定が困難なため、初期は allowlist で個別管理する
 *
 * @see app/src/test/allowlists/signalIntegrity.ts
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, collectTestFiles, rel } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage } from '../architectureRules'
import { g3SuppressAllowlist } from '../allowlists'

// ─── 検出対象から除外するファイル ──────────────────────────
//
// このガード自身 / baseline 採取スクリプトは、検出対象パターンを文字列
// リテラルとして含むため除外する。
const EXCLUDED_FILES = new Set(['test/guards/testSignalIntegrityGuard.test.ts'])

const isExcluded = (relPath: string): boolean => EXCLUDED_FILES.has(relPath)

// ─── TSIG-TEST-01: existence-only assertion 検出 ──────────────

/**
 * TSIG-TEST-01 legacy baseline (Phase 3 観測期間で発見した既存違反数)
 *
 * 2026-04-13 に 2 つの bug fix を適用した結果、過去の false negative で
 * 隠れていた legacy violations が炙り出された:
 * 1. hasMeaningfulMatcher 正規表現の substring match bug (`toBe` が
 *    `toBeDefined` の prefix としてマッチ)
 * 2. existence-only matcher リストに `toBeNull` を誤って含めていた
 *
 * 11 件の legacy violations は主に `expect(x).toBeTruthy()` / `toBeDefined()`
 * の borderline assertion (find predicate に contract がある等)。一括修正は
 * scope 過多のため ratchet-down baseline 方式で許容し、新規追加は block する。
 *
 * **減らせたら本定数を更新してベースラインを下げる**。
 * 増える方向の変更は本 guard によって FAIL する。
 */
const TSIG_TEST_01_LEGACY_BASELINE = 11

describe('TSIG-TEST-01: existence-only assertion がない', () => {
  it('existence-only assertion 違反が legacy baseline を超えない (ratchet-down)', () => {
    const testFiles = collectTestFiles(SRC_DIR)
    const violations: string[] = []

    // 構造的検知パターン:
    // 1. 1-liner: it('...', () => { expect(x).toBeDefined() })
    // 2. multi-line: it() ブロック内に expect が 1 つだけ + 上記 matcher のみ
    //
    // 検出対象 matcher: toBeDefined / toBeTruthy のみ (principle 定義準拠)
    // FIXED 2026-04-13 (Phase 3 観測期間で発見): toBeNull は当初の実装で誤って
    // 含めていたが、`toBeNull()` は「value === null」を検証する meaningful な
    // 契約チェック (= `toBe(null)` と等価) であり、existence-only ではない。
    // references/01-principles/test-signal-integrity.md TSIG-TEST-01 の定義は
    // toBeDefined / toBeTruthy / typeof のみ。
    const oneLinerPattern =
      /(?:it|test)\(\s*['"`][^'"`]+['"`]\s*,\s*(?:async\s*)?\(\)\s*=>\s*\{\s*expect\([^)]+\)\.(?:toBeDefined|toBeTruthy)\(\)\s*\}\s*\)/

    const itBlockPattern =
      /(?:^|\n)\s*(?:it|test)\(\s*['"`][^'"`]+['"`]\s*,\s*(?:async\s*)?\(\)\s*=>\s*\{/g

    for (const file of testFiles) {
      const relPath = rel(file)
      if (isExcluded(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')

      // Pass 1: 1-liner pattern
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (oneLinerPattern.test(lines[i])) {
          violations.push(`${relPath}:${i + 1}: ${lines[i].trim().slice(0, 100)}`)
        }
      }

      // Pass 2: multi-line it() blocks
      let match: RegExpExecArray | null
      itBlockPattern.lastIndex = 0
      while ((match = itBlockPattern.exec(content)) !== null) {
        const blockStart = match.index + match[0].length
        // 対応する閉じ } を depth count で検出
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

        // 1 つだけの expect が toBeDefined / toBeTruthy のみか？
        // FIXED 2026-04-13 (詳細は oneLinerPattern コメント参照): toBeNull は除外
        const hasExistenceOnly = /expect\([^)]+\)\.(?:toBeDefined|toBeTruthy)\(\)/.test(block)
        // FIXED 2026-04-13 (Phase 3 観測期間で発見): alternatives の後ろに
        // `\(` を必須化して word boundary を作る。これがないと `toBe` が
        // `toBeDefined` の prefix としてマッチして false negative になり、
        // existence-only assertion を「意味的 matcher を持つ」と誤判定する
        const hasMeaningfulMatcher =
          /expect\([^)]+\)\.(?:toBe|toEqual|toMatch|toThrow|toContain|toHaveLength|toHaveBeenCalled|toBeGreaterThan|toBeLessThan|toBeCloseTo)\(/.test(
            block,
          )

        if (hasExistenceOnly && !hasMeaningfulMatcher) {
          const lineNum = content.slice(0, match.index).split('\n').length
          const lineText = lines[lineNum - 1]?.trim() ?? ''
          // 1-liner pass で既に拾われたものを除外
          const dupKey = `${relPath}:${lineNum}`
          if (!violations.some((v) => v.startsWith(dupKey))) {
            violations.push(`${dupKey}: ${lineText.slice(0, 100)}`)
          }
        }
      }
    }

    const message =
      `[AR-TSIG-TEST-01] existence-only assertion violations: ${violations.length} ` +
      `(legacy baseline: ${TSIG_TEST_01_LEGACY_BASELINE})\n` +
      `${formatViolationMessage(getRuleById('AR-TSIG-TEST-01')!, violations)}\n` +
      `\n本 baseline は Phase 3 観測期間 (2026-04-13) で炙り出された legacy 11 件を許容している。\n` +
      `新規追加された違反は block される。減らせたら TSIG_TEST_01_LEGACY_BASELINE を更新する。`
    expect(violations.length, message).toBeLessThanOrEqual(TSIG_TEST_01_LEGACY_BASELINE)
  })

  it('legacy baseline が現状より大きすぎない (ratchet-down が stale していない)', () => {
    const testFiles = collectTestFiles(SRC_DIR)
    const violations: string[] = []

    const oneLinerPattern =
      /(?:it|test)\(\s*['"`][^'"`]+['"`]\s*,\s*(?:async\s*)?\(\)\s*=>\s*\{\s*expect\([^)]+\)\.(?:toBeDefined|toBeTruthy)\(\)\s*\}\s*\)/

    const itBlockPattern =
      /(?:^|\n)\s*(?:it|test)\(\s*['"`][^'"`]+['"`]\s*,\s*(?:async\s*)?\(\)\s*=>\s*\{/g

    for (const file of testFiles) {
      const relPath = rel(file)
      if (isExcluded(relPath)) continue
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (oneLinerPattern.test(lines[i])) {
          violations.push(`${relPath}:${i + 1}`)
        }
      }
      let match: RegExpExecArray | null
      itBlockPattern.lastIndex = 0
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
        if (expects.length !== 1) continue
        const hasExistenceOnly = /expect\([^)]+\)\.(?:toBeDefined|toBeTruthy)\(\)/.test(block)
        const hasMeaningfulMatcher =
          /expect\([^)]+\)\.(?:toBe|toEqual|toMatch|toThrow|toContain|toHaveLength|toHaveBeenCalled|toBeGreaterThan|toBeLessThan|toBeCloseTo)\(/.test(
            block,
          )
        if (hasExistenceOnly && !hasMeaningfulMatcher) {
          const lineNum = content.slice(0, match.index).split('\n').length
          const dupKey = `${relPath}:${lineNum}`
          if (!violations.some((v) => v === dupKey)) {
            violations.push(dupKey)
          }
        }
      }
    }

    const slack = TSIG_TEST_01_LEGACY_BASELINE - violations.length
    const message =
      `TSIG_TEST_01_LEGACY_BASELINE (${TSIG_TEST_01_LEGACY_BASELINE}) が現在の violations 数 (${violations.length}) より ${slack} 件多い。\n` +
      `baseline を ${violations.length} に下げてください (ratchet-down の更新)。\n` +
      `app/src/test/guards/testSignalIntegrityGuard.test.ts の TSIG_TEST_01_LEGACY_BASELINE を更新する。`
    expect(slack, message).toBeLessThan(5)
  })
})

// ─── AR-G3-SUPPRESS-RATIONALE: 構造化 rationale 必須 ──────────────
//
// 上位原則: references/01-principles/test-signal-integrity.md
// 関連項目: TSIG-COMP-01 / TSIG-COMP-02
//
// AR-G3-SUPPRESS の拡張ルール。allowlist 登録された suppression は、
// allowlist エントリ (signalIntegrity.ts) と source code コメントの両方で
// 構造化された reason: / removalCondition: を持つことを必須化する。
//
// 新規 guard ではなく既存 G3 family の拡張として実装することで、
// 「黙らせる手段」を構造化された rationale enforcement に格上げする。

describe('AR-G3-SUPPRESS-RATIONALE: allowlist 登録ファイルの構造化 rationale', () => {
  it('g3SuppressAllowlist 全 entries が reason / removalCondition を持つ (allowlist メタデータ)', () => {
    const violations: string[] = []
    for (const entry of g3SuppressAllowlist) {
      if (!entry.reason || entry.reason.length < 20) {
        violations.push(`${entry.path}: reason が短すぎる (20 文字未満)`)
      }
      if (!entry.removalCondition || entry.removalCondition.length < 20) {
        violations.push(`${entry.path}: removalCondition が短すぎる (20 文字未満)`)
      }
    }
    expect(
      violations,
      `AR-G3-SUPPRESS-RATIONALE: 構造化 rationale が不足しています:\n${violations.join('\n')}\n` +
        '修正: app/src/test/allowlists/signalIntegrity.ts の対象 entry に reason: と' +
        ' removalCondition: を 20 文字以上で追記してください',
    ).toEqual([])
  })

  it('g3SuppressAllowlist 全 entries の source file に reason: / removalCondition: コメントが存在する', () => {
    const violations: string[] = []
    for (const entry of g3SuppressAllowlist) {
      const filePath = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(filePath)) {
        violations.push(`${entry.path}: ファイルが存在しない (allowlist の path が古い可能性)`)
        continue
      }
      const content = fs.readFileSync(filePath, 'utf-8')
      // reason: と removalCondition: の両方がコメント内に存在することを確認
      // (改行を跨ぐ複数行コメントでも検出可能)
      if (!/reason:/i.test(content)) {
        violations.push(
          `${entry.path}: source code に "reason:" コメントが見つからない` +
            ' (allowlist 登録された suppression は構造化 rationale を必須とする)',
        )
      }
      if (!/removalCondition:/i.test(content)) {
        violations.push(
          `${entry.path}: source code に "removalCondition:" コメントが見つからない` +
            ' (allowlist 登録された suppression は削除条件の明示を必須とする)',
        )
      }
    }
    expect(
      violations,
      `AR-G3-SUPPRESS-RATIONALE: source code rationale が不足しています:\n${violations.join('\n')}\n` +
        '修正: 該当ファイルの suppression コメントに以下を追記してください:\n' +
        '  // reason: <なぜ抑制が必要か>\n' +
        '  // removalCondition: <いつ削除可能になるか>\n' +
        '構造化フォーマットは references/01-principles/test-signal-integrity.md EX-03 を参照',
    ).toEqual([])
  })
})

// ─── TSIG-COMP-03: unused suppress escape (multi-underscore) ──────────────
//
// 上位原則: references/01-principles/test-signal-integrity.md
//
// 関数引数で _ プレフィックスを 2 つ以上連続持つパターンを禁止する。
// 単独の _xxx は callback signature 互換性で必要なケースが多いので除外。
// 2 つ以上は「責務整理 or signature 削減」で解決すべき候補。

describe('TSIG-COMP-03: unused suppress escape (multi-underscore)', () => {
  it('関数引数に _ プレフィックスを 2 つ以上連続持つパターンがない', () => {
    const violations: string[] = []

    // 2 つ以上の連続 _ プレフィックス引数を持つ pattern
    const multiUnderscorePattern = /\(\s*_[A-Za-z][A-Za-z0-9_]*\s*[:,][^)]*?,\s*_[A-Za-z]/

    const dirs = ['domain', 'application', 'infrastructure', 'presentation']
    for (const dirName of dirs) {
      const dir = path.join(SRC_DIR, dirName)
      const files = collectTsFiles(dir)
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (multiUnderscorePattern.test(lines[i])) {
            violations.push(`${rel(file)}:${i + 1}: ${lines[i].trim().slice(0, 100)}`)
          }
        }
      }
    }

    expect(violations, formatViolationMessage(getRuleById('AR-TSIG-COMP-03')!, violations)).toEqual(
      [],
    )
  })
})

// ─── TSIG-TEST-04: tautology assertion 検出 ──────────────
//
// 上位原則: references/01-principles/test-signal-integrity.md
//
// 常に true となる比較を禁止する。観測期間中 (Wave 1〜7) に 9+ 件発見され、
// AR-TSIG-TEST-04 として昇格。
//
// 検出パターン:
// 1. expect(<expr>.length).toBeGreaterThanOrEqual(0) — Array/String length は常に >= 0
// 2. expect(<expr>.size).toBeGreaterThanOrEqual(0) — Map/Set size は常に >= 0
// 3. expect(true).toBe(true) — リテラル恒真比較
// 4. expect(false).toBe(false) — リテラル恒真比較
//
// 除外:
// - コメント行 (`//` または `*` で始まる行)
// - 本 guard 自身 (検出パターンを文字列として含むため)
//
// EXCLUDED_FILES に追加された file は guard 全体から除外される (本 guard
// 自身) が、TSIG-TEST-04 では追加で「guard test 内の `expect(true).toBe(true)`」
// を除外する。これは guard test が console.log 等の side-effect を assertion
// する際の慣用パターンであり、意味的に「副作用が起こったこと」を assert している。
//
// 参考: architectureRuleGuard.test.ts 等の `expect(true).toBe(true)` は
// console.log で audit 情報を出力した後の placeholder assertion として
// 使用されている (12 件)。これらは Phase 3 観測期間中に発見された legacy
// pattern として ratchet-down baseline で許容する。

/**
 * TSIG-TEST-04 legacy baseline (Wave 1〜7 観測期間で発見した既存違反数)
 *
 * 内訳:
 * - architectureRuleGuard.test.ts: 12 件 (audit console.log 後の placeholder)
 * - useCostDetailData.helpers.test.ts: 1 件 (`result.length >= 0`)
 * - divisorRules.test.ts: 1 件
 * - dbHelpers.test.ts: 1 件
 * - responsibilityTagGuard.test.ts: 1 件
 * - migrationTagGuard.test.ts: 1 件
 *
 * 合計 17 件。一括修正は scope 過多のため ratchet-down baseline 方式で許容し、
 * 新規追加は block する。
 *
 * **減らせたら本定数を更新してベースラインを下げる**。
 */
const TSIG_TEST_04_LEGACY_BASELINE = 17

describe('TSIG-TEST-04: tautology assertion がない', () => {
  // 検出 pattern を 1 つの集合関数に集約 (regex を `it` 間で共有)
  const collectTautologyViolations = (): string[] => {
    const violations: string[] = []
    const testFiles = collectTestFiles(SRC_DIR)

    // (a) expect(<expr>.length|.size).toBeGreaterThanOrEqual(0)
    const lengthSizePattern = /expect\([^)]*\.(length|size)\)\.toBeGreaterThanOrEqual\(0\)/
    // (b) expect(true).toBe(true)
    const trueTruePattern = /expect\(true\)\.toBe\(true\)/
    // (c) expect(false).toBe(false)
    const falseFalsePattern = /expect\(false\)\.toBe\(false\)/

    for (const file of testFiles) {
      const relPath = rel(file)
      if (isExcluded(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim()
        // コメント行は除外
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue

        if (
          lengthSizePattern.test(lines[i]) ||
          trueTruePattern.test(lines[i]) ||
          falseFalsePattern.test(lines[i])
        ) {
          violations.push(`${relPath}:${i + 1}: ${trimmed.slice(0, 100)}`)
        }
      }
    }
    return violations
  }

  it('tautology assertion 違反が legacy baseline を超えない (ratchet-down)', () => {
    const violations = collectTautologyViolations()
    const message =
      `[AR-TSIG-TEST-04] tautology assertion violations: ${violations.length} ` +
      `(legacy baseline: ${TSIG_TEST_04_LEGACY_BASELINE})\n` +
      `${formatViolationMessage(getRuleById('AR-TSIG-TEST-04')!, violations)}\n` +
      `\n本 baseline は Wave 1〜7 観測期間 (2026-04-13) で炙り出された legacy ${TSIG_TEST_04_LEGACY_BASELINE} 件を許容している。\n` +
      `新規追加された違反は block される。減らせたら TSIG_TEST_04_LEGACY_BASELINE を更新する。`
    expect(violations.length, message).toBeLessThanOrEqual(TSIG_TEST_04_LEGACY_BASELINE)
  })

  it('legacy baseline が現状より大きすぎない (ratchet-down が stale していない)', () => {
    const violations = collectTautologyViolations()
    const slack = TSIG_TEST_04_LEGACY_BASELINE - violations.length
    const message =
      `TSIG_TEST_04_LEGACY_BASELINE (${TSIG_TEST_04_LEGACY_BASELINE}) が現在の violations 数 (${violations.length}) より ${slack} 件多い。\n` +
      `baseline を ${violations.length} に下げてください (ratchet-down の更新)。\n` +
      `app/src/test/guards/testSignalIntegrityGuard.test.ts の TSIG_TEST_04_LEGACY_BASELINE を更新する。`
    expect(slack, message).toBeLessThan(5)
  })
})

// ─── Self-test: 検出 regex の動作検証 (Phase 5 運用着地確認) ──────────────
//
// 上位原則: references/01-principles/test-signal-integrity.md
//
// guard 自体が「正しい違反を捕まえ、正しいパターンを通す」ことを文字列レベルで
// 検証する。実コードに違反を書かずに detection 精度を保証するため。
//
// 保護対象:
// - false positive: 正しいテストが誤検知されないこと
// - false negative: 違反パターンが見逃されないこと

describe('Test Signal Integrity Guard: 検出 regex の self-test', () => {
  // 注意: 検出 regex はファイル単体スキャン用の line-based / block-based なので、
  //       正規表現リテラルとして文字列を組み立てて検証する。
  //       実コードの違反を作らないために bad pattern は文字列のみで構築する。

  describe('TSIG-TEST-01: existence-only assertion 検出 regex', () => {
    const oneLinerPattern =
      /(?:it|test)\(\s*['"`][^'"`]+['"`]\s*,\s*(?:async\s*)?\(\)\s*=>\s*\{\s*expect\([^)]+\)\.(?:toBeDefined|toBeTruthy)\(\)\s*\}\s*\)/

    it('bad pattern (one-liner toBeDefined のみ) を検出する', () => {
      const bad = "it('exists', () => { expect(fn).toBeDefined() })"
      expect(oneLinerPattern.test(bad)).toBe(true)
    })

    it('good pattern (toBe + 値) を誤検知しない', () => {
      const good = "it('returns 6', () => { expect(sum([1,2,3])).toBe(6) })"
      expect(oneLinerPattern.test(good)).toBe(false)
    })

    it('toBeTruthy のみも検出する', () => {
      const bad = "it('truthy', () => { expect(value).toBeTruthy() })"
      expect(oneLinerPattern.test(bad)).toBe(true)
    })

    // Regression: 2026-04-13 Phase 3 観測期間で発見した false positive bug
    // toBeNull() は「value === null」の meaningful 契約チェックであり、
    // existence-only ではない (= toBe(null) と等価)
    it('toBeNull は誤検知しない (toBe(null) 相当の契約チェック)', () => {
      const good = "it('returns null', () => { expect(result).toBeNull() })"
      expect(oneLinerPattern.test(good)).toBe(false)
    })

    // Regression: 2026-04-13 Phase 3 観測期間で発見した substring match bug
    // hasMeaningfulMatcher の regex が `\(` を持たないと `toBe` が
    // `toBeDefined` の prefix としてマッチして false negative になる
    describe('multi-line block: hasMeaningfulMatcher が toBe* の substring を誤マッチしない', () => {
      const hasMeaningfulMatcher = (block: string): boolean =>
        /expect\([^)]+\)\.(?:toBe|toEqual|toMatch|toThrow|toContain|toHaveLength|toHaveBeenCalled|toBeGreaterThan|toBeLessThan|toBeCloseTo)\(/.test(
          block,
        )
      const hasExistenceOnly = (block: string): boolean =>
        /expect\([^)]+\)\.(?:toBeDefined|toBeTruthy)\(\)/.test(block)

      it('toBeDefined() のみは meaningful matcher として誤判定しない', () => {
        const block = 'expect(fn).toBeDefined()'
        expect(hasMeaningfulMatcher(block)).toBe(false)
        expect(hasExistenceOnly(block)).toBe(true)
      })

      it('toBeTruthy() のみは meaningful matcher として誤判定しない', () => {
        const block = 'expect(value).toBeTruthy()'
        expect(hasMeaningfulMatcher(block)).toBe(false)
        expect(hasExistenceOnly(block)).toBe(true)
      })

      it('toBeNull() は existence-only として誤判定しない (契約チェック)', () => {
        const block = 'expect(result).toBeNull()'
        expect(hasExistenceOnly(block)).toBe(false)
      })

      it('toBe(6) は meaningful matcher として認識する', () => {
        const block = 'expect(sum).toBe(6)'
        expect(hasMeaningfulMatcher(block)).toBe(true)
      })

      it('toBeGreaterThan(0) は meaningful matcher として認識する', () => {
        const block = 'expect(count).toBeGreaterThan(0)'
        expect(hasMeaningfulMatcher(block)).toBe(true)
      })

      it('toEqual(...) は meaningful matcher として認識する', () => {
        const block = 'expect(result).toEqual({ a: 1 })'
        expect(hasMeaningfulMatcher(block)).toBe(true)
      })
    })
  })

  describe('TSIG-COMP-03: multi-underscore 検出 regex', () => {
    const multiUnderscorePattern = /\(\s*_[A-Za-z][A-Za-z0-9_]*\s*[:,][^)]*?,\s*_[A-Za-z]/

    it('bad pattern (連続 _ プレフィックス引数) を検出する', () => {
      const bad = 'function fn(_event: MouseEvent, _index: number, payload: Payload)'
      expect(multiUnderscorePattern.test(bad)).toBe(true)
    })

    it('good pattern (単独 _ 引数) を誤検知しない', () => {
      const good = 'array.map((item, _index) => process(item))'
      expect(multiUnderscorePattern.test(good)).toBe(false)
    })

    it('good pattern (通常の引数のみ) を誤検知しない', () => {
      const good = 'function handleClick(payload: Payload, options: Options)'
      expect(multiUnderscorePattern.test(good)).toBe(false)
    })
  })

  describe('AR-G3-SUPPRESS-RATIONALE: rationale コメント検出', () => {
    it('reason: と removalCondition: を含むコメントを accept する', () => {
      const sourceWithRationale = `
        // reason: ECharts library constraint
        // removalCondition: react-hooks supports stable refs
        // eslint-disable-next-line react-hooks/exhaustive-deps
        useEffect(() => {}, [])
      `
      expect(/reason:/i.test(sourceWithRationale)).toBe(true)
      expect(/removalCondition:/i.test(sourceWithRationale)).toBe(true)
    })

    it('reason: のみで removalCondition: 無いコメントを reject する', () => {
      const sourceMissingRemoval = `
        // reason: ECharts library constraint
        // eslint-disable-next-line react-hooks/exhaustive-deps
        useEffect(() => {}, [])
      `
      expect(/reason:/i.test(sourceMissingRemoval)).toBe(true)
      expect(/removalCondition:/i.test(sourceMissingRemoval)).toBe(false)
    })

    it('rationale 無しコメントを reject する', () => {
      const sourceWithoutRationale = `
        // eslint-disable-next-line react-hooks/exhaustive-deps
        useEffect(() => {}, [])
      `
      expect(/reason:/i.test(sourceWithoutRationale)).toBe(false)
      expect(/removalCondition:/i.test(sourceWithoutRationale)).toBe(false)
    })
  })
})
