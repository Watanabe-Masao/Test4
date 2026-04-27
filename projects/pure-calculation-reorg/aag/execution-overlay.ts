/**
 * Execution Overlay — 案件固有の運用状態
 *
 * Project Overlay 側の正本。App Domain（architectureRules/rules.ts）の
 * 安定知識（semantics / governance / detection / binding）に対して、
 * 「今この案件でどう扱うか」を ruleId キーで注入する。
 *
 * 合成ロジック: app/src/test/architectureRules/index.ts
 *
 * 正本区分:
 * - App Domain: decisionCriteria, migrationRecipe, sunsetCondition, detection, binding
 * - Project Overlay（本ファイル）: fixNow, executionPlan, reviewPolicy, lifecyclePolicy
 *
 * 参照: references/03-guides/governance-final-placement-plan.md
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
  readonly fixNow: FixNowClassification;
  readonly executionPlan: ExecutionPlan;
  readonly reviewPolicy?: ReviewPolicy;
  readonly lifecyclePolicy?: LifecyclePolicy;
}

/** ruleId -> 運用状態のマップ */
export type ExecutionOverlay = {
  readonly [ruleId: string]: RuleExecutionOverlayEntry;
};

/**
 * 全 140 ルールの案件運用状態。
 * overlay 未定義のルールはエラー（default 補完しない）。
 */
export const EXECUTION_OVERLAY: ExecutionOverlay = {
  "AR-001": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-11",
      reviewCadenceDays: 90,
    },
  },
  "AR-002": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-003": {
    fixNow: "debt",
    executionPlan: { effort: "medium", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-004": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-005": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-A1-APP-INFRA": {
    fixNow: "now",
    executionPlan: { effort: "medium", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-A1-APP-PRES": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-A1-DOMAIN": {
    fixNow: "now",
    executionPlan: { effort: "medium", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-A1-INFRA-APP": {
    fixNow: "now",
    executionPlan: { effort: "medium", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-A1-INFRA-PRES": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-A1-PRES-INFRA": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-A1-PRES-USECASE": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-BRIDGE-CANDIDATE-DEFAULT": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-BRIDGE-DIRECT-IMPORT": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-BRIDGE-RATE-OWNERSHIP": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-C3-STORE": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-C5-SELECTOR": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-C6-FACADE": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-C7-NO-DUAL-API": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-C9-HONEST-UNCLASSIFIED": {
    fixNow: "review",
    executionPlan: { effort: "trivial", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-CAND-ANA-CONTRACT-REQUIRED": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CAND-ANA-INVARIANT-REQUIRED": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CAND-ANA-METHOD-REQUIRED": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CAND-ANA-NO-BUSINESS-BRIDGE": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CAND-ANA-NO-CURRENT-BIZ-MIX": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CAND-ANA-NO-DIRECT-IMPORT": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CAND-ANA-NO-FACTOR-DECOMP": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CAND-BIZ-CONTRACT-REQUIRED": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CAND-BIZ-NO-ANALYTICS-BRIDGE": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CAND-BIZ-NO-CURRENT-MIX": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CAND-BIZ-NO-DIRECT-IMPORT": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CAND-BIZ-NO-PROMOTE-WITHOUT-DUALRUN": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CAND-BIZ-NO-RATE-UI": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CAND-BIZ-NO-ROLLBACK-SKIP": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CANON-SEMANTIC-REQUIRED": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CANON-ZOD-REQUIRED": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-CANON-ZOD-REVIEW": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-COCHANGE-DUCKDB-MOCK": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-COCHANGE-READMODEL-PARSE": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-COCHANGE-VALIDATION-SEVERITY": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CONTRACT-ANALYTIC-METHOD": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CONTRACT-BUSINESS-MEANING": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CONTRACT-SEMANTIC-REQUIRED": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CONVENTION-BARREL": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-CONVENTION-CONTEXT-SINGLE-SOURCE": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-CONVENTION-FEATURE-BOUNDARY": {
    fixNow: "debt",
    executionPlan: { effort: "medium", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-CURRENT-CANDIDATE-SEPARATION": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
    lifecyclePolicy: {
      introducedAt: "2026-04-10",
      observeForDays: 30,
      promoteIf: ["Phase 4 で current/candidate 分離が安定"],
      withdrawIf: ["candidate の概念が不要と判断された場合"],
    },
  },
  "AR-CURRENT-FACTOR-BUSINESS-LOCK": {
    fixNow: "now",
    executionPlan: { effort: "medium", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CURRENT-NO-CANDIDATE-MIX": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CURRENT-NO-CANDIDATE-STATE": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CURRENT-NO-DIRECT-IMPORT-GROWTH": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CURRENT-NO-STANDALONE-AUTH": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CURRENT-SEMANTIC-REQUIRED": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-CURRENT-VIEW-SEPARATION": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-DOC-STATIC-NUMBER": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-09",
      reviewCadenceDays: 90,
    },
  },
  "AR-E4-TRUTHINESS": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-G2-EMPTY-CATCH": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-G3-SUPPRESS": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-G4-INTERNAL": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-G5-DOMAIN-LINES": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-G5-HOOK-LINES": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-G5-HOOK-MEMO": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-G5-HOOK-STATE": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-G5-INFRA-LINES": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-G5-USECASE-LINES": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-G6-COMPONENT": {
    fixNow: "debt",
    executionPlan: { effort: "medium", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-G7-CACHE-BODY": {
    fixNow: "review",
    executionPlan: { effort: "medium", priority: 4 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-JS-NO-NEW-AUTHORITATIVE": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-JS-NO-PRES-HELPER-PROMOTE": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-JS-NO-REFERENCE-GROWTH": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-MIG-OLD-PATH": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-PATH-CUSTOMER": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-PATH-CUSTOMER-GAP": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-PATH-DISCOUNT": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-PATH-FACTOR-DECOMPOSITION": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-PATH-FREE-PERIOD": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-PATH-FREE-PERIOD-BUDGET": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-PATH-FREE-PERIOD-DEPT-KPI": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-PATH-GROSS-PROFIT": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-PATH-GROSS-PROFIT-CONSISTENCY": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-PATH-PI-VALUE": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-PATH-PURCHASE-COST": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-PATH-SALES": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-Q3-CHART-NO-DUCKDB": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-Q4-ALIGNMENT-HANDLER": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-REGISTRY-SINGLE-MASTER": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
    lifecyclePolicy: {
      introducedAt: "2026-04-10",
      observeForDays: 30,
      promoteIf: ["Phase 2 で master + derived view が安定"],
      withdrawIf: ["正本が別の仕組みに置き換わった場合"],
    },
  },
  "AR-RESP-EXPORT-DENSITY": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-RESP-FALLBACK-SPREAD": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-RESP-FEATURE-COMPLEXITY": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-RESP-HOOK-COMPLEXITY": {
    fixNow: "debt",
    executionPlan: { effort: "medium", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-RESP-MODULE-STATE": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-RESP-NORMALIZATION": {
    fixNow: "debt",
    executionPlan: { effort: "medium", priority: 4 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-RESP-STORE-COUPLING": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-REVIEW-NEEDED-BLOCK": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },
  "AR-SAFETY-FIRE-FORGET": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 30,
    },
    lifecyclePolicy: {
      introducedAt: "2026-04-10",
      observeForDays: 7,
      promoteIf: ["7日間の運用で false positive がない"],
      withdrawIf: ["検出精度が低く false positive が頻発する"],
    },
  },
  "AR-SAFETY-INSERT-VERIFY": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 60,
    },
    lifecyclePolicy: {
      introducedAt: "2026-04-10",
      observeForDays: 7,
      promoteIf: ["7日間の運用で false positive がない"],
      withdrawIf: ["検出精度が低く false positive が頻発する"],
    },
  },
  "AR-SAFETY-NULLABLE-ASYNC": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 30,
    },
  },
  "AR-SAFETY-PROD-VALIDATION": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 60,
    },
    lifecyclePolicy: {
      introducedAt: "2026-04-10",
      observeForDays: 7,
      promoteIf: ["7日間の運用で false positive がない"],
      withdrawIf: ["検出精度が低く false positive が頻発する"],
    },
  },
  "AR-SAFETY-SILENT-CATCH": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 30,
    },
    lifecyclePolicy: {
      introducedAt: "2026-04-10",
      observeForDays: 7,
      promoteIf: ["7日間の運用で false positive がない"],
      withdrawIf: ["検出精度が低く false positive が頻発する"],
    },
  },
  "AR-SAFETY-STALE-STORE": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 60,
    },
    lifecyclePolicy: {
      introducedAt: "2026-04-10",
      observeForDays: 7,
      promoteIf: ["7日間の運用で false positive がない"],
      withdrawIf: ["検出精度が低く false positive が頻発する"],
    },
  },
  "AR-SAFETY-VALIDATION-ENFORCE": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 30,
    },
  },
  "AR-SAFETY-WORKER-TIMEOUT": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 4 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 60,
    },
    lifecyclePolicy: {
      introducedAt: "2026-04-10",
      observeForDays: 7,
      promoteIf: ["7日間の運用で false positive がない"],
      withdrawIf: ["検出精度が低く false positive が頻発する"],
    },
  },
  "AR-SEMANTIC-BUSINESS-ANALYTIC-SEPARATION": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
    lifecyclePolicy: {
      introducedAt: "2026-04-10",
      observeForDays: 30,
      promoteIf: ["Phase 2 で derived view + guard が安定"],
      withdrawIf: ["意味分類が不要と判断された場合"],
    },
  },
  "AR-STRUCT-ANALYSIS-FRAME": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-STRUCT-CALC-CANON": {
    fixNow: "review",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-STRUCT-CANONICAL-INPUT": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-STRUCT-CANONICALIZATION": {
    fixNow: "review",
    executionPlan: { effort: "medium", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-STRUCT-COMPARISON-SCOPE": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-STRUCT-DATA-INTEGRITY": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-STRUCT-DUAL-RUN-EXIT": {
    fixNow: "review",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-11",
      reviewCadenceDays: 60,
    },
  },
  "AR-STRUCT-FALLBACK-METADATA": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-STRUCT-PAGE-META": {
    fixNow: "review",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-STRUCT-PRES-ISOLATION": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-STRUCT-PURITY": {
    fixNow: "now",
    executionPlan: { effort: "medium", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-STRUCT-QUERY-PATTERN": {
    fixNow: "debt",
    executionPlan: { effort: "medium", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-STRUCT-RENDER-SIDE-EFFECT": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-STRUCT-STORE-RESULT-INPUT": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-STRUCT-TEMPORAL-ROLLING": {
    fixNow: "review",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-STRUCT-TEMPORAL-SCOPE": {
    fixNow: "review",
    executionPlan: { effort: "medium", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 60,
    },
  },
  "AR-STRUCT-TOPOLOGY": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 90,
    },
  },
  "AR-TAG-ADAPTER": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TAG-BARREL": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TAG-CALCULATION": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TAG-CHART-OPTION": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TAG-CHART-VIEW": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TAG-CONTEXT": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TAG-FORM": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TAG-LAYOUT": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TAG-ORCHESTRATION": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TAG-PAGE": {
    fixNow: "debt",
    executionPlan: { effort: "medium", priority: 4 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TAG-PERSISTENCE": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TAG-QUERY-EXEC": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TAG-QUERY-PLAN": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TAG-REDUCER": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TAG-SELECTION-GUIDE": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TAG-STATE-MACHINE": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TAG-TRANSFORM": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TAG-UTILITY": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TAG-WIDGET": {
    fixNow: "debt",
    executionPlan: { effort: "small", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-08",
      reviewCadenceDays: 45,
    },
  },
  "AR-TERM-AUTHORITATIVE-STANDALONE": {
    fixNow: "debt",
    executionPlan: { effort: "trivial", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-10",
      reviewCadenceDays: 90,
    },
  },

  // ── AAG 入口一元化（C2: direct import 禁止の guard 化）──
  "AR-AAG-DERIVED-ONLY-IMPORT": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-12",
      reviewCadenceDays: 90,
    },
  },
  "AR-AAG-NO-BASE-RULES-CONSUMER-IMPORT": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-12",
      reviewCadenceDays: 90,
    },
  },
  "AR-AAG-NO-DIRECT-OVERLAY-IMPORT": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-12",
      reviewCadenceDays: 90,
    },
  },
  // ── Test Signal Integrity (project: test-signal-integrity Phase 3) ──
  // 上位原則: references/01-principles/test-signal-integrity.md
  // AR-TSIG-TEST-01 / AR-TSIG-COMP-03 / AR-TSIG-TEST-04 は taxonomy-v2 子 Phase 8 で
  // testSignalIntegrityGuard.test.ts を物理削除した際、本 overlay からも削除済 (2026-04-27)。
  // 置換は v2 T:kind per-test obligation (taxonomyInterlockGuard + testTaxonomyGuardV2)。
  // AR-G3-SUPPRESS-RATIONALE は scope 違いで恒久維持。
  "AR-G3-SUPPRESS-RATIONALE": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-13",
      reviewCadenceDays: 90,
    },
  },
  "AR-SCOPE-AWARE-MUTATION": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-17",
      reviewCadenceDays: 90,
    },
  },
  // ── AR-TAXONOMY-* (taxonomy-v2 子 Phase 3.5: 共通 infra) ──
  // 上位原則: references/01-principles/taxonomy-constitution.md
  // 7 rule の reviewPolicy 設定（90 日 cadence、solo-maintainer owner）。
  // 実検出は v2 guard test 群（responsibilityTagGuardV2 / testTaxonomyGuardV2 /
  // taxonomyInterlockGuard）が担う。本 entry は Pure Calc Reorg overlay に同梱
  // するが、AR-TAXONOMY-* は taxonomy-v2 project の deliverable として project 横断
  // で運用される（reviewPolicy は currently-active overlay = pure-calculation-reorg
  // に集約、taxonomy-v2 project の Phase 4 archive 後に整理）。
  "AR-TAXONOMY-NO-UNTAGGED": {
    fixNow: "debt",
    executionPlan: { effort: "medium", priority: 3 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-27",
      reviewCadenceDays: 90,
    },
  },
  "AR-TAXONOMY-KNOWN-VOCABULARY": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-27",
      reviewCadenceDays: 90,
    },
  },
  "AR-TAXONOMY-ONE-TAG-ONE-AXIS": {
    fixNow: "now",
    executionPlan: { effort: "small", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-27",
      reviewCadenceDays: 90,
    },
  },
  "AR-TAXONOMY-INTERLOCK": {
    fixNow: "debt",
    executionPlan: { effort: "medium", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-27",
      reviewCadenceDays: 90,
    },
  },
  "AR-TAXONOMY-ORIGIN-REQUIRED": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-27",
      reviewCadenceDays: 90,
    },
  },
  "AR-TAXONOMY-COGNITIVE-LOAD": {
    fixNow: "now",
    executionPlan: { effort: "medium", priority: 2 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-27",
      reviewCadenceDays: 90,
    },
  },
  "AR-TAXONOMY-AI-VOCABULARY-BINDING": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "solo-maintainer",
      lastReviewedAt: "2026-04-27",
      reviewCadenceDays: 90,
    },
  },
};
