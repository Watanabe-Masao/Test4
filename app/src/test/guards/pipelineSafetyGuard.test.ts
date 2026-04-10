/**
 * パイプライン安全性ガード — データパイプラインの壊れ方を機械的に検出
 *
 * 各テストは Architecture Rule の detection を実装し、
 * 「どう壊れるか」をコードベース全体から検出する。
 *
 * @guard G2 エラー伝播 — エラーは握り潰さず伝播させる
 * @guard G3 警告黙殺禁止 — 状態を無視してデータだけ取らない
 * @guard E1 境界で検証 — バリデーション結果を無視しない
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage, checkRatchetDown } from '../architectureRules'

// ─── ヘルパー ────────────────────────────────────────────

function scanFiles(
  dirs: string[],
  filter: (file: string) => boolean,
  detector: (content: string, lines: string[], relPath: string) => string[],
): string[] {
  const violations: string[] = []
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue
    for (const file of collectTsFiles(dir)) {
      if (!filter(file)) continue
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      violations.push(...detector(content, lines, rel(file)))
    }
  }
  return violations
}

const isSourceFile = (f: string) =>
  !f.includes('.test.') && !f.includes('.styles.') && !f.includes('__tests__')

// ─── AR-SAFETY-SILENT-CATCH: サイレント catch 検出 ────────

describe('AR-SAFETY-SILENT-CATCH: ログなし catch の検出', () => {
  const rule = getRuleById('AR-SAFETY-SILENT-CATCH')!
  // ratchet-down: 現在30件。各 catch にログを追加するたびに減らす
  // ratchet-down: 30 → 9（22箇所にログ追加済み。残りは LOW + recovery 内部蓄積パターン）
  const BASELINE = 9

  /**
   * 「ログなし catch」の検出対象:
   * - application/ と infrastructure/ のデータパイプライン系ファイル
   * - .catch(() => { }) で console 出力も throw もない
   *
   * 除外:
   * - presentation/ （UI 層は別ガードで管理）
   * - SW、preload 等の非クリティカルパス
   */
  it('データパイプラインのサイレント catch がベースライン以下であること', () => {
    // データパイプラインのクリティカルパスのみ対象
    const CRITICAL_DIRS = [
      path.join(SRC_DIR, 'application/hooks'),
      path.join(SRC_DIR, 'application/usecases'),
      path.join(SRC_DIR, 'application/workers'),
      path.join(SRC_DIR, 'application/stores'),
      path.join(SRC_DIR, 'infrastructure/duckdb'),
    ]

    const violations = scanFiles(CRITICAL_DIRS, isSourceFile, (_content, lines, relPath) => {
      const found: string[] = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.startsWith('//') || line.startsWith('*')) continue

        // .catch(() => { ... }) — 空パラメータ catch
        const isCatchEmpty = /\.catch\(\s*\(\s*\)\s*=>/.test(line)
        // } catch { or } catch (_) { — パラメータなし/未使用 catch
        const isCatchBlock = /\}\s*catch\s*(\(\s*_?\s*\))?\s*\{/.test(line)

        if (isCatchEmpty || isCatchBlock) {
          const block = lines.slice(i, i + 8).join('\n')
          const hasLog = /console\.(warn|error|log|info)/.test(block)
          const hasThrow = /throw\b/.test(block)
          const hasDispatch = /dispatch|setError|setState/.test(block)
          if (!hasLog && !hasThrow && !hasDispatch) {
            found.push(`${relPath}:${i + 1}: ${line}`)
          }
        }
      }
      return found
    })

    expect(
      violations.length,
      [
        formatViolationMessage(rule, violations),
        `ベースライン: ${BASELINE}。各 catch にログまたはエラー伝播を追加すること。`,
        ...violations,
      ].join('\n'),
    ).toBeLessThanOrEqual(BASELINE)
    checkRatchetDown(rule, violations.length, 'silent-catch')
  })
})

// ─── AR-SAFETY-NULLABLE-ASYNC: readModels の ?? 0 検出 ──

// readModelSafetyGuard.test.ts に委譲（既存）

// ─── AR-SAFETY-VALIDATION-ENFORCE: バリデーション結果未使用 ─

describe('AR-SAFETY-VALIDATION-ENFORCE: バリデーション結果のチェック', () => {
  const rule = getRuleById('AR-SAFETY-VALIDATION-ENFORCE')!

  it('validateImportData の呼び出し箇所で結果がチェックされていること（ベースライン管理）', () => {
    const importDir = path.join(SRC_DIR, 'application/usecases/import')
    if (!fs.existsSync(importDir)) return

    const violations: string[] = []
    for (const file of collectTsFiles(importDir)) {
      if (file.includes('.test.')) continue
      // 関数定義ファイルは除外（呼び出し側のみ検査）
      if (file.includes('importValidation.ts')) continue
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('validateImportData(')) {
          // 前後20行に hasValidationErrors / .level === 'error' / messages.some がなければ違反
          const surrounding = lines.slice(Math.max(0, i - 5), i + 20).join('\n')
          if (
            !surrounding.includes('hasValidationErrors') &&
            !surrounding.includes("level === 'error'") &&
            !surrounding.includes('.some(') &&
            !surrounding.includes('blocked')
          ) {
            violations.push(
              `${rel(file)}:${i + 1}: validateImportData() の結果がチェックされていない`,
            )
          }
        }
      }
    }

    // 現在4箇所（single×2 + multi×2）: Phase A で修正予定
    const BASELINE = 4
    expect(
      violations.length,
      [
        formatViolationMessage(rule, violations),
        `ベースライン: ${BASELINE}。Phase A で hasValidationErrors チェックを追加すること。`,
      ].join('\n'),
    ).toBeLessThanOrEqual(BASELINE)
    checkRatchetDown(rule, violations.length, 'validation-unchecked')
  })
})

// ─── AR-SAFETY-PROD-VALIDATION: DEV 限定バリデーション検出 ──

describe('AR-SAFETY-PROD-VALIDATION: DEV 限定 Zod バリデーション', () => {
  const rule = getRuleById('AR-SAFETY-PROD-VALIDATION')!

  it('queryToObjects の Zod バリデーションが import.meta.env.DEV でガードされている箇所を検出', () => {
    const duckdbDir = path.join(SRC_DIR, 'infrastructure/duckdb')
    if (!fs.existsSync(duckdbDir)) return

    const violations = scanFiles([duckdbDir], isSourceFile, (_content, lines, relPath) => {
      const found: string[] = []
      for (let i = 0; i < lines.length; i++) {
        // safeParse を DEV でガードしている箇所
        if (lines[i].includes('import.meta.env.DEV') && lines[i].includes('mode')) {
          found.push(`${relPath}:${i + 1}: ${lines[i].trim()}`)
        }
      }
      return found
    })

    // 現在は1箇所（queryRunner.ts）。ratchet-down で管理
    const BASELINE = 1
    expect(
      violations.length,
      [
        formatViolationMessage(rule, violations),
        `ベースライン: ${BASELINE}。本番でも first-row バリデーションを有効にすべき。`,
      ].join('\n'),
    ).toBeLessThanOrEqual(BASELINE)
  })
})

// ─── AR-SAFETY-INSERT-VERIFY: INSERT 行数未検証 ──────────

describe('AR-SAFETY-INSERT-VERIFY: bulkInsert の行数検証', () => {
  const rule = getRuleById('AR-SAFETY-INSERT-VERIFY')!

  it('bulkInsert が行数を検証せずに返していないこと', () => {
    const file = path.join(SRC_DIR, 'infrastructure/duckdb/dataConversions.ts')
    if (!fs.existsSync(file)) return

    const content = fs.readFileSync(file, 'utf-8')
    const lines = content.split('\n')
    const violations: string[] = []

    for (let i = 0; i < lines.length; i++) {
      // "return rows.length" without preceding COUNT(*) verification
      if (lines[i].includes('return rows.length')) {
        // 前の20行に COUNT(*) や verify がなければ違反
        const preceding = lines.slice(Math.max(0, i - 20), i).join('\n')
        if (!preceding.includes('COUNT(') && !preceding.includes('verify')) {
          violations.push(`${rel(file)}:${i + 1}: bulkInsert が rows.length を検証なしで返している`)
        }
      }
    }

    // 現在は1箇所。将来的に修正されたら0になる
    const BASELINE = 1
    expect(violations.length, formatViolationMessage(rule, violations)).toBeLessThanOrEqual(
      BASELINE,
    )
    checkRatchetDown(rule, violations.length, 'unverified-insert')
  })
})

// ─── AR-SAFETY-WORKER-TIMEOUT: タイムアウトなし Promise ──

describe('AR-SAFETY-WORKER-TIMEOUT: Worker/Mutex タイムアウト', () => {
  const rule = getRuleById('AR-SAFETY-WORKER-TIMEOUT')!

  it('Worker 通信に new Promise がありタイムアウトがないこと（ベースライン管理）', () => {
    const workerDir = path.join(SRC_DIR, 'application/workers')
    const coordDir = path.join(SRC_DIR, 'infrastructure/duckdb')
    const violations = scanFiles(
      [workerDir, coordDir],
      (f) =>
        isSourceFile(f) &&
        (f.includes('Worker') || f.includes('Coordinator') || f.includes('loadCoordinator')),
      (_content, lines, relPath) => {
        const found: string[] = []
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('new Promise') && !lines[i].includes('// with-timeout')) {
            // 前後10行に timeout/race/AbortSignal がなければ違反
            const block = lines.slice(Math.max(0, i - 5), i + 10).join('\n')
            if (
              !block.includes('timeout') &&
              !block.includes('Promise.race') &&
              !block.includes('AbortSignal') &&
              !block.includes('setTimeout')
            ) {
              found.push(`${relPath}:${i + 1}: タイムアウトなし Promise`)
            }
          }
        }
        return found
      },
    )

    const BASELINE = 2
    expect(
      violations.length,
      [formatViolationMessage(rule, violations), `ベースライン: ${BASELINE}`].join('\n'),
    ).toBeLessThanOrEqual(BASELINE)
    checkRatchetDown(rule, violations.length, 'no-timeout-promise')
  })
})

// ─── AR-SAFETY-STALE-STORE: データソース変更時のクリア ────

describe('AR-SAFETY-STALE-STORE: setCurrentMonthData の storeResults クリア', () => {
  const rule = getRuleById('AR-SAFETY-STALE-STORE')!

  it('setCurrentMonthData が storeResults をクリアしていること', () => {
    const storeFile = path.join(SRC_DIR, 'application/stores/dataStore.ts')
    if (!fs.existsSync(storeFile)) return

    const content = fs.readFileSync(storeFile, 'utf-8')
    const violations: string[] = []

    // setCurrentMonthData のアクション実装を探す（型定義ではなく (monthly) => set(...) の方）
    const idx = content.indexOf('setCurrentMonthData: (monthly)')
    if (idx >= 0) {
      const block = content.slice(idx, idx + 500)
      if (!block.includes('storeResults')) {
        violations.push(
          'application/stores/dataStore.ts: setCurrentMonthData が storeResults をクリアしていない',
        )
      }
    }

    // 前コミットで setCurrentMonthData に storeResults: new Map() を追加済み → 0
    const BASELINE = 0
    expect(violations.length, formatViolationMessage(rule, violations)).toBeLessThanOrEqual(
      BASELINE,
    )
    checkRatchetDown(rule, violations.length, 'stale-store')
  })
})
