/**
 * Doc-Code Consistency Guard — 定義書と実装の双方向リンク検証
 *
 * CLAUDE.md の正本化体系テーブルに記載された「定義書 ↔ 実装関数」の
 * 整合性を機械的に検証する。ドキュメント品質層のガード。
 *
 * 検証対象:
 * 1. 定義書が実装関数名を含んでいること（定義書 → 実装）
 * 2. 実装関数が実際に存在すること（定義書 → コード）
 *
 * @guard G1 テストに書く
 * ルール定義: architectureRules.ts (AR-DOC-STATIC-NUMBER)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const REFS_DIR = path.join(PROJECT_ROOT, 'references/01-principles')
const SRC_DIR = path.resolve(__dirname, '../..')
const rule = getRuleById('AR-DOC-STATIC-NUMBER')!

// ── 正本化体系: 定義書 ↔ 実装関数のペア ──────────────────────
// CLAUDE.md §正本化体系 テーブルから抽出。
// ここが正本。ペアを追加・変更したらこのリストも更新する。

interface CanonicalPair {
  /** 正本名（日本語） */
  readonly label: string
  /** 実装関数名（export された関数） */
  readonly implFunction: string
  /** 定義書ファイル名 */
  readonly definitionDoc: string
  /** 実装関数を含むファイルの検索パス（glob 的に） */
  readonly implSearchDir: string
}

const CANONICAL_PAIRS: readonly CanonicalPair[] = [
  {
    label: '仕入原価',
    implFunction: 'readPurchaseCost',
    definitionDoc: 'purchase-cost-definition.md',
    implSearchDir: 'application/readModels/purchaseCost',
  },
  {
    label: '粗利',
    implFunction: 'calculateGrossProfit',
    definitionDoc: 'gross-profit-definition.md',
    implSearchDir: 'application/readModels/grossProfit',
  },
  {
    label: '売上',
    implFunction: 'readSalesFact',
    definitionDoc: 'sales-definition.md',
    implSearchDir: 'application/readModels/salesFact',
  },
  {
    label: '値引き',
    implFunction: 'readDiscountFact',
    definitionDoc: 'discount-definition.md',
    implSearchDir: 'application/readModels/discountFact',
  },
  {
    label: '客数',
    implFunction: 'readCustomerFact',
    definitionDoc: 'customer-definition.md',
    implSearchDir: 'application/readModels/customerFact',
  },
  {
    label: '要因分解',
    implFunction: 'calculateFactorDecomposition',
    definitionDoc: 'authoritative-calculation-definition.md',
    implSearchDir: 'application/readModels/factorDecomposition',
  },
  {
    label: 'PI値',
    implFunction: 'calculateQuantityPI',
    definitionDoc: 'pi-value-definition.md',
    implSearchDir: 'domain/calculations',
  },
  {
    label: '客数GAP',
    implFunction: 'calculateCustomerGap',
    definitionDoc: 'customer-gap-definition.md',
    implSearchDir: 'domain/calculations',
  },
]

// ── テスト ────────────────────────────────────────────────────

describe('Doc-Code Consistency Guard: 定義書と実装の整合性', () => {
  it('定義書が実装関数名を含んでいる（定義書 → 実装）', () => {
    const violations: string[] = []

    for (const pair of CANONICAL_PAIRS) {
      const docPath = path.join(REFS_DIR, pair.definitionDoc)
      if (!fs.existsSync(docPath)) {
        violations.push(`${pair.label}: 定義書 ${pair.definitionDoc} が存在しない`)
        continue
      }
      const content = fs.readFileSync(docPath, 'utf-8')
      if (!content.includes(pair.implFunction)) {
        violations.push(
          `${pair.label}: ${pair.definitionDoc} に実装関数 ${pair.implFunction} の記載がない`,
        )
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('実装関数がコードベースに存在する（定義書 → コード）', () => {
    const violations: string[] = []

    for (const pair of CANONICAL_PAIRS) {
      const searchDir = path.join(SRC_DIR, pair.implSearchDir)
      if (!fs.existsSync(searchDir)) {
        violations.push(`${pair.label}: 実装ディレクトリ ${pair.implSearchDir} が存在しない`)
        continue
      }

      // ディレクトリ内のファイルを走査（ファイル名 or 関数宣言で検索）
      const files = fs
        .readdirSync(searchDir)
        .filter((f) => f.endsWith('.ts') && !f.includes('.test.'))
      let found = false
      for (const file of files) {
        // ファイル名に関数名を含む（readSalesFact.ts 等）
        if (file.includes(pair.implFunction)) {
          found = true
          break
        }
        const content = fs.readFileSync(path.join(searchDir, file), 'utf-8')
        if (content.includes(`function ${pair.implFunction}`)) {
          found = true
          break
        }
      }
      if (!found) {
        violations.push(
          `${pair.label}: ${pair.implSearchDir}/ に ${pair.implFunction} が見つからない`,
        )
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })
})
