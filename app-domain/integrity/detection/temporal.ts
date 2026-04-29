/**
 * app-domain/integrity/detection/temporal.ts —
 * 期限 / freshness 判定 primitive (Phase B Step B-5)
 *
 * `expiresAt` 超過検出 + `lastReviewedAt + reviewCadenceDays` の freshness 検証を generic 化。
 *
 * 設計: integrity-domain-architecture.md §3.3 (temporal、検出パターン iv)
 *
 * 利用ペア: #6 taxonomy (cooling 期間) / #9 allowlists (M5 expiresAt 超過) /
 *           #10 checklist (deadline) / #12 contentSpec (freshness)
 *
 * 不変条件 (domain 純粋性):
 * - 副作用ゼロ
 * - 現在時刻は caller が `now: Date` で injection (テスト純粋性)
 * - 外部 import なし (types.ts のみ)
 */
import type { DriftReport, EnforcementSeverity } from "../types";

export interface ExpirationOptions {
  readonly ruleId: string;
  readonly itemLabel: string;
  readonly severity?: EnforcementSeverity;
}

export interface ExpiringItem {
  readonly id: string;
  /** ISO 8601 日付文字列 (e.g., '2026-04-28') */
  readonly expiresAt: string;
}

/**
 * checkExpired — expiresAt が now を過ぎている item を検出。
 *
 * @example
 *   const items = [{ id: 'allowlist:foo', expiresAt: '2026-01-01' }]
 *   const violations = checkExpired(items, new Date('2026-04-28'), {
 *     ruleId: 'allowlist-metadata',
 *     itemLabel: 'allowlist entry',
 *   })
 *   // → 1 violation
 */
export function checkExpired(
  items: readonly ExpiringItem[],
  now: Date,
  options: ExpirationOptions,
): DriftReport[] {
  const severity = options.severity ?? "gate";
  const violations: DriftReport[] = [];
  for (const item of items) {
    const expiresTs = new Date(item.expiresAt).getTime();
    if (Number.isNaN(expiresTs)) continue;
    if (now.getTime() > expiresTs) {
      violations.push({
        ruleId: options.ruleId,
        severity,
        location: `${options.itemLabel}: ${item.id}`,
        expected: `expiresAt > ${formatDate(now)}`,
        actual: `expiresAt = ${item.expiresAt} (expired)`,
        fixHint: `${options.itemLabel} ${item.id} の見直しを実施するか、expiresAt を延長`,
      });
    }
  }
  return violations;
}

export interface FreshnessOptions {
  readonly ruleId: string;
  readonly itemLabel: string;
  readonly severity?: EnforcementSeverity;
}

export interface FreshnessTarget {
  readonly id: string;
  /** ISO 8601 日付文字列 */
  readonly lastReviewedAt: string;
  /** review cadence (日数)。`now - lastReviewedAt > cadenceDays` で stale */
  readonly cadenceDays: number;
}

/**
 * checkFreshness — lastReviewedAt + cadenceDays を経過した item を stale 判定。
 *
 * @example
 *   const targets = [{ id: 'spec:WID-001', lastReviewedAt: '2025-01-01', cadenceDays: 90 }]
 *   const violations = checkFreshness(targets, new Date('2026-04-28'), {
 *     ruleId: 'AR-CONTENT-SPEC-FRESHNESS',
 *     itemLabel: 'spec',
 *   })
 *   // → 1 violation (1 年以上経過)
 */
export function checkFreshness(
  targets: readonly FreshnessTarget[],
  now: Date,
  options: FreshnessOptions,
): DriftReport[] {
  const severity = options.severity ?? "warn";
  const violations: DriftReport[] = [];
  for (const t of targets) {
    const reviewedTs = new Date(t.lastReviewedAt).getTime();
    if (Number.isNaN(reviewedTs)) continue;
    const ageDays = (now.getTime() - reviewedTs) / (24 * 60 * 60 * 1000);
    if (ageDays > t.cadenceDays) {
      violations.push({
        ruleId: options.ruleId,
        severity,
        location: `${options.itemLabel}: ${t.id}`,
        expected: `lastReviewedAt 経過日数 ≤ ${t.cadenceDays}`,
        actual: `lastReviewedAt = ${t.lastReviewedAt} (${Math.floor(ageDays)} 日前)`,
        fixHint: `${options.itemLabel} ${t.id} を review し lastReviewedAt を更新`,
      });
    }
  }
  return violations;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
