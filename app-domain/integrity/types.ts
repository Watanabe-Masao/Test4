/**
 * app-domain/integrity/types.ts — 整合性ドメインの抽象型 4 種
 *
 * canonicalization-domain-consolidation Phase B Step B-1 (型定義のみ、実装なし)。
 *
 * 13 既存 registry+guard ペア + tier1 横展開候補すべての primitive が本 file の
 * 4 抽象型のみで構築できるよう設計されている。具体 primitive の型 signature は
 * Step B-2 以降で順次 landing する。
 *
 * 設計詳細: `references/03-implementation/integrity-domain-architecture.md` §3.1
 * Phase A inventory: `references/03-implementation/integrity-pair-inventory.md` §3
 *
 * 不変条件 (domain 純粋性):
 * - 本 file は何にも依存しない (Node API / app/src 不可、自己完結)
 * - I/O 無し (caller が文字列 / 構造化データを渡す)
 * - all readonly (生成後の mutation を防ぐ)
 */

/**
 * Registry<TEntry> — 抽象 registry。
 *
 * parser 系 primitive (jsonRegistry / tsRegistry / yamlFrontmatter / filesystemRegistry /
 * markdownIdScan / jsdocTag) が一様に返す中間表現。
 *
 * - `source`: registry の出所 (file path や virtual id)。violation 報告で use。
 * - `entries`: id → TEntry の map。順序保持のため `ReadonlyMap` を採用。
 *
 * @example
 *   // jsonRegistry が doc-registry.json から構築する例 (B-3 以降で実装)
 *   const reg: Registry<{ path: string; label: string }> = {
 *     source: 'docs/contracts/doc-registry.json',
 *     entries: new Map([
 *       ['references/01-foundation/X.md', { path: '...', label: '...' }],
 *     ]),
 *   }
 */
export interface Registry<TEntry> {
  readonly source: string;
  readonly entries: ReadonlyMap<string, TEntry>;
}

/**
 * EnforcementSeverity — 検出結果の強度。
 *
 * - `warn`: ratchet-down 候補だが現時点で informational
 * - `gate`: hard fail (CI で push をブロック)
 * - `ratchet-down`: baseline 比で増加検出時のみ fail
 */
export type EnforcementSeverity = "warn" | "gate" | "ratchet-down";

/**
 * SyncDirection — parser ↔ source の同期方向。
 *
 * - `one-way`: registry → source の単方向検証 (e.g., registry に登録した path が実在)
 * - `two-way`: 双方向検証 (registry の path 全実在 + source 配下の全 file が registry 登録済)
 */
export type SyncDirection = "one-way" | "two-way";

/**
 * DriftReport — 共通 drift 表現。
 *
 * detection 系 primitive (existence / pathExistence / shapeSync / ratchet / temporal /
 * setRelation / bidirectionalReference / cardinality) が一様に返す violation 単位。
 *
 * - `ruleId`: `architectureRules.ts` の rule id (AR-XXX-XXX 形式)。caller が rule 文脈を補う
 * - `severity`: `EnforcementSeverity`
 * - `location`: violation 発生箇所 (file:line / registry key / etc.)
 * - `expected` / `actual`: 期待値 vs 実値の文字列化 (formatViolation で diff 表示)
 * - `fixHint`: AAG response 用 (optional、`tools/architecture-health/src/aag-response.ts` で消費)
 *
 * @example
 *   // pathExistence が doc-registry の broken link を発見した例 (B-4 以降で実装)
 *   const violation: DriftReport = {
 *     ruleId: 'AR-DOC-STATIC-NUMBER',
 *     severity: 'gate',
 *     location: 'docs/contracts/doc-registry.json:91',
 *     expected: 'references/03-implementation/integrity-pair-inventory.md (実在)',
 *     actual: 'references/03-implementation/integrity-pair-inventory.md (broken)',
 *     fixHint: 'inventory.md を実在させるか、registry から削除',
 *   }
 */
export interface DriftReport {
  readonly ruleId: string;
  readonly severity: EnforcementSeverity;
  readonly location: string;
  readonly expected: string;
  readonly actual: string;
  readonly fixHint?: string;
}
