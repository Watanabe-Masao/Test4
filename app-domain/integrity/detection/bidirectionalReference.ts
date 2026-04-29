/**
 * app-domain/integrity/detection/bidirectionalReference.ts —
 * 双方向対称参照検出 primitive (Phase D Wave 2)
 *
 * `A.pair = B` ならば `B.pair = A` (または null) を期待する Antibody Pair /
 * lifecycle replacedBy ↔ supersedes / R⇔T interlock 等に適用。
 *
 * 設計: integrity-domain-architecture.md §3.3 (bidirectionalReference、検出パターン vi)
 *
 * 利用ペア: #6 taxonomy v2 (Antibody Pair / R⇔T interlock) /
 *           #12 contentSpec (replacedBy ↔ supersedes) /
 *           #13 invariant (id ↔ test name)
 *
 * 不変条件 (domain 純粋性):
 * - 副作用ゼロ
 * - 外部 import なし (types.ts のみ)
 */
import type { DriftReport, EnforcementSeverity } from "../types";

export interface BidirectionalReferenceOptions {
  readonly ruleId: string;
  readonly registryLabel: string;
  readonly severity?: EnforcementSeverity;
}

/**
 * checkBidirectionalReference — 各 entry の reference が双方向対称であることを検証。
 *
 * @param ids - registry の全 id
 * @param getReverse - 各 id の reference 先を返す関数 (null は「対象外」を示す)
 * @returns 非対称 1 件につき 1 DriftReport
 *
 * @example
 *   // R:bridge.antibodyPair = R:hook、R:hook.antibodyPair = R:bridge を期待
 *   checkBidirectionalReference(
 *     RESPONSIBILITY_TAGS_V2,
 *     (tag) => RESPONSIBILITY_TAG_REGISTRY_V2[tag].antibodyPair,
 *     { ruleId: 'AR-X', registryLabel: 'Antibody Pair' },
 *   )
 */
export function checkBidirectionalReference<T extends string>(
  ids: readonly T[],
  getReverse: (id: T) => T | null,
  options: BidirectionalReferenceOptions,
): DriftReport[] {
  const severity = options.severity ?? "gate";
  const violations: DriftReport[] = [];
  for (const id of ids) {
    const pair = getReverse(id);
    if (pair === null) continue;
    const reverse = getReverse(pair);
    if (reverse !== id) {
      violations.push({
        ruleId: options.ruleId,
        severity,
        location: `${options.registryLabel}: ${id} → ${pair}`,
        expected: `${pair} → ${id} (双方向対称)`,
        actual: `${pair} → ${reverse ?? "null"} (非対称)`,
        fixHint: `${pair} の reference を ${id} に修正、または ${id} の reference を null に`,
      });
    }
  }
  return violations;
}
