/**
 * RepoSteward Command Registry Sync Guard — v4.2 seed (= reposteward-substrate-v4-2-seed)
 *
 * 目的: aag describe / list の commandTable (= aag-engine/internal/describe/describe.go)
 * と main.go dispatcher (= aag-engine/cmd/aag/main.go) と usage.go (= aag-engine/cmd/aag/usage.go)
 * の **三方向 drift を機械検証**。AI session が読む command surface registry が
 * dispatcher と usage と齟齬しないことを保証する。
 *
 * 検証 4 軸:
 *   - R1: describe table の各 command name の **first word** が dispatcher case に articulate
 *   - R2: describe table の各 command name が usage.go の COMMANDS section に articulate
 *   - R3: dispatcher の各 case が describe table または special (= help / unknown) に articulate
 *   - R4: describe table の各 entry に whyExists / enables / relatedCommands が factual articulate
 *         (= 空 string / 空 array は drift signal)
 *
 * Substrate philosophy:
 *   - 本 guard は **AAG self-test** (= AAG 自身の正しさを machine-verify)
 *   - AI を縛る guard ではない (= command 追加は freely possible、ただし 3 file 同期が articulate される)
 *   - regex 解析 (= Go AST 不使用、軽量) — false positive 時は describe.go の format を articulate
 *
 * @guard G1 テストに書く
 *
 * @responsibility R:guard
 * @taxonomyKind T:meta-guard
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const DESCRIBE_GO = path.join(PROJECT_ROOT, 'aag-engine/internal/describe/describe.go')
const MAIN_GO = path.join(PROJECT_ROOT, 'aag-engine/cmd/aag/main.go')
const USAGE_GO = path.join(PROJECT_ROOT, 'aag-engine/cmd/aag/usage.go')

// dispatcher special cases (= 不明 command / help は describe table に articulate されない)
const DISPATCHER_SPECIAL_CASES = new Set(['--help', '-h', 'help'])

function readFile(p: string): string {
  return fs.readFileSync(p, 'utf-8')
}

/**
 * describe.go から commandTable の Name field 一覧を抽出する。
 * Format: `Name:            "validate",` 等の line を articulate。
 */
function extractDescribeCommandNames(source: string): string[] {
  const matches = source.matchAll(/Name:\s+"([^"]+)"/g)
  return [...matches].map((m) => m[1])
}

/**
 * describe.go から各 entry の whyExists / Enables / RelatedCommands を抽出する。
 * 軽量 parse: Name から次の Name までの block を articulate する。
 */
function extractDescribeEntries(
  source: string,
): Array<{ name: string; whyExists: string; enables: string[]; related: string[] }> {
  const result: Array<{ name: string; whyExists: string; enables: string[]; related: string[] }> =
    []
  // commandTable block を articulate
  const tableMatch = source.match(
    /var commandTable = \[\]CommandMetadata\{([\s\S]+?)\n\}\n\n\/\/ Describe/,
  )
  if (!tableMatch) return result
  const body = tableMatch[1]

  // 各 entry block (= { ... }, ) を articulate
  // entry は Name から次の Name の前 } まで
  const entryPattern = /\{[\s\S]+?\n\t\},/g
  for (const match of body.matchAll(entryPattern)) {
    const block = match[0]
    const nameMatch = block.match(/Name:\s+"([^"]+)"/)
    if (!nameMatch) continue
    const name = nameMatch[1]
    const whyMatch = block.match(/WhyExists:\s+"([^"]*)"/)
    const enablesMatch = block.match(/Enables:\s+\[\]string\{([^}]*)\}/)
    const relatedMatch = block.match(/RelatedCommands:\s+\[\]string\{([^}]*)\}/)
    const enables: string[] = enablesMatch
      ? [...enablesMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
      : []
    const related: string[] = relatedMatch
      ? [...relatedMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
      : []
    result.push({
      name,
      whyExists: whyMatch ? whyMatch[1] : '',
      enables,
      related,
    })
  }
  return result
}

/**
 * main.go の switch args[0] block から case "<name>": の name 一覧を抽出する。
 */
function extractDispatcherCases(source: string): string[] {
  const switchMatch = source.match(/switch args\[0\] \{([\s\S]+?)\n\t\}/)
  if (!switchMatch) return []
  const body = switchMatch[1]
  const cases: string[] = []
  for (const m of body.matchAll(/case ([^:]+):/g)) {
    // case "X", "Y", "Z": の articulate も articulate
    const inner = m[1]
    for (const lit of inner.matchAll(/"([^"]+)"/g)) {
      cases.push(lit[1])
    }
  }
  return cases
}

/**
 * usage.go の usage const 内 articulate (= COMMANDS section + 各 line に command 名が articulate される) を文字列として articulate。
 */
function readUsageString(source: string): string {
  const match = source.match(/const usage = `([\s\S]+?)`/)
  return match ? match[1] : ''
}

describe('RepoSteward Command Registry Sync Guard', () => {
  const describeGo = readFile(DESCRIBE_GO)
  const mainGo = readFile(MAIN_GO)
  const usageGo = readFile(USAGE_GO)

  const describeNames = extractDescribeCommandNames(describeGo)
  const dispatcherCases = extractDispatcherCases(mainGo)
  const usageString = readUsageString(usageGo)

  it('R0 smoke: 全 source file が読める + table 抽出が空でない', () => {
    expect(
      describeNames.length,
      'describe table から 1 件以上の command が抽出されること',
    ).toBeGreaterThan(0)
    expect(
      dispatcherCases.length,
      'main.go dispatcher から 1 件以上の case が抽出されること',
    ).toBeGreaterThan(0)
    expect(usageString.length, 'usage.go の usage const が抽出されること').toBeGreaterThan(0)
  })

  it('R1: describe table の各 command name の first word が dispatcher case に articulate されている', () => {
    const dispatcherSet = new Set(dispatcherCases)
    const violations: string[] = []
    for (const name of describeNames) {
      const firstWord = name.split(' ')[0]
      if (!dispatcherSet.has(firstWord)) {
        violations.push(
          `describe table has "${name}" but main.go dispatcher has no case for "${firstWord}"`,
        )
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('R2: describe table の各 command name が usage.go の COMMANDS section に articulate されている', () => {
    const violations: string[] = []
    for (const name of describeNames) {
      if (!usageString.includes(name)) {
        violations.push(`describe table has "${name}" but usage.go does not articulate it`)
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('R3: dispatcher の各 case が describe table または special (= help / unknown) に articulate されている', () => {
    const describeFirstWords = new Set(describeNames.map((n) => n.split(' ')[0]))
    const violations: string[] = []
    for (const c of dispatcherCases) {
      if (DISPATCHER_SPECIAL_CASES.has(c)) continue
      if (!describeFirstWords.has(c)) {
        violations.push(
          `main.go dispatcher has case "${c}" but describe table has no command starting with "${c}"`,
        )
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('R4: describe table の各 entry に whyExists / enables / relatedCommands が factual articulate されている', () => {
    const entries = extractDescribeEntries(describeGo)
    const violations: string[] = []
    for (const e of entries) {
      if (!e.whyExists) {
        violations.push(`describe entry "${e.name}": whyExists が空 (= factual articulate 必須)`)
      }
      if (e.enables.length === 0) {
        violations.push(
          `describe entry "${e.name}": enables が空配列 (= factual capability articulate 必須、最低 1 件)`,
        )
      }
      // relatedCommands は 0 件許容 (= isolated command も許容、ただし articulate されていない場合は signal)
    }
    expect(violations, violations.join('\n')).toEqual([])
  })
})
