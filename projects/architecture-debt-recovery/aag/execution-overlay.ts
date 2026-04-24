/**
 * architecture-debt-recovery Project Overlay — active 昇格時 reviewPolicy 整備
 *
 * 本 project は 2026-04-23 Phase 5 人間承認により draft → active 昇格。
 * `CURRENT_PROJECT.md` = `architecture-debt-recovery` となったため、
 * experimental rule の reviewPolicy 要件（architectureRuleGuard）を満たす必要がある。
 *
 * `projects/completed/budget-achievement-simulator/aag/execution-overlay.ts` と
 * 同構造で、現 architecture owner が 30 日周期で review する規律を確立。
 *
 * 合成ロジック: app/src/test/architectureRules/merged.ts
 * 解決順序: project overlay → DEFAULT_EXECUTION_OVERLAY → error
 *
 * 正本区分:
 * - App Domain: decisionCriteria, migrationRecipe, detection, binding, defaults
 * - Project Overlay（本ファイル）: fixNow, executionPlan, reviewPolicy, lifecyclePolicy
 *
 * 参照:
 * - projects/completed/aag-format-redesign/overlay-bootstrap-design.md
 * - references/03-guides/governance-final-placement-plan.md
 * - projects/completed/budget-achievement-simulator/aag/execution-overlay.ts（参照元）
 *
 * @responsibility R:utility
 */

import type {
  FixNowClassification,
  ExecutionPlan,
  ReviewPolicy,
  LifecyclePolicy,
} from "@/test/aag-core-types";

/** 単一ルールに対する案件運用状態 */
export interface RuleExecutionOverlayEntry {
  readonly fixNow?: FixNowClassification;
  readonly executionPlan?: ExecutionPlan;
  readonly reviewPolicy?: ReviewPolicy;
  readonly lifecyclePolicy?: LifecyclePolicy;
}

/** ruleId -> 運用状態のマップ */
export type ExecutionOverlay = {
  readonly [ruleId: string]: RuleExecutionOverlayEntry;
};

const SAFETY_REVIEW_POLICY: ReviewPolicy = {
  owner: "architecture",
  lastReviewedAt: "2026-04-23",
  reviewCadenceDays: 30,
};

// ADR-D-001 PR2 (2026-04-24): 139 rule に bulk 追記する reviewPolicy。
// rule カテゴリに応じて owner を割当（architecture 89 / implementation 45 / specialist 5）。
// cadence は 90 日（四半期レビュー）として統一。PR4 で expired 検出を有効化。
const ARCH_REVIEW_POLICY: ReviewPolicy = {
  owner: "architecture",
  lastReviewedAt: "2026-04-24",
  reviewCadenceDays: 90,
};
const IMPL_REVIEW_POLICY: ReviewPolicy = {
  owner: "implementation",
  lastReviewedAt: "2026-04-24",
  reviewCadenceDays: 90,
};
const SPEC_REVIEW_POLICY: ReviewPolicy = {
  owner: "specialist",
  lastReviewedAt: "2026-04-24",
  reviewCadenceDays: 90,
};

/**
 * experimental なルールには `reviewPolicy` が必須（architectureRuleGuard）。
 * 本 project が active の間は architecture owner が 30 日周期で review する。
 *
 * 値は projects/completed/budget-achievement-simulator/aag/execution-overlay.ts のコピー。
 * executionOverlayGuard が executionPlan + fixNow の両必須を要求するため、
 * reviewPolicy のみの上書きにせず defaults.ts の値をそのまま再指定している。
 */
export const EXECUTION_OVERLAY: ExecutionOverlay = {
  "AR-SAFETY-SILENT-CATCH": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: SAFETY_REVIEW_POLICY,
  },
  "AR-SAFETY-FIRE-FORGET": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: SAFETY_REVIEW_POLICY,
  },
  "AR-SAFETY-INSERT-VERIFY": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: SAFETY_REVIEW_POLICY,
  },
  "AR-SAFETY-PROD-VALIDATION": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: SAFETY_REVIEW_POLICY,
  },
  "AR-SAFETY-STALE-STORE": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: SAFETY_REVIEW_POLICY,
  },
  "AR-SAFETY-WORKER-TIMEOUT": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 4 },
    reviewPolicy: SAFETY_REVIEW_POLICY,
  },
  "AR-SEMANTIC-BUSINESS-ANALYTIC-SEPARATION": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: SAFETY_REVIEW_POLICY,
  },
  "AR-CURRENT-CANDIDATE-SEPARATION": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: SAFETY_REVIEW_POLICY,
  },
  "AR-REGISTRY-SINGLE-MASTER": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: SAFETY_REVIEW_POLICY,
  },
  "AR-001": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-002": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-003": {
    fixNow: "debt",
    executionPlan: { effort: "medium", priority: 3 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-004": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-005": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-A1-APP-INFRA": {
    fixNow: "now",
    executionPlan: { effort: "medium", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-A1-APP-PRES": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-A1-DOMAIN": {
    fixNow: "now",
    executionPlan: { effort: "medium", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-A1-INFRA-APP": {
    fixNow: "now",
    executionPlan: { effort: "medium", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-A1-INFRA-PRES": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-A1-PRES-INFRA": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-A1-PRES-USECASE": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-AAG-DERIVED-ONLY-IMPORT": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-AAG-NO-BASE-RULES-CONSUMER-IMPORT": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-AAG-NO-DIRECT-OVERLAY-IMPORT": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-BRIDGE-CANDIDATE-DEFAULT": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-BRIDGE-DIRECT-IMPORT": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-BRIDGE-RATE-OWNERSHIP": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-C3-STORE": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-C5-SELECTOR": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-C6-FACADE": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-C7-NO-DUAL-API": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-C9-HONEST-UNCLASSIFIED": {
    fixNow: "review",
    executionPlan: { effort: "trivial", priority: 3 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CAND-ANA-CONTRACT-REQUIRED": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CAND-ANA-INVARIANT-REQUIRED": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CAND-ANA-METHOD-REQUIRED": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CAND-ANA-NO-BUSINESS-BRIDGE": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CAND-ANA-NO-CURRENT-BIZ-MIX": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CAND-ANA-NO-DIRECT-IMPORT": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CAND-ANA-NO-FACTOR-DECOMP": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CAND-BIZ-CONTRACT-REQUIRED": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CAND-BIZ-NO-ANALYTICS-BRIDGE": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CAND-BIZ-NO-CURRENT-MIX": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CAND-BIZ-NO-DIRECT-IMPORT": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CAND-BIZ-NO-PROMOTE-WITHOUT-DUALRUN": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CAND-BIZ-NO-RATE-UI": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CAND-BIZ-NO-ROLLBACK-SKIP": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CANON-SEMANTIC-REQUIRED": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CANON-ZOD-REQUIRED": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CANON-ZOD-REVIEW": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-COCHANGE-DUCKDB-MOCK": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: SPEC_REVIEW_POLICY,
  },
  "AR-COCHANGE-READMODEL-PARSE": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: SPEC_REVIEW_POLICY,
  },
  "AR-COCHANGE-VALIDATION-SEVERITY": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: SPEC_REVIEW_POLICY,
  },
  "AR-CONTRACT-ANALYTIC-METHOD": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CONTRACT-BUSINESS-MEANING": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CONTRACT-SEMANTIC-REQUIRED": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CONVENTION-BARREL": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CONVENTION-CONTEXT-SINGLE-SOURCE": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CONVENTION-FEATURE-BOUNDARY": {
    fixNow: "debt",
    executionPlan: { effort: "medium", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CURRENT-FACTOR-BUSINESS-LOCK": {
    fixNow: "now",
    executionPlan: { effort: "medium", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CURRENT-NO-CANDIDATE-MIX": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CURRENT-NO-CANDIDATE-STATE": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CURRENT-NO-DIRECT-IMPORT-GROWTH": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CURRENT-NO-STANDALONE-AUTH": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CURRENT-SEMANTIC-REQUIRED": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-CURRENT-VIEW-SEPARATION": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-DOC-STATIC-NUMBER": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-E4-TRUTHINESS": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-G2-EMPTY-CATCH": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-G3-SUPPRESS": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-G3-SUPPRESS-RATIONALE": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-G4-INTERNAL": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-G5-DOMAIN-LINES": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-G5-HOOK-LINES": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-G5-HOOK-MEMO": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-G5-HOOK-STATE": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-G5-INFRA-LINES": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-G5-USECASE-LINES": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-G6-COMPONENT": {
    fixNow: "debt",
    executionPlan: { effort: "medium", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-G7-CACHE-BODY": {
    fixNow: "review",
    executionPlan: { effort: "medium", priority: 4 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-JS-NO-NEW-AUTHORITATIVE": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-JS-NO-PRES-HELPER-PROMOTE": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-JS-NO-REFERENCE-GROWTH": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-MIG-OLD-PATH": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-PATH-CUSTOMER": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-PATH-CUSTOMER-GAP": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-PATH-DISCOUNT": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-PATH-FACTOR-DECOMPOSITION": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-PATH-FREE-PERIOD": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-PATH-FREE-PERIOD-BUDGET": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-PATH-FREE-PERIOD-DEPT-KPI": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-PATH-GROSS-PROFIT": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-PATH-GROSS-PROFIT-CONSISTENCY": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-PATH-PI-VALUE": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-PATH-PURCHASE-COST": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-PATH-SALES": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-Q3-CHART-NO-DUCKDB": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-Q4-ALIGNMENT-HANDLER": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-RESP-EXPORT-DENSITY": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-RESP-FALLBACK-SPREAD": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-RESP-FEATURE-COMPLEXITY": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-RESP-HOOK-COMPLEXITY": {
    fixNow: "debt",
    executionPlan: { effort: "medium", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-RESP-MODULE-STATE": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-RESP-NORMALIZATION": {
    fixNow: "debt",
    executionPlan: { effort: "medium", priority: 4 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-RESP-STORE-COUPLING": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-REVIEW-NEEDED-BLOCK": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-SAFETY-NULLABLE-ASYNC": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: SPEC_REVIEW_POLICY,
  },
  "AR-SAFETY-VALIDATION-ENFORCE": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: SPEC_REVIEW_POLICY,
  },
  "AR-SCOPE-AWARE-MUTATION": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-STRUCT-ANALYSIS-FRAME": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-STRUCT-CALC-CANON": {
    fixNow: "review",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-STRUCT-CANONICAL-INPUT": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-STRUCT-CANONICALIZATION": {
    fixNow: "review",
    executionPlan: { effort: "medium", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-STRUCT-COMPARISON-SCOPE": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-STRUCT-DATA-INTEGRITY": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-STRUCT-DUAL-RUN-EXIT": {
    fixNow: "review",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-STRUCT-FALLBACK-METADATA": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-STRUCT-PAGE-META": {
    fixNow: "review",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-STRUCT-PRES-ISOLATION": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-STRUCT-PURITY": {
    fixNow: "now",
    executionPlan: { effort: "medium", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-STRUCT-QUERY-PATTERN": {
    fixNow: "debt",
    executionPlan: { effort: "medium", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-STRUCT-RENDER-SIDE-EFFECT": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-STRUCT-STORE-RESULT-INPUT": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-STRUCT-TEMPORAL-ROLLING": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-STRUCT-TEMPORAL-SCOPE": {
    fixNow: "review",
    executionPlan: { effort: "medium", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-STRUCT-TOPOLOGY": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-TAG-ADAPTER": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TAG-BARREL": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TAG-CALCULATION": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TAG-CHART-OPTION": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TAG-CHART-VIEW": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TAG-CONTEXT": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TAG-FORM": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TAG-LAYOUT": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TAG-ORCHESTRATION": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TAG-PAGE": {
    fixNow: "debt",
    executionPlan: { effort: "medium", priority: 4 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TAG-PERSISTENCE": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TAG-QUERY-EXEC": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TAG-QUERY-PLAN": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TAG-REDUCER": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TAG-SELECTION-GUIDE": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TAG-STATE-MACHINE": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TAG-TRANSFORM": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TAG-UTILITY": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TAG-WIDGET": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TERM-AUTHORITATIVE-STANDALONE": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: ARCH_REVIEW_POLICY,
  },
  "AR-TSIG-COMP-03": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TSIG-TEST-01": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
  "AR-TSIG-TEST-04": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: IMPL_REVIEW_POLICY,
  },
};
