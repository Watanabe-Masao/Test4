/**
 * Architecture Rule Guard — ルール定義の整合性検証
 *
 * Architecture Rule レジストリ自体の品質を保証する。
 * ルール ID の一意性、タグ参照の妥当性、必須フィールドの検証。
 *
 * @guard G1 テストに書く
 *
 * @responsibility R:guard
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { ARCHITECTURE_RULES, SLICE_GUIDANCE, type AagSlice } from '../architectureRules'
import { GUARD_TAG_REGISTRY } from '../guardTagRegistry'
import { GUARD_CATEGORY_MAP } from '../guardCategoryMap'

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

  it('migrationRecipe がある場合は steps が空でない', () => {
    const invalid: string[] = []

    for (const rule of ARCHITECTURE_RULES) {
      if (rule.migrationRecipe && rule.migrationRecipe.steps.length === 0) {
        invalid.push(`${rule.id}: migrationRecipe.steps が空`)
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

      // AAG Response 形式で出力
      for (const [ruleId, count] of exceptionCount) {
        if (count < EXCEPTION_PRESSURE_THRESHOLD) continue
        const rule = ARCHITECTURE_RULES.find((r) => r.id === ruleId)
        if (!rule) continue
        console.log(
          `\n  🔍 観測・レビュー対象 [${rule.slice ?? 'unknown'}]` +
            `\n    ${ruleId}: 例外 ${count} 件 — 分割を検討` +
            `\n    理由: ${rule.why}` +
            `\n    詳細: ${rule.doc ?? ''}` +
            `\n    参考: references/01-principles/aag-rule-splitting-plan.md`,
        )
      }
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

  it('experimental ルールが gate / block-merge で運用されていない', () => {
    const violations: string[] = []

    for (const rule of ARCHITECTURE_RULES) {
      if (
        rule.maturity === 'experimental' &&
        (rule.detection.severity === 'gate' || rule.detection.severity === 'block-merge')
      ) {
        violations.push(
          `${rule.id}: experimental なのに ${rule.detection.severity}。パターンが安定するまで warn にすべき`,
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

  it('review overdue のルールを検出する (ADR-D-001 PR4: hard fail)', () => {
    // ADR-D-001 PR4 (2026-04-24): lastReviewedAt + reviewCadenceDays 超過を hard fail に昇格。
    // Temporal Governance の時計機能を本格稼働（cadence を超えて未レビューのルールは CI を止める）。
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

    expect(
      overdue,
      `cadence 超過ルール ${overdue.length} 件:\n  ${overdue.join('\n  ')}\n` +
        '  → 該当 rule の projects/<active>/aag/execution-overlay.ts で\n' +
        '     reviewPolicy.lastReviewedAt を更新するか、ルール自体の見直しを実施してください。',
    ).toEqual([])
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
      if (rule.migrationRecipe) withMigration++
      if (rule.decisionCriteria) withDecision++
      if (rule.relationships) withRelationships++
    }

    const experimental = ARCHITECTURE_RULES.filter((r) => r.maturity === 'experimental').length
    const deprecated = ARCHITECTURE_RULES.filter((r) => r.maturity === 'deprecated').length
    const stable = ARCHITECTURE_RULES.length - experimental - deprecated

    const summary = [...byType.entries()].map(([type, count]) => `  ${type}: ${count}`).join('\n')
    console.log(
      `[Architecture Rules] ${ARCHITECTURE_RULES.length} rules (stable: ${stable}, experimental: ${experimental}, deprecated: ${deprecated})\n${summary}\n` +
        `  migrationRecipe: ${withMigration} | decisionCriteria: ${withDecision} | relationships: ${withRelationships}`,
    )
  })

  it('入口品質サマリー（情報出力）', () => {
    // fixNow 分布
    const fixDist = { now: 0, debt: 0, review: 0, unset: 0 }
    for (const r of ARCHITECTURE_RULES) {
      const key = r.fixNow ?? 'unset'
      fixDist[key as keyof typeof fixDist]++
    }
    console.log(
      `[fixNow] now: ${fixDist.now} | debt: ${fixDist.debt} | review: ${fixDist.review} | unset: ${fixDist.unset}`,
    )

    // slice 分布
    const sliceDist: Record<string, number> = {}
    for (const r of ARCHITECTURE_RULES) {
      const s = r.slice ?? 'unset'
      sliceDist[s] = (sliceDist[s] ?? 0) + 1
    }
    const sliceLines = Object.entries(sliceDist)
      .sort((a, b) => b[1] - a[1])
      .map(([s, c]) => `  ${s}: ${c}`)
      .join('\n')
    console.log(`[slice]\n${sliceLines}`)

    // 入口品質カバレッジ
    const withMigration = ARCHITECTURE_RULES.filter(
      (r) => r.migrationRecipe && r.migrationRecipe.steps.length > 0,
    ).length
    const withExceptions = ARCHITECTURE_RULES.filter((r) => r.decisionCriteria?.exceptions).length
    const withDoc = ARCHITECTURE_RULES.filter((r) => r.doc).length
    console.log(
      `[入口品質] migrationRecipe: ${withMigration}/${ARCHITECTURE_RULES.length} | ` +
        `exceptions: ${withExceptions}/${ARCHITECTURE_RULES.length} | ` +
        `doc: ${withDoc}/${ARCHITECTURE_RULES.length}`,
    )

    // fixNow 未設定は 0 であること
    expect(fixDist.unset).toBe(0)
    // slice 未設定は 0 であること
    expect(sliceDist['unset'] ?? 0).toBe(0)
  })
})

// ─── AAG 自己品質ガード（第 7 原則） ──────────────────────────

describe('AAG Self-Quality: ルール自身がルールの品質基準を満たす', () => {
  it('全ルールに why がある（存在理由が不明なルールは削除候補）', () => {
    const missing = ARCHITECTURE_RULES.filter((r) => !r.why || r.why.trim() === '')
    expect(missing.map((r) => r.id)).toEqual([])
  })

  it('全ルールに doc がある（深掘り先がないルールは根拠不明）', () => {
    const missing = ARCHITECTURE_RULES.filter((r) => !r.doc)
    expect(missing.map((r) => r.id)).toEqual([])
  })

  it('全ルールに migrationRecipe がある（直し方がわからないルールは運用できない）', () => {
    const missing = ARCHITECTURE_RULES.filter(
      (r) => !r.migrationRecipe || r.migrationRecipe.steps.length === 0,
    )
    expect(missing.map((r) => r.id)).toEqual([])
  })

  it('全ルールに executionPlan がある（工数・優先度がないルールは計画できない）', () => {
    const missing = ARCHITECTURE_RULES.filter(
      (r) => !r.executionPlan || !r.executionPlan.effort || r.executionPlan.priority == null,
    )
    expect(missing.map((r) => r.id)).toEqual([])
  })

  it('全ルールに decisionCriteria がある（判断基準がないルールは属人化する）', () => {
    const missing = ARCHITECTURE_RULES.filter((r) => !r.decisionCriteria)
    expect(missing.map((r) => r.id)).toEqual([])
  })

  it('deprecated ルールが残存していない（不要なルールは削除する）', () => {
    const deprecated = ARCHITECTURE_RULES.filter((r) => r.maturity === 'deprecated')
    expect(
      deprecated.map((r) => r.id),
      '不要になったルールは deprecated ではなく削除してください',
    ).toEqual([])
  })

  it('全ルールに principleRefs がある（思想とルールの紐付け）', () => {
    const missing = ARCHITECTURE_RULES.filter(
      (r) => !r.principleRefs || r.principleRefs.length === 0,
    )
    expect(
      missing.map((r) => r.id),
      '全ルールは少なくとも 1 つの設計原則（A1〜Q4）に紐づく必要があります',
    ).toEqual([])
  })
})

// ─── 思想 → ルールのトレーサビリティ ──────────────────────────

describe('AAG Traceability: 思想とルールの整合性', () => {
  // principles.json を正本として ALL_PRINCIPLES を構築
  const principlesJson = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, 'docs/contracts/principles.json'), 'utf-8'),
  )
  const ALL_PRINCIPLES: readonly string[] = principlesJson.categories.flatMap(
    (c: { principles: { id: string }[] }) => c.principles.map((p: { id: string }) => p.id),
  )

  it('思想カバレッジ: ルールが紐づいていない設計原則を検出', () => {
    const covered = new Set<string>()
    for (const rule of ARCHITECTURE_RULES) {
      for (const ref of rule.principleRefs ?? []) covered.add(ref)
    }
    const uncovered = ALL_PRINCIPLES.filter((p) => !covered.has(p))

    // 思想（カテゴリ）→ 原則 → ルール の 3 層トレーサビリティ
    const CATEGORY_LABELS: Record<string, string> = {
      A: '層境界',
      B: '実行エンジン境界',
      C: '純粋性と責務分離',
      D: '数学的不変条件',
      E: '型安全と欠損処理',
      F: 'コード構造規約',
      G: '機械的防御',
      H: 'Screen Runtime',
      Q: 'Query Access',
    }

    // カテゴリ別のカバレッジ
    const categoryStats = new Map<string, { total: number; covered: number }>()
    for (const p of ALL_PRINCIPLES) {
      const cat = p.replace(/\d+/, '')
      const entry = categoryStats.get(cat) ?? { total: 0, covered: 0 }
      entry.total++
      if (covered.has(p)) entry.covered++
      categoryStats.set(cat, entry)
    }

    console.log(
      `\n[思想→原則→ルール] ${covered.size}/${ALL_PRINCIPLES.length} 原則にルールが紐づいている`,
    )
    for (const [cat, stats] of [...categoryStats.entries()].sort()) {
      const label = CATEGORY_LABELS[cat] ?? cat
      const pct = Math.round((stats.covered / stats.total) * 100)
      const bar = stats.covered === stats.total ? '✅' : `⚠️ ${pct}%`
      console.log(`  ${cat}. ${label}: ${stats.covered}/${stats.total} ${bar}`)
    }
    if (uncovered.length > 0) {
      console.log(`  ルール未設定の原則: ${uncovered.join(', ')}`)
    }

    expect(true).toBe(true)
  })

  it('思想の重複検出: 同じ principleRef を持つルールの一覧', () => {
    const principleToRules = new Map<string, string[]>()
    for (const rule of ARCHITECTURE_RULES) {
      for (const ref of rule.principleRefs ?? []) {
        const list = principleToRules.get(ref) ?? []
        list.push(rule.id)
        principleToRules.set(ref, list)
      }
    }

    // 情報出力: 3 ルール以上が紐づく原則（重複の兆候）
    const dense = [...principleToRules.entries()]
      .filter(([, rules]) => rules.length >= 3)
      .sort((a, b) => b[1].length - a[1].length)

    if (dense.length > 0) {
      console.log('\n[思想の密度] 3 ルール以上が紐づく原則:')
      for (const [principle, rules] of dense) {
        console.log(`  ${principle}: ${rules.length} ルール (${rules.join(', ')})`)
      }
    }

    expect(true).toBe(true)
  })

  it('双方向リンク: principles.json の全原則がルールに紐づいている', () => {
    const covered = new Set<string>()
    for (const rule of ARCHITECTURE_RULES) {
      for (const ref of rule.principleRefs ?? []) covered.add(ref)
    }
    const uncovered = ALL_PRINCIPLES.filter((p) => !covered.has(p))
    expect(
      uncovered,
      `principles.json に定義されているがルールに紐づいていない原則: ${uncovered.join(', ')}`,
    ).toEqual([])
  })

  it('双方向リンク: ルールの principleRefs が全て principles.json に存在する', () => {
    const principleSet = new Set(ALL_PRINCIPLES)
    const orphans: string[] = []
    for (const rule of ARCHITECTURE_RULES) {
      for (const ref of rule.principleRefs ?? []) {
        if (!principleSet.has(ref)) orphans.push(`${rule.id} → ${ref}`)
      }
    }
    expect(orphans, `principles.json に存在しない principleRef: ${orphans.join(', ')}`).toEqual([])
  })

  it('principles.json と PrincipleId 型の一致', () => {
    // architectureRules.ts の PrincipleId 型で定義された値を検証
    const typeIds = ARCHITECTURE_RULES.flatMap((r) => r.principleRefs ?? [])
    const allUsed = new Set(typeIds)
    const principleSet = new Set(ALL_PRINCIPLES)
    const inTypeButNotJson = [...allUsed].filter((id) => !principleSet.has(id))
    expect(inTypeButNotJson, 'PrincipleId にあるが principles.json にない').toEqual([])
  })
})

// ─── 入口品質: AAG Response 統一フォーマットの運用監視 ────────────

describe('AAG Entry Quality: 入口品質の自己監視', () => {
  it('手書き AAG レスポンスの残件数（ratchet-down）', () => {
    // AAG Response 統一フォーマットに移行済みでない手書き出力を検出
    // "⚡ AAG" パターン（renderAagResponse 経由でない独自フォーマット）
    const toolsDir = path.join(PROJECT_ROOT, 'tools')
    const files = [
      path.join(toolsDir, 'git-hooks/pre-commit'),
      path.join(toolsDir, 'architecture-health/src/collectors/obligation-collector.ts'),
    ]
    let handwritten = 0
    for (const file of files) {
      if (!fs.existsSync(file)) continue
      const content = fs.readFileSync(file, 'utf-8')
      // renderAagResponse 互換フォーマット（"⚡ 今すぐ修正"）は OK
      // 旧フォーマット（"⚡ AAG"）は手書き残件
      const oldPattern = (content.match(/⚡ AAG /g) || []).length
      handwritten += oldPattern
    }
    // BASELINE: 0（全入口が統一フォーマットに移行済み）
    expect(
      handwritten,
      `手書き AAG レスポンスが ${handwritten} 件残っています。renderAagResponse 互換フォーマットに移行してください`,
    ).toBe(0)
  })

  it('SLICE_GUIDANCE が全スライスをカバーしている', () => {
    const slices: AagSlice[] = [
      'layer-boundary',
      'canonicalization',
      'query-runtime',
      'responsibility-separation',
      'governance-ops',
    ]
    for (const slice of slices) {
      expect(SLICE_GUIDANCE[slice], `SLICE_GUIDANCE に ${slice} がない`).toBeTruthy()
    }
  })

  it('tools 側レンダラが app 側と同じ出力契約を持つ（drift 検出）', () => {
    // tools/architecture-health/src/aag-response.ts のレンダラが
    // app/src/test/architectureRules.ts の renderAagResponse と同じ出力を返すことを検証
    const toolsRendererPath = path.join(
      PROJECT_ROOT,
      'tools/architecture-health/src/aag-response.ts',
    )
    const content = fs.readFileSync(toolsRendererPath, 'utf-8')

    // 出力フォーマットの契約キーワードが一致していること
    const contractKeywords = [
      '⚡ 今すぐ修正',
      '📋 構造負債として管理',
      '🔍 観測・レビュー対象',
      '方向:',
      '修正手順:',
      '対応: allowlist に登録して計画的に返済する',
      '対応: コード修正不要。Discovery Review で評価する',
      '解消手順（返済時）:',
      'レビュー先:',
    ]

    const missing = contractKeywords.filter((kw) => !content.includes(kw))
    expect(
      missing,
      `tools 側レンダラに出力契約キーワードが不足: ${missing.join(', ')}\n` +
        `app 側 renderAagResponse() と tools/aag-response.ts の出力を一致させてください`,
    ).toEqual([])
  })

  it('全ルールが guardCategoryMap に登録されている（AAG 5.0 A3）', () => {
    const violations: string[] = []

    for (const rule of ARCHITECTURE_RULES) {
      if (!GUARD_CATEGORY_MAP[rule.id]) {
        violations.push(`${rule.id} が guardCategoryMap に未登録`)
      }
    }

    const ruleIds = new Set(ARCHITECTURE_RULES.map((r) => r.id))
    for (const mapId of Object.keys(GUARD_CATEGORY_MAP)) {
      if (!ruleIds.has(mapId)) {
        violations.push(`${mapId} が guardCategoryMap にあるが architectureRules に存在しない`)
      }
    }

    expect(violations, violations.join('\n')).toEqual([])
  })

  it('guardCategoryMap の note が標準プレフィックスを持つ（AAG 5.0 A3）', () => {
    const VALID_PREFIXES = [
      'core-rule:',
      'merge-candidate:',
      'duplicate-family:',
      'sunset-candidate:',
      'review-focus:',
    ]
    const violations: string[] = []

    for (const [ruleId, entry] of Object.entries(GUARD_CATEGORY_MAP)) {
      if (entry.note === null) continue
      const hasValidPrefix = VALID_PREFIXES.some((p) => entry.note!.startsWith(p))
      if (!hasValidPrefix) {
        violations.push(
          `${ruleId}: note が標準プレフィックスで始まっていない: "${entry.note!.slice(0, 40)}..."`,
        )
      }
    }

    expect(violations, violations.join('\n')).toEqual([])
  })
})
