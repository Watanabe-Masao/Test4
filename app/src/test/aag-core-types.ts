/**
 * AAG Core Types — 再利用可能なルール型定義
 *
 * AAG Core の Schema 層。アプリ固有の意味を含まない。
 * ルールの「意味」「運用」「検出仕様」を型で分離する。
 *
 * @see aag/core/principles/core-boundary-policy.md — 境界ポリシー
 * @see aag/core/AAG_CORE_INDEX.md — Core 全体の入口
 *
 * 設計原則 D: 意味・運用・検出を分ける
 * 設計原則 E: 具体名は後段へ落とす（この型には含めない）
 *
 * @responsibility R:unclassified
 */

// ─── 共通列挙型 ─────────────────────────────────────────

/** 検出方法の種別 */
export type DetectionType =
  | 'import' // 禁止 import の検出
  | 'regex' // コードパターンの検出
  | 'count' // 数値上限（行数、hook 数等）
  | 'must-include' // A を含む必須（Zod parse 必須等）
  | 'must-only' // A 以外禁止（barrel は re-export のみ等）
  | 'co-change' // A を変えたら B も変える（型 → schema 等）
  | 'must-not-coexist' // A と B は同居禁止（useState と SQL 等）
  | 'custom' // 上記に当てはまらない特殊検出

/** ルールの成熟度。新しいルールは experimental から始め、安定したら stable に昇格する */
export type RuleMaturity = 'experimental' | 'stable' | 'deprecated'

/**
 * AAG 縦スライス — 関心ごとの完結したルール群
 * 各スライスが Domain/Application/Infrastructure/Presentation の 4 層を持つ
 */
export type AagSlice =
  | 'layer-boundary' // 層境界、依存方向、描画専用原則
  | 'canonicalization' // 正本経路、readModel、Zod、path guard
  | 'query-runtime' // QueryHandler、AnalysisFrame、ComparisonScope
  | 'responsibility-separation' // size / hook complexity / responsibility tags
  | 'governance-ops' // allowlist、health、obligation、generated docs

/** ルールの性質 */
export type RuleClassification = 'invariant' | 'default' | 'heuristic'

/** ルールの確信度。low + gate の組み合わせは禁止 */
export type ConfidenceLevel = 'high' | 'medium' | 'low'

/** 違反時の運用区分 */
export type FixNowClassification = 'now' | 'debt' | 'review'

/** 検出の深刻度 */
export type DetectionSeverity = 'gate' | 'warn' | 'block-merge'

/** 修正工数 */
export type MigrationEffort = 'trivial' | 'small' | 'medium'

/**
 * ルールの risk tier（Phase Q.O-2 で導入）
 *
 * - 0: data corruption / financial correctness / layer inversion — 即 fail、例外原則禁止、allowlist 不可
 * - 1: architecture drift / source-of-truth drift / stale docs — 原則 fail、短期 allowlist 可
 * - 2: complexity / ergonomics / migration debt — ratchet 管理
 * - 3: review-only / observation — report と review 対象
 *
 * Tier 0 一覧: `references/AAG_CRITICAL_RULES.md`
 *
 * @see references/AAG_CRITICAL_RULES.md
 */
export type RuleTier = 0 | 1 | 2 | 3

// ─── RuleSemantics — 何を守るか ────────────────────────────

/**
 * ルールの意味層。
 * このルールが「何を守り」「なぜ守るのか」を定義する。
 * アプリ固有の具体名は含まない。
 */
export interface RuleSemantics {
  /** ルール ID */
  readonly id: string
  /** 何を強制するか（1 文） */
  readonly what: string
  /** なぜ重要か（業務/技術的文脈） */
  readonly why: string
  /**
   * どの設計原則から生まれたか（トレーサビリティ）。
   * Core では string[]。App 側で PrincipleId 等に narrowing する。
   * ※ 原則参照は binding ではなく意味層に属する（ルールの出自を辿る）
   */
  readonly principleRefs?: readonly string[]
  /** ガードタグ */
  readonly guardTags: readonly string[]
  /** 責務タグ */
  readonly responsibilityTags?: readonly string[]
  /** バージョン追跡 */
  readonly epoch?: number
  /** 成熟度 */
  readonly maturity?: RuleMaturity
  /** ルールの性質 */
  readonly ruleClass?: RuleClassification
  /** 確信度 */
  readonly confidence?: ConfidenceLevel
  /** このルールが防いでいる害 */
  readonly protectedHarm?: {
    readonly prevents: readonly string[]
  }
  /** 所属する関心スライス */
  readonly slice?: AagSlice
  /**
   * Risk tier（Phase Q.O-2、optional schema、Tier 0 のみ初期指定）
   *
   * Tier 0 (data corruption / financial correctness / layer inversion) を AAG_CRITICAL_RULES.md
   * に集約し、初見者が「絶対踏んではいけない rule」を 1 ページで把握できるようにする。
   *
   * 未指定の rule は暗黙的に Tier 1-2 として扱う（Phase Q.O-2 minimal landing 方針：
   * 162 rule の bulk classification は speculative なので避け、Tier 0 のみ明示）。
   */
  readonly tier?: RuleTier
}

// ─── RuleGovernance — どう扱うか ───────────────────────────

/** 判断基準（脱属人化） */
export interface DecisionCriteria {
  /** いつこのルールが適用されるか */
  readonly when: string
  /** 例外が許容される条件 */
  readonly exceptions: string
  /** 判断に迷ったときの行動 */
  readonly escalation: string
}

/** 修正手順 — App Domain の安定知識（「どう直すか」） */
export interface MigrationRecipe {
  readonly steps: readonly string[]
}

/** 実行計画 — Project Overlay の案件運用状態（「いつ・どの重さで扱うか」） */
export interface ExecutionPlan {
  readonly effort: MigrationEffort
  /** 低い = 先にやる */
  readonly priority: number
}

/** レビュー周期 */
export interface ReviewPolicy {
  readonly owner: string
  /** 最終レビュー日。新規ルールや未レビューの場合は null */
  readonly lastReviewedAt: string | null
  readonly reviewCadenceDays: number
}

/** experimental ルールの出口（昇格/撤回の対称性） */
export interface LifecyclePolicy {
  readonly introducedAt: string
  readonly observeForDays: number
  readonly promoteIf: readonly string[]
  readonly withdrawIf: readonly string[]
}

/**
 * ルールの安定知識層（App Domain 側）。
 * 「どう判断するか」「どう直すか」「いつ不要になるか」を定義する。
 * 案件が変わっても基本的に変わらない知識。
 */
export interface RuleGovernance {
  /** 判断基準（脱属人化） */
  readonly decisionCriteria?: DecisionCriteria
  /** 修正手順（安定知識: どう直すか）— 全ルール必須 */
  readonly migrationRecipe: MigrationRecipe
  /** いつこのルールが不要になるか（反証可能性） */
  readonly sunsetCondition?: string
}

/**
 * ルールの案件運用状態層（Project Overlay 側）。
 * 「今この案件でどう扱うか」を定義する。
 * 案件の優先順位・進捗・リソースで変わる。
 */
export interface RuleOperationalState {
  /** 違反時の運用区分（今この案件での扱い） */
  readonly fixNow?: FixNowClassification
  /** 実行計画（案件固有の工数・優先度）— 全ルール必須 */
  readonly executionPlan: ExecutionPlan
  /**
   * レビュー周期（案件運用）— 全ルール必須
   * ADR-D-001 PR3 (2026-04-24) で optional → required 昇格 (BC-6)。
   */
  readonly reviewPolicy: ReviewPolicy
  /** experimental ルールの出口（案件の時計） */
  readonly lifecyclePolicy?: LifecyclePolicy
}

// ─── RuleDetectionSpec — どう見つけるか ──────────────────────

/** 検出設定 */
export interface DetectionConfig {
  readonly type: DetectionType
  /**
   * gate: CI fail + マージ block（即修正必須）
   * block-merge: CI warn + マージ block（移行途中の検知用）
   * warn: CI warn + マージ allow（注意喚起のみ）
   */
  readonly severity: DetectionSeverity
  readonly baseline?: number
}

/** ルール間の因果関係 */
export interface RuleRelationships {
  /** 前提ルール */
  readonly dependsOn?: readonly string[]
  /** 守ると有効になるルール */
  readonly enables?: readonly string[]
  /** 同時適用不可 */
  readonly conflicts?: readonly string[]
}

/**
 * ルールの検出仕様層（Core）。
 * 「どう検出するか」の抽象仕様のみを定義する。
 *
 * correctPattern/outdatedPattern は description（何を正しい/古いとみなすか）のみ。
 * 具体 import パス・codeSignals・example は RuleBinding（App 側）に属する。
 * TypeScript intersection により ArchitectureRule でマージされる。
 */
export interface RuleDetectionSpec {
  /** 検出設定 */
  readonly detection: DetectionConfig
  /** 閾値（タグ連動） */
  readonly thresholds?: {
    readonly [key: string]: number | undefined
  }
  /** あるべき姿（Core: description のみ） */
  readonly correctPattern: {
    readonly description: string
  }
  /** 禁止/旧パターン（Core: description のみ） */
  readonly outdatedPattern: {
    readonly description: string
  }
  /** ルール間の因果関係 */
  readonly relationships?: RuleRelationships
}

// ─── slice 誘導文 ──────────────────────────────────────────

/** slice ごとの短い誘導文 — 違反時に「向かう先」を 1 行で示す */
export const SLICE_GUIDANCE: Readonly<Record<AagSlice, string>> = {
  'layer-boundary': 'hook / adapter / interface 経由に変更する',
  canonicalization: 'readModel / 正本関数 / path guard 経由に変更する',
  'query-runtime': 'QueryHandler / AnalysisFrame 経由に変更する',
  'responsibility-separation': '責務分離（分割 or active-debt）で対応する',
  'governance-ops': 'docs:generate / rule review で対応する',
}
