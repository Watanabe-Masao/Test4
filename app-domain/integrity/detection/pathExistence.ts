/**
 * app-domain/integrity/detection/pathExistence.ts —
 * registry 内 path 文字列の filesystem 実在検証 (Phase B Step B-4)
 *
 * 設計: integrity-domain-architecture.md §3.3 (pathExistence、検出パターン i)
 *
 * 利用ペア: #3 doc-registry / #5 scope.json / #11 obligation / #12 contentSpec /
 *           phased-content-specs J7 後続課題
 *
 * 不変条件 (domain 純粋性):
 * - I/O 関数は caller (guard 側) が `existsSync` を渡す形式で injection
 * - 本 primitive 自体は existsSync を import しない (テスト純粋性確保)
 */
import type { DriftReport, EnforcementSeverity } from "../types";

export type ExistsCheck = (absPath: string) => boolean;

export interface PathExistenceOptions {
  readonly ruleId: string;
  /** registry を識別する文字列 (e.g., 'docs/contracts/doc-registry.json') */
  readonly registryLabel: string;
  readonly severity?: EnforcementSeverity;
}

export interface RegisteredPath {
  /** registry 内の絶対パス (existsSync に渡す形) */
  readonly absPath: string;
  /** violation 報告で使う相対パス / id */
  readonly displayPath: string;
  /** registry 内の出現箇所 (file:line 等)、optional */
  readonly registryLocation?: string;
}

/**
 * checkPathExistence — registry に登録された path 群が filesystem に実在するかを検証。
 *
 * @param paths - 検証対象 path 集合
 * @param exists - filesystem 検査関数 (caller が `existsSync` 等を bind して渡す)
 * @returns broken path に対する DriftReport[]
 *
 * @example
 *   import { existsSync } from 'node:fs'
 *   const violations = checkPathExistence(
 *     [{ absPath: '/repo/X.md', displayPath: 'X.md' }],
 *     existsSync,
 *     { ruleId: 'AR-DOC-STATIC-NUMBER', registryLabel: 'doc-registry.json' },
 *   )
 */
export function checkPathExistence(
  paths: readonly RegisteredPath[],
  exists: ExistsCheck,
  options: PathExistenceOptions,
): DriftReport[] {
  const severity = options.severity ?? "gate";
  const violations: DriftReport[] = [];
  for (const p of paths) {
    if (!exists(p.absPath)) {
      violations.push({
        ruleId: options.ruleId,
        severity,
        location:
          p.registryLocation ?? `${options.registryLabel}: ${p.displayPath}`,
        expected: `${p.displayPath} が filesystem に実在`,
        actual: `${p.displayPath} が見つからない (broken link)`,
        fixHint: `${p.displayPath} を実在させるか、${options.registryLabel} から削除`,
      });
    }
  }
  return violations;
}
