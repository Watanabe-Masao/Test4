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
  {
    id: "docs.obligation.requiredReads.brokenLinks",
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
    target: 32,
  },
  {
    id: "temporal.allowlist.activeDebt.count",
    type: "soft_gate",
    operator: "lte",
    target: 12, // Phase 5-6: 11 candidate bridge + 1 既存
  },
  // 減少禁止: baseline を下回ったら fail
  {
    id: "temporal.rules.reviewPolicy.count",
    type: "soft_gate",
    operator: "gte",
    target: 92,
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
    target: 1,
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

  // --- Project Checklist Governance ---
  // Hard gate: completed なのに archive 未実施の project は許さない
  // (consistency guard が同じ条件で fail するが、health 側にも責任を持たせる)
  {
    id: "project.checklist.completedNotArchivedCount",
    type: "hard_gate",
    operator: "eq",
    target: 0,
  },
  // Info: active project 数（観測のみ。上限は付けない）
  {
    id: "project.checklist.activeCount",
    type: "info",
    operator: "lte",
    target: 20,
  },
  // Info: in_progress / collection / empty / archived 数（観測のみ）
  {
    id: "project.checklist.inProgressCount",
    type: "info",
    operator: "lte",
    target: 20,
  },
  {
    id: "project.checklist.archivedCount",
    type: "info",
    operator: "lte",
    target: 100,
  },
  {
    id: "project.checklist.emptyCount",
    type: "info",
    operator: "lte",
    target: 10,
  },
] as const;
