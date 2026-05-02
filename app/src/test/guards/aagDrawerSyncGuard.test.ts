/**
 * AAG Drawer Sync Guard
 *
 * `docs/generated/aag/{rule-index, rules-by-path, rule-by-topic}.json`
 * (drawer artifact 群、`drawer-generator.ts` で生成) が runtime BASE_RULES
 * (= base-rules.ts) と structurally consistent であることを機械保証する
 * sync guard。
 *
 * **canonical**: BASE_RULES (= app-domain/gross-profit/rule-catalog/base-rules.ts)。
 *   3 drawer artifact は同 source からの 派生 (一方向)。
 *
 * 検証項目 (10 test):
 * 1. 3 artifact file 全て存在
 * 2. rule-index: rule 数が BASE_RULES と一致 / 各 entry に id+what+slice articulate
 * 3. rule-index: _seam field articulate (post-Pilot AI Role Layer 差し込み口)
 * 4. rules-by-path: mapped + unmapped = totalRules (集合論的整合)
 * 5. rules-by-path: byImport + bySignal の rule id が全て BASE_RULES に存在
 * 6. rule-by-topic: bySlice の合計 ≤ totalRules (rule は slice を 0 or 1 個持つ)
 * 7. rule-by-topic: 全 byResponsibilityTag rule id が BASE_RULES に存在
 * 8. rule-by-topic: 全 byGuardTag rule id が BASE_RULES に存在
 * 9. canonicalSource articulate が一致
 * 10. schemaVersion 一致
 *
 * drift 修復: `npm run generate:drawers` (or `docs:generate`)。
 *
 * @responsibility R:guard
 * @see app/src/test/architectureRules/drawer-generator.ts
 * @see app/src/test/guards/aagMergedArtifactSyncGuard.test.ts (sibling guard、A2b)
 *
 * @taxonomyKind T:meta-guard
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { ARCHITECTURE_RULES as BASE_RULES } from '@app-domain/gross-profit/rule-catalog/base-rules'
import {
  RULE_INDEX_PATH,
  RULES_BY_PATH_PATH,
  RULE_BY_TOPIC_PATH,
} from '../architectureRules/drawer-generator'

const REPO_ROOT = resolve(__dirname, '../../../..')
const RULE_INDEX_FULL = resolve(REPO_ROOT, RULE_INDEX_PATH)
const RULES_BY_PATH_FULL = resolve(REPO_ROOT, RULES_BY_PATH_PATH)
const RULE_BY_TOPIC_FULL = resolve(REPO_ROOT, RULE_BY_TOPIC_PATH)

interface RuleIndexEntry {
  id: string
  what: string
  slice: string | null
  responsibilityTags: string[]
  guardTags: string[]
  _seam: { consumerKind: string; taskHint: string; sourceRefs: string[] }
}

interface RuleIndexArtifact {
  schemaVersion: string
  canonicalSource: string
  summary: { totalRules: number }
  rules: RuleIndexEntry[]
}

interface RulesByPathArtifact {
  schemaVersion: string
  canonicalSource: string
  summary: { totalRules: number; mappedRules: number; unmappedRules: number }
  byImport: Record<string, string[]>
  bySignal: Record<string, string[]>
  unmapped: string[]
}

interface RuleByTopicArtifact {
  schemaVersion: string
  canonicalSource: string
  summary: { totalRules: number; slices: number; responsibilityTags: number; guardTags: number }
  bySlice: Record<string, string[]>
  byResponsibilityTag: Record<string, string[]>
  byGuardTag: Record<string, string[]>
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T
}

const KNOWN_RULE_IDS = new Set(BASE_RULES.map((r) => r.id))

describe('AAG Drawer Sync Guard', () => {
  it('3 drawer artifact file 全て存在', () => {
    expect(existsSync(RULE_INDEX_FULL), `missing: ${RULE_INDEX_FULL}`).toBe(true)
    expect(existsSync(RULES_BY_PATH_FULL), `missing: ${RULES_BY_PATH_FULL}`).toBe(true)
    expect(existsSync(RULE_BY_TOPIC_FULL), `missing: ${RULE_BY_TOPIC_FULL}`).toBe(true)
  })

  it('rule-index: rule 数が BASE_RULES と一致', () => {
    const a = loadJson<RuleIndexArtifact>(RULE_INDEX_FULL)
    expect(a.rules.length).toBe(BASE_RULES.length)
    expect(a.summary.totalRules).toBe(BASE_RULES.length)
  })

  it('rule-index: 各 entry に _seam field (post-Pilot Role Layer seam) articulate', () => {
    const a = loadJson<RuleIndexArtifact>(RULE_INDEX_FULL)
    const missing = a.rules.filter(
      (r) =>
        !r._seam ||
        typeof r._seam.consumerKind !== 'string' ||
        typeof r._seam.taskHint !== 'string',
    )
    expect(missing.length, `_seam 欠落 rule: ${missing.map((r) => r.id).join(', ')}`).toBe(0)
  })

  it('rules-by-path: mapped + unmapped = totalRules (集合論的整合)', () => {
    const a = loadJson<RulesByPathArtifact>(RULES_BY_PATH_FULL)
    expect(a.summary.mappedRules + a.summary.unmappedRules).toBe(a.summary.totalRules)
    expect(a.summary.totalRules).toBe(BASE_RULES.length)
  })

  it('rules-by-path: byImport + bySignal の全 rule id が BASE_RULES に存在', () => {
    const a = loadJson<RulesByPathArtifact>(RULES_BY_PATH_FULL)
    const allIds = new Set<string>()
    for (const ids of Object.values(a.byImport)) ids.forEach((id) => allIds.add(id))
    for (const ids of Object.values(a.bySignal)) ids.forEach((id) => allIds.add(id))
    a.unmapped.forEach((id) => allIds.add(id))
    const orphans = [...allIds].filter((id) => !KNOWN_RULE_IDS.has(id))
    expect(orphans, `unknown rule ids: ${orphans.join(', ')}`).toEqual([])
  })

  it('rule-by-topic: bySlice の合計 ≤ totalRules', () => {
    const a = loadJson<RuleByTopicArtifact>(RULE_BY_TOPIC_FULL)
    const sliceTotal = Object.values(a.bySlice).reduce((sum, arr) => sum + arr.length, 0)
    expect(sliceTotal).toBeLessThanOrEqual(a.summary.totalRules)
  })

  it('rule-by-topic: 全 byResponsibilityTag rule id が BASE_RULES に存在', () => {
    const a = loadJson<RuleByTopicArtifact>(RULE_BY_TOPIC_FULL)
    const orphans = new Set<string>()
    for (const ids of Object.values(a.byResponsibilityTag)) {
      ids.forEach((id) => {
        if (!KNOWN_RULE_IDS.has(id)) orphans.add(id)
      })
    }
    expect(
      [...orphans],
      `unknown rule ids in byResponsibilityTag: ${[...orphans].join(', ')}`,
    ).toEqual([])
  })

  it('rule-by-topic: 全 byGuardTag rule id が BASE_RULES に存在', () => {
    const a = loadJson<RuleByTopicArtifact>(RULE_BY_TOPIC_FULL)
    const orphans = new Set<string>()
    for (const ids of Object.values(a.byGuardTag)) {
      ids.forEach((id) => {
        if (!KNOWN_RULE_IDS.has(id)) orphans.add(id)
      })
    }
    expect([...orphans], `unknown rule ids in byGuardTag: ${[...orphans].join(', ')}`).toEqual([])
  })

  it('canonicalSource articulate が articulate されている', () => {
    const idx = loadJson<RuleIndexArtifact>(RULE_INDEX_FULL)
    const path = loadJson<RulesByPathArtifact>(RULES_BY_PATH_FULL)
    const topic = loadJson<RuleByTopicArtifact>(RULE_BY_TOPIC_FULL)
    expect(idx.canonicalSource).toContain('base-rules.ts')
    expect(path.canonicalSource).toContain('base-rules.ts')
    expect(topic.canonicalSource).toContain('base-rules.ts')
  })

  it('schemaVersion = 1.0.0 が articulate されている', () => {
    const idx = loadJson<RuleIndexArtifact>(RULE_INDEX_FULL)
    const path = loadJson<RulesByPathArtifact>(RULES_BY_PATH_FULL)
    const topic = loadJson<RuleByTopicArtifact>(RULE_BY_TOPIC_FULL)
    expect(idx.schemaVersion).toBe('1.0.0')
    expect(path.schemaVersion).toBe('1.0.0')
    expect(topic.schemaVersion).toBe('1.0.0')
  })
})
