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
 * **Phase D Wave 1 (2026-04-28)**: canonicalization-domain-consolidation Phase D で
 * `app-domain/integrity/` 経由の adapter 化。jsonRegistry (test-contract.json 読込) +
 * checkPathExistence (source guard 実在) + checkInclusionByPredicate (token / pair /
 * dynamicSource / sections の CLAUDE.md 包含) に切替。動作同一性は 7 既存 test で検証済。
 *
 * @guard G1 テストに書く / governance-ops
 * ルール定義: architectureRules.ts (AR-DOC-STATIC-NUMBER — 文書品質ガバナンス)
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { getRuleById, formatViolationMessage } from '../architectureRules'
import {
  jsonRegistry,
  checkPathExistence,
  checkInclusionByPredicate,
  type RegisteredPath,
} from '@app-domain/integrity'

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

interface TestContractEnvelope {
  version: string
  owner: string
  rationale: string
  contracts: Contract[]
}

const contractPath = path.join(PROJECT_ROOT, 'docs/contracts/test-contract.json')
const claudeMdPath = path.join(PROJECT_ROOT, 'CLAUDE.md')

// ── domain 経由で test-contract.json を Registry<Contract> に整える ──
const contractRegistry = jsonRegistry<Contract>(
  fs.readFileSync(contractPath, 'utf-8'),
  (parsed) => {
    const env = parsed as TestContractEnvelope
    return env.contracts.map((c) => [c.id, c] as const)
  },
  'docs/contracts/test-contract.json',
)
const testContractRoot = JSON.parse(fs.readFileSync(contractPath, 'utf-8')) as TestContractEnvelope
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
    expect(testContractRoot.version).toBeTruthy()
    expect(testContractRoot.owner).toBeTruthy()
    expect(contractRegistry.entries.size).toBeGreaterThan(0)
  })

  it('各 contract の source guard ファイルが実在する', () => {
    const paths: RegisteredPath[] = [...contractRegistry.entries.values()].map((c) => ({
      absPath: path.join(PROJECT_ROOT, c.source),
      displayPath: c.source,
      registryLocation: `contract '${c.id}' の source ${c.source}`,
    }))
    const violations = checkPathExistence(paths, fs.existsSync, {
      ruleId: rule.id,
      registryLabel: 'test-contract.json',
    })
    const missing = violations.map((v) => `${v.location} が存在しない`)
    expect(missing, formatViolationMessage(rule, missing)).toEqual([])
  })

  it('tokens 契約: 各トークンが CLAUDE.md に出現する', () => {
    const violations: string[] = []
    for (const c of contractRegistry.entries.values()) {
      if (!('tokens' in c)) continue
      const tokens = new Set((c as TokenContract).tokens)
      const reports = checkInclusionByPredicate(tokens, (t) => claudeMd.includes(t), {
        ruleId: rule.id,
        subsetLabel: `contract '${c.id}'`,
        supersetLabel: 'CLAUDE.md',
      })
      for (const r of reports) {
        const token = r.location.replace(/^CLAUDE\.md: /, '')
        violations.push(`contract '${c.id}': トークン '${token}' が CLAUDE.md に出現しない`)
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('dynamicSource 契約: 動的に列挙された全項目が CLAUDE.md に出現する', () => {
    const violations: string[] = []
    for (const c of contractRegistry.entries.values()) {
      if (!('dynamicSource' in c)) continue
      const items = new Set(listDir((c as DynamicContract).dynamicSource))
      const reports = checkInclusionByPredicate(items, (item) => claudeMd.includes(item), {
        ruleId: rule.id,
        subsetLabel: `contract '${c.id}'`,
        supersetLabel: 'CLAUDE.md',
      })
      for (const r of reports) {
        const item = r.location.replace(/^CLAUDE\.md: /, '')
        violations.push(
          `contract '${c.id}': ${(c as DynamicContract).dynamicSource}/${item} が CLAUDE.md に出現しない`,
        )
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('sections 契約: GENERATED:START/END マーカー対が CLAUDE.md に存在する', () => {
    const violations: string[] = []
    for (const c of contractRegistry.entries.values()) {
      if (!('sections' in c)) continue
      const markers = new Set<string>()
      for (const sec of (c as SectionContract).sections) {
        markers.add(`<!-- GENERATED:START ${sec} -->`)
        markers.add(`<!-- GENERATED:END ${sec} -->`)
      }
      const reports = checkInclusionByPredicate(markers, (m) => claudeMd.includes(m), {
        ruleId: rule.id,
        subsetLabel: `contract '${c.id}'`,
        supersetLabel: 'CLAUDE.md',
      })
      for (const r of reports) {
        const marker = r.location.replace(/^CLAUDE\.md: /, '')
        violations.push(`contract '${c.id}': '${marker}' マーカーが CLAUDE.md に存在しない`)
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('pairs 契約: 各 function と doc のペアが CLAUDE.md に共起する', () => {
    const violations: string[] = []
    for (const c of contractRegistry.entries.values()) {
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

    // 旧 inline `expect(content).toContain('xxx')` パターン + 新 adapter
    // `requiredTokens = new Set([...])` パターンの両方を抽出 (Phase D refactor 後の互換)
    const required = new Set<string>()
    const reToContain = /expect\(content\)\.toContain\(\s*['"]([^'"]+)['"]\s*\)/g
    let m: RegExpExecArray | null
    while ((m = reToContain.exec(guardSrc)) !== null) {
      required.add(m[1])
    }
    const reSetLiteral = /requiredTokens\s*=\s*new\s+Set\(\s*\[([\s\S]*?)\]\s*\)/
    const setMatch = guardSrc.match(reSetLiteral)
    if (setMatch) {
      const reItem = /['"]([^'"]+)['"]/g
      while ((m = reItem.exec(setMatch[1])) !== null) {
        required.add(m[1])
      }
    }

    const declared = new Set<string>()
    for (const c of contractRegistry.entries.values()) {
      if ('tokens' in c) {
        for (const t of c.tokens) declared.add(t)
      }
    }

    const undeclared = [...required].filter((t) => !declared.has(t))
    if (undeclared.length > 0) {
      const hint = '\ndocs/contracts/test-contract.json の tokens 契約に上記を追加してください。'
      expect(undeclared, formatViolationMessage(rule, undeclared) + hint).toEqual([])
    }
  })
})
