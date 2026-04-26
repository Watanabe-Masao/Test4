/**
 * Responsibility Taxonomy Registry V2
 *
 * 責務軸 (R:*) v2 vocabulary の TypeScript 正本。
 *
 * 本 file は responsibility-taxonomy-v2 子 Phase 1 (Schema 設計) の deliverable。
 * v1 registry (`responsibilityTagRegistry.ts`) と **並行運用** する（v1 は子 Phase 8
 * Retirement で削除予定）。
 *
 * 各 R:tag entry は OCS frontmatter（Evidence Level / Promotion Gate / Lifecycle）+
 * Interlock 必須 T:kind + Antibody Pair + Origin metadata を持つ。
 *
 * @see references/01-principles/responsibility-taxonomy-schema.md (schema 仕様正本)
 * @see references/01-principles/taxonomy-interlock.md (R⇔T 完全マトリクス)
 * @see references/01-principles/taxonomy-origin-journal.md §3 (Origin 詳細)
 * @see projects/taxonomy-v2/plan.md §OCS.2 / §OCS.4 / §OCS.5 (frontmatter 仕様)
 *
 * @responsibility R:registry
 */

// ─── OCS frontmatter 型定義 ─────────────────────────────

/** §OCS.2 Evidence Level — タグの根拠の強さ */
export type EvidenceLevel =
  | 'generated' // registry から機械生成された事実（最強）
  | 'tested' // T:kind obligation が満たされている
  | 'guarded' // guard で違反が検出される
  | 'reviewed' // review window で承認済
  | 'asserted' // Origin Journal にだけ記載
  | 'unknown' // 根拠不明（原則 5 違反、本 registry で禁止）

/** §OCS.5 Promotion Gate — vocabulary の制度成立度 */
export type PromotionLevel =
  | 'L0' // proposed（review window 提案中）
  | 'L1' // Registered（registry に entry 追加完了）
  | 'L2' // Origin-linked（Origin Journal に Why/When/Who/Sunset 記載）
  | 'L3' // Interlock-bound（required T:kind との対応が matrix で固定）
  | 'L4' // Guarded（AR-TAXONOMY-* で violations 検出可能）
  | 'L5' // Coverage（全該当 file が tagged 状態）
  | 'L6' // Health-tracked（taxonomy-health.json に常時反映）

/** §OCS.4 Lifecycle State Machine — vocabulary の生命状態 */
export type LifecycleStatus =
  | 'proposed' // review window で提案中
  | 'active' // 採択済、現役
  | 'deprecated' // 新規使用禁止、既存 consumer あり
  | 'sunsetting' // consumer 撤退中、期限あり
  | 'retired' // source 削除済、ID は欠番保持
  | 'archived' // 歴史参照のみ

// ─── v2 R:tag 型定義 ─────────────────────────────────

/** v2 責務タグ (R: プレフィックス) — 10 件 / Cognitive Load Ceiling 15 まで 5 スロット余裕 */
export type ResponsibilityTagV2 =
  | 'R:calculation'
  | 'R:bridge'
  | 'R:read-model'
  | 'R:guard'
  | 'R:presentation'
  | 'R:store'
  | 'R:hook'
  | 'R:adapter'
  | 'R:registry'
  | 'R:unclassified'

// ─── Origin metadata 型定義（§OCS.5 L2 Origin-linked の入力）

export interface ResponsibilityOrigin {
  readonly why: string
  readonly when: string
  readonly who: string
  readonly sunsetCondition: string
}

export interface ResponsibilityInterlock {
  readonly requiredTKinds: readonly string[]
  readonly optionalTKinds: readonly string[]
}

export interface ResponsibilityTagEntry {
  readonly tag: ResponsibilityTagV2
  readonly evidenceLevel: EvidenceLevel
  readonly promotionLevel: PromotionLevel
  readonly lifecycle: LifecycleStatus
  readonly origin: ResponsibilityOrigin
  readonly interlock: ResponsibilityInterlock
  /**
   * Antibody Pair (原則 6: 対概念タグの相互制約)。
   * 1 file が `tag` と `antibodyPair` を同時に持つことは Constitutional Correctness 破綻 →
   * review window で裁定。null の場合は対概念タグなし（sentinel R:unclassified のみ）。
   */
  readonly antibodyPair: ResponsibilityTagV2 | null
  readonly description: string
}

// ─── v2 R:tag registry (10 件) ───────────────────────

/**
 * 共通 Origin（v2 採択経緯）。
 *
 * 全 v2 R:tag は taxonomy-v2 親 Phase 1 Constitution + 子 Phase 1 Schema 設計で
 * landing。who は `claude` (AI) + `user` (human approval gate) の双方を表す。
 */
const COMMON_ORIGIN_BASE = {
  when: '2026-04-26',
  who: 'taxonomy-v2 子 Phase 1 Schema 設計（claude + user 承認）',
} as const

export const RESPONSIBILITY_TAG_REGISTRY_V2: Readonly<
  Record<ResponsibilityTagV2, ResponsibilityTagEntry>
> = {
  'R:calculation': {
    tag: 'R:calculation',
    evidenceLevel: 'guarded',
    promotionLevel: 'L1',
    lifecycle: 'active',
    origin: {
      why: 'domain/calculations/ archetype: 純粋計算 + 数値契約 + 不変条件保持',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition:
        'pure calculation の概念が Engine boundary policy ごと再定義された場合のみ撤退検討',
    },
    interlock: {
      requiredTKinds: ['T:unit-numerical', 'T:boundary'],
      optionalTKinds: ['T:invariant-math'],
    },
    antibodyPair: 'R:read-model',
    description: '純粋計算（数値契約 + 不変条件）。domain/calculations/ archetype。',
  },

  'R:bridge': {
    tag: 'R:bridge',
    evidenceLevel: 'guarded',
    promotionLevel: 'L1',
    lifecycle: 'active',
    origin: {
      why: 'current ⇔ candidate 境界（移行中の両側 keep）。Antibody Pair の archetype',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition:
        '全 migration project が完了し bridge file 0 達成 → 撤退候補（review window 経由）',
    },
    interlock: {
      requiredTKinds: ['T:contract-parity'],
      optionalTKinds: ['T:fallback-path'],
    },
    antibodyPair: 'R:hook',
    description: 'current ⇔ candidate 境界。両側 keep が責務。\\*Bridge.ts archetype。',
  },

  'R:read-model': {
    tag: 'R:read-model',
    evidenceLevel: 'guarded',
    promotionLevel: 'L1',
    lifecycle: 'active',
    origin: {
      why: 'application/readModels/ archetype: Zod parse fail fast + 欠損正常系の anchor',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: 'readModel パターンが他の正本化 mechanism に置換された場合のみ撤退検討',
    },
    interlock: {
      requiredTKinds: ['T:zod-contract', 'T:null-path'],
      optionalTKinds: [],
    },
    antibodyPair: 'R:calculation',
    description: 'application/readModels/ の Zod parse + ヘルパー。IO 境界の最初の anchor。',
  },

  'R:guard': {
    tag: 'R:guard',
    evidenceLevel: 'guarded',
    promotionLevel: 'L1',
    lifecycle: 'active',
    origin: {
      why: 'test/guards/ archetype: 構造制約の機械検証（meta-guard が必要な archetype）',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: 'AAG mechanism が他の検証層に置換された場合のみ撤退検討',
    },
    interlock: {
      requiredTKinds: ['T:meta-guard'],
      optionalTKinds: ['T:allowlist-integrity'],
    },
    antibodyPair: 'R:presentation',
    description: 'test/guards/ の構造制約検証（meta-guard が必要）。',
  },

  'R:presentation': {
    tag: 'R:presentation',
    evidenceLevel: 'guarded',
    promotionLevel: 'L1',
    lifecycle: 'active',
    origin: {
      why: '描画形状のみ・副作用なし（chart-view + widget + page + layout + form + navigation 統合）',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: 'React / DOM 描画モデルが根本的に変更された場合のみ撤退検討',
    },
    interlock: {
      requiredTKinds: ['T:render-shape'],
      optionalTKinds: ['T:side-effect-none'],
    },
    antibodyPair: 'R:guard',
    description: '描画形状のみ。副作用なし。chart/widget/page/layout/form/navigation の統合。',
  },

  'R:store': {
    tag: 'R:store',
    evidenceLevel: 'guarded',
    promotionLevel: 'L1',
    lifecycle: 'active',
    origin: {
      why: 'state container 系の統合（Zustand / React Context / reducer / persistence の統合）',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: 'state 管理 mechanism が React 標準 hook 等に統一された場合のみ撤退検討',
    },
    interlock: {
      requiredTKinds: ['T:state-transition'],
      optionalTKinds: [],
    },
    antibodyPair: 'R:hook',
    description: 'state container（Zustand / Context / reducer 統合）。state のみ保有。',
  },

  'R:hook': {
    tag: 'R:hook',
    evidenceLevel: 'guarded',
    promotionLevel: 'L1',
    lifecycle: 'active',
    origin: {
      why: 'application/hooks orchestration（data-fetch + state-machine + query-plan + orchestration の統合）',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: 'hook orchestration pattern が他の mechanism に置換された場合のみ撤退検討',
    },
    interlock: {
      requiredTKinds: ['T:dependency-list', 'T:unmount-path'],
      optionalTKinds: [],
    },
    antibodyPair: 'R:store',
    description: 'application/hooks の orchestration。effect 駆動。',
  },

  'R:adapter': {
    tag: 'R:adapter',
    evidenceLevel: 'asserted',
    promotionLevel: 'L1',
    lifecycle: 'active',
    origin: {
      why: 'infrastructure 境界 adapter（DuckDB / 外部 API / 永続化）',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: 'infrastructure layer が消失した場合のみ撤退検討',
    },
    interlock: {
      // 短期は T:unclassified 許容（Phase 5 review window で正式 T:kind 検討）
      requiredTKinds: [],
      optionalTKinds: [],
    },
    antibodyPair: 'R:bridge',
    description: 'infrastructure 境界 adapter。DuckDB / 外部 API / 永続化。',
  },

  'R:registry': {
    tag: 'R:registry',
    evidenceLevel: 'asserted',
    promotionLevel: 'L1',
    lifecycle: 'active',
    origin: {
      why: 'vocabulary / catalog / metadata 定義 file の archetype（responsibility-tag-registry 自身もここに属する）',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: 'registry pattern が他の宣言的 mechanism に置換された場合のみ撤退検討',
    },
    interlock: {
      // 短期は T:unclassified 許容（Phase 5 review window で正式 T:kind 検討）
      requiredTKinds: [],
      optionalTKinds: [],
    },
    antibodyPair: 'R:calculation',
    description: 'vocabulary / catalog / metadata 定義 file。宣言的、計算しない。',
  },

  'R:unclassified': {
    tag: 'R:unclassified',
    evidenceLevel: 'reviewed',
    promotionLevel: 'L1',
    lifecycle: 'active',
    origin: {
      why: 'sentinel — review window 待ちの能動タグ（原則 1: 未分類は分類である）',
      ...COMMON_ORIGIN_BASE,
      sunsetCondition: 'なし（sentinel として恒久的に必要）',
    },
    interlock: {
      requiredTKinds: ['T:unclassified'],
      optionalTKinds: [],
    },
    antibodyPair: null,
    description: 'sentinel — review window 待ちの能動タグ。タグなしと区別される。',
  },
}

// ─── ヘルパー（読み出し専用 API） ──────────────────────

/** 全 v2 R:tag のリスト */
export const RESPONSIBILITY_TAGS_V2: readonly ResponsibilityTagV2[] = Object.keys(
  RESPONSIBILITY_TAG_REGISTRY_V2,
) as readonly ResponsibilityTagV2[]

/** Cognitive Load Ceiling 検証 (原則 7) */
export const COGNITIVE_LOAD_CEILING = 15

export const isWithinCognitiveLoadCeiling = (): boolean =>
  RESPONSIBILITY_TAGS_V2.length <= COGNITIVE_LOAD_CEILING

/** タグが有効な v2 R:tag か */
export const isResponsibilityTagV2 = (tag: string): tag is ResponsibilityTagV2 =>
  tag in RESPONSIBILITY_TAG_REGISTRY_V2

/** Anchor Slice 5 R:tag (親 plan §OCS.7) */
export const ANCHOR_SLICE_R_TAGS: readonly ResponsibilityTagV2[] = [
  'R:calculation',
  'R:bridge',
  'R:read-model',
  'R:guard',
  'R:presentation',
] as const

export const isAnchorSliceTag = (tag: ResponsibilityTagV2): boolean =>
  (ANCHOR_SLICE_R_TAGS as readonly string[]).includes(tag)

/** Antibody Pair の取得 */
export const getAntibodyPair = (tag: ResponsibilityTagV2): ResponsibilityTagV2 | null =>
  RESPONSIBILITY_TAG_REGISTRY_V2[tag].antibodyPair

/** Interlock 必須 T:kind の取得 (taxonomy-interlock.md §2.1 の引用) */
export const getRequiredTKinds = (tag: ResponsibilityTagV2): readonly string[] =>
  RESPONSIBILITY_TAG_REGISTRY_V2[tag].interlock.requiredTKinds
