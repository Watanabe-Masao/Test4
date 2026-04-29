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
 * @responsibility R:unclassified
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
  // AR-TSIG-TEST-01 / AR-TSIG-COMP-03 / AR-TSIG-TEST-04 は taxonomy-v2 子 Phase 8 で
  // testSignalIntegrityGuard.test.ts を物理削除した際、本 categoryMap からも削除済 (2026-04-27)。
  // 置換は v2 T:kind per-test obligation (taxonomyInterlockGuard + testTaxonomyGuardV2)。
  // AR-G3-SUPPRESS-RATIONALE は scope 違いで恒久維持。
  'AR-G3-SUPPRESS-RATIONALE': {
    category: 'ratchet-legacy-control',
    layer: 'execution',
    note: 'merge-candidate: AR-G3-SUPPRESS の rationale enforcement 拡張 (TSIG-COMP-01/02 を統合実現)',
  },
  'AR-SCOPE-AWARE-MUTATION': {
    category: 'registry-integrity',
    layer: 'execution',
    note: 'core-rule: is_prev_year 列を持つテーブルへの DELETE/UPDATE でスコープ条件を必須化',
  },

  // ── AR-TAXONOMY-* (taxonomy-v2 子 Phase 3.5: 共通 infra) ──
  'AR-TAXONOMY-NO-UNTAGGED': {
    category: 'registry-integrity',
    layer: 'constitution',
    note: 'core-rule: 原則 1（未分類は分類である）の機械的強制 — タグなし禁止、R:unclassified / T:unclassified は能動タグとして許可',
  },
  'AR-TAXONOMY-KNOWN-VOCABULARY': {
    category: 'registry-integrity',
    layer: 'schema',
    note: 'core-rule: 原則 3（語彙生成は高コスト儀式）の機械的強制 — registry V2 未登録 vocabulary の使用禁止',
  },
  'AR-TAXONOMY-ONE-TAG-ONE-AXIS': {
    category: 'registry-integrity',
    layer: 'schema',
    note: 'core-rule: 原則 2（1 タグ = 1 軸）の機械的強制 — 責務 × 純粋性 × 層を 1 タグに混在させない',
  },
  'AR-TAXONOMY-INTERLOCK': {
    category: 'registry-integrity',
    layer: 'schema',
    note: 'core-rule: 原則 4（Tag ↔ Test は双方向契約）の機械的強制 — R:tag が指定する requiredTKinds を持つ test の存在を強制',
  },
  'AR-TAXONOMY-ORIGIN-REQUIRED': {
    category: 'registry-integrity',
    layer: 'schema',
    note: 'core-rule: 原則 5（Origin は記録する）の機械的強制 — 全 R:tag / T:kind に why/when/who/sunsetCondition の Origin metadata を必須化',
  },
  'AR-TAXONOMY-COGNITIVE-LOAD': {
    category: 'registry-integrity',
    layer: 'constitution',
    note: 'core-rule: 原則 7（Cognitive Load Ceiling）の機械的強制 — 軸ごとの vocabulary 数 ≤ 15',
  },
  'AR-TAXONOMY-AI-VOCABULARY-BINDING': {
    category: 'registry-integrity',
    layer: 'operations',
    note: 'core-rule: 原則 3 + 8 昇華メカニズム #7 — AI による review window 外の新 vocabulary 追加を block',
  },
  // ── AR-CONTENT-SPEC-* (phased-content-specs-rollout Phase A) ──
  'AR-CONTENT-SPEC-EXISTS': {
    category: 'registry-integrity',
    layer: 'schema',
    note: 'core-rule: spec ↔ source の双方向存在性（@widget-id JSDoc 必須）',
  },
  'AR-CONTENT-SPEC-FRONTMATTER-SYNC': {
    category: 'registry-integrity',
    layer: 'schema',
    note: 'core-rule: WID-NNN.md frontmatter が tools/widget-specs/generate.mjs 出力と完全一致',
  },
  'AR-CONTENT-SPEC-CO-CHANGE': {
    category: 'registry-integrity',
    layer: 'schema',
    note: 'core-rule: registry source の id 行と spec.registryLine の同期 (Phase A 静的、Phase I で git diff ベースに置換)',
  },
  'AR-CONTENT-SPEC-OWNER': {
    category: 'registry-integrity',
    layer: 'operations',
    note: 'core-rule: WID-NNN.md frontmatter の owner field 必須化（責任所在）',
  },
  'AR-CONTENT-SPEC-LIFECYCLE-FIELDS': {
    category: 'registry-integrity',
    layer: 'operations',
    note: 'core-rule: Lifecycle State Machine (proposed→active→deprecated→sunsetting→retired→archived) の必須 field + deadline 超過 hard fail',
  },
  'AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC': {
    category: 'registry-integrity',
    layer: 'schema',
    note: 'core-rule: kind=calculation の spec.canonicalRegistration ↔ calculationCanonRegistry.runtimeStatus 双方向一致 (Promote Ceremony 1 PR 同期更新を機械強制)',
  },
  'AR-CONTENT-SPEC-LIFECYCLE-LINK-SYMMETRY': {
    category: 'registry-integrity',
    layer: 'schema',
    note: 'core-rule: replacedBy / supersedes 双方向対称 + 自己参照禁止 (片方向リンク = 半移行状態を構造的に排除)',
  },
  'AR-CONTENT-SPEC-VISUAL-EVIDENCE': {
    category: 'registry-integrity',
    layer: 'operations',
    note: 'core-rule: kind=chart / kind=ui-component の Storybook story or visual regression test 整備件数を ratchet-down (見た目 silent drift 抑制)',
  },
  'AR-CONTENT-SPEC-EVIDENCE-LEVEL': {
    category: 'registry-integrity',
    layer: 'operations',
    note: 'core-rule: spec body の Behavior Claims table の evidenceLevel / riskLevel 整合 (high-risk asserted 禁止 / tested→test path / guarded→guard path 必須)',
  },
  'AR-CONTENT-SPEC-PATH-EXISTENCE': {
    category: 'registry-integrity',
    layer: 'operations',
    note: 'core-rule: Phase J7 (2026-04-29) Behavior Claims tests / guards 列の各 path が実 file を指すことを checkPathExistence 経由で検証 (path typo / stale reference / orphan 検出)',
  },
  'AR-CONTENT-SPEC-LAST-VERIFIED-COMMIT': {
    category: 'registry-integrity',
    layer: 'operations',
    note: 'core-rule: Phase K Option 1 (2026-04-29) 全 spec の lastVerifiedCommit が source file の最新 commit hash (full SHA) と完全一致を git log -1 --format=%H 経由で検証 (date-based cadence は撤退済、AR-CONTENT-SPEC-FRESHNESS は registry 削除済)',
  },
  'AR-INTEGRITY-NO-RESURRECT': {
    category: 'registry-integrity',
    layer: 'schema',
    note: 'core-rule: adoption-candidates.json rejected[] の originalSlot 名と app-domain/integrity/{parsing,detection,reporting}/<name>.ts の同名 file 出現を禁止 (永久不採用 archive の resurrection 検出)',
  },
  'AR-CI-FETCH-DEPTH': {
    category: 'registry-integrity',
    layer: 'operations',
    note: 'core-rule: Phase K Option 1 後続再発防止 (2026-04-29) — `.github/workflows/*.yml` の actions/checkout step で full history が必要な job (test:guards / vitest run 等を含む) に `fetch-depth: 0` を強制。allowlist (wasm-build / e2e / pages-build / deploy) で full history 不要 job を明示',
  },
  'AR-COVERAGE-MAP-DISPLAY-NAME-COUNT': {
    category: 'registry-integrity',
    layer: 'schema',
    note: 'core-rule: Phase K Option 1 後続再発防止 B (2026-04-29) — coverage-map.json の各 pair の displayName 末尾 `× N` 表記が guardFiles.length と一致を機械検証。新 guard 追加時の手作業 count drift を防止 (PR #1207 で発生した × 11 → × 12 更新漏れの再発防止)',
  },
} as const
