/**
 * RepoSteward Principle Guard — reposteward-ai-ops-platform 8 不可侵原則の core 5 articulation 整合
 *
 * 目的: Wave 1〜5 で landing 済の reposteward-ai-ops-platform の **8 不可侵原則**
 * のうち、AI session が daily に articulate する **core 5 subset** が key consumer
 * file (= AI_CONTEXT.md / plan.md / aag-engine main.go) で articulate されているか
 * を機械検証する。
 *
 * Core 5 subset:
 *   1. JSON-first
 *   2. AI-first (= Human UI 不在)
 *   3. Read-only first
 *   4. 主検出は構造 (= structure-driven detection)
 *   6. Additive-only (= Wave 1 milestone 前 hard gate 追加禁止)
 *
 * Why core 5 subset (not all 8):
 *   - 5 = DetectorResult-first は schema layer (= contract sync guard で別途検証)
 *   - 7 = Wave-by-wave delivery は git history layer (= 本 guard では検証不能)
 *   - 8 = versionImpact declare は project archive layer (= projectizationPolicyGuard で検証)
 *   - 上記 3 つは別 mechanism で守られているため、daily articulation 整合は core 5 で十分
 *
 * @guard G1 テストに書く (= 不可侵原則の articulation 整合は機械検証で守る)
 *
 * @responsibility R:guard
 * @taxonomyKind T:meta-guard
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')

const PLAN_PATH = path.join(PROJECT_ROOT, 'projects/active/reposteward-ai-ops-platform/plan.md')
const AI_CONTEXT_PATH = path.join(
  PROJECT_ROOT,
  'projects/active/reposteward-ai-ops-platform/AI_CONTEXT.md',
)
const MAIN_GO_PATH = path.join(PROJECT_ROOT, 'aag-engine/cmd/aag/main.go')

// Core 5 不可侵原則 (= reposteward-ai-ops-platform plan.md §不可侵原則)
// 各 principle は (id, anchor terms) で articulate。anchor terms は consumer file で
// articulate される時に必ず含まれるべき term の disjunction (= いずれか 1 つ含まれれば PASS)。
const CORE_PRINCIPLES = [
  { id: 1, anchors: ['JSON-first'] },
  { id: 2, anchors: ['AI-first', 'Human-UI 不在', 'Human UI 不在'] },
  { id: 3, anchors: ['Read-only first', 'read-only'] },
  { id: 4, anchors: ['構造', 'structure-driven', '構造駆動'] },
  { id: 6, anchors: ['Additive-only', 'additive-only'] },
] as const

function readIfExists(p: string): string | null {
  try {
    return fs.readFileSync(p, 'utf-8')
  } catch {
    return null
  }
}

function findMissing(
  text: string,
  principles: ReadonlyArray<{ id: number; anchors: ReadonlyArray<string> }>,
): number[] {
  return principles.filter((p) => !p.anchors.some((a) => text.includes(a))).map((p) => p.id)
}

describe('RepoSteward Principle Guard', () => {
  it('plan.md は core 5 不可侵原則を全て articulate する (= 正本)', () => {
    const text = readIfExists(PLAN_PATH)
    expect(text, `plan.md が読めない: ${PLAN_PATH}`).not.toBeNull()
    const missing = findMissing(text!, CORE_PRINCIPLES)
    expect(
      missing,
      `plan.md が core 5 のうち ${missing.join(', ')} 番を articulate していない`,
    ).toEqual([])
  })

  it('AI_CONTEXT.md は 不可侵原則 を articulate する (= consumer side、term 出現)', () => {
    const text = readIfExists(AI_CONTEXT_PATH)
    expect(text, `AI_CONTEXT.md が読めない: ${AI_CONTEXT_PATH}`).not.toBeNull()
    expect(
      text!.includes('不可侵原則'),
      'AI_CONTEXT.md が "不可侵原則" を articulate していない',
    ).toBe(true)
  })

  it('aag-engine main.go は core 5 のうち少なくとも 3 つを articulate する', () => {
    const text = readIfExists(MAIN_GO_PATH)
    expect(text, `main.go が読めない: ${MAIN_GO_PATH}`).not.toBeNull()
    const missing = findMissing(text!, CORE_PRINCIPLES)
    const articulated = CORE_PRINCIPLES.length - missing.length
    expect(
      articulated >= 3,
      `main.go は core 5 のうち ${articulated} 個しか articulate していない (missing: ${missing.join(', ')})`,
    ).toBe(true)
  })

  it('plan.md の 不可侵原則 section は 8 番まで articulate する (= count invariant)', () => {
    const text = readIfExists(PLAN_PATH)
    expect(text).not.toBeNull()
    // §不可侵原則 section の冒頭から次 ## section までを抽出
    const match = text!.match(/## 不可侵原則([\s\S]*?)(?=\n## )/)
    expect(match, '## 不可侵原則 section が見つからない').not.toBeNull()
    const section = match![1]
    // 1. 〜 8. の番号付き行が articulate されているか
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8]
    const missing = numbers.filter((n) => !new RegExp(`^${n}\\. \\*\\*`, 'm').test(section))
    expect(
      missing,
      `plan.md §不可侵原則 が ${missing.join(', ')} 番を articulate していない`,
    ).toEqual([])
  })
})
