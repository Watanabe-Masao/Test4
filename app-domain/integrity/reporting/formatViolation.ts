/**
 * app-domain/integrity/reporting/formatViolation.ts —
 * 共通 violation formatter (Phase B Step B-2)
 *
 * 全 13 ペア共通の `expect(violations, formatted).toEqual([])` パターンを
 * generic 化する。caller (guard 側) が DriftReport[] または string[] を
 * 受け取れるよう、2 つの formatter を提供する。
 *
 * 設計: integrity-domain-architecture.md §3.4
 *
 * 不変条件 (domain 純粋性):
 * - 副作用ゼロ (純粋関数)
 * - 外部 import なし (types.ts のみ)
 */
import type { DriftReport } from "../types";

/**
 * formatViolations — DriftReport[] を多行文字列にフォーマット。
 *
 * @param violations - 検出済の violation 集合
 * @returns 違反 0 件なら空文字、それ以外は header + 各 violation の詳細
 *
 * @example
 *   const violations: DriftReport[] = [{
 *     ruleId: 'AR-DOC-STATIC-NUMBER',
 *     severity: 'gate',
 *     location: 'docs/contracts/doc-registry.json:91',
 *     expected: 'X.md (実在)',
 *     actual: 'X.md (broken)',
 *   }]
 *   expect(violations, formatViolations(violations)).toEqual([])
 */
export function formatViolations(violations: readonly DriftReport[]): string {
  if (violations.length === 0) return "";
  const lines: string[] = [`違反 (${violations.length} 件):`];
  for (const v of violations) {
    lines.push(`  [${v.severity}] ${v.ruleId} @ ${v.location}`);
    lines.push(`    expected: ${v.expected}`);
    lines.push(`    actual:   ${v.actual}`);
    if (v.fixHint) lines.push(`    hint:     ${v.fixHint}`);
  }
  return lines.join("\n");
}

/**
 * formatStringViolations — 既存 guard で多用されている string[] パターン用の
 * 互換 formatter。`violations.join('\n')` を「違反件数 header + bullet list」に
 * 統一し、test failure メッセージの一貫性を担保する。
 *
 * @example
 *   const missing: string[] = ['file-A.md', 'file-B.md']
 *   expect(missing, formatStringViolations(missing)).toEqual([])
 */
export function formatStringViolations(violations: readonly string[]): string {
  if (violations.length === 0) return "";
  return `違反 (${violations.length} 件):\n${violations.map((v) => `  - ${v}`).join("\n")}`;
}
