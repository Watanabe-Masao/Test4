/**
 * Doc Static Number Guard — 文書中のハードコード数値の drift を検出
 *
 * 現在形で書かれた静的数値（「N ルール」「N テスト」等）は、
 * コード変更に伴い文書が更新されないと嘘になる。
 *
 * このガードは:
 * 1. 高リスク文書をスキャンして静的数値パターンを検出
 * 2. generated section 内・バージョン履歴内は除外（スナップショット）
 * 3. 例外リストで既知の正当な静的数値を管理
 * 4. ratchet-down で残件数を監視
 *
 * @guard G1 テストに書く
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')

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

// ── 例外リスト ────────────────────────────────────────────────
// スナップショット（当時の値）や、数値が構造的に安定しているもの
// 理由を明記して管理する

const EXCEPTIONS: ReadonlySet<string> = new Set([
  // ── aag-operational-classification.md ──
  // セクション見出しのルール数は本文のルール一覧と連動。
  // ルール追加時に文書自体を更新する obligation がある
  'aag-operational-classification.md:即修正（31 ルール',
  'aag-operational-classification.md:構造負債（33 ルール',
  'aag-operational-classification.md:観測（20 ルール',
  'aag-operational-classification.md:7 ルール — invariant',
  'aag-operational-classification.md:8 ルール）',
  'aag-operational-classification.md:14 ルール — 主に',
  'aag-operational-classification.md:2 ルール）',
  'aag-operational-classification.md:7 ルール — heuristic',
  'aag-operational-classification.md:20 ルール — heuristic',
  'aag-operational-classification.md:6 ルール — default',
  'aag-operational-classification.md:12 ルール — default',
  'aag-operational-classification.md:4 ルール — default',
  'aag-operational-classification.md:4 ルール — heuristic',
  // ── architecture-rule-system.md ──
  // 「1 ルール = 1 つの害」は原則定義であり件数ではない
  'architecture-rule-system.md:1 ルール = 1 つ',
  // ── CLAUDE.md ──
  // 設計原則カテゴリ数は原則体系の安定した定義
  'CLAUDE.md:8カテゴリ',
  // タスク規模定義（Small = 1ファイル変更）は運用定義
  'CLAUDE.md:1ファイル変更',
  // C1 原則の定義「1ファイル=1変更理由」は設計原則
  'CLAUDE.md:1ファイル=1変更理由',
  // UI/UX 4原則はセクション見出し（原則体系の定義）
  'CLAUDE.md:4原則',
  // ── adaptive-architecture-governance.md ──
  // 4層・5スライスは AAG の構造定義
  'adaptive-architecture-governance.md:4 層',
  'adaptive-architecture-governance.md:5 スライス',
  // 「第 N 原則」は序数（原則の番号）であり件数ではない
  'adaptive-architecture-governance.md:第 7 原則',
  'adaptive-architecture-governance.md:第 8 原則',
])

function isException(fileName: string, matchedText: string): boolean {
  for (const exc of EXCEPTIONS) {
    if (exc.startsWith(fileName) && matchedText.includes(exc.split(':')[1])) return true
  }
  return false
}

// ── BASELINE（ratchet-down） ──────────────────────────────────
// 既存の静的数値残件。減少のみ許可。
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
            // 例外チェック
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
      `文書中のハードコード数値が BASELINE (${STATIC_NUMBER_BASELINE}) を超えています。\n` +
        `generated section 化するか、EXCEPTIONS に追加してください。\n` +
        violations.slice(0, 10).join('\n'),
    ).toBeLessThanOrEqual(STATIC_NUMBER_BASELINE)
  })
})
