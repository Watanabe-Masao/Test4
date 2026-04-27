/**
 * Test Contract Guard — CLAUDE.md テスト契約の整合性検証
 *
 * docs/contracts/test-contract.json で宣言された各 contract が
 * CLAUDE.md 内で満たされているかを検証する。
 *
 * 暗黙のテスト依存（『この guard が CLAUDE.md にこのトークンを要求している』）を
 * 明示化し、CLAUDE.md の安全な編集と将来の構造的変更を可能にする AAG 拡張。
 *
 * - tokens: CLAUDE.md に文字列として出現すること
 * - dynamicSource: 該当ディレクトリ配下の全項目が CLAUDE.md に出現すること
 * - sections: GENERATED:START/END マーカー対が存在すること
 * - pairs: 関数名と定義書名のペアが共起すること
 *
 * @guard G1 テストに書く / governance-ops
 * ルール定義: architectureRules.ts (AR-DOC-STATIC-NUMBER — 文書品質ガバナンス)
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const rule = getRuleById('AR-DOC-STATIC-NUMBER')!

interface TokenContract {
  id: string
  label: string
  source: string
  verification: string
  tokens: string[]
}
interface DynamicContract {
  id: string
  label: string
  source: string
  verification: string
  dynamicSource: string
}
interface SectionContract {
  id: string
  label: string
  source: string
  verification: string
  sections: string[]
}
interface PairContract {
  id: string
  label: string
  source: string
  verification: string
  pairs: { function: string; doc: string }[]
}
interface NoteContract {
  id: string
  label: string
  source: string
  verification: string
}
type Contract = TokenContract | DynamicContract | SectionContract | PairContract | NoteContract

interface TestContract {
  version: string
  owner: string
  rationale: string
  contracts: Contract[]
}

const contractPath = path.join(PROJECT_ROOT, 'docs/contracts/test-contract.json')
const claudeMdPath = path.join(PROJECT_ROOT, 'CLAUDE.md')
const testContract: TestContract = JSON.parse(fs.readFileSync(contractPath, 'utf-8'))
const claudeMd = fs.readFileSync(claudeMdPath, 'utf-8')

function listDir(relDir: string): string[] {
  const dir = path.join(PROJECT_ROOT, relDir)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
}

describe('Test Contract Guard: docs/contracts/test-contract.json と CLAUDE.md の整合性', () => {
  it('test-contract.json が読み込める', () => {
    expect(testContract.version).toBeTruthy()
    expect(testContract.owner).toBeTruthy()
    expect(testContract.contracts.length).toBeGreaterThan(0)
  })

  it('各 contract の source guard ファイルが実在する', () => {
    const missing: string[] = []
    for (const c of testContract.contracts) {
      const sourcePath = path.join(PROJECT_ROOT, c.source)
      if (!fs.existsSync(sourcePath)) {
        missing.push(`contract '${c.id}' の source ${c.source} が存在しない`)
      }
    }
    expect(missing, formatViolationMessage(rule, missing)).toEqual([])
  })

  it('tokens 契約: 各トークンが CLAUDE.md に出現する', () => {
    const violations: string[] = []
    for (const c of testContract.contracts) {
      if (!('tokens' in c)) continue
      for (const token of (c as TokenContract).tokens) {
        if (!claudeMd.includes(token)) {
          violations.push(`contract '${c.id}': トークン '${token}' が CLAUDE.md に出現しない`)
        }
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('dynamicSource 契約: 動的に列挙された全項目が CLAUDE.md に出現する', () => {
    const violations: string[] = []
    for (const c of testContract.contracts) {
      if (!('dynamicSource' in c)) continue
      const items = listDir((c as DynamicContract).dynamicSource)
      for (const item of items) {
        if (!claudeMd.includes(item)) {
          violations.push(
            `contract '${c.id}': ${(c as DynamicContract).dynamicSource}/${item} が CLAUDE.md に出現しない`,
          )
        }
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('sections 契約: GENERATED:START/END マーカー対が CLAUDE.md に存在する', () => {
    const violations: string[] = []
    for (const c of testContract.contracts) {
      if (!('sections' in c)) continue
      for (const sec of (c as SectionContract).sections) {
        const start = `<!-- GENERATED:START ${sec} -->`
        const end = `<!-- GENERATED:END ${sec} -->`
        if (!claudeMd.includes(start)) {
          violations.push(`contract '${c.id}': '${start}' マーカーが CLAUDE.md に存在しない`)
        }
        if (!claudeMd.includes(end)) {
          violations.push(`contract '${c.id}': '${end}' マーカーが CLAUDE.md に存在しない`)
        }
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('pairs 契約: 各 function と doc のペアが CLAUDE.md に共起する', () => {
    const violations: string[] = []
    for (const c of testContract.contracts) {
      if (!('pairs' in c)) continue
      for (const pair of (c as PairContract).pairs) {
        if (!claudeMd.includes(pair.function)) {
          violations.push(`contract '${c.id}': 関数 '${pair.function}' が CLAUDE.md に出現しない`)
        }
        if (!claudeMd.includes(pair.doc)) {
          violations.push(`contract '${c.id}': 定義書 '${pair.doc}' が CLAUDE.md に出現しない`)
        }
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  // ── reverse direction: 既存 guard の暗黙要求 ↔ 宣言の整合 ────────────────
  // 各 source guard が実際に要求しているトークンが、test-contract.json に
  // 宣言されているか確認する。drift の片方向検出。

  it('canonicalizationSystemGuard が要求するトークンが全て tokens 契約に宣言されている', () => {
    const sourcePath = path.join(
      PROJECT_ROOT,
      'app/src/test/guards/canonicalizationSystemGuard.test.ts',
    )
    if (!fs.existsSync(sourcePath)) return
    const guardSrc = fs.readFileSync(sourcePath, 'utf-8')

    // expect(content).toContain('xxx') の引数を抽出（簡易パース）
    const required: string[] = []
    const re = /expect\(content\)\.toContain\(\s*['"]([^'"]+)['"]\s*\)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(guardSrc)) !== null) {
      required.push(m[1])
    }

    // tokens 契約のいずれかに宣言されているか
    const declared = new Set<string>()
    for (const c of testContract.contracts) {
      if ('tokens' in c) {
        for (const t of c.tokens) declared.add(t)
      }
    }

    const undeclared = required.filter((t) => !declared.has(t))
    if (undeclared.length > 0) {
      const hint = '\ndocs/contracts/test-contract.json の tokens 契約に上記を追加してください。'
      expect(undeclared, formatViolationMessage(rule, undeclared) + hint).toEqual([])
    }
  })
})
