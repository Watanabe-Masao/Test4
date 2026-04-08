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

  it('allowlist の active-debt に renewalCount > 2 がない', () => {
    const allowlistDir = path.resolve(__dirname, '../allowlists')
    const files = fs.readdirSync(allowlistDir).filter((f) => f.endsWith('.ts') && f !== 'types.ts')
    const overRenewed: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(path.join(allowlistDir, file), 'utf-8')
      // renewalCount を持つエントリを検出
      for (const match of content.matchAll(/path:\s*'([^']+)'[\s\S]*?renewalCount:\s*(\d+)/g)) {
        const count = Number(match[2])
        if (count > 2) {
          overRenewed.push(`${file}: ${match[1]} (renewalCount: ${count})`)
        }
      }
    }

    if (overRenewed.length > 0) {
      console.log(`\n[renewalCount > 2] ${overRenewed.length} 件 — ルール見直しを検討:`)
      for (const o of overRenewed) console.log(`  ${o}`)
    }

    expect(true).toBe(true)
  })

  it('active-debt の allowlist エントリは createdAt を持つ', () => {
    const allowlistDir = path.resolve(__dirname, '../allowlists')
    const files = fs.readdirSync(allowlistDir).filter((f) => f.endsWith('.ts') && f !== 'types.ts')
    const missing: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(path.join(allowlistDir, file), 'utf-8')
      // active-debt エントリで createdAt がないものを検出
      const entries = [
        ...content.matchAll(/path:\s*'([^']+)'[\s\S]*?lifecycle:\s*'active-debt'[\s\S]*?\}/g),
      ]
      for (const entry of entries) {
        if (!entry[0].includes('createdAt:')) {
          missing.push(`${file}: ${entry[1]} — active-debt なのに createdAt なし`)
        }
      }
    }

    expect(
      missing,
      `active-debt の allowlist エントリに createdAt が必要です:\n${missing.join('\n')}`,
    ).toEqual([])
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

  it('experimental ルールは lifecyclePolicy（昇格条件 + 撤回条件）を持つ', () => {
    const violations: string[] = []

    for (const rule of ARCHITECTURE_RULES) {
      if (rule.maturity === 'experimental' && !rule.lifecyclePolicy) {
        violations.push(
          `${rule.id}: experimental なのに lifecyclePolicy が未設定。昇格条件と撤回条件を定義すべき`,
        )
      }
    }

    expect(violations, violations.join('\n')).toEqual([])
  })

  it('experimental / deprecated ルールは reviewPolicy を持つ', () => {
    const violations: string[] = []

    for (const rule of ARCHITECTURE_RULES) {
      if (
        (rule.maturity === 'experimental' || rule.maturity === 'deprecated') &&
        !rule.reviewPolicy
      ) {
        violations.push(
          `${rule.id}: ${rule.maturity} なのに reviewPolicy が未設定。owner / lastReviewedAt / reviewCadenceDays を定義すべき`,
        )
      }
    }

    expect(violations, violations.join('\n')).toEqual([])
  })

  it('review overdue のルールを検出する', () => {
    const now = Date.now()
    const overdue: string[] = []

    for (const rule of ARCHITECTURE_RULES) {
      if (!rule.reviewPolicy?.lastReviewedAt) continue
      const lastReviewed = new Date(rule.reviewPolicy.lastReviewedAt).getTime()
      const cadence = rule.reviewPolicy.reviewCadenceDays
      const elapsed = Math.floor((now - lastReviewed) / (1000 * 60 * 60 * 24))
      if (elapsed > cadence) {
        overdue.push(`${rule.id}: review overdue（${elapsed} 日経過、cadence: ${cadence} 日）`)
      }
    }

    if (overdue.length > 0) {
      console.log(`\n[review overdue] ${overdue.length} 件:`)
      for (const o of overdue) console.log(`  ${o}`)
      console.log('  → lastReviewedAt を更新するか、ルールの見直しを実施してください')
    }

    expect(true).toBe(true)
  })

  it('sunsetCondition + 長期未レビューのルールを検出する', () => {
    const now = Date.now()
    const stale: string[] = []

    for (const rule of ARCHITECTURE_RULES) {
      if (!rule.sunsetCondition) continue
      if (!rule.reviewPolicy?.lastReviewedAt) {
        stale.push(`${rule.id}: sunsetCondition ありだが reviewPolicy なし`)
        continue
      }
      const lastReviewed = new Date(rule.reviewPolicy.lastReviewedAt).getTime()
      const elapsed = Math.floor((now - lastReviewed) / (1000 * 60 * 60 * 24))
      if (elapsed > 60) {
        stale.push(
          `${rule.id}: sunsetCondition ありで ${elapsed} 日未レビュー。条件達成を確認すべき`,
        )
      }
    }

    if (stale.length > 0) {
      console.log(`\n[sunset + 長期未レビュー] ${stale.length} 件:`)
      for (const s of stale) console.log(`  ${s}`)
    }

    expect(true).toBe(true)
  })

  it('experimental ルールの観測期間超過を検出', () => {
    const now = Date.now()
    const overdue: string[] = []

    for (const rule of ARCHITECTURE_RULES) {
      if (rule.maturity !== 'experimental' || !rule.lifecyclePolicy?.introducedAt) continue
      const introduced = new Date(rule.lifecyclePolicy.introducedAt).getTime()
      const deadlineDays = rule.lifecyclePolicy.observeForDays ?? 90
      const elapsed = Math.floor((now - introduced) / (1000 * 60 * 60 * 24))
      if (elapsed > deadlineDays) {
        overdue.push(
          `${rule.id}: 観測期間 ${deadlineDays} 日を ${elapsed - deadlineDays} 日超過。stable に昇格するか deprecated で撤回すべき`,
        )
      }
    }

    if (overdue.length > 0) {
      console.log(`\n[観測期間超過] ${overdue.length} 件:`)
      for (const o of overdue) console.log(`  ${o}`)
    }

    expect(true).toBe(true)
  })

  it('confidence: low のルールが gate で運用されていない', () => {
    const violations: string[] = []

    for (const rule of ARCHITECTURE_RULES) {
      if (rule.confidence === 'low' && rule.detection.severity === 'gate') {
        violations.push(`${rule.id}: confidence: low なのに gate。確信度が上がるまで warn にすべき`)
      }
    }

    expect(violations, violations.join('\n')).toEqual([])
  })

  it('ruleClass 分布（情報出力）', () => {
    const invariant = ARCHITECTURE_RULES.filter((r) => r.ruleClass === 'invariant').length
    const defaultR = ARCHITECTURE_RULES.filter((r) => r.ruleClass === 'default').length
    const heuristic = ARCHITECTURE_RULES.filter((r) => r.ruleClass === 'heuristic').length
    const unset = ARCHITECTURE_RULES.filter((r) => !r.ruleClass).length
    const withSunset = ARCHITECTURE_RULES.filter((r) => r.sunsetCondition).length

    console.log(
      `[ruleClass] invariant: ${invariant} | default: ${defaultR} | heuristic: ${heuristic} | unset: ${unset}`,
    )
    console.log(`[sunsetCondition] ${withSunset}/${ARCHITECTURE_RULES.length} ルールに設定済み`)

    // heuristic + gate の近限（ratchet-down で warn 化を促す）
    const HEURISTIC_GATE_NEAR_LIMIT = 32
    const heuristicGate = ARCHITECTURE_RULES.filter(
      (r) => r.ruleClass === 'heuristic' && r.detection.severity === 'gate',
    )
    console.log(
      `[heuristic+gate] ${heuristicGate.length}/${HEURISTIC_GATE_NEAR_LIMIT} (近限: ${HEURISTIC_GATE_NEAR_LIMIT})`,
    )
    if (heuristicGate.length > 0) {
      console.log(`  対象:`)
      for (const r of heuristicGate.slice(0, 5)) console.log(`    ${r.id}`)
      if (heuristicGate.length > 5) console.log(`    ...他 ${heuristicGate.length - 5} 件`)
    }

    // heuristic + gate は増やさない（ratchet-down）
    expect(
      heuristicGate.length,
      `heuristic+gate が近限 ${HEURISTIC_GATE_NEAR_LIMIT} を超えています (${heuristicGate.length} 件)。` +
        `\nheuristic ルールは原則 warn に。gate が必要なら ruleClass を default に昇格してください。`,
    ).toBeLessThanOrEqual(HEURISTIC_GATE_NEAR_LIMIT)

    expect(true).toBe(true)
  })

  it('sunsetCondition 付きルールのレビュー候補（情報出力）', () => {
    const withSunset = ARCHITECTURE_RULES.filter((r) => r.sunsetCondition)

    if (withSunset.length > 0) {
      console.log(`\n[sunsetCondition レビュー] ${withSunset.length} 件:`)
      for (const r of withSunset) {
        console.log(`  ${r.id}: ${r.sunsetCondition}`)
      }
      console.log('  → 上記の条件が達成されていれば deprecated に変更して次回削除')
    }

    expect(true).toBe(true)
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
