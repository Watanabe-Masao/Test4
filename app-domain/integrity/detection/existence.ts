/**
 * app-domain/integrity/detection/existence.ts —
 * 双方向存在検証 primitive (Phase B Step B-4)
 *
 * 「registry に登録された id が source 側に実在する」AND
 * 「source 側にある id が registry に登録されている」の双方向集合差を検出。
 *
 * 設計: integrity-domain-architecture.md §3.3 (existence primitive、検出パターン i)
 *
 * 利用ペア: #1 calc canon / #2 readModels / #3 doc-registry / #11 obligation /
 *           #12 contentSpec / #13 invariant
 *
 * 不変条件 (domain 純粋性):
 * - 副作用ゼロ (引数 set のみ)
 * - 外部 import なし (types.ts のみ)
 */
import type { DriftReport, EnforcementSeverity } from "../types";

export interface ExistenceCheckOptions {
  readonly ruleId: string;
  readonly registryLabel: string;
  readonly sourceLabel: string;
  readonly severity?: EnforcementSeverity;
  /** 一方向のみ検証する場合に指定 (省略時は双方向) */
  readonly direction?: "registry-to-source" | "source-to-registry" | "both";
}

/**
 * checkBidirectionalExistence — registry id 集合 ↔ source id 集合の双方向集合差。
 *
 * @returns DriftReport[] (registry に有るが source に無い + source に有るが registry に無い)
 *
 * @example
 *   const result = checkBidirectionalExistence(
 *     new Set(['WID-001', 'WID-002']),  // registry
 *     new Set(['WID-001', 'WID-003']),  // source filesystem
 *     { ruleId: 'AR-CONTENT-SPEC-EXISTS', registryLabel: 'spec', sourceLabel: 'fs' },
 *   )
 *   // → 2 violations: WID-002 (registry 有 / source 無), WID-003 (source 有 / registry 無)
 */
export function checkBidirectionalExistence(
  registryIds: ReadonlySet<string>,
  sourceIds: ReadonlySet<string>,
  options: ExistenceCheckOptions,
): DriftReport[] {
  const direction = options.direction ?? "both";
  const severity = options.severity ?? "gate";
  const violations: DriftReport[] = [];

  if (direction === "registry-to-source" || direction === "both") {
    for (const id of registryIds) {
      if (!sourceIds.has(id)) {
        violations.push({
          ruleId: options.ruleId,
          severity,
          location: `${options.registryLabel}: ${id}`,
          expected: `${id} が ${options.sourceLabel} に存在`,
          actual: `${options.sourceLabel} に未存在 (stale registry entry)`,
          fixHint: `registry から ${id} を削除するか、${options.sourceLabel} に追加`,
        });
      }
    }
  }

  if (direction === "source-to-registry" || direction === "both") {
    for (const id of sourceIds) {
      if (!registryIds.has(id)) {
        violations.push({
          ruleId: options.ruleId,
          severity,
          location: `${options.sourceLabel}: ${id}`,
          expected: `${id} が ${options.registryLabel} に登録済`,
          actual: `${options.registryLabel} に未登録 (untracked source)`,
          fixHint: `${options.registryLabel} に ${id} を登録するか、${options.sourceLabel} から削除`,
        });
      }
    }
  }

  return violations;
}
