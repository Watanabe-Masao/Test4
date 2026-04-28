/**
 * app-domain/integrity/detection/ratchet.ts —
 * ratchet-down 集計 primitive (Phase B Step B-5)
 *
 * 既存の `expect(violations.length).toBeLessThanOrEqual(BASELINE)` パターンを generic 化。
 * baseline 比で増加してれば fail、減少してれば「baseline 更新を促す」hint を返す。
 *
 * 設計: integrity-domain-architecture.md §3.3 (ratchet、検出パターン iii)
 *
 * 利用ペア: #1 calc canon (Zod 未追加 ≤3) / #3 doc-registry (UNREGISTERED_BASELINE) /
 *           #6 taxonomy (cooling) / #9 allowlists (M1〜M4) / #10 checklist (FORMAT_EXEMPT) /
 *           #12 contentSpec (J6 coverage)
 *
 * 不変条件 (domain 純粋性):
 * - 副作用ゼロ
 * - 外部 import なし (types.ts のみ)
 */
import type { DriftReport, EnforcementSeverity } from "../types";

export interface RatchetOptions {
  readonly ruleId: string;
  /** counter の意味を示す label (e.g., 'Zod 未追加 entry') */
  readonly counterLabel: string;
  readonly baseline: number;
  readonly severity?: EnforcementSeverity;
}

export interface RatchetResult {
  readonly status: "ok" | "over" | "reduced";
  readonly violations: readonly DriftReport[];
  /** 減少した場合の baseline 更新 hint (status='reduced' 時のみ) */
  readonly ratchetDownHint?: string;
}

/**
 * checkRatchet — 現在のカウント vs baseline を比較。
 *
 * - `current > baseline` → status='over' + violation 1 件 (caller が test fail させる)
 * - `current < baseline` → status='reduced' + ratchetDownHint (baseline 更新催促)
 * - `current === baseline` → status='ok' (no violation)
 *
 * @example
 *   const r = checkRatchet(2, { ruleId: 'AR-X', counterLabel: 'Zod 未追加', baseline: 3 })
 *   // → { status: 'reduced', violations: [], ratchetDownHint: 'baseline を 3 → 2 に更新' }
 */
export function checkRatchet(
  current: number,
  options: RatchetOptions,
): RatchetResult {
  const severity = options.severity ?? "ratchet-down";
  if (current > options.baseline) {
    return {
      status: "over",
      violations: [
        {
          ruleId: options.ruleId,
          severity,
          location: options.counterLabel,
          expected: `${options.counterLabel} ≤ ${options.baseline}`,
          actual: `${options.counterLabel} = ${current} (baseline +${current - options.baseline})`,
          fixHint: `${options.counterLabel} を ${options.baseline} 以下に減らすか、baseline 更新理由を明記`,
        },
      ],
    };
  }
  if (current < options.baseline) {
    return {
      status: "reduced",
      violations: [],
      ratchetDownHint:
        `[ratchet-down] ${options.counterLabel} が ${options.baseline} → ${current} に減少。` +
        ` baseline を ${current} に更新してください。`,
    };
  }
  return { status: "ok", violations: [] };
}
