/**
 * Test Contract Collector — CLAUDE.md テスト契約の整合性 KPI を収集
 *
 * docs/contracts/test-contract.json で宣言された各 contract が
 * CLAUDE.md 内で満たされているかを集計し、KPI として出力する。
 *
 * 詳細検証は app/src/test/guards/testContractGuard.test.ts が担う。
 * collector は KPI 数値（満たされた契約数 / 違反数）と
 * generated section 用の rendering を提供する。
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import type { HealthKpi } from '../types.js'

interface TokenContract {
  readonly id: string
  readonly label: string
  readonly source: string
  readonly verification: string
  readonly tokens: readonly string[]
}
interface DynamicContract {
  readonly id: string
  readonly label: string
  readonly source: string
  readonly verification: string
  readonly dynamicSource: string
}
interface SectionContract {
  readonly id: string
  readonly label: string
  readonly source: string
  readonly verification: string
  readonly sections: readonly string[]
}
interface PairContract {
  readonly id: string
  readonly label: string
  readonly source: string
  readonly verification: string
  readonly pairs: readonly { readonly function: string; readonly doc: string }[]
}
interface NoteContract {
  readonly id: string
  readonly label: string
  readonly source: string
  readonly verification: string
}

type Contract =
  | TokenContract
  | DynamicContract
  | SectionContract
  | PairContract
  | NoteContract

interface TestContract {
  readonly version: string
  readonly owner: string
  readonly rationale: string
  readonly contracts: readonly Contract[]
}

interface ContractCheckResult {
  readonly id: string
  readonly label: string
  readonly source: string
  readonly satisfied: boolean
  readonly missing: readonly string[]
}

function listFeatureModules(repoRoot: string, dynamicSource: string): string[] {
  const dir = resolve(repoRoot, dynamicSource)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => statSync(resolve(dir, f)).isDirectory())
    .sort()
}

function checkContract(
  contract: Contract,
  claudeMd: string,
  repoRoot: string,
): ContractCheckResult {
  const missing: string[] = []

  if ('tokens' in contract) {
    for (const t of contract.tokens) {
      if (!claudeMd.includes(t)) missing.push(t)
    }
  } else if ('dynamicSource' in contract) {
    const items = listFeatureModules(repoRoot, contract.dynamicSource)
    for (const m of items) {
      if (!claudeMd.includes(m)) missing.push(m)
    }
  } else if ('sections' in contract) {
    for (const s of contract.sections) {
      const start = `<!-- GENERATED:START ${s} -->`
      const end = `<!-- GENERATED:END ${s} -->`
      if (!claudeMd.includes(start) || !claudeMd.includes(end)) {
        missing.push(s)
      }
    }
  } else if ('pairs' in contract) {
    for (const p of contract.pairs) {
      if (!claudeMd.includes(p.function) || !claudeMd.includes(p.doc)) {
        missing.push(`${p.function} ↔ ${p.doc}`)
      }
    }
  }
  // NoteContract は collector では検証しない（動的検証は guard 側で実施）

  return {
    id: contract.id,
    label: contract.label,
    source: contract.source,
    satisfied: missing.length === 0,
    missing,
  }
}

export interface TestContractSnapshot {
  readonly contract: TestContract | null
  readonly results: readonly ContractCheckResult[]
  readonly satisfiedCount: number
  readonly violationCount: number
}

export function collectTestContractSnapshot(repoRoot: string): TestContractSnapshot {
  const contractPath = resolve(repoRoot, 'docs/contracts/test-contract.json')
  if (!existsSync(contractPath)) {
    return { contract: null, results: [], satisfiedCount: 0, violationCount: 0 }
  }

  const contract: TestContract = JSON.parse(readFileSync(contractPath, 'utf-8'))
  const claudeMdPath = resolve(repoRoot, 'CLAUDE.md')
  if (!existsSync(claudeMdPath)) {
    return { contract, results: [], satisfiedCount: 0, violationCount: contract.contracts.length }
  }

  const claudeMd = readFileSync(claudeMdPath, 'utf-8')
  const results = contract.contracts.map((c) => checkContract(c, claudeMd, repoRoot))
  const satisfiedCount = results.filter((r) => r.satisfied).length
  const violationCount = results.filter((r) => !r.satisfied).length

  return { contract, results, satisfiedCount, violationCount }
}

export function collectFromTestContract(repoRoot: string): HealthKpi[] {
  const snapshot = collectTestContractSnapshot(repoRoot)
  if (!snapshot.contract) return []

  const totalContracts = snapshot.contract.contracts.length

  return [
    {
      id: 'docs.testContract.declared',
      label: 'CLAUDE.md テスト契約宣言数',
      category: 'docs',
      value: totalContracts,
      unit: 'count',
      status: 'ok',
      owner: 'documentation-steward',
      docRefs: [{ kind: 'definition', path: 'docs/contracts/test-contract.json' }],
      implRefs: [
        'tools/architecture-health/src/collectors/test-contract-collector.ts',
        'app/src/test/guards/testContractGuard.test.ts',
      ],
    },
    {
      id: 'docs.testContract.violations',
      label: 'CLAUDE.md テスト契約違反数',
      category: 'docs',
      value: snapshot.violationCount,
      unit: 'count',
      status: snapshot.violationCount === 0 ? 'ok' : 'fail',
      budget: 0,
      owner: 'documentation-steward',
      docRefs: [{ kind: 'definition', path: 'docs/contracts/test-contract.json' }],
      implRefs: ['app/src/test/guards/testContractGuard.test.ts'],
    },
  ]
}

/**
 * Generated section 用のコンパクトテーブルをレンダリングする。
 * CLAUDE.md の <!-- GENERATED:START test-contract --> ブロックに埋め込まれる。
 */
export function renderTestContractSection(repoRoot: string): string {
  const snapshot = collectTestContractSnapshot(repoRoot)
  if (!snapshot.contract) {
    return '> test-contract.json が見つかりません'
  }

  const lines: string[] = []
  lines.push('| Contract | Source guard | 検証内容 | 状態 |')
  lines.push('|---|---|---|---|')

  for (const result of snapshot.results) {
    const sourceShort = result.source.replace(/^app\/src\/test\/guards\//, '')
    const contract = snapshot.contract.contracts.find((c) => c.id === result.id)!
    const status = result.satisfied ? 'OK' : `FAIL: ${result.missing.length} 件不足`
    lines.push(
      `| \`${result.id}\` | \`${sourceShort}\` | ${contract.verification} | ${status} |`,
    )
  }

  lines.push('')
  lines.push(
    `> 生成: ${new Date().toISOString()} — 正本: \`docs/contracts/test-contract.json\` — ${snapshot.satisfiedCount}/${snapshot.contract.contracts.length} 契約満足`,
  )

  return lines.join('\n')
}
