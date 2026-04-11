/**
 * Derived Views — master registry からの自動導出
 *
 * **手編集禁止**: 全 view は CALCULATION_CANON_REGISTRY（唯一の master）から
 * フィルタで生成される。CI で master との一致を検証する。
 *
 * business / analytic / candidate を同じ view に載せない（I3 原則）。
 *
 * @responsibility R:utility
 * @guard I4
 */

import {
  CALCULATION_CANON_REGISTRY,
  type CanonEntry,
  type SemanticClass,
} from './calculationCanonRegistry'

type CanonEntryWithPath = CanonEntry & { readonly path: string }

function deriveView(semanticClass: SemanticClass): readonly CanonEntryWithPath[] {
  return Object.entries(CALCULATION_CANON_REGISTRY)
    .filter(
      ([, entry]) => entry.semanticClass === semanticClass && entry.runtimeStatus === 'current',
    )
    .map(([path, entry]) => ({ ...entry, path }))
}

function deriveCandidateView(): readonly CanonEntryWithPath[] {
  return Object.entries(CALCULATION_CANON_REGISTRY)
    .filter(([, entry]) => entry.runtimeStatus === 'candidate')
    .map(([path, entry]) => ({ ...entry, path }))
}

/** Business Semantic Core: business-authoritative の current 群 */
export const BUSINESS_SEMANTIC_VIEW = deriveView('business')

/** Analytic Kernel: analytic-authoritative の current 群 */
export const ANALYTIC_KERNEL_VIEW = deriveView('analytic')

/** Migration Candidate: candidate 群（business + analytics 問わず） */
export const MIGRATION_CANDIDATE_VIEW = deriveCandidateView()
