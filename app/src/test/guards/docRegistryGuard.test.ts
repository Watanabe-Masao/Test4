/**
 * Doc Registry Guard — ドキュメントレジストリとファイルシステムの整合性検証
 *
 * docs/contracts/doc-registry.json に登録された全正本文書が実在するか、
 * また実在する文書がレジストリに登録されているかを双方向に検証する。
 *
 * **Phase C (2026-04-28)**: canonicalization-domain-consolidation Phase C で
 * `app-domain/integrity/` 経由の adapter 化を実施。
 * inline parsing / existence check ロジックを削除し、jsonRegistry +
 * checkPathExistence + checkBidirectionalExistence + formatStringViolations 経由に切替。
 * 旧 inline 経路と同一 violation 集合を返すこと (動作同一性) を 6 既存 test で検証済。
 *
 * @guard G1 テストに書く
 * ルール定義: architectureRules.ts (AR-DOC-STATIC-NUMBER)
 *
 * @see references/03-guides/integrity-domain-architecture.md §5 adapter pattern
 *
 * @responsibility R:unclassified
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { getRuleById, formatViolationMessage } from '../architectureRules'
import {
  jsonRegistry,
  checkPathExistence,
  checkBidirectionalExistence,
  type RegisteredPath,
} from '@app-domain/integrity'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const rule = getRuleById('AR-DOC-STATIC-NUMBER')!

interface DocEntry {
  readonly path: string
  readonly label: string
  readonly categoryId: string
}

// ── domain 経由で registry を一度だけ構築 ──
const docRegistry = jsonRegistry<DocEntry>(
  fs.readFileSync(path.join(PROJECT_ROOT, 'docs/contracts/doc-registry.json'), 'utf-8'),
  (parsed) => {
    const obj = parsed as {
      categories: Array<{
        id: string
        docs: Array<{ path: string; label: string }>
      }>
    }
    return obj.categories.flatMap((c) =>
      c.docs.map((d) => [d.path, { path: d.path, label: d.label, categoryId: c.id }] as const),
    )
  },
  'docs/contracts/doc-registry.json',
)

const allRegisteredPaths: ReadonlySet<string> = new Set(docRegistry.entries.keys())

describe('Doc Registry Guard: ドキュメントレジストリの整合性', () => {
  it('レジストリに登録された全文書が存在する', () => {
    const paths: RegisteredPath[] = [...allRegisteredPaths].map((p) => ({
      absPath: path.join(PROJECT_ROOT, p),
      displayPath: p,
    }))
    const violations = checkPathExistence(paths, fs.existsSync, {
      ruleId: rule.id,
      registryLabel: 'doc-registry.json',
    })
    const missing = violations.map((v) => v.actual.replace(/ \(broken link\)$/, ''))
    expect(missing, formatViolationMessage(rule, missing)).toEqual([])
  })

  it('references/01-principles/ の .md がレジストリに登録されている', () => {
    const dir = path.join(PROJECT_ROOT, 'references/01-principles')
    const actualFiles = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => `references/01-principles/${f}`)

    const violations = checkBidirectionalExistence(allRegisteredPaths, new Set(actualFiles), {
      ruleId: rule.id,
      registryLabel: 'doc-registry',
      sourceLabel: '01-principles/',
      direction: 'source-to-registry',
    })
    const unregistered = violations
      .map((v) => v.location.replace(/^01-principles\/: /, ''))
      .filter((p) => actualFiles.includes(p))

    // ratchet baseline は 0 (固定)。動作同一性: 旧経路と同じく count > 0 で fail
    const UNREGISTERED_BASELINE = 0
    if (unregistered.length < UNREGISTERED_BASELINE) {
      console.log(
        `\n[ratchet-down] 未登録文書が ${UNREGISTERED_BASELINE} → ${unregistered.length} に減少。` +
          `\nUNREGISTERED_BASELINE を ${unregistered.length} に更新してください。`,
      )
    }
    if (unregistered.length > 0) {
      console.log(`\n[Doc Registry] 01-principles/ の未登録 .md:`)
      for (const f of unregistered) console.log(`  ${f}`)
    }
    expect(unregistered.length, formatViolationMessage(rule, unregistered)).toBeLessThanOrEqual(
      UNREGISTERED_BASELINE,
    )
  })

  it('references/03-guides/ の .md がレジストリに登録されている', () => {
    const dir = path.join(PROJECT_ROOT, 'references/03-guides')
    const actualFiles = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => `references/03-guides/${f}`)

    const violations = checkBidirectionalExistence(allRegisteredPaths, new Set(actualFiles), {
      ruleId: rule.id,
      registryLabel: 'doc-registry',
      sourceLabel: '03-guides/',
      direction: 'source-to-registry',
    })
    const unregistered = violations
      .map((v) => v.location.replace(/^03-guides\/: /, ''))
      .filter((p) => actualFiles.includes(p))

    const UNREGISTERED_BASELINE = 0
    if (unregistered.length < UNREGISTERED_BASELINE) {
      console.log(
        `\n[ratchet-down] 未登録文書が ${UNREGISTERED_BASELINE} → ${unregistered.length} に減少。` +
          `\nUNREGISTERED_BASELINE を ${unregistered.length} に更新してください。`,
      )
    }
    if (unregistered.length > 0) {
      console.log(`\n[Doc Registry] 03-guides/ の未登録 .md:`)
      for (const f of unregistered) console.log(`  ${f}`)
    }
    expect(unregistered.length, formatViolationMessage(rule, unregistered)).toBeLessThanOrEqual(
      UNREGISTERED_BASELINE,
    )
  })

  it('references/README.md がレジストリの全カテゴリを参照している', () => {
    const readmePath = path.join(PROJECT_ROOT, 'references/README.md')
    const content = fs.readFileSync(readmePath, 'utf-8')
    const violations: string[] = []

    // entries を categoryId 毎にまとめる必要があるので generic Registry の上でカテゴリ走査
    const categoriesSeen = new Map<string, DocEntry[]>()
    for (const entry of docRegistry.entries.values()) {
      const list = categoriesSeen.get(entry.categoryId) ?? []
      list.push(entry)
      categoriesSeen.set(entry.categoryId, list)
    }
    for (const [catId, docs] of categoriesSeen) {
      // contracts カテゴリは references/ 外なので除外
      if (catId === 'contracts') continue
      for (const doc of docs) {
        // generated ファイルは README に必ずしも載っていない
        if (doc.path.includes('/generated/')) continue
        const fileName = path.basename(doc.path)
        if (!content.includes(fileName)) {
          violations.push(`${doc.path} (${doc.label}) が README.md に記載なし`)
        }
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('CLAUDE.md が参照する子ドキュメントが全て実在する', () => {
    const claudeMd = fs.readFileSync(path.join(PROJECT_ROOT, 'CLAUDE.md'), 'utf-8')
    const refPattern = /`(references\/[^`]+\.(?:md|json))`/g
    const contractPattern = /`(docs\/contracts\/[^`]+\.json)`/g
    const refPaths: RegisteredPath[] = []
    let match: RegExpExecArray | null
    while ((match = refPattern.exec(claudeMd)) !== null) {
      refPaths.push({
        absPath: path.join(PROJECT_ROOT, match[1]),
        displayPath: match[1],
      })
    }
    while ((match = contractPattern.exec(claudeMd)) !== null) {
      refPaths.push({
        absPath: path.join(PROJECT_ROOT, match[1]),
        displayPath: match[1],
      })
    }
    const violations = checkPathExistence(refPaths, fs.existsSync, {
      ruleId: rule.id,
      registryLabel: 'CLAUDE.md',
    })
    const broken = violations.map(
      (v) => `CLAUDE.md → ${v.location.replace(/^CLAUDE\.md: /, '')} がリンク切れ`,
    )
    expect(broken, formatViolationMessage(rule, broken)).toEqual([])
  })

  it('AAG 正本文書が参照する子ドキュメントが全て実在する', () => {
    const aagPath = path.join(
      PROJECT_ROOT,
      'references/01-principles/aag/README.md',
    )
    const content = fs.readFileSync(aagPath, 'utf-8')
    const refPattern = /`(references\/[^`]+\.(?:md|json))`/g
    const refPaths: RegisteredPath[] = []
    let match: RegExpExecArray | null
    while ((match = refPattern.exec(content)) !== null) {
      refPaths.push({
        absPath: path.join(PROJECT_ROOT, match[1]),
        displayPath: match[1],
      })
    }
    const violations = checkPathExistence(refPaths, fs.existsSync, {
      ruleId: rule.id,
      registryLabel: 'AAG 正本',
    })
    const broken = violations.map(
      (v) => `AAG 正本 → ${v.location.replace(/^AAG 正本: /, '')} がリンク切れ`,
    )
    expect(broken, formatViolationMessage(rule, broken)).toEqual([])
  })
})
