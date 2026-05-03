/**
 * AAG 5.0 スキーマ定義
 *
 * AAG が扱う主要オブジェクトの構造化データ型。
 * テンプレート運用から schema 運用への引き上げ。
 *
 * 層: Schema（宣言的仕様）
 * 正本性: 正本（型定義の唯一の定義元）
 *
 * == AAG 3 層分離 ==
 * - Core 型（AagLayer, AagViolation, GuardCategory 等）→ 本ファイル
 * - Core ルール型（RuleSemantics, RuleGovernance 等）→ aag-core-types.ts
 * - App Domain 型（SemanticClass, AuthorityKind 等）→ calculationCanonRegistry.ts
 *
 * 注意:
 * - 型定義のみ。データ登録やテスト実装は含まない
 * - 既存 AagResponse はまだ変更しない（二段階移行: Parse1 = 型定義、Parse2 = 接続）
 * - SemanticClass / AuthorityKind は calculationCanonRegistry.ts から流用（App Domain）
 *
 * @responsibility R:unclassified
 * @see aag/core/AAG_CORE_INDEX.md — Core 入口
 * @see aag/_internal/architecture.md — 4層構造定義
 * @see aag/_internal/source-of-truth.md — 正本ポリシー
 */

import type { SemanticClass, AuthorityKind, RuntimeStatus } from './calculationCanonRegistry'

// Core ルール型を re-export（aagSchemas.ts 経由でもアクセス可能にする）
export type {
  RuleSemantics,
  RuleGovernance,
  RuleOperationalState,
  RuleDetectionSpec,
  DetectionType,
  RuleMaturity,
  AagSlice,
  RuleClassification,
  ConfidenceLevel,
  FixNowClassification,
  DetectionSeverity,
  MigrationEffort,
  DetectionConfig,
  DecisionCriteria,
  MigrationRecipe,
  ExecutionPlan,
  ReviewPolicy,
  LifecyclePolicy,
  RuleRelationships,
} from './aag-core-types'

// App Domain 型を re-export（architectureRules.ts で定義、aagSchemas 経由でもアクセス可能）
export type { RuleBinding } from './architectureRules'

// ────────────────────────────────────────────────────────
// 共通型
// ────────────────────────────────────────────────────────

/** AAG 5.0 の 4 層 */
export type AagLayer = 'constitution' | 'schema' | 'execution' | 'operations'

/** 違反の深刻度 */
export type AagSeverity = 'gate' | 'warn' | 'info'

/** ガードの強制レベル */
export type AagEnforcement = 'hard' | 'soft' | 'ratchet'

/** JS 正本縮退の 4 段階 */
export type JsRetirementStage =
  | 'current-reference'
  | 'compare-reference'
  | 'fallback-only'
  | 'retired-js'

/** Bridge のモード（既存文書の用語に統一） */
export type BridgeMode =
  | 'current-only'
  | 'candidate-only'
  | 'dual-run-compare'
  | 'fallback-to-current'

/** ガードのカテゴリ（Phase A3 でルール再編に使用） */
export type GuardCategory =
  | 'terminology'
  | 'semantic-boundary'
  | 'registry-integrity'
  | 'bridge-runtime-boundary'
  | 'current-candidate-lifecycle'
  | 'docs-synchronization'
  | 'promote-retire-lifecycle'
  | 'ratchet-legacy-control'
  | 'display-rule'

// ────────────────────────────────────────────────────────
// 1. Violation — 違反の構造化表現
// ────────────────────────────────────────────────────────

/**
 * AAG が検出した違反。
 * AI に修正導線を返すためのフル情報を持つ。
 */
export interface AagViolation {
  /** 違反コード（例: 'AR-001', 'DRIFT-REGISTRY-ENGINE', 'DOCS-SYNC-001'） */
  readonly code: string
  /** 1行要約 */
  readonly title: string
  /** architectureRules.ts の id または synthetic governance id */
  readonly brokenRule: string
  /** どの層の違反か */
  readonly layer: AagLayer
  /** 深刻度 */
  readonly severity: AagSeverity
  /** なぜこれが問題か */
  readonly why: string
  /** 見るべきファイル・パス */
  readonly whereToLook: string
  /** 具体的な修正内容 */
  readonly whatToFix: string
  /** 許可される次のアクション */
  readonly allowedNextAction: string
  /** やってはいけない近道 */
  readonly forbiddenShortcut: string
  /** 再発防止のヒント */
  readonly recurrenceHint: string
}

// ────────────────────────────────────────────────────────
// 2. EvidencePack — 昇格/品質判定の証拠束
// ────────────────────────────────────────────────────────

/** Parity 検証の結果 */
export interface ParityResult {
  /** 値の一致 */
  readonly valueMatch: boolean
  /** null の一致 */
  readonly nullMatch: boolean
  /** warning の一致 */
  readonly warningMatch: boolean
  /** methodUsed の一致 */
  readonly methodUsedMatch: boolean
  /** scope の一致 */
  readonly scopeMatch: boolean
  /** 重大な差分の件数 */
  readonly criticalDiffCount: number
  /** 観測期間（日数） */
  readonly observationDays: number
}

/** Rollback 実証の結果 */
export interface RollbackEvidence {
  /** rollback テストが通過したか */
  readonly tested: boolean
  /** candidate 失敗 → current-only に復帰できるか */
  readonly canRevertToCurrentOnly: boolean
  /** テスト日時 */
  readonly testedAt: string | null
}

/** Guard 通過状態 */
export interface GuardStatus {
  /** hard gate 全通過か */
  readonly hardGatePass: boolean
  /** 失敗したガードの ruleId リスト */
  readonly failedRules: readonly string[]
  /** 検証日時 */
  readonly checkedAt: string
}

/** Registry の変更差分 */
export interface RegistryDiff {
  /** 変更前の runtimeStatus */
  readonly fromStatus: RuntimeStatus
  /** 変更後の runtimeStatus */
  readonly toStatus: RuntimeStatus
  /** 変更前の authorityKind */
  readonly fromAuthority: AuthorityKind
  /** 変更後の authorityKind */
  readonly toAuthority: AuthorityKind
}

/**
 * 昇格/品質判定のために収集する証拠の束。
 * Promote Ceremony で人間承認の根拠となる。
 */
export interface AagEvidencePack {
  /** 対象の contractId（BIZ-xxx / ANA-xxx） */
  readonly targetId: string
  /** 対象ファイルパス */
  readonly targetFile: string
  /** 意味分類 */
  readonly semanticClass: SemanticClass
  /** 権限種別 */
  readonly authorityKind: AuthorityKind
  /** トラック */
  readonly track: 'candidate' | 'current-quality'
  /** Registry の変更差分 */
  readonly registryDiff: RegistryDiff
  /** Bridge のモード */
  readonly bridgeMode: BridgeMode
  /** Parity 検証の結果 */
  readonly parityResult: ParityResult
  /** Rollback 実証の結果 */
  readonly rollbackEvidence: RollbackEvidence
  /** Guard 通過状態 */
  readonly guardStatus: GuardStatus
  /** 収集日時 */
  readonly collectedAt: string
  /** 人間レビュー後のサマリ（レビュー前は null） */
  readonly reviewerSummary: string | null
}

// ────────────────────────────────────────────────────────
// 3. PromoteRecord — 昇格記録
// ────────────────────────────────────────────────────────

/** Bridge の遷移記録 */
export interface BridgeTransition {
  /** 変更前のモード */
  readonly fromMode: BridgeMode
  /** 変更後のモード */
  readonly toMode: BridgeMode
}

/**
 * candidate → current への昇格記録。
 * 人間承認必須。AI は提案のみ。
 */
export interface AagPromoteRecord {
  /** 対象の contractId */
  readonly candidateId: string
  /** 遷移前の runtimeStatus */
  readonly fromStatus: 'candidate'
  /** 遷移後の runtimeStatus */
  readonly toStatus: 'current'
  /** 遷移前の authorityKind */
  readonly fromAuthority: 'candidate-authoritative'
  /** 遷移後の authorityKind（promote 先は business か analytic のみ） */
  readonly toAuthority: 'business-authoritative' | 'analytic-authoritative'
  /** 承認日時 */
  readonly decisionAt: string
  /** 人間が承認したか（必ず true） */
  readonly approvedByHuman: true
  /** 証拠束の参照パス */
  readonly evidenceRef: string
  /** Registry の遷移 */
  readonly registryTransition: RegistryDiff
  /** Bridge の遷移 */
  readonly bridgeTransition: BridgeTransition
  /** Rollback 手順 */
  readonly rollbackPlan: readonly string[]
  /** 結果 */
  readonly result: 'success' | 'failed' | 'rolled-back'
}

// ────────────────────────────────────────────────────────
// 4. RetirementRecord — JS 退役記録
// ────────────────────────────────────────────────────────

/**
 * JS reference の段階的退役記録。
 * current-reference → compare-reference → fallback-only → retired-js
 */
export interface AagRetirementRecord {
  /** 対象の contractId */
  readonly targetId: string
  /** 退役する JS ファイルパス */
  readonly oldJsPath: string
  /** 引き継ぎ先（WASM crate 名） */
  readonly newRuntimeOwner: string
  /** 遷移前の段階 */
  readonly stageBefore: JsRetirementStage
  /** 遷移後の段階 */
  readonly stageAfter: JsRetirementStage
  /** import 削除の進捗 */
  readonly importRemovalStatus: 'complete' | 'partial' | 'not-started'
  /** Guard 通過状態 */
  readonly guardStatus: GuardStatus
  /** 退役日時 */
  readonly retiredAt: string
  /** 結果 */
  readonly result: 'success' | 'failed' | 'rolled-back'
}

// ────────────────────────────────────────────────────────
// 5. GuardMetadata — ガードのメタ情報
// ────────────────────────────────────────────────────────

/**
 * 各ガードのメタ情報。Phase A3 でルール再編に使用。
 * architectureRules.ts のルール定義を補完し、
 * カテゴリ・層・正本・自動修正可否を付加する。
 */
export interface AagGuardMetadata {
  /** architectureRules.ts の id */
  readonly ruleId: string
  /** ガードカテゴリ（Phase A3 で全ルールに付与） */
  readonly category: GuardCategory
  /** 所属層 */
  readonly layer: AagLayer
  /** 深刻度 */
  readonly severity: AagSeverity
  /** 正本ファイルパス */
  readonly sourceOfTruth: string
  /** 強制レベル */
  readonly enforcement: AagEnforcement
  /** 検出対象のパスパターン */
  readonly targetArea: string
  /** 1文説明 */
  readonly description: string
  /** 自動修正可能か */
  readonly canAutoFix: boolean
  /** 廃止条件（null = 廃止条件なし） */
  readonly sunsetCondition: string | null
}
