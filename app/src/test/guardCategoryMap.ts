/**
 * AAG 5.0 ガードカテゴリマップ — 全ルールの意味別分類
 *
 * Phase A3: 既存 rule を「追加順」ではなく「意味責務」で整理する。
 * 全 rule にカテゴリと Layer を付与し、重複・統合・廃止候補を可視化する。
 *
 * layer は「このルールが主に守っている関心層」を表す。
 * - constitution: 思想・原則レベルの制約
 * - schema: 型契約・レジストリ構造の制約
 * - execution: 検出ロジック・ランタイム境界の制約
 * - operations: 運用手順・移行プロセスの制約
 *
 * 層: Schema（宣言的仕様）
 * 正本性: 正本（カテゴリ分類の唯一の定義元）
 *
 * @responsibility R:utility
 * @see references/01-principles/aag-5-constitution.md — 4層構造
 * @see app/src/test/aagSchemas.ts — AagGuardMetadata / GuardCategory / AagLayer 型定義
 */

import type { AagGuardMetadata } from './aagSchemas'

// ────────────────────────────────────────────────────────
// カテゴリマップ型 — AagGuardMetadata の部分型
// ────────────────────────────────────────────────────────

export type GuardCategoryEntry = Pick<AagGuardMetadata, 'category' | 'layer'> & {
  /**
   * 再編メタ情報（該当なしは null）
   *
   * 標準プレフィックス:
   * - `core-rule:` カテゴリの中核ルール
   * - `merge-candidate:` 他ルールとの統合候補
   * - `duplicate-family:` 同系統ルール群
   * - `sunset-candidate:` 廃止検討対象
   * - `review-focus:` 観測期間後に要見直し
   */
  readonly note: string | null
}

// ────────────────────────────────────────────────────────
// 全 140 ルールのカテゴリマップ
// ────────────────────────────────────────────────────────

export const GUARD_CATEGORY_MAP: Readonly<Record<string, GuardCategoryEntry>> = {
  // ── terminology（用語・命名規約）──

  'AR-TERM-AUTHORITATIVE-STANDALONE': {
    category: 'terminology',
    layer: 'constitution',
    note: 'core-rule: terminology の中核。Constitution 層の用語定義を直接守る',
  },
  'AR-C7-NO-DUAL-API': {
    category: 'terminology',
    layer: 'schema',
    note: null,
  },

  // ── semantic-boundary（意味分類の境界）──

  'AR-CANON-SEMANTIC-REQUIRED': {
    category: 'semantic-boundary',
    layer: 'schema',
    note: null,
  },
  'AR-SEMANTIC-BUSINESS-ANALYTIC-SEPARATION': {
    category: 'semantic-boundary',
    layer: 'schema',
    note: null,
  },
  'AR-CONTRACT-SEMANTIC-REQUIRED': {
    category: 'semantic-boundary',
    layer: 'schema',
    note: null,
  },
  'AR-CONTRACT-BUSINESS-MEANING': {
    category: 'semantic-boundary',
    layer: 'schema',
    note: null,
  },
  'AR-CONTRACT-ANALYTIC-METHOD': {
    category: 'semantic-boundary',
    layer: 'schema',
    note: null,
  },
  'AR-CURRENT-SEMANTIC-REQUIRED': {
    category: 'semantic-boundary',
    layer: 'schema',
    note: null,
  },
  'AR-CURRENT-FACTOR-BUSINESS-LOCK': {
    category: 'semantic-boundary',
    layer: 'schema',
    note: null,
  },

  // ── registry-integrity（正本レジストリ・パスガード・Zod 契約）──

  'AR-REGISTRY-SINGLE-MASTER': {
    category: 'registry-integrity',
    layer: 'schema',
    note: null,
  },
  'AR-STRUCT-CALC-CANON': {
    category: 'registry-integrity',
    layer: 'schema',
    note: null,
  },
  'AR-CANON-ZOD-REQUIRED': {
    category: 'registry-integrity',
    layer: 'schema',
    note: null,
  },
  'AR-CANON-ZOD-REVIEW': {
    category: 'registry-integrity',
    layer: 'schema',
    note: null,
  },
  'AR-STRUCT-CANONICAL-INPUT': {
    category: 'registry-integrity',
    layer: 'schema',
    note: null,
  },
  'AR-STRUCT-CANONICALIZATION': {
    category: 'registry-integrity',
    layer: 'schema',
    note: null,
  },
  'AR-STRUCT-STORE-RESULT-INPUT': {
    category: 'registry-integrity',
    layer: 'schema',
    note: null,
  },
  'AR-STRUCT-FALLBACK-METADATA': {
    category: 'registry-integrity',
    layer: 'schema',
    note: null,
  },
  'AR-STRUCT-DATA-INTEGRITY': {
    category: 'registry-integrity',
    layer: 'execution',
    note: null,
  },
  'AR-C9-HONEST-UNCLASSIFIED': {
    category: 'registry-integrity',
    layer: 'schema',
    note: null,
  },
  'AR-PATH-SALES': { category: 'registry-integrity', layer: 'execution', note: null },
  'AR-PATH-DISCOUNT': { category: 'registry-integrity', layer: 'execution', note: null },
  'AR-PATH-GROSS-PROFIT': { category: 'registry-integrity', layer: 'execution', note: null },
  'AR-PATH-PURCHASE-COST': { category: 'registry-integrity', layer: 'execution', note: null },
  'AR-PATH-CUSTOMER': { category: 'registry-integrity', layer: 'execution', note: null },
  'AR-PATH-CUSTOMER-GAP': { category: 'registry-integrity', layer: 'execution', note: null },
  'AR-PATH-PI-VALUE': { category: 'registry-integrity', layer: 'execution', note: null },
  'AR-PATH-FREE-PERIOD': { category: 'registry-integrity', layer: 'execution', note: null },
  'AR-PATH-FREE-PERIOD-BUDGET': { category: 'registry-integrity', layer: 'execution', note: null },
  'AR-PATH-FREE-PERIOD-DEPT-KPI': {
    category: 'registry-integrity',
    layer: 'execution',
    note: null,
  },
  'AR-PATH-FACTOR-DECOMPOSITION': {
    category: 'registry-integrity',
    layer: 'execution',
    note: null,
  },
  'AR-PATH-GROSS-PROFIT-CONSISTENCY': {
    category: 'registry-integrity',
    layer: 'execution',
    note: null,
  },

  // ── bridge-runtime-boundary（層境界・bridge・engine・ランタイム分離）──

  'AR-001': {
    category: 'bridge-runtime-boundary',
    layer: 'execution',
    note: 'merge-candidate: AR-STRUCT-DUAL-RUN-EXIT と関連。両方ともインフラ層 dual-run 禁止',
  },
  'AR-002': {
    category: 'bridge-runtime-boundary',
    layer: 'execution',
    note: null,
  },
  'AR-A1-DOMAIN': { category: 'bridge-runtime-boundary', layer: 'execution', note: null },
  'AR-A1-APP-INFRA': { category: 'bridge-runtime-boundary', layer: 'execution', note: null },
  'AR-A1-APP-PRES': { category: 'bridge-runtime-boundary', layer: 'execution', note: null },
  'AR-A1-PRES-INFRA': { category: 'bridge-runtime-boundary', layer: 'execution', note: null },
  'AR-A1-PRES-USECASE': { category: 'bridge-runtime-boundary', layer: 'execution', note: null },
  'AR-A1-INFRA-APP': { category: 'bridge-runtime-boundary', layer: 'execution', note: null },
  'AR-A1-INFRA-PRES': { category: 'bridge-runtime-boundary', layer: 'execution', note: null },
  'AR-BRIDGE-RATE-OWNERSHIP': {
    category: 'bridge-runtime-boundary',
    layer: 'schema',
    note: null,
  },
  'AR-BRIDGE-DIRECT-IMPORT': {
    category: 'bridge-runtime-boundary',
    layer: 'execution',
    note: 'duplicate-family: direct-import 系。AR-CURRENT-NO-DIRECT-IMPORT-GROWTH / AR-CAND-BIZ-NO-DIRECT-IMPORT / AR-CAND-ANA-NO-DIRECT-IMPORT と同系統',
  },
  'AR-BRIDGE-CANDIDATE-DEFAULT': {
    category: 'bridge-runtime-boundary',
    layer: 'schema',
    note: null,
  },
  'AR-STRUCT-DUAL-RUN-EXIT': {
    category: 'bridge-runtime-boundary',
    layer: 'execution',
    note: 'merge-candidate: AR-001 と関連。インフラ層 dual-run 退役の構造検証',
  },
  'AR-STRUCT-PURITY': { category: 'bridge-runtime-boundary', layer: 'execution', note: null },
  'AR-STRUCT-PRES-ISOLATION': {
    category: 'bridge-runtime-boundary',
    layer: 'execution',
    note: null,
  },
  'AR-STRUCT-RENDER-SIDE-EFFECT': {
    category: 'bridge-runtime-boundary',
    layer: 'execution',
    note: null,
  },
  'AR-STRUCT-TOPOLOGY': {
    category: 'bridge-runtime-boundary',
    layer: 'execution',
    note: null,
  },
  'AR-STRUCT-PAGE-META': {
    category: 'bridge-runtime-boundary',
    layer: 'execution',
    note: null,
  },
  'AR-Q3-CHART-NO-DUCKDB': {
    category: 'bridge-runtime-boundary',
    layer: 'execution',
    note: null,
  },
  'AR-Q4-ALIGNMENT-HANDLER': {
    category: 'bridge-runtime-boundary',
    layer: 'execution',
    note: null,
  },
  'AR-STRUCT-ANALYSIS-FRAME': {
    category: 'bridge-runtime-boundary',
    layer: 'execution',
    note: null,
  },
  'AR-STRUCT-COMPARISON-SCOPE': {
    category: 'bridge-runtime-boundary',
    layer: 'execution',
    note: null,
  },
  'AR-STRUCT-TEMPORAL-ROLLING': {
    category: 'bridge-runtime-boundary',
    layer: 'execution',
    note: null,
  },
  'AR-STRUCT-TEMPORAL-SCOPE': {
    category: 'bridge-runtime-boundary',
    layer: 'execution',
    note: null,
  },
  'AR-STRUCT-QUERY-PATTERN': {
    category: 'bridge-runtime-boundary',
    layer: 'execution',
    note: null,
  },

  // ── current-candidate-lifecycle（current/candidate 分離・状態遷移）──

  'AR-CURRENT-CANDIDATE-SEPARATION': {
    category: 'current-candidate-lifecycle',
    layer: 'schema',
    note: null,
  },
  'AR-CURRENT-NO-CANDIDATE-MIX': {
    category: 'current-candidate-lifecycle',
    layer: 'execution',
    note: null,
  },
  'AR-CURRENT-NO-CANDIDATE-STATE': {
    category: 'current-candidate-lifecycle',
    layer: 'schema',
    note: null,
  },
  'AR-CURRENT-NO-DIRECT-IMPORT-GROWTH': {
    category: 'current-candidate-lifecycle',
    layer: 'execution',
    note: 'duplicate-family: direct-import 系。AR-BRIDGE-DIRECT-IMPORT / AR-CAND-BIZ-NO-DIRECT-IMPORT / AR-CAND-ANA-NO-DIRECT-IMPORT と同系統',
  },
  'AR-CURRENT-VIEW-SEPARATION': {
    category: 'current-candidate-lifecycle',
    layer: 'schema',
    note: null,
  },
  'AR-CURRENT-NO-STANDALONE-AUTH': {
    category: 'current-candidate-lifecycle',
    layer: 'schema',
    note: null,
  },
  'AR-CAND-BIZ-CONTRACT-REQUIRED': {
    category: 'current-candidate-lifecycle',
    layer: 'schema',
    note: null,
  },
  'AR-CAND-BIZ-NO-ANALYTICS-BRIDGE': {
    category: 'current-candidate-lifecycle',
    layer: 'execution',
    note: null,
  },
  'AR-CAND-BIZ-NO-CURRENT-MIX': {
    category: 'current-candidate-lifecycle',
    layer: 'execution',
    note: null,
  },
  'AR-CAND-BIZ-NO-DIRECT-IMPORT': {
    category: 'current-candidate-lifecycle',
    layer: 'execution',
    note: 'duplicate-family: direct-import 系 4 ルールの統合検討',
  },
  'AR-CAND-BIZ-NO-PROMOTE-WITHOUT-DUALRUN': {
    category: 'current-candidate-lifecycle',
    layer: 'schema',
    note: null,
  },
  'AR-CAND-BIZ-NO-RATE-UI': {
    category: 'current-candidate-lifecycle',
    layer: 'execution',
    note: null,
  },
  'AR-CAND-BIZ-NO-ROLLBACK-SKIP': {
    category: 'current-candidate-lifecycle',
    layer: 'schema',
    note: null,
  },
  'AR-CAND-ANA-CONTRACT-REQUIRED': {
    category: 'current-candidate-lifecycle',
    layer: 'schema',
    note: null,
  },
  'AR-CAND-ANA-INVARIANT-REQUIRED': {
    category: 'current-candidate-lifecycle',
    layer: 'schema',
    note: null,
  },
  'AR-CAND-ANA-METHOD-REQUIRED': {
    category: 'current-candidate-lifecycle',
    layer: 'schema',
    note: null,
  },
  'AR-CAND-ANA-NO-BUSINESS-BRIDGE': {
    category: 'current-candidate-lifecycle',
    layer: 'execution',
    note: null,
  },
  'AR-CAND-ANA-NO-CURRENT-BIZ-MIX': {
    category: 'current-candidate-lifecycle',
    layer: 'execution',
    note: null,
  },
  'AR-CAND-ANA-NO-DIRECT-IMPORT': {
    category: 'current-candidate-lifecycle',
    layer: 'execution',
    note: 'duplicate-family: direct-import 系 4 ルールの統合検討',
  },
  'AR-CAND-ANA-NO-FACTOR-DECOMP': {
    category: 'current-candidate-lifecycle',
    layer: 'schema',
    note: null,
  },

  // ── docs-synchronization（文書同期・co-change・静的数値）──

  'AR-DOC-STATIC-NUMBER': {
    category: 'docs-synchronization',
    layer: 'execution',
    note: null,
  },
  'AR-COCHANGE-VALIDATION-SEVERITY': {
    category: 'docs-synchronization',
    layer: 'execution',
    note: null,
  },
  'AR-COCHANGE-DUCKDB-MOCK': {
    category: 'docs-synchronization',
    layer: 'execution',
    note: null,
  },
  'AR-COCHANGE-READMODEL-PARSE': {
    category: 'docs-synchronization',
    layer: 'execution',
    note: null,
  },
  'AR-CONVENTION-BARREL': {
    category: 'docs-synchronization',
    layer: 'execution',
    note: null,
  },
  'AR-CONVENTION-FEATURE-BOUNDARY': {
    category: 'docs-synchronization',
    layer: 'execution',
    note: null,
  },
  'AR-CONVENTION-CONTEXT-SINGLE-SOURCE': {
    category: 'docs-synchronization',
    layer: 'execution',
    note: null,
  },

  // ── promote-retire-lifecycle（昇格・JS 退役・移行パス禁止）──

  'AR-JS-NO-NEW-AUTHORITATIVE': {
    category: 'promote-retire-lifecycle',
    layer: 'execution',
    note: null,
  },
  'AR-JS-NO-PRES-HELPER-PROMOTE': {
    category: 'promote-retire-lifecycle',
    layer: 'execution',
    note: null,
  },
  'AR-JS-NO-REFERENCE-GROWTH': {
    category: 'promote-retire-lifecycle',
    layer: 'execution',
    note: null,
  },
  'AR-REVIEW-NEEDED-BLOCK': {
    category: 'promote-retire-lifecycle',
    layer: 'execution',
    note: null,
  },
  'AR-MIG-OLD-PATH': {
    category: 'promote-retire-lifecycle',
    layer: 'execution',
    note: null,
  },

  // ── ratchet-legacy-control（サイズ制限・責務タグ・コード品質・安全性）──

  'AR-003': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-004': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-005': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-G4-INTERNAL': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-C3-STORE': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-G3-SUPPRESS': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-E4-TRUTHINESS': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-C5-SELECTOR': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-G2-EMPTY-CATCH': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-C6-FACADE': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-G7-CACHE-BODY': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-G5-HOOK-MEMO': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-G5-HOOK-STATE': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-G5-HOOK-LINES': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-G6-COMPONENT': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-G5-DOMAIN-LINES': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-G5-INFRA-LINES': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-G5-USECASE-LINES': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-RESP-STORE-COUPLING': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-RESP-MODULE-STATE': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-RESP-HOOK-COMPLEXITY': {
    category: 'ratchet-legacy-control',
    layer: 'execution',
    note: null,
  },
  'AR-RESP-FEATURE-COMPLEXITY': {
    category: 'ratchet-legacy-control',
    layer: 'execution',
    note: null,
  },
  'AR-RESP-EXPORT-DENSITY': {
    category: 'ratchet-legacy-control',
    layer: 'execution',
    note: null,
  },
  'AR-RESP-NORMALIZATION': {
    category: 'ratchet-legacy-control',
    layer: 'execution',
    note: null,
  },
  'AR-RESP-FALLBACK-SPREAD': {
    category: 'ratchet-legacy-control',
    layer: 'execution',
    note: null,
  },
  'AR-TAG-SELECTION-GUIDE': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-TAG-CHART-VIEW': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-TAG-CHART-OPTION': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-TAG-CALCULATION': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-TAG-TRANSFORM': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-TAG-STATE-MACHINE': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-TAG-QUERY-PLAN': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-TAG-QUERY-EXEC': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-TAG-WIDGET': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-TAG-PAGE': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-TAG-FORM': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-TAG-LAYOUT': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-TAG-ORCHESTRATION': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-TAG-UTILITY': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-TAG-CONTEXT': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-TAG-PERSISTENCE': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-TAG-ADAPTER': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-TAG-REDUCER': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-TAG-BARREL': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-SAFETY-SILENT-CATCH': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-SAFETY-FIRE-FORGET': { category: 'ratchet-legacy-control', layer: 'execution', note: null },
  'AR-SAFETY-NULLABLE-ASYNC': {
    category: 'ratchet-legacy-control',
    layer: 'execution',
    note: null,
  },
  'AR-SAFETY-VALIDATION-ENFORCE': {
    category: 'ratchet-legacy-control',
    layer: 'execution',
    note: null,
  },
  'AR-SAFETY-INSERT-VERIFY': {
    category: 'ratchet-legacy-control',
    layer: 'execution',
    note: null,
  },
  'AR-SAFETY-PROD-VALIDATION': {
    category: 'ratchet-legacy-control',
    layer: 'execution',
    note: null,
  },
  'AR-SAFETY-WORKER-TIMEOUT': {
    category: 'ratchet-legacy-control',
    layer: 'execution',
    note: null,
  },
  'AR-SAFETY-STALE-STORE': { category: 'ratchet-legacy-control', layer: 'execution', note: null },

  // ── AAG 入口一元化（C2: direct import 禁止）──
  'AR-AAG-DERIVED-ONLY-IMPORT': {
    category: 'registry-integrity',
    layer: 'operations',
    note: 'core-rule: AAG の正本ルートを facade 経由に固定する入口ルール',
  },
  'AR-AAG-NO-BASE-RULES-CONSUMER-IMPORT': {
    category: 'registry-integrity',
    layer: 'operations',
    note: 'merge-candidate: AR-AAG-DERIVED-ONLY-IMPORT の具体化（BaseRule 直参照禁止）',
  },
  'AR-AAG-NO-DIRECT-OVERLAY-IMPORT': {
    category: 'registry-integrity',
    layer: 'operations',
    note: 'merge-candidate: AR-AAG-DERIVED-ONLY-IMPORT の具体化（Project Overlay 直参照禁止）',
  },
  // ── Test Signal Integrity (project: test-signal-integrity Phase 3) ──
  'AR-TSIG-TEST-01': {
    category: 'ratchet-legacy-control',
    layer: 'execution',
    note: 'core-rule: Signal Integrity の existence-only assertion 禁止 (False Green / Review Misleading 防止)',
  },
  'AR-G3-SUPPRESS-RATIONALE': {
    category: 'ratchet-legacy-control',
    layer: 'execution',
    note: 'merge-candidate: AR-G3-SUPPRESS の rationale enforcement 拡張 (TSIG-COMP-01/02 を統合実現)',
  },
  'AR-TSIG-COMP-03': {
    category: 'ratchet-legacy-control',
    layer: 'execution',
    note: 'core-rule: Signal Integrity の unused suppress escape (multi-underscore) 禁止',
  },
} as const
