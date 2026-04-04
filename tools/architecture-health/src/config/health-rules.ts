/**
 * Health Rules — しきい値定義
 *
 * 各 KPI に対して hard_gate / soft_gate / trend_gate / info を設定する。
 * Phase 1 では TypeScript で定義。将来的に YAML 外部化可能。
 */
import type { HealthRule } from '../types.js'

export const HEALTH_RULES: readonly HealthRule[] = [
  // --- Allowlist ---
  { id: 'allowlist.frozen.nonZero', type: 'hard_gate', operator: 'eq', target: 0 },
  { id: 'allowlist.total', type: 'soft_gate', operator: 'lte', target: 20 },
  { id: 'allowlist.active.count', type: 'info', operator: 'lte', target: 10 },

  // --- Compatibility Debt ---
  { id: 'compat.bridge.count', type: 'soft_gate', operator: 'lte', target: 3 },
  { id: 'compat.reexport.count', type: 'soft_gate', operator: 'lte', target: 3 },

  // --- Complexity ---
  { id: 'complexity.hotspot.count', type: 'info', operator: 'lte', target: 10 },
  { id: 'complexity.nearLimit.count', type: 'soft_gate', operator: 'lte', target: 5 },
  { id: 'complexity.vm.count', type: 'info', operator: 'lte', target: 30 },

  // --- Guard ---
  { id: 'guard.files.count', type: 'info', operator: 'gte', target: 30 },
  { id: 'guard.reviewOnlyTags.count', type: 'soft_gate', operator: 'lte', target: 5 },

  // --- Docs ---
  { id: 'docs.obsoleteTerms.count', type: 'hard_gate', operator: 'eq', target: 0 },
  { id: 'docs.generatedSections.stale', type: 'hard_gate', operator: 'eq', target: 0 },

  // --- Boundary ---
  { id: 'boundary.presentationToInfra', type: 'hard_gate', operator: 'eq', target: 0 },
  { id: 'boundary.infraToApplication', type: 'hard_gate', operator: 'eq', target: 0 },

  // --- Build Perf (Phase 3 で追加予定) ---
  // { id: 'perf.build.app.seconds', type: 'trend_gate', operator: 'lte', target: 60 },
  // { id: 'perf.test.fastGate.seconds', type: 'trend_gate', operator: 'lte', target: 120 },

  // --- Bundle Perf (Phase 3 で追加予定) ---
  // { id: 'perf.bundle.totalJsKb', type: 'soft_gate', operator: 'lte', target: 2000 },
] as const
