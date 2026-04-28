/**
 * app-domain/integrity/detection/cardinality.ts —
 * 集合濃度 (cardinality) 検出 primitive (Phase D Wave 2)
 *
 * 「id 重複なし」「件数 ≤ N」「件数 ≥ M」「2 集合の件数一致」を一様な violation 集合に変換。
 *
 * 設計: integrity-domain-architecture.md §3.3 (cardinality、検出パターン vii)
 *
 * 利用ペア: #6 taxonomy v2 (Cognitive Load Ceiling 軸ごと ≤ 15) /
 *           #8 architectureRules (id 一意 / 4 経路 件数一致 / 全 rule 必須 field 充足)
 *
 * 不変条件 (domain 純粋性):
 * - 副作用ゼロ
 * - 外部 import なし (types.ts のみ)
 */
import type { DriftReport, EnforcementSeverity } from "../types";

export interface UniquenessOptions {
  readonly ruleId: string;
  readonly registryLabel: string;
  readonly severity?: EnforcementSeverity;
}

/**
 * checkUniqueness — 配列内の重複 id を検出。
 *
 * @returns 重複 id 1 件につき 1 DriftReport
 *
 * @example
 *   checkUniqueness(['a', 'b', 'a', 'c'], { ruleId: 'AR-X', registryLabel: 'rule ids' })
 *   // → 1 violation: 'a' が重複
 */
export function checkUniqueness(
  ids: readonly string[],
  options: UniquenessOptions,
): DriftReport[] {
  const severity = options.severity ?? "gate";
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates].map((id) => ({
    ruleId: options.ruleId,
    severity,
    location: `${options.registryLabel}: ${id}`,
    expected: `${options.registryLabel} の id は一意`,
    actual: `'${id}' が重複`,
    fixHint: `${options.registryLabel} から重複 '${id}' を削除`,
  }));
}

export interface UpperBoundOptions {
  readonly ruleId: string;
  readonly counterLabel: string;
  readonly upperBound: number;
  readonly severity?: EnforcementSeverity;
}

/**
 * checkUpperBound — count ≤ upperBound を検証。
 *
 * @example
 *   checkUpperBound(16, { ruleId: 'AR-X', counterLabel: 'R:tag 数', upperBound: 15 })
 *   // → 1 violation: 16 > 15
 */
export function checkUpperBound(
  count: number,
  options: UpperBoundOptions,
): DriftReport[] {
  if (count <= options.upperBound) return [];
  const severity = options.severity ?? "gate";
  return [
    {
      ruleId: options.ruleId,
      severity,
      location: options.counterLabel,
      expected: `${options.counterLabel} ≤ ${options.upperBound}`,
      actual: `${options.counterLabel} = ${count} (over by ${count - options.upperBound})`,
      fixHint: `${options.counterLabel} を ${options.upperBound} 以下に削減`,
    },
  ];
}

export interface NonEmptyOptions {
  readonly ruleId: string;
  readonly registryLabel: string;
  readonly severity?: EnforcementSeverity;
}

/**
 * checkNonEmpty — 配列 / Set が非空であることを検証 (配線が死んでいないことを担保)。
 *
 * @example
 *   checkNonEmpty(ARCHITECTURE_RULES, { ruleId: 'AR-X', registryLabel: 'ARCHITECTURE_RULES' })
 */
export function checkNonEmpty<T>(
  collection: {
    readonly length?: number;
    readonly size?: number;
  } & Iterable<T>,
  options: NonEmptyOptions,
): DriftReport[] {
  const len =
    typeof collection.length === "number"
      ? collection.length
      : typeof collection.size === "number"
        ? collection.size
        : [...collection].length;
  if (len > 0) return [];
  const severity = options.severity ?? "gate";
  return [
    {
      ruleId: options.ruleId,
      severity,
      location: options.registryLabel,
      expected: `${options.registryLabel} が非空`,
      actual: `${options.registryLabel} が空 (配線死亡疑い)`,
      fixHint: `${options.registryLabel} の merge / re-export 経路を確認`,
    },
  ];
}

export interface SizeEqualityOptions {
  readonly ruleId: string;
  readonly leftLabel: string;
  readonly rightLabel: string;
  readonly severity?: EnforcementSeverity;
}

/**
 * checkSizeEquality — 2 集合の件数が一致することを検証 (overlay 欠損等の検出)。
 *
 * @example
 *   checkSizeEquality(MERGED.length, BASE_RE_EXPORT.length, {
 *     ruleId: 'AR-X', leftLabel: 'merged', rightLabel: 'base re-export'
 *   })
 */
export function checkSizeEquality(
  leftSize: number,
  rightSize: number,
  options: SizeEqualityOptions,
): DriftReport[] {
  if (leftSize === rightSize) return [];
  const severity = options.severity ?? "gate";
  return [
    {
      ruleId: options.ruleId,
      severity,
      location: `${options.leftLabel} vs ${options.rightLabel}`,
      expected: `件数一致 (overlay 欠損なし)`,
      actual: `${options.leftLabel}=${leftSize}, ${options.rightLabel}=${rightSize}`,
      fixHint: `merge / re-export 経路の overlay 構成を確認`,
    },
  ];
}
