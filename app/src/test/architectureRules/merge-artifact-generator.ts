/**
 * Merged Architecture Rules Artifact Generator
 *
 * `aag/_internal/source-of-truth.md` §4 (Merge Policy) の
 * derived artifact 生成器。§4.3 resolvedBy 追跡を artifact に articulate する。
 *
 * **canonical merge policy**: source-of-truth.md §4 = 唯一の canonical。
 *   merged.ts (= §4 implementation runtime) と本 generator は同一 merge logic を
 *   持つ。runtime ARCHITECTURE_RULES と artifact が byte-identical (resolvedBy
 *   field を除く) であることを `aagMergedArtifactSyncGuard` が検証する。
 *
 * 出力: `docs/generated/aag/merged-architecture-rules.json` (実書き出しは
 * `merge-artifact-generator.test.ts` 経由 = vitest runner で alias 解決)
 *
 * @responsibility R:utility
 * @see aag/_internal/source-of-truth.md §4 (Merge Policy canonical)
 * @see app/src/test/architectureRules/merged.ts (§4 runtime implementation)
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { EXECUTION_OVERLAY } from '@project-overlay/execution-overlay'
import { DEFAULT_REVIEW_POLICY_STUB } from '@/test/aag-core-types'
import { DEFAULT_EXECUTION_OVERLAY } from '@/test/architectureRules/defaults'
import { ARCHITECTURE_RULES as BASE_RULES } from '@app-domain/gross-profit/rule-catalog/base-rules'
import type { ArchitectureRule } from '@/test/architectureRules/types'

type ResolvedBy = 'project-overlay' | 'defaults' | 'stub'

export interface ResolvedByMap {
  readonly fixNow: ResolvedBy
  readonly executionPlan: ResolvedBy
  readonly reviewPolicy: ResolvedBy
  readonly lifecyclePolicy: ResolvedBy | null
}

export type MergedRuleWithResolvedBy = ArchitectureRule & { readonly resolvedBy: ResolvedByMap }

export interface ResolvedByCounts {
  readonly fixNow: { 'project-overlay': number; defaults: number; stub: number }
  readonly executionPlan: { 'project-overlay': number; defaults: number; stub: number }
  readonly reviewPolicy: { 'project-overlay': number; defaults: number; stub: number }
  readonly lifecyclePolicy: {
    'project-overlay': number
    defaults: number
    stub: number
    null: number
  }
}

export interface MergedArtifact {
  readonly $schemaDescription: string
  readonly canonicalMergePolicy: string
  readonly schemaVersion: '1.0.0'
  readonly generatedAt: string
  readonly sourceCommit: string
  readonly activeProjectId: string | null
  readonly summary: {
    readonly totalRules: number
    readonly resolvedBy: ResolvedByCounts
  }
  readonly rules: readonly MergedRuleWithResolvedBy[]
}

export const ARTIFACT_OUTPUT_PATH = 'docs/generated/aag/merged-architecture-rules.json'
export const CANONICAL_MERGE_POLICY =
  'aag/_internal/source-of-truth.md §4 (Merge Policy)'

function getRepoRoot(): string {
  return resolve(__dirname, '../../../..')
}

function getActiveProjectId(): string | null {
  try {
    const content = readFileSync(resolve(getRepoRoot(), 'CURRENT_PROJECT.md'), 'utf-8')
    const match = content.match(/^active:\s*(\S+)\s*$/m)
    return match ? match[1] : null
  } catch {
    return null
  }
}

function getSourceCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8', cwd: getRepoRoot() }).trim()
  } catch {
    return 'unknown'
  }
}

export function generateMergedArtifact(): MergedArtifact {
  const counts: ResolvedByCounts = {
    fixNow: { 'project-overlay': 0, defaults: 0, stub: 0 },
    executionPlan: { 'project-overlay': 0, defaults: 0, stub: 0 },
    reviewPolicy: { 'project-overlay': 0, defaults: 0, stub: 0 },
    lifecyclePolicy: { 'project-overlay': 0, defaults: 0, stub: 0, null: 0 },
  }

  const rules: MergedRuleWithResolvedBy[] = BASE_RULES.map((rule): MergedRuleWithResolvedBy => {
    const projectOverlay = EXECUTION_OVERLAY[rule.id]
    const defaultOverlay = DEFAULT_EXECUTION_OVERLAY[rule.id]

    if (!projectOverlay && !defaultOverlay) {
      throw new Error(
        `[merge-artifact-generator] Missing overlay for rule: ${rule.id}. ` +
          `canonical merge policy: ${CANONICAL_MERGE_POLICY}`,
      )
    }

    // §4.1 解決順序 (merged.ts と同一)
    const fixNowSrc: ResolvedBy =
      projectOverlay?.fixNow !== undefined ? 'project-overlay' : 'defaults'
    const executionPlanSrc: ResolvedBy =
      projectOverlay?.executionPlan !== undefined ? 'project-overlay' : 'defaults'
    // §4.2 reviewPolicy 契約: project overlay 未提供時は stub fallback
    const reviewPolicySrc: ResolvedBy =
      projectOverlay?.reviewPolicy !== undefined ? 'project-overlay' : 'stub'

    let lifecyclePolicySrc: ResolvedBy | null = null
    if (projectOverlay?.lifecyclePolicy !== undefined) {
      lifecyclePolicySrc = 'project-overlay'
    } else if (defaultOverlay?.lifecyclePolicy !== undefined) {
      lifecyclePolicySrc = 'defaults'
    }

    counts.fixNow[fixNowSrc]++
    counts.executionPlan[executionPlanSrc]++
    counts.reviewPolicy[reviewPolicySrc]++
    if (lifecyclePolicySrc) {
      counts.lifecyclePolicy[lifecyclePolicySrc]++
    } else {
      counts.lifecyclePolicy.null++
    }

    const fixNow = projectOverlay?.fixNow ?? defaultOverlay!.fixNow
    const executionPlan = projectOverlay?.executionPlan ?? defaultOverlay!.executionPlan
    const reviewPolicy = projectOverlay?.reviewPolicy ?? DEFAULT_REVIEW_POLICY_STUB
    const lifecyclePolicy = projectOverlay?.lifecyclePolicy ?? defaultOverlay?.lifecyclePolicy

    return {
      ...rule,
      fixNow,
      executionPlan,
      reviewPolicy,
      lifecyclePolicy,
      resolvedBy: {
        fixNow: fixNowSrc,
        executionPlan: executionPlanSrc,
        reviewPolicy: reviewPolicySrc,
        lifecyclePolicy: lifecyclePolicySrc,
      },
    } as MergedRuleWithResolvedBy
  })

  return {
    $schemaDescription:
      'Merged ARCHITECTURE_RULES artifact. App Domain (BaseRule) + Project Overlay (RuleOperationalState) を ruleId で merge した結果 + resolvedBy 追跡。',
    canonicalMergePolicy: CANONICAL_MERGE_POLICY,
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    sourceCommit: getSourceCommit(),
    activeProjectId: getActiveProjectId(),
    summary: {
      totalRules: rules.length,
      resolvedBy: counts,
    },
    rules,
  }
}
