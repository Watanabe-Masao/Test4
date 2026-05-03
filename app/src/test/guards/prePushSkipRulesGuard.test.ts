/**
 * Pre-push Skip Rules Guard
 *
 * `tools/git-hooks/pre-push-skip-rules.json` (= DA-β-001 で institute された
 * negative manifest) の整合性を機械検証する。
 *
 * 設計 articulation:
 * Pre-push hook = 軽量 / 変更箇所 + 影響範囲 / **何を check しないか** で articulate。
 * 全スキャンは CI が AI 不可侵の最終ゲートとして担う。pre-push は影響範囲フォーカス
 * の即時 feedback layer に純化する。skip-rules の追加は AI 単独で許可されない (=
 * skipBaseline で ratchet-down)。
 *
 * 検証内容:
 * - **S1: skipRules.length <= skipBaseline** (= ratchet-down baseline)
 * - **S2: skip 配列の値は pre-push hook の CHECK_REGISTRY に存在する**
 *   (= 関数名の sync、orphan skip rule 防止)
 * - **S3: 全 rule に rationale フィールド存在** (= human-readable why we don't check)
 * - **S4: matchAll が valid regex として parse 可能**
 *
 * 詳細: projects/aag-self-hosting-completion/decision-audit.md DA-β-001
 *
 * @responsibility R:guard
 * @taxonomyKind T:meta-guard
 * @see tools/git-hooks/pre-push-skip-rules.json
 * @see tools/git-hooks/skip-rules-evaluator.mjs
 * @see tools/git-hooks/pre-push
 */

import path from 'path'
import fs from 'fs'
import { describe, it, expect } from 'vitest'

const PROJECT_ROOT = path.resolve(__dirname, '../../../../')
const CONFIG_PATH = path.join(PROJECT_ROOT, 'tools/git-hooks/pre-push-skip-rules.json')
const HOOK_PATH = path.join(PROJECT_ROOT, 'tools/git-hooks/pre-push')

interface SkipRule {
  name: string
  matchAll: string
  skip: string[]
  rationale: string
}

interface SkipRulesConfig {
  $schema: string
  skipBaseline: number
  skipRules: SkipRule[]
}

function loadConfig(): SkipRulesConfig {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
}

function loadCheckRegistry(): Set<string> {
  const hook = fs.readFileSync(HOOK_PATH, 'utf-8')
  const match = hook.match(/CHECK_REGISTRY="([^"]+)"/)
  if (!match) {
    throw new Error('CHECK_REGISTRY not found in pre-push hook')
  }
  return new Set(match[1].split(/\s+/).filter(Boolean))
}

describe('Pre-push Skip Rules Guard (DA-β-001)', () => {
  it('S1: skipRules.length <= skipBaseline (ratchet-down)', () => {
    const config = loadConfig()
    expect(config.skipRules.length).toBeLessThanOrEqual(config.skipBaseline)
  })

  it('S2: skip 配列の値は pre-push hook の CHECK_REGISTRY に存在する', () => {
    const config = loadConfig()
    const registry = loadCheckRegistry()
    const violations: string[] = []
    for (const rule of config.skipRules) {
      for (const check of rule.skip ?? []) {
        if (!registry.has(check)) {
          violations.push(`rule "${rule.name}" の skip:${check} は CHECK_REGISTRY に存在しない`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('S3: 全 rule に rationale フィールド存在 (= why we do not check)', () => {
    const config = loadConfig()
    const violations: string[] = []
    for (const rule of config.skipRules) {
      if (typeof rule.rationale !== 'string' || rule.rationale.trim().length === 0) {
        violations.push(`rule "${rule.name}" に rationale 欠落`)
      }
    }
    expect(violations).toEqual([])
  })

  it('S4: matchAll が valid regex として parse 可能', () => {
    const config = loadConfig()
    const violations: string[] = []
    for (const rule of config.skipRules) {
      try {
        new RegExp(rule.matchAll)
      } catch (err) {
        violations.push(`rule "${rule.name}".matchAll: invalid regex (${(err as Error).message})`)
      }
    }
    expect(violations).toEqual([])
  })
})
