/**
 * app-domain/integrity/detection/setRelation.ts —
 * 集合関係 (intersect / disjoint / subset) の検出 primitive (Phase D Wave 1)
 *
 * 「2 つの集合が排他的か」「片方が他方を包含するか」「期待トークンが全て含まれるか」
 * を一様な violation 集合に変換する。
 *
 * 設計: integrity-domain-architecture.md §3.3 (setRelation、検出パターン v)
 *
 * 利用ペア: #4 test-contract (token inclusion / dynamicSource exhaustion) /
 *           #5 scope.json (owns ⊥ out_of_scope_warn) /
 *           #7 principles (id 集合一致) / #8 architectureRules (4 経路 id 集合一致)
 *
 * 不変条件 (domain 純粋性):
 * - 副作用ゼロ (引数 set のみ)
 * - 外部 import なし (types.ts のみ)
 */
import type { DriftReport, EnforcementSeverity } from "../types";

export interface DisjointOptions {
  readonly ruleId: string;
  readonly leftLabel: string;
  readonly rightLabel: string;
  readonly severity?: EnforcementSeverity;
}

/**
 * checkDisjoint — 2 つの集合が排他的 (共通元なし) であることを検証。
 *
 * @returns 共通元 1 件につき 1 DriftReport
 *
 * @example
 *   checkDisjoint(new Set(['a', 'b']), new Set(['b', 'c']), {
 *     ruleId: 'AR-X', leftLabel: 'owns', rightLabel: 'out_of_scope_warn',
 *   })
 *   // → 1 violation: 'b' が両方に出現
 */
export function checkDisjoint(
  left: ReadonlySet<string>,
  right: ReadonlySet<string>,
  options: DisjointOptions,
): DriftReport[] {
  const severity = options.severity ?? "gate";
  const violations: DriftReport[] = [];
  for (const item of left) {
    if (right.has(item)) {
      violations.push({
        ruleId: options.ruleId,
        severity,
        location: `${options.leftLabel} ∩ ${options.rightLabel}: ${item}`,
        expected: `${options.leftLabel} と ${options.rightLabel} は排他`,
        actual: `'${item}' が両方に出現`,
        fixHint: `${options.leftLabel} か ${options.rightLabel} のどちらかから削除`,
      });
    }
  }
  return violations;
}

export interface InclusionOptions {
  readonly ruleId: string;
  readonly subsetLabel: string;
  readonly supersetLabel: string;
  readonly severity?: EnforcementSeverity;
}

/**
 * checkInclusion — `subset` の全要素が `superset` に含まれることを検証。
 *
 * @returns 不足 1 件につき 1 DriftReport
 *
 * @example
 *   checkInclusion(
 *     new Set(['readPurchaseCost', 'calculateGrossProfit']),
 *     new Set(claudeMdContent.match(/.../g) ?? []),
 *     { ruleId: 'AR-X', subsetLabel: '必須トークン', supersetLabel: 'CLAUDE.md' }
 *   )
 *
 * 注: superset は通常 ReadonlySet だが、文字列包含のような検査の場合は
 *      `new Set([...]).has` の形で hash 化する前にスケールしないので、
 *      caller 側で predicate を使う `checkInclusionByPredicate` も提供する。
 */
export function checkInclusion(
  subset: ReadonlySet<string>,
  superset: ReadonlySet<string>,
  options: InclusionOptions,
): DriftReport[] {
  const severity = options.severity ?? "gate";
  const violations: DriftReport[] = [];
  for (const item of subset) {
    if (!superset.has(item)) {
      violations.push({
        ruleId: options.ruleId,
        severity,
        location: `${options.supersetLabel}: ${item}`,
        expected: `'${item}' が ${options.supersetLabel} に含まれる`,
        actual: `'${item}' が ${options.supersetLabel} に未存在`,
        fixHint: `${options.supersetLabel} に '${item}' を追加するか、${options.subsetLabel} から削除`,
      });
    }
  }
  return violations;
}

export interface InclusionPredicateOptions {
  readonly ruleId: string;
  readonly subsetLabel: string;
  readonly supersetLabel: string;
  readonly severity?: EnforcementSeverity;
}

/**
 * checkInclusionByPredicate — `subset` の各要素が `predicate(item) === true` であることを検証。
 *
 * 例: `claudeMd.includes(token)` のように superset を Set 化せず文字列包含で検査する場合に使う。
 *
 * @example
 *   checkInclusionByPredicate(
 *     new Set(['token-a', 'token-b']),
 *     (token) => claudeMdContent.includes(token),
 *     { ruleId: 'AR-X', subsetLabel: '必須トークン', supersetLabel: 'CLAUDE.md' }
 *   )
 */
export function checkInclusionByPredicate(
  subset: ReadonlySet<string>,
  predicate: (item: string) => boolean,
  options: InclusionPredicateOptions,
): DriftReport[] {
  const severity = options.severity ?? "gate";
  const violations: DriftReport[] = [];
  for (const item of subset) {
    if (!predicate(item)) {
      violations.push({
        ruleId: options.ruleId,
        severity,
        location: `${options.supersetLabel}: ${item}`,
        expected: `'${item}' が ${options.supersetLabel} に含まれる`,
        actual: `'${item}' が ${options.supersetLabel} に未存在`,
        fixHint: `${options.supersetLabel} に '${item}' を追加するか、${options.subsetLabel} から削除`,
      });
    }
  }
  return violations;
}
