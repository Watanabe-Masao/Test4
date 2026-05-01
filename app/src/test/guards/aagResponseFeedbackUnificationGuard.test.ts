/**
 * AAG Feedback 層単一性 Guard — renderAagResponse 重複検出 + 構造的拒否
 *
 * ## 検証する原則
 *
 * `aag/operational-classification.md §6` の Feedback 層単一性原則:
 *   「違反検出時に **どこで止まっても同じ情報構造で返る** ための統一 response mechanism」
 *
 * 具体的には `renderAagResponse()` (= 通知 layer の唯一の描画関数) が
 * **2 箇所以上に独立実装されていない** ことを構造的に保証する。
 *
 * ## 背景 (= 2026-05-01 audit で発見)
 *
 * audit (mechanism 重複調査) で `renderAagResponse()` が:
 *   - `tools/architecture-health/src/aag-response.ts` (canonical 正本)
 *   - `app/src/test/architectureRules/helpers.ts` (重複実装)
 *
 * の **2 箇所に独立定義** されており、AAG が自分自身の Feedback 層単一性原則を
 * 構造的に違反していた状態を解消した。本 guard は再発を構造的に拒否する。
 *
 * ## 検証 strategy
 *
 * helpers.ts の `renderAagResponse` export が **canonical からの re-export** で
 * あることを source 走査で hard fail 検証する (= 独立 function 定義の混入を拒否)。
 *
 * @guard G1 テストに書く
 *
 * @see tools/architecture-health/src/aag-response.ts (canonical 正本)
 * @see app/src/test/architectureRules/helpers.ts (re-export consumer)
 * @see references/01-principles/aag/operational-classification.md §6
 *
 * @responsibility R:guard
 *
 * @taxonomyKind T:meta-guard
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const REPO_ROOT = path.resolve(__dirname, '../../../..')
const HELPERS_PATH = path.resolve(REPO_ROOT, 'app/src/test/architectureRules/helpers.ts')
const CANONICAL_PATH = path.resolve(REPO_ROOT, 'tools/architecture-health/src/aag-response.ts')

describe('AAG Feedback 層単一性 Guard (renderAagResponse 重複検出)', () => {
  it('canonical (tools/aag-response.ts) に renderAagResponse が定義されている', () => {
    const content = fs.readFileSync(CANONICAL_PATH, 'utf-8')
    const hasFunction = /export\s+function\s+renderAagResponse\s*\(/.test(content)
    expect(
      hasFunction,
      `${path.relative(REPO_ROOT, CANONICAL_PATH)} に renderAagResponse() が定義されていません`,
    ).toBe(true)
  })

  it('helpers.ts は renderAagResponse を独立定義せず、canonical から re-export している', () => {
    const content = fs.readFileSync(HELPERS_PATH, 'utf-8')

    // 独立 function 定義 (= `export function renderAagResponse(...)` 形) を拒否
    const independentDefinition = /export\s+function\s+renderAagResponse\s*\(/.test(content)
    expect(
      independentDefinition,
      `helpers.ts に renderAagResponse() の独立定義が存在します。\n` +
        `  Feedback 層単一性原則 (= aag/operational-classification.md §6) の違反です。\n` +
        `  修正: helpers.ts から function 定義を削除し、` +
        `'@tools/architecture-health/aag-response' から re-export してください。`,
    ).toBe(false)

    // re-export 経路の確認 (= `import ... renderAagResponse ... from '@tools/architecture-health/aag-response'`)
    const reExportImport = /from\s+['"]@tools\/architecture-health\/aag-response['"]/.test(content)
    expect(
      reExportImport,
      `helpers.ts が canonical (@tools/architecture-health/aag-response) から import していません。\n` +
        `  Feedback 層単一性を維持するため、import + re-export 経路が必須です。`,
    ).toBe(true)
  })

  it('AagResponse 型も canonical を正本とし、helpers.ts では独立定義しない', () => {
    const content = fs.readFileSync(HELPERS_PATH, 'utf-8')

    // 独立 interface 定義を拒否 (= helpers.ts に `export interface AagResponse {` が存在しないこと)
    const independentInterface = /export\s+interface\s+AagResponse\s*\{/.test(content)
    expect(
      independentInterface,
      `helpers.ts に AagResponse interface の独立定義が存在します。\n` +
        `  AagResponse 型は canonical (tools/aag-response.ts) からの type re-export であるべきです。`,
    ).toBe(false)
  })

  it('buildObligationResponse も canonical 正本のみ (= helpers.ts では独立定義しない)', () => {
    const content = fs.readFileSync(HELPERS_PATH, 'utf-8')
    const independentDefinition = /export\s+function\s+buildObligationResponse\s*\(/.test(content)
    expect(
      independentDefinition,
      `helpers.ts に buildObligationResponse() の独立定義が存在します。\n` +
        `  canonical 正本 (tools/aag-response.ts) からの re-export に統一してください。`,
    ).toBe(false)
  })
})
