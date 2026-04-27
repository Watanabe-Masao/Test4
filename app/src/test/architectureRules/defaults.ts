/**
 * Default Execution Overlay — BaseRule カテゴリ非依存のデフォルト運用状態
 *
 * BaseRule 全 rule に対するデフォルトの fixNow / executionPlan を定義する。
 * project overlay が明示的に override しない rule は、ここから値を取る。
 *
 * 配置ポリシー: App Domain（案件非依存の安定知識）
 * - defaults は「標準的な扱い」であり、project 案件運用状態ではない
 * - project overlay は「この案件ではこう扱う」という override
 * - reviewPolicy（案件固有の時刻フィールド）は defaults に含めない
 *
 * 新 project bootstrap 時は空 EXECUTION_OVERLAY = {} で全 rule がこの
 * defaults から解決される。
 *
 * 完全性は defaultOverlayCompletenessGuard が保証する。
 *
 * @responsibility R:unclassified
 * @see projects/completed/aag-format-redesign/overlay-bootstrap-design.md
 */

import type { FixNowClassification, ExecutionPlan, LifecyclePolicy } from '@/test/aag-core-types'

/** defaults 用の overlay entry（reviewPolicy は含めない） */
export interface DefaultOverlayEntry {
  readonly fixNow: FixNowClassification
  readonly executionPlan: ExecutionPlan
  readonly lifecyclePolicy?: LifecyclePolicy
}

export type DefaultExecutionOverlay = {
  readonly [ruleId: string]: DefaultOverlayEntry
}

export const DEFAULT_EXECUTION_OVERLAY: DefaultExecutionOverlay = {
  'AR-001': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-002': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-003': {
    fixNow: 'debt',
    executionPlan: { effort: 'medium', priority: 3 },
  },
  'AR-004': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-005': {
    fixNow: 'debt',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-A1-APP-INFRA': {
    fixNow: 'now',
    executionPlan: { effort: 'medium', priority: 2 },
  },
  'AR-A1-APP-PRES': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-A1-DOMAIN': {
    fixNow: 'now',
    executionPlan: { effort: 'medium', priority: 1 },
  },
  'AR-A1-INFRA-APP': {
    fixNow: 'now',
    executionPlan: { effort: 'medium', priority: 1 },
  },
  'AR-A1-INFRA-PRES': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-A1-PRES-INFRA': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-A1-PRES-USECASE': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-BRIDGE-CANDIDATE-DEFAULT': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-BRIDGE-DIRECT-IMPORT': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-BRIDGE-RATE-OWNERSHIP': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-C3-STORE': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-C5-SELECTOR': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-C6-FACADE': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-C7-NO-DUAL-API': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-C9-HONEST-UNCLASSIFIED': {
    fixNow: 'review',
    executionPlan: { effort: 'trivial', priority: 3 },
  },
  'AR-CAND-ANA-CONTRACT-REQUIRED': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-CAND-ANA-INVARIANT-REQUIRED': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-CAND-ANA-METHOD-REQUIRED': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-CAND-ANA-NO-BUSINESS-BRIDGE': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-CAND-ANA-NO-CURRENT-BIZ-MIX': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-CAND-ANA-NO-DIRECT-IMPORT': {
    fixNow: 'debt',
    executionPlan: { effort: 'trivial', priority: 2 },
  },
  'AR-CAND-ANA-NO-FACTOR-DECOMP': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-CAND-BIZ-CONTRACT-REQUIRED': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-CAND-BIZ-NO-ANALYTICS-BRIDGE': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-CAND-BIZ-NO-CURRENT-MIX': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-CAND-BIZ-NO-DIRECT-IMPORT': {
    fixNow: 'debt',
    executionPlan: { effort: 'trivial', priority: 2 },
  },
  'AR-CAND-BIZ-NO-PROMOTE-WITHOUT-DUALRUN': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-CAND-BIZ-NO-RATE-UI': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-CAND-BIZ-NO-ROLLBACK-SKIP': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-CANON-SEMANTIC-REQUIRED': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-CANON-ZOD-REQUIRED': {
    fixNow: 'review',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-CANON-ZOD-REVIEW': {
    fixNow: 'review',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-COCHANGE-DUCKDB-MOCK': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-COCHANGE-READMODEL-PARSE': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-COCHANGE-VALIDATION-SEVERITY': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-CONTRACT-ANALYTIC-METHOD': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-CONTRACT-BUSINESS-MEANING': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-CONTRACT-SEMANTIC-REQUIRED': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-CONVENTION-BARREL': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-CONVENTION-CONTEXT-SINGLE-SOURCE': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-CONVENTION-FEATURE-BOUNDARY': {
    fixNow: 'debt',
    executionPlan: { effort: 'medium', priority: 2 },
  },
  'AR-CURRENT-CANDIDATE-SEPARATION': {
    fixNow: 'review',
    executionPlan: { effort: 'small', priority: 1 },
    lifecyclePolicy: {
      introducedAt: '2026-04-10',
      observeForDays: 30,
      promoteIf: ['Phase 4 で current/candidate 分離が安定'],
      withdrawIf: ['candidate の概念が不要と判断された場合'],
    },
  },
  'AR-CURRENT-FACTOR-BUSINESS-LOCK': {
    fixNow: 'now',
    executionPlan: { effort: 'medium', priority: 1 },
  },
  'AR-CURRENT-NO-CANDIDATE-MIX': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-CURRENT-NO-CANDIDATE-STATE': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-CURRENT-NO-DIRECT-IMPORT-GROWTH': {
    fixNow: 'debt',
    executionPlan: { effort: 'trivial', priority: 2 },
  },
  'AR-CURRENT-NO-STANDALONE-AUTH': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-CURRENT-SEMANTIC-REQUIRED': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-CURRENT-VIEW-SEPARATION': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-DOC-STATIC-NUMBER': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 3 },
  },
  'AR-E4-TRUTHINESS': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-G2-EMPTY-CATCH': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-G3-SUPPRESS': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-G4-INTERNAL': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-G5-DOMAIN-LINES': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-G5-HOOK-LINES': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-G5-HOOK-MEMO': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-G5-HOOK-STATE': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-G5-INFRA-LINES': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-G5-USECASE-LINES': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-G6-COMPONENT': {
    fixNow: 'debt',
    executionPlan: { effort: 'medium', priority: 3 },
  },
  'AR-G7-CACHE-BODY': {
    fixNow: 'review',
    executionPlan: { effort: 'medium', priority: 4 },
  },
  'AR-JS-NO-NEW-AUTHORITATIVE': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-JS-NO-PRES-HELPER-PROMOTE': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-JS-NO-REFERENCE-GROWTH': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-MIG-OLD-PATH': {
    fixNow: 'debt',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-PATH-CUSTOMER': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-PATH-CUSTOMER-GAP': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 2 },
  },
  'AR-PATH-DISCOUNT': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-PATH-FACTOR-DECOMPOSITION': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-PATH-FREE-PERIOD': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-PATH-FREE-PERIOD-BUDGET': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-PATH-FREE-PERIOD-DEPT-KPI': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-PATH-GROSS-PROFIT': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-PATH-GROSS-PROFIT-CONSISTENCY': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-PATH-PI-VALUE': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 2 },
  },
  'AR-PATH-PURCHASE-COST': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-PATH-SALES': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-Q3-CHART-NO-DUCKDB': {
    fixNow: 'review',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-Q4-ALIGNMENT-HANDLER': {
    fixNow: 'review',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-REGISTRY-SINGLE-MASTER': {
    fixNow: 'review',
    executionPlan: { effort: 'small', priority: 1 },
    lifecyclePolicy: {
      introducedAt: '2026-04-10',
      observeForDays: 30,
      promoteIf: ['Phase 2 で master + derived view が安定'],
      withdrawIf: ['正本が別の仕組みに置き換わった場合'],
    },
  },
  'AR-RESP-EXPORT-DENSITY': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-RESP-FALLBACK-SPREAD': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-RESP-FEATURE-COMPLEXITY': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-RESP-HOOK-COMPLEXITY': {
    fixNow: 'debt',
    executionPlan: { effort: 'medium', priority: 3 },
  },
  'AR-RESP-MODULE-STATE': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-RESP-NORMALIZATION': {
    fixNow: 'debt',
    executionPlan: { effort: 'medium', priority: 4 },
  },
  'AR-RESP-STORE-COUPLING': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-REVIEW-NEEDED-BLOCK': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-SAFETY-FIRE-FORGET': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
    lifecyclePolicy: {
      introducedAt: '2026-04-10',
      observeForDays: 7,
      promoteIf: ['7日間の運用で false positive がない'],
      withdrawIf: ['検出精度が低く false positive が頻発する'],
    },
  },
  'AR-SAFETY-INSERT-VERIFY': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 2 },
    lifecyclePolicy: {
      introducedAt: '2026-04-10',
      observeForDays: 7,
      promoteIf: ['7日間の運用で false positive がない'],
      withdrawIf: ['検出精度が低く false positive が頻発する'],
    },
  },
  'AR-SAFETY-NULLABLE-ASYNC': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-SAFETY-PROD-VALIDATION': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
    lifecyclePolicy: {
      introducedAt: '2026-04-10',
      observeForDays: 7,
      promoteIf: ['7日間の運用で false positive がない'],
      withdrawIf: ['検出精度が低く false positive が頻発する'],
    },
  },
  'AR-SAFETY-SILENT-CATCH': {
    fixNow: 'debt',
    executionPlan: { effort: 'trivial', priority: 2 },
    lifecyclePolicy: {
      introducedAt: '2026-04-10',
      observeForDays: 7,
      promoteIf: ['7日間の運用で false positive がない'],
      withdrawIf: ['検出精度が低く false positive が頻発する'],
    },
  },
  'AR-SAFETY-STALE-STORE': {
    fixNow: 'debt',
    executionPlan: { effort: 'trivial', priority: 2 },
    lifecyclePolicy: {
      introducedAt: '2026-04-10',
      observeForDays: 7,
      promoteIf: ['7日間の運用で false positive がない'],
      withdrawIf: ['検出精度が低く false positive が頻発する'],
    },
  },
  'AR-SAFETY-VALIDATION-ENFORCE': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-SAFETY-WORKER-TIMEOUT': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 4 },
    lifecyclePolicy: {
      introducedAt: '2026-04-10',
      observeForDays: 7,
      promoteIf: ['7日間の運用で false positive がない'],
      withdrawIf: ['検出精度が低く false positive が頻発する'],
    },
  },
  'AR-SEMANTIC-BUSINESS-ANALYTIC-SEPARATION': {
    fixNow: 'review',
    executionPlan: { effort: 'small', priority: 2 },
    lifecyclePolicy: {
      introducedAt: '2026-04-10',
      observeForDays: 30,
      promoteIf: ['Phase 2 で derived view + guard が安定'],
      withdrawIf: ['意味分類が不要と判断された場合'],
    },
  },
  'AR-STRUCT-ANALYSIS-FRAME': {
    fixNow: 'review',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-STRUCT-CALC-CANON': {
    fixNow: 'review',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-STRUCT-CANONICAL-INPUT': {
    fixNow: 'review',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-STRUCT-CANONICALIZATION': {
    fixNow: 'review',
    executionPlan: { effort: 'medium', priority: 1 },
  },
  'AR-STRUCT-COMPARISON-SCOPE': {
    fixNow: 'review',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-STRUCT-DATA-INTEGRITY': {
    fixNow: 'review',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-STRUCT-DUAL-RUN-EXIT': {
    fixNow: 'review',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-STRUCT-FALLBACK-METADATA': {
    fixNow: 'review',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-STRUCT-PAGE-META': {
    fixNow: 'review',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-STRUCT-PRES-ISOLATION': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-STRUCT-PURITY': {
    fixNow: 'now',
    executionPlan: { effort: 'medium', priority: 1 },
  },
  'AR-STRUCT-QUERY-PATTERN': {
    fixNow: 'debt',
    executionPlan: { effort: 'medium', priority: 2 },
  },
  'AR-STRUCT-RENDER-SIDE-EFFECT': {
    fixNow: 'review',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-STRUCT-STORE-RESULT-INPUT': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-STRUCT-TEMPORAL-ROLLING': {
    fixNow: 'review',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-STRUCT-TEMPORAL-SCOPE': {
    fixNow: 'review',
    executionPlan: { effort: 'medium', priority: 2 },
  },
  'AR-STRUCT-TOPOLOGY': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-TAG-ADAPTER': {
    fixNow: 'debt',
    executionPlan: { effort: 'trivial', priority: 3 },
  },
  'AR-TAG-BARREL': {
    fixNow: 'debt',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-TAG-CALCULATION': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-TAG-CHART-OPTION': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-TAG-CHART-VIEW': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-TAG-CONTEXT': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-TAG-FORM': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-TAG-LAYOUT': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-TAG-ORCHESTRATION': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-TAG-PAGE': {
    fixNow: 'debt',
    executionPlan: { effort: 'medium', priority: 4 },
  },
  'AR-TAG-PERSISTENCE': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-TAG-QUERY-EXEC': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-TAG-QUERY-PLAN': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-TAG-REDUCER': {
    fixNow: 'debt',
    executionPlan: { effort: 'trivial', priority: 2 },
  },
  'AR-TAG-SELECTION-GUIDE': {
    fixNow: 'debt',
    executionPlan: { effort: 'trivial', priority: 2 },
  },
  'AR-TAG-STATE-MACHINE': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-TAG-TRANSFORM': {
    fixNow: 'debt',
    executionPlan: { effort: 'trivial', priority: 3 },
  },
  'AR-TAG-UTILITY': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-TAG-WIDGET': {
    fixNow: 'debt',
    executionPlan: { effort: 'small', priority: 3 },
  },
  'AR-TERM-AUTHORITATIVE-STANDALONE': {
    fixNow: 'debt',
    executionPlan: { effort: 'trivial', priority: 2 },
  },
  'AR-AAG-DERIVED-ONLY-IMPORT': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-AAG-NO-BASE-RULES-CONSUMER-IMPORT': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-AAG-NO-DIRECT-OVERLAY-IMPORT': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-TSIG-TEST-01': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-G3-SUPPRESS-RATIONALE': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-TSIG-COMP-03': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-TSIG-TEST-04': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-SCOPE-AWARE-MUTATION': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  // ── AR-TAXONOMY-* (taxonomy-v2 子 Phase 3.5: 共通 infra) ──
  'AR-TAXONOMY-NO-UNTAGGED': {
    fixNow: 'debt',
    executionPlan: { effort: 'medium', priority: 3 },
  },
  'AR-TAXONOMY-KNOWN-VOCABULARY': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 1 },
  },
  'AR-TAXONOMY-ONE-TAG-ONE-AXIS': {
    fixNow: 'now',
    executionPlan: { effort: 'small', priority: 2 },
  },
  'AR-TAXONOMY-INTERLOCK': {
    fixNow: 'debt',
    executionPlan: { effort: 'medium', priority: 2 },
  },
  'AR-TAXONOMY-ORIGIN-REQUIRED': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
  'AR-TAXONOMY-COGNITIVE-LOAD': {
    fixNow: 'now',
    executionPlan: { effort: 'medium', priority: 2 },
  },
  'AR-TAXONOMY-AI-VOCABULARY-BINDING': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },
}
