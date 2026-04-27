/**
 * Doc Static Number Guard — 文書中のハードコード数値の drift を検出
 *
 * 現在形で書かれた静的数値（「N ルール」「N テスト」等）は、
 * コード変更に伴い文書が更新されないと嘘になる。
 *
 * このガードは:
 * 1. 高リスク文書をスキャンして静的数値パターンを検出
 * 2. generated section 内・バージョン履歴内は除外（スナップショット）
 * 3. 例外リストで既知の正当な静的数値を管理（allowlists/docs.ts に分離）
 * 4. ratchet-down で残件数を監視
 *
 * @guard G1 テストに書く
 * ルール定義: architectureRules.ts (AR-DOC-STATIC-NUMBER)
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { getRuleById, formatViolationMessage } from '../architectureRules'
import { DOC_STATIC_NUMBER_EXCEPTIONS } from '../allowlists/docs'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const rule = getRuleById('AR-DOC-STATIC-NUMBER')!

// ── スキャン対象ファイル ──────────────────────────────────────

const TARGET_FILES = [
  'CLAUDE.md',
  'CONTRIBUTING.md',
  'references/01-principles/adaptive-architecture-governance.md',
  'references/01-principles/aag-operational-classification.md',
  'references/03-guides/architecture-rule-system.md',
]

// ── 検出パターン ──────────────────────────────────────────────

const STATIC_NUMBER_PATTERNS = [
  /\d+\s*ルール/g,
  /\d+\s*テスト/g,
  /\d+\s*ガード/g,
  /\d+\s*KPI/g,
  /\d+\s*原則/g,
  /\d+\s*ファイル/g,
]

// ── 除外ゾーン ────────────────────────────────────────────────

/** generated section 内の行を除外 */
function isInGeneratedSection(lines: string[], lineIndex: number): boolean {
  for (let i = lineIndex; i >= 0; i--) {
    if (lines[i].includes('GENERATED:END')) return false
    if (lines[i].includes('GENERATED:START')) return true
  }
  return false
}

/** バージョン履歴セクション内の行を除外（### vN.N.N — で始まるセクション） */
function isInVersionHistory(lines: string[], lineIndex: number): boolean {
  for (let i = lineIndex; i >= 0; i--) {
    const line = lines[i].trim()
    if (/^### v\d+\.\d+\.\d+/.test(line)) return true
    if (/^## /.test(line) && !line.includes('バージョン履歴')) return false
    if (/^## バージョン履歴/.test(line)) return true
  }
  return false
}

/** 「直近の主要変更」セクション内の行を除外（スナップショット） */
function isInRecentChanges(lines: string[], lineIndex: number): boolean {
  for (let i = lineIndex; i >= 0; i--) {
    const line = lines[i].trim()
    if (/^## 直近の主要変更/.test(line)) return true
    if (/^## /.test(line) && !line.includes('直近の主要変更')) return false
  }
  return false
}

// ── 例外チェック（allowlists/docs.ts から読み込み） ──────────

function isException(fileName: string, line: string): boolean {
  return DOC_STATIC_NUMBER_EXCEPTIONS.some(
    (exc) => exc.fileName === fileName && line.includes(exc.pattern),
  )
}

// ── BASELINE（ratchet-down） ──────────────────────────────────
const STATIC_NUMBER_BASELINE = 0

// ── テスト ────────────────────────────────────────────────────

describe('Doc Static Number Guard: 文書中のハードコード数値 drift 検出', () => {
  it('高リスク文書の静的数値が BASELINE 以下', () => {
    const violations: string[] = []

    for (const relPath of TARGET_FILES) {
      const filePath = path.join(PROJECT_ROOT, relPath)
      if (!fs.existsSync(filePath)) continue

      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')
      const fileName = path.basename(relPath)

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // 除外ゾーン
        if (isInGeneratedSection(lines, i)) continue
        if (isInVersionHistory(lines, i)) continue
        if (isInRecentChanges(lines, i)) continue

        // パターンマッチ
        for (const pattern of STATIC_NUMBER_PATTERNS) {
          pattern.lastIndex = 0
          let match
          while ((match = pattern.exec(line)) !== null) {
            const matched = match[0]
            // 「1ファイル」「1テスト」等の 1 は誤検出が多いのでスキップ
            if (/^[01]\s/.test(matched)) continue
            // 例外チェック（allowlists/docs.ts）
            if (isException(fileName, line)) continue
            violations.push(`${relPath}:${i + 1}: ${matched} — "${line.trim()}"`)
          }
        }
      }
    }

    if (violations.length < STATIC_NUMBER_BASELINE) {
      console.log(
        `\n[ratchet-down] 静的数値が ${STATIC_NUMBER_BASELINE} → ${violations.length} に減少。` +
          `\nSTATIC_NUMBER_BASELINE を ${violations.length} に更新してください。`,
      )
    }

    if (violations.length > 0) {
      console.log(`\n[Doc Static Number] ${violations.length} 件の静的数値を検出:`)
      for (const v of violations) console.log(`  ${v}`)
    }

    expect(
      violations.length,
      formatViolationMessage(rule, violations.slice(0, 10)),
    ).toBeLessThanOrEqual(STATIC_NUMBER_BASELINE)
  })
})
