/**
 * Doc Registry Guard — ドキュメントレジストリとファイルシステムの整合性検証
 *
 * docs/contracts/doc-registry.json に登録された全正本文書が実在するか、
 * また実在する文書がレジストリに登録されているかを双方向に検証する。
 *
 * ドキュメント品質層のガード。
 *
 * @guard G1 テストに書く
 * ルール定義: architectureRules.ts (AR-DOC-STATIC-NUMBER)
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const rule = getRuleById('AR-DOC-STATIC-NUMBER')!

interface DocEntry {
  path: string
  label: string
}
interface DocCategory {
  id: string
  title: string
  docs: DocEntry[]
}
interface DocRegistry {
  categories: DocCategory[]
}

const registry: DocRegistry = JSON.parse(
  fs.readFileSync(path.join(PROJECT_ROOT, 'docs/contracts/doc-registry.json'), 'utf-8'),
)

const allRegisteredPaths = new Set(registry.categories.flatMap((c) => c.docs.map((d) => d.path)))

describe('Doc Registry Guard: ドキュメントレジストリの整合性', () => {
  it('レジストリに登録された全文書が存在する', () => {
    const missing: string[] = []
    for (const docPath of allRegisteredPaths) {
      const fullPath = path.join(PROJECT_ROOT, docPath)
      if (!fs.existsSync(fullPath)) {
        missing.push(docPath)
      }
    }
    expect(missing, formatViolationMessage(rule, missing)).toEqual([])
  })

  it('references/01-principles/ の .md がレジストリに登録されている', () => {
    const dir = path.join(PROJECT_ROOT, 'references/01-principles')
    const actualFiles = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => `references/01-principles/${f}`)

    const unregistered = actualFiles.filter((f) => !allRegisteredPaths.has(f))

    // 未登録ファイルを検出（ratchet-down）
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

    const unregistered = actualFiles.filter((f) => !allRegisteredPaths.has(f))

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

    for (const cat of registry.categories) {
      // contracts カテゴリは references/ 外なので除外
      if (cat.id === 'contracts') continue
      for (const doc of cat.docs) {
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
    // `references/...` や `docs/contracts/...` のパスを抽出
    const refPattern = /`(references\/[^`]+\.(?:md|json))`/g
    const contractPattern = /`(docs\/contracts\/[^`]+\.json)`/g
    const violations: string[] = []
    let match: RegExpExecArray | null

    while ((match = refPattern.exec(claudeMd)) !== null) {
      const refPath = match[1]
      if (!fs.existsSync(path.join(PROJECT_ROOT, refPath))) {
        violations.push(`CLAUDE.md → ${refPath} がリンク切れ`)
      }
    }
    while ((match = contractPattern.exec(claudeMd)) !== null) {
      const refPath = match[1]
      if (!fs.existsSync(path.join(PROJECT_ROOT, refPath))) {
        violations.push(`CLAUDE.md → ${refPath} がリンク切れ`)
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('AAG 正本文書が参照する子ドキュメントが全て実在する', () => {
    const aagPath = path.join(
      PROJECT_ROOT,
      'references/01-principles/adaptive-architecture-governance.md',
    )
    const content = fs.readFileSync(aagPath, 'utf-8')
    const refPattern = /`(references\/[^`]+\.(?:md|json))`/g
    const violations: string[] = []
    let match: RegExpExecArray | null

    while ((match = refPattern.exec(content)) !== null) {
      const refPath = match[1]
      if (!fs.existsSync(path.join(PROJECT_ROOT, refPath))) {
        violations.push(`AAG 正本 → ${refPath} がリンク切れ`)
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })
})
