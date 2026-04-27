/**
 * Test Taxonomy Registry V2
 *
 * テスト軸 (T:*) v2 vocabulary の TypeScript 正本。
 *
 * 本 file は test-taxonomy-v2 子 Phase 1 (Schema 設計) の deliverable。
 * v1 TSIG global rule (`testSignalIntegrityGuard.test.ts`) と **並行運用** する
 * （TSIG は子 Phase 8 Retirement で T:kind ベース obligation に完全置換予定）。
 *
 * 各 T:kind entry は OCS frontmatter（Evidence Level / Promotion Gate / Lifecycle）+
 * Interlock 検証対象 R:tag + obligation 強度 (must/should/may) + Antibody Pair +
 * Origin metadata + tier (primary / optional / sentinel) を持つ。
 *
 * @see references/01-principles/test-taxonomy-schema.md (schema 仕様正本)
 * @see references/01-principles/taxonomy-interlock.md (R⇔T 完全マトリクス)
 * @see references/01-principles/taxonomy-origin-journal.md §3 (T:* Origin、§v2 T:kind Origin で v2 詳細)
 * @see projects/taxonomy-v2/plan.md §OCS.2 / §OCS.4 / §OCS.5 (frontmatter 仕様)
 *
 * @responsibility R:registry
 */

// ─── OCS frontmatter 型定義（responsibility と共通の概念。registry は分離） ──

/** §OCS.2 Evidence Level */
export type EvidenceLevel = 'generated' | 'tested' | 'guarded' | 'reviewed' | 'asserted' | 'unknown'

/** §OCS.5 Promotion Gate */
export type PromotionLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'

/** §OCS.4 Lifecycle State Machine */
export type LifecycleStatus =
  | 'proposed'
  | 'active'
  | 'deprecated'
  | 'sunsetting'
  | 'retired'
  | 'archived'

// ─── v2 T:kind 型定義 ─────────────────────────────────

/**
 * v2 テスト分類タグ (T: プレフィックス) — 15 件 / Cognitive Load Ceiling 15 cap。
 *
 * **tier 構造**:
 * - **primary** (11): interlock §2.1 の必須 (required) T:kind + sentinel
 * - **optional** (4): interlock §2.1 の任意 (optional) T:kind
 */
export type TestTaxonomyKindV2 =
  | 'T:unit-numerical' // primary
  | 'T:boundary' // primary
  | 'T:contract-parity' // primary
  | 'T:zod-contract' // primary
  | 'T:null-path' // primary
  | 'T:meta-guard' // primary
  | 'T:render-shape' // primary
  | 'T:state-transition' // primary
  | 'T:dependency-list' // primary
  | 'T:unmount-path' // primary
  | 'T:unclassified' // primary (sentinel)
  | 'T:invariant-math' // optional
  | 'T:fallback-path' // optional
  | 'T:allowlist-integrity' // optional
  | 'T:side-effect-none' // optional

// ─── tier / obligation 型定義 ─────────────────────────

/** Tier — vocabulary の運用優先度（schema md §1） */
export type TestTaxonomyTier = 'primary' | 'optional' | 'sentinel'

/**
 * Obligation 強度（schema md §3） — interlock guard の強制力を制御する。
 *
 * - `must-have`: required: 1 件以上の test が必須（hard fail / baseline=0）
 * - `should-have`: 推奨: 1 件以上が望ましい（WARN / baseline ratchet-down）
 * - `may-have`: optional: 任意（検出のみ、guard 静観）
 */
export type ObligationStrength = 'must-have' | 'should-have' | 'may-have'

// ─── Origin / Interlock 型定義 ────────────────────────

export interface TestKindOrigin {
  readonly why: string
  readonly when: string
  readonly who: string
  readonly sunsetCondition: string
}

export interface TestKindInterlock {
  /** 検証対象 R:tag list (taxonomy-interlock.md §2.2) */
  readonly verifies: readonly string[]
  /** Obligation 強度（schema md §3） */
  readonly obligation: ObligationStrength
}

export interface TestKindEntry {
  readonly kind: TestTaxonomyKindV2
  readonly tier: TestTaxonomyTier
  readonly evidenceLevel: EvidenceLevel
  readonly promotionLevel: PromotionLevel
  readonly lifecycle: LifecycleStatus
  readonly origin: TestKindOrigin
  readonly interlock: TestKindInterlock
  /**
   * Antibody Pair (原則 6: 対概念タグの相互制約)。
   * 1 test が `kind` と `antibodyPair` を同時主張する場合は scope 分離が必要。
   * null = 対概念タグなし（sentinel / lifecycle bookend）。
   */
  readonly antibodyPair: TestTaxonomyKindV2 | null
  readonly description: string
}

// ─── v2 T:kind registry (15 件) ──────────────────────

const COMMON_ORIGIN_BASE = {
  when: '2026-04-26',
  who: 'taxonomy-v2 子 Phase 1 Schema 設計（claude + user 承認）',
} as const

export const TEST_TAXONOMY_REGISTRY_V2: Readonly<Record<TestTaxonomyKindV2, TestKindEntry>> = {
  // ─── primary tier (11) ──────────────────────────────

  'T:unit-numerical': {
    kind: 'T:unit-numerical',
    tier: 'primary',
    evidenceLevel: 'guarded',
    promotionLevel: 'L5',
    lifecycle: 'active',
    origin: {
      why: 'R:calculation の数値契約 anchor（Anchor 6 T:kind の archetype）',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: '純粋計算の検証 mechanism が他に置換された場合のみ撤退検討',
    },
    interlock: { verifies: ['R:calculation'], obligation: 'must-have' },
    antibodyPair: 'T:invariant-math',
    description: '数値契約（入力 → 出力の正しさ）。R:calculation 必須。',
  },

  'T:boundary': {
    kind: 'T:boundary',
    tier: 'primary',
    evidenceLevel: 'guarded',
    promotionLevel: 'L5',
    lifecycle: 'active',
    origin: {
      why: 'R:calculation の境界値 anchor（Anchor 6 T:kind の archetype）',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: '純粋計算の境界検証が不要になる mechanism が登場した場合のみ撤退検討',
    },
    interlock: { verifies: ['R:calculation'], obligation: 'must-have' },
    antibodyPair: 'T:null-path',
    description: '境界値（empty / null / overflow / 0 / 負数 等）。R:calculation 必須。',
  },

  'T:contract-parity': {
    kind: 'T:contract-parity',
    tier: 'primary',
    evidenceLevel: 'guarded',
    promotionLevel: 'L5',
    lifecycle: 'active',
    origin: {
      why: 'R:bridge の current⇔candidate 同一性 anchor（Anchor 6 T:kind の archetype）',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: 'bridge pattern 自身が消失した場合のみ撤退検討',
    },
    interlock: { verifies: ['R:bridge'], obligation: 'must-have' },
    antibodyPair: 'T:fallback-path',
    description: 'current ⇔ candidate の同一性。R:bridge 必須。',
  },

  'T:zod-contract': {
    kind: 'T:zod-contract',
    tier: 'primary',
    evidenceLevel: 'guarded',
    promotionLevel: 'L5',
    lifecycle: 'active',
    origin: {
      why: 'R:read-model の Zod parse anchor（Anchor 6 T:kind の archetype）',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: 'Zod が他の schema validation library に置換された場合のみ撤退検討',
    },
    interlock: { verifies: ['R:read-model'], obligation: 'must-have' },
    antibodyPair: null,
    description: 'Zod schema による parse fail fast。R:read-model 必須。',
  },

  'T:null-path': {
    kind: 'T:null-path',
    tier: 'primary',
    evidenceLevel: 'guarded',
    promotionLevel: 'L5',
    lifecycle: 'active',
    origin: {
      why: 'R:read-model の欠損正常系 anchor（IO 境界の null/undefined 許容）',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition:
        'TypeScript 型システムが null safety を完全保証する mechanism に置換された場合のみ撤退検討',
    },
    interlock: { verifies: ['R:read-model'], obligation: 'must-have' },
    antibodyPair: 'T:boundary',
    description: '欠損正常系（null / undefined の許容範囲）。R:read-model 必須。',
  },

  'T:meta-guard': {
    kind: 'T:meta-guard',
    tier: 'primary',
    evidenceLevel: 'guarded',
    promotionLevel: 'L5',
    lifecycle: 'active',
    origin: {
      why: 'R:guard 自身の契約検証 anchor（Anchor 6 T:kind の archetype）',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: 'AAG mechanism が消失した場合のみ撤退検討',
    },
    interlock: { verifies: ['R:guard'], obligation: 'must-have' },
    antibodyPair: 'T:allowlist-integrity',
    description: 'guard 自身の契約（test for tests）。R:guard 必須。',
  },

  'T:render-shape': {
    kind: 'T:render-shape',
    tier: 'primary',
    evidenceLevel: 'guarded',
    promotionLevel: 'L5',
    lifecycle: 'active',
    origin: {
      why: 'R:presentation の描画形状 anchor（Anchor 6 T:kind の archetype）',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: 'React / DOM 描画モデルが根本変更された場合のみ撤退検討',
    },
    interlock: { verifies: ['R:presentation'], obligation: 'must-have' },
    antibodyPair: 'T:side-effect-none',
    description: '描画 DOM 形状の検証。R:presentation 必須。',
  },

  'T:state-transition': {
    kind: 'T:state-transition',
    tier: 'primary',
    evidenceLevel: 'guarded',
    promotionLevel: 'L5',
    lifecycle: 'active',
    origin: {
      why: 'R:store の state 遷移網羅性 anchor',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: 'state container pattern が消失した場合のみ撤退検討',
    },
    interlock: { verifies: ['R:store'], obligation: 'must-have' },
    antibodyPair: 'T:dependency-list',
    description: 'state 遷移の網羅性。R:store 必須。',
  },

  'T:dependency-list': {
    kind: 'T:dependency-list',
    tier: 'primary',
    evidenceLevel: 'guarded',
    promotionLevel: 'L5',
    lifecycle: 'active',
    origin: {
      why: 'R:hook の useEffect deps 完全性 anchor',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition:
        'React hook deps 検証が ESLint で完全保証される mechanism に置換された場合のみ撤退検討',
    },
    interlock: { verifies: ['R:hook'], obligation: 'must-have' },
    antibodyPair: 'T:state-transition',
    description: 'useEffect 等の deps 完全性。R:hook 必須。',
  },

  'T:unmount-path': {
    kind: 'T:unmount-path',
    tier: 'primary',
    evidenceLevel: 'guarded',
    promotionLevel: 'L5',
    lifecycle: 'active',
    origin: {
      why: 'R:hook の unmount cleanup 完全性 anchor',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition:
        'React hook unmount 検証が React 標準 API で完全保証される mechanism に置換された場合のみ撤退検討',
    },
    interlock: { verifies: ['R:hook'], obligation: 'must-have' },
    antibodyPair: null,
    description: 'unmount 時の cleanup 完全性。R:hook 必須。',
  },

  'T:unclassified': {
    kind: 'T:unclassified',
    tier: 'primary',
    evidenceLevel: 'reviewed',
    promotionLevel: 'L5',
    lifecycle: 'active',
    origin: {
      why: 'sentinel — review window 待ちの能動タグ（原則 1: 未分類は分類である）',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: 'なし（sentinel として恒久的に必要）',
    },
    interlock: { verifies: ['R:unclassified'], obligation: 'may-have' },
    antibodyPair: null,
    description: 'sentinel — review window 待ちの能動タグ。タグなしと区別される。',
  },

  // ─── optional tier (4) ──────────────────────────────

  'T:invariant-math': {
    kind: 'T:invariant-math',
    tier: 'optional',
    evidenceLevel: 'guarded',
    promotionLevel: 'L5',
    lifecycle: 'active',
    origin: {
      why: 'R:calculation の数学的不変条件検証（シャープリー恒等式・合計値整合等）',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: '不変条件の概念が他の検証層に置換された場合のみ撤退検討',
    },
    interlock: { verifies: ['R:calculation'], obligation: 'should-have' },
    antibodyPair: 'T:unit-numerical',
    description:
      '数学的不変条件（合計値 = 構成要素和、シャープリー恒等式 等）。R:calculation 任意。',
  },

  'T:fallback-path': {
    kind: 'T:fallback-path',
    tier: 'optional',
    evidenceLevel: 'guarded',
    promotionLevel: 'L5',
    lifecycle: 'active',
    origin: {
      why: 'R:bridge の fallback 分岐到達性検証',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: 'fallback 分岐の概念が消失した場合のみ撤退検討',
    },
    interlock: { verifies: ['R:bridge'], obligation: 'should-have' },
    antibodyPair: 'T:contract-parity',
    description: 'fallback 分岐の到達性。R:bridge 任意。',
  },

  'T:allowlist-integrity': {
    kind: 'T:allowlist-integrity',
    tier: 'optional',
    evidenceLevel: 'guarded',
    promotionLevel: 'L5',
    lifecycle: 'active',
    origin: {
      why: 'R:guard の allowlist データ整合性検証',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: 'allowlist mechanism が消失した場合のみ撤退検討',
    },
    interlock: { verifies: ['R:guard'], obligation: 'should-have' },
    antibodyPair: 'T:meta-guard',
    description: 'allowlist 構造の整合性。R:guard 任意。',
  },

  'T:side-effect-none': {
    kind: 'T:side-effect-none',
    tier: 'optional',
    evidenceLevel: 'guarded',
    promotionLevel: 'L5',
    lifecycle: 'active',
    origin: {
      why: 'R:presentation の純粋性検証（描画は副作用を持たないこと）',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: 'React 描画モデルが副作用を許容する変更があった場合のみ撤退検討',
    },
    interlock: { verifies: ['R:presentation'], obligation: 'should-have' },
    antibodyPair: 'T:render-shape',
    description: '副作用がないことの検証。R:presentation 任意。',
  },
}

// ─── ヘルパー（読み出し専用 API） ──────────────────────

/** 全 v2 T:kind のリスト */
export const TEST_TAXONOMY_KINDS_V2: readonly TestTaxonomyKindV2[] = Object.keys(
  TEST_TAXONOMY_REGISTRY_V2,
) as readonly TestTaxonomyKindV2[]

/** Cognitive Load Ceiling 検証 (原則 7) */
export const COGNITIVE_LOAD_CEILING = 15

export const isWithinCognitiveLoadCeiling = (): boolean =>
  TEST_TAXONOMY_KINDS_V2.length <= COGNITIVE_LOAD_CEILING

/** タグが有効な v2 T:kind か */
export const isTestTaxonomyKindV2 = (kind: string): kind is TestTaxonomyKindV2 =>
  kind in TEST_TAXONOMY_REGISTRY_V2

/** Anchor Slice 6 T:kind (親 plan §OCS.7) */
export const ANCHOR_SLICE_T_KINDS: readonly TestTaxonomyKindV2[] = [
  'T:unit-numerical',
  'T:boundary',
  'T:contract-parity',
  'T:zod-contract',
  'T:meta-guard',
  'T:render-shape',
] as const

export const isAnchorSliceKind = (kind: TestTaxonomyKindV2): boolean =>
  (ANCHOR_SLICE_T_KINDS as readonly string[]).includes(kind)

/** Tier 別 T:kind 取得 */
export const filterByTier = (tier: TestTaxonomyTier): readonly TestTaxonomyKindV2[] =>
  TEST_TAXONOMY_KINDS_V2.filter((k) => TEST_TAXONOMY_REGISTRY_V2[k].tier === tier)

/** Antibody Pair の取得 */
export const getAntibodyPair = (kind: TestTaxonomyKindV2): TestTaxonomyKindV2 | null =>
  TEST_TAXONOMY_REGISTRY_V2[kind].antibodyPair

/** 検証対象 R:tag の取得 (taxonomy-interlock.md §2.2 の引用) */
export const getVerifiedRTags = (kind: TestTaxonomyKindV2): readonly string[] =>
  TEST_TAXONOMY_REGISTRY_V2[kind].interlock.verifies

/** Obligation 強度の取得 */
export const getObligationStrength = (kind: TestTaxonomyKindV2): ObligationStrength =>
  TEST_TAXONOMY_REGISTRY_V2[kind].interlock.obligation
