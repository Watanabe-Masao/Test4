/**
 * Health Rules — しきい値定義
 *
 * 各 KPI に対して hard_gate / soft_gate / trend_gate / info を設定する。
 * Phase 1 では TypeScript で定義。将来的に YAML 外部化可能。
 */
import type { HealthRule } from "../types.js";

export const HEALTH_RULES: readonly HealthRule[] = [
  // --- Allowlist ---
  {
    id: "allowlist.frozen.nonZero",
    type: "hard_gate",
    operator: "eq",
    target: 0,
  },
  { id: "allowlist.total", type: "soft_gate", operator: "lte", target: 20 },
  { id: "allowlist.active.count", type: "info", operator: "lte", target: 10 },

  // --- Compatibility Debt ---
  { id: "compat.bridge.count", type: "soft_gate", operator: "lte", target: 3 },
  {
    id: "compat.reexport.count",
    type: "soft_gate",
    operator: "lte",
    target: 3,
  },

  // --- Complexity ---
  { id: "complexity.hotspot.count", type: "info", operator: "lte", target: 10 },
  {
    id: "complexity.nearLimit.count",
    type: "soft_gate",
    operator: "lte",
    target: 5,
  },
  { id: "complexity.vm.count", type: "info", operator: "lte", target: 30 },

  // --- Guard ---
  { id: "guard.files.count", type: "info", operator: "gte", target: 30 },
  {
    id: "guard.reviewOnlyTags.count",
    type: "soft_gate",
    operator: "lte",
    target: 5,
  },

  // --- Docs ---
  {
    id: "docs.obsoleteTerms.count",
    type: "hard_gate",
    operator: "eq",
    target: 0,
  },
  {
    id: "docs.generatedSections.stale",
    type: "hard_gate",
    operator: "eq",
    target: 0,
  },

  // --- Boundary ---
  {
    id: "boundary.presentationToInfra",
    type: "hard_gate",
    operator: "eq",
    target: 0,
  },
  {
    id: "boundary.infraToApplication",
    type: "hard_gate",
    operator: "eq",
    target: 0,
  },

  // --- Bundle Perf ---
  {
    id: "perf.bundle.totalJsKb",
    type: "soft_gate",
    operator: "lte",
    target: 7000,
  },
  {
    id: "perf.bundle.mainJsKb",
    type: "soft_gate",
    operator: "lte",
    target: 2500,
  },
  {
    id: "perf.bundle.vendorEchartsKb",
    type: "info",
    operator: "lte",
    target: 1000,
  },

  // --- Build Perf ---
  {
    id: "perf.build.app.seconds",
    type: "soft_gate",
    operator: "lte",
    target: 120,
  },
  {
    id: "perf.test.guards.seconds",
    type: "soft_gate",
    operator: "lte",
    target: 30,
  },
  {
    id: "perf.test.coverage.seconds",
    type: "soft_gate",
    operator: "lte",
    target: 300,
  },
  {
    id: "perf.test.e2e.seconds",
    type: "soft_gate",
    operator: "lte",
    target: 300,
  },

  // --- Obligation ---
  {
    id: "docs.obligation.violations",
    type: "hard_gate",
    operator: "eq",
    target: 0,
  },

  // --- Temporal Governance (ratchet-down) ---
  // 増加禁止: baseline を超えたら fail
  {
    id: "temporal.rules.reviewOverdue.count",
    type: "hard_gate",
    operator: "eq",
    target: 0,
  },
  {
    id: "temporal.rules.heuristicGate.count",
    type: "soft_gate",
    operator: "lte",
    target: 27,
  },
  {
    id: "temporal.allowlist.activeDebt.count",
    type: "soft_gate",
    operator: "lte",
    target: 33,
  },
  // 減少禁止: baseline を下回ったら fail
  {
    id: "temporal.rules.reviewPolicy.count",
    type: "soft_gate",
    operator: "gte",
    target: 84,
  },
  {
    id: "temporal.rules.sunsetCondition.count",
    type: "info",
    operator: "gte",
    target: 9,
  },
  {
    id: "temporal.allowlist.activeDebt.withCreatedAt",
    type: "soft_gate",
    operator: "gte",
    target: 33,
  },
  // --- Rule Efficacy ---
  {
    id: "efficacy.rules.highNoise.count",
    type: "info",
    operator: "lte",
    target: 3,
  },
  {
    id: "efficacy.allowlist.renewalTotal",
    type: "info",
    operator: "lte",
    target: 10,
  },
] as const;
