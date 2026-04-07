/**
 * Architecture Rule Guard — ルール定義の整合性検証
 *
 * Architecture Rule レジストリ自体の品質を保証する。
 * ルール ID の一意性、タグ参照の妥当性、必須フィールドの検証。
 *
 * @guard G1 テストに書く
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { ARCHITECTURE_RULES } from '../architectureRules'
import { GUARD_TAG_REGISTRY } from '../guardTagRegistry'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')

describe('Architecture Rule Registry', () => {
  it('全ルール ID が一意', () => {
    const ids = ARCHITECTURE_RULES.map((r) => r.id)
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(duplicates, `重複 ID: ${duplicates.join(', ')}`).toEqual([])
  })

  it('全 guardTag が GUARD_TAG_REGISTRY に存在する', () => {
    const validTags = new Set(Object.keys(GUARD_TAG_REGISTRY))
    const invalid: string[] = []

    for (const rule of ARCHITECTURE_RULES) {
      for (const tag of rule.guardTags) {
        if (!validTags.has(tag)) {
          invalid.push(`${rule.id}: guardTag "${tag}" は GUARD_TAG_REGISTRY に存在しない`)
        }
      }
    }

    expect(invalid, invalid.join('\n')).toEqual([])
  })

  it('gate severity + count 型のルールは baseline または thresholds を持つ', () => {
    const missing: string[] = []

    for (const rule of ARCHITECTURE_RULES) {
      if (rule.detection.severity === 'gate' && rule.detection.type === 'count') {
        const hasBaseline = rule.detection.baseline !== undefined
        const hasThresholds = rule.thresholds !== undefined
        if (!hasBaseline && !hasThresholds) {
          missing.push(`${rule.id}: gate+count だが baseline も thresholds もない`)
        }
      }
    }

    expect(missing, missing.join('\n')).toEqual([])
  })

  it('全ルールに what / why / correctPattern.description がある', () => {
    const incomplete: string[] = []

    for (const rule of ARCHITECTURE_RULES) {
      if (!rule.what) incomplete.push(`${rule.id}: what が空`)
      if (!rule.why) incomplete.push(`${rule.id}: why が空`)
      if (!rule.correctPattern.description) {
        incomplete.push(`${rule.id}: correctPattern.description が空`)
      }
    }

    expect(incomplete, incomplete.join('\n')).toEqual([])
  })

  it('migrationPath がある場合は steps が空でない', () => {
    const invalid: string[] = []

    for (const rule of ARCHITECTURE_RULES) {
      if (rule.migrationPath && rule.migrationPath.steps.length === 0) {
        invalid.push(`${rule.id}: migrationPath.steps が空`)
      }
    }

    expect(invalid, invalid.join('\n')).toEqual([])
  })

  it('relationships の参照先ルールが全て存在する', () => {
    const allIds = new Set(ARCHITECTURE_RULES.map((r) => r.id))
    const invalid: string[] = []

    for (const rule of ARCHITECTURE_RULES) {
      if (!rule.relationships) continue
      const refs = [
        ...(rule.relationships.dependsOn ?? []),
        ...(rule.relationships.enables ?? []),
        ...(rule.relationships.conflicts ?? []),
      ]
      for (const ref of refs) {
        if (!allIds.has(ref)) {
          invalid.push(`${rule.id}: relationships が存在しないルール "${ref}" を参照`)
        }
      }
    }

    expect(invalid, invalid.join('\n')).toEqual([])
  })

  it('doc 参照が全て実在するファイルを指す', () => {
    const invalid: string[] = []

    for (const rule of ARCHITECTURE_RULES) {
      if (!rule.doc) continue
      const docPath = path.join(PROJECT_ROOT, rule.doc)
      if (!fs.existsSync(docPath)) {
        invalid.push(`${rule.id}: doc "${rule.doc}" が存在しない`)
      }
    }

    expect(invalid, invalid.join('\n')).toEqual([])
  })

  it('doc 参照カバレッジ（情報出力）', () => {
    const withDoc = ARCHITECTURE_RULES.filter((r) => r.doc).length
    const total = ARCHITECTURE_RULES.length
    const docs = new Set(ARCHITECTURE_RULES.filter((r) => r.doc).map((r) => r.doc!))

    console.log(
      `[doc カバレッジ] ${withDoc}/${total} ルールが doc 参照あり | ` +
        `${docs.size} 種類のドキュメントを参照`,
    )
    for (const doc of [...docs].sort()) {
      const count = ARCHITECTURE_RULES.filter((r) => r.doc === doc).length
      console.log(`  ${doc}: ${count} ルール`)
    }

    expect(true).toBe(true)
  })

  it('allowlist の ruleId が全て有効な Architecture Rule を指す', () => {
    const allIds = new Set(ARCHITECTURE_RULES.map((r) => r.id))
    const allowlistDir = path.resolve(__dirname, '../allowlists')
    const files = fs.readdirSync(allowlistDir).filter((f) => f.endsWith('.ts') && f !== 'types.ts')
    const invalid: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(path.join(allowlistDir, file), 'utf-8')
      const ruleIdMatches = content.matchAll(/ruleId:\s*'([^']+)'/g)
      for (const match of ruleIdMatches) {
        if (!allIds.has(match[1])) {
          invalid.push(`${file}: ruleId '${match[1]}' は存在しないルール`)
        }
      }
    }

    expect(invalid, invalid.join('\n')).toEqual([])
  })

  it('allowlist 卒業候補の検出（情報出力）', () => {
    const allowlistDir = path.resolve(__dirname, '../allowlists')
    const files = fs.readdirSync(allowlistDir).filter((f) => f.endsWith('.ts') && f !== 'types.ts')
    const candidates: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(path.join(allowlistDir, file), 'utf-8')
      // 空配列のエクスポートを検出（卒業済み）
      const emptyArrays = content.matchAll(/export const (\w+).*?=\s*\[\s*\]\s*as const/g)
      for (const match of emptyArrays) {
        candidates.push(`${file}: ${match[1]} は空（卒業済み — 削除可能）`)
      }
    }

    if (candidates.length > 0) {
      console.log(`\n[allowlist 卒業候補] ${candidates.length} 件:`)
      for (const c of candidates) console.log(`  ${c}`)
    }

    expect(true).toBe(true)
  })

  // ── ルール健全性評価 ──

  it('例外圧が高いルールを検出（ルール見直し候補）', () => {
    const allowlistDir = path.resolve(__dirname, '../allowlists')
    const files = fs.readdirSync(allowlistDir).filter((f) => f.endsWith('.ts') && f !== 'types.ts')

    // ruleId ごとの例外数を集計
    const exceptionCount = new Map<string, number>()
    for (const file of files) {
      const content = fs.readFileSync(path.join(allowlistDir, file), 'utf-8')
      for (const match of content.matchAll(/ruleId:\s*'([^']+)'/g)) {
        exceptionCount.set(match[1], (exceptionCount.get(match[1]) ?? 0) + 1)
      }
    }

    const EXCEPTION_PRESSURE_THRESHOLD = 10
    const highPressure: string[] = []

    for (const [ruleId, count] of exceptionCount) {
      if (count >= EXCEPTION_PRESSURE_THRESHOLD) {
        const rule = ARCHITECTURE_RULES.find((r) => r.id === ruleId)
        highPressure.push(`${ruleId}: ${count} 件の例外（${rule?.what ?? '不明'}）`)
      }
    }

    if (highPressure.length > 0) {
      console.log(
        `\n[例外圧 警告] ${highPressure.length} ルールが閾値 ${EXCEPTION_PRESSURE_THRESHOLD} 以上:`,
      )
      for (const h of highPressure) console.log(`  ${h}`)
      console.log('  → ルール自体が現実に合っていない可能性。見直しを検討')
    }

    // 例外圧レポート（全ルール）
    const sorted = [...exceptionCount.entries()].sort((a, b) => b[1] - a[1])
    if (sorted.length > 0) {
      console.log(`\n[例外圧レポート] ruleId 別の例外数:`)
      for (const [ruleId, count] of sorted) {
        console.log(`  ${ruleId}: ${count}`)
      }
    }

    expect(true).toBe(true)
  })

  it('experimental ルールが gate で運用されていない', () => {
    const violations: string[] = []

    for (const rule of ARCHITECTURE_RULES) {
      if (rule.maturity === 'experimental' && rule.detection.severity === 'gate') {
        violations.push(
          `${rule.id}: experimental なのに gate。パターンが安定するまで warn にすべき`,
        )
      }
    }

    expect(violations, violations.join('\n')).toEqual([])
  })

  it('deprecated ルールが存在しない（存在したら削除を促す）', () => {
    const deprecated = ARCHITECTURE_RULES.filter((r) => r.maturity === 'deprecated')

    if (deprecated.length > 0) {
      console.log(`\n[deprecated ルール] ${deprecated.length} 件 — 削除を検討:`)
      for (const r of deprecated) console.log(`  ${r.id}: ${r.what}`)
    }

    expect(true).toBe(true)
  })

  it('ルール数サマリー', () => {
    const byType = new Map<string, number>()
    let withMigration = 0
    let withDecision = 0
    let withRelationships = 0
    for (const rule of ARCHITECTURE_RULES) {
      byType.set(rule.detection.type, (byType.get(rule.detection.type) ?? 0) + 1)
      if (rule.migrationPath) withMigration++
      if (rule.decisionCriteria) withDecision++
      if (rule.relationships) withRelationships++
    }

    const experimental = ARCHITECTURE_RULES.filter((r) => r.maturity === 'experimental').length
    const deprecated = ARCHITECTURE_RULES.filter((r) => r.maturity === 'deprecated').length
    const stable = ARCHITECTURE_RULES.length - experimental - deprecated

    const summary = [...byType.entries()].map(([type, count]) => `  ${type}: ${count}`).join('\n')
    console.log(
      `[Architecture Rules] ${ARCHITECTURE_RULES.length} rules (stable: ${stable}, experimental: ${experimental}, deprecated: ${deprecated})\n${summary}\n` +
        `  migrationPath: ${withMigration} | decisionCriteria: ${withDecision} | relationships: ${withRelationships}`,
    )
  })
})
