/**
 * Architecture Rule Guard — ルール定義の整合性検証
 *
 * Architecture Rule レジストリ自体の品質を保証する。
 * ルール ID の一意性、タグ参照の妥当性、必須フィールドの検証。
 *
 * @guard G1 テストに書く
 */
import { describe, it, expect } from 'vitest'
import { ARCHITECTURE_RULES } from '../architectureRules'
import { GUARD_TAG_REGISTRY } from '../guardTagRegistry'

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

  it('ルール数サマリー', () => {
    const byType = new Map<string, number>()
    for (const rule of ARCHITECTURE_RULES) {
      byType.set(rule.detection.type, (byType.get(rule.detection.type) ?? 0) + 1)
    }

    const summary = [...byType.entries()]
      .map(([type, count]) => `  ${type}: ${count}`)
      .join('\n')
    console.log(`[Architecture Rules] ${ARCHITECTURE_RULES.length} rules\n${summary}`)
  })
})
