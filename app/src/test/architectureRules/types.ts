/**
 * Architecture Rule 型定義 + Core 型 re-export
 *
 * App Domain の型（PrincipleId, RuleBinding, ArchitectureRule）と
 * Core 型の re-export（後方互換）をまとめる。
 *
 * @responsibility R:unclassified
 */

// ─── Core 型の import + re-export（後方互換） ──────────────
import type {
  RuleSemantics as _RuleSemantics,
  RuleGovernance as _RuleGovernance,
  RuleOperationalState as _RuleOperationalState,
  RuleDetectionSpec as _RuleDetectionSpec,
  DetectionType as _DetectionType,
  RuleMaturity as _RuleMaturity,
  AagSlice as _AagSlice,
  RuleClassification as _RuleClassification,
  ConfidenceLevel as _ConfidenceLevel,
  FixNowClassification as _FixNowClassification,
  DetectionSeverity as _DetectionSeverity,
  MigrationEffort as _MigrationEffort,
  RuleTier as _RuleTier,
  DetectionConfig as _DetectionConfig,
  DecisionCriteria as _DecisionCriteria,
  MigrationRecipe as _MigrationRecipe,
  ExecutionPlan as _ExecutionPlan,
  ReviewPolicy as _ReviewPolicy,
  LifecyclePolicy as _LifecyclePolicy,
  RuleRelationships as _RuleRelationships,
} from '../aag-core-types'

// Core 型を re-export（既存 consumer の import を壊さない）
export type DetectionType = _DetectionType
export type RuleMaturity = _RuleMaturity
export type AagSlice = _AagSlice
export type RuleClassification = _RuleClassification
export type ConfidenceLevel = _ConfidenceLevel
export type FixNowClassification = _FixNowClassification
export type DetectionSeverity = _DetectionSeverity
export type MigrationEffort = _MigrationEffort
export type RuleTier = _RuleTier
export type DetectionConfig = _DetectionConfig
export type DecisionCriteria = _DecisionCriteria
export type MigrationRecipe = _MigrationRecipe
export type ExecutionPlan = _ExecutionPlan
export type ReviewPolicy = _ReviewPolicy
export type LifecyclePolicy = _LifecyclePolicy
export type RuleRelationships = _RuleRelationships

// Core 意味層
export type RuleSemantics = _RuleSemantics
// Core 安定知識層（App Domain 側 governance）
export type RuleGovernance = _RuleGovernance
// Core 案件運用状態層（Project Overlay 側 governance）
export type RuleOperationalState = _RuleOperationalState
// Core 検出仕様層
export type RuleDetectionSpec = _RuleDetectionSpec

// SLICE_GUIDANCE は Core から import し re-export
import { SLICE_GUIDANCE as _SLICE_GUIDANCE } from '../aag-core-types'
export const SLICE_GUIDANCE = _SLICE_GUIDANCE

// ─── App Domain 型定義 ───────────────────────────────────

/**
 * 設計原則 ID — CLAUDE.md §設計原則 の A1〜H6 + Q3〜Q4
 * ルールがどの思想から生まれたかを辿るトレーサビリティ
 * ※ アプリ固有（この設計原則体系は粗利管理ツール固有）
 */
export type PrincipleId =
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'B1'
  | 'B2'
  | 'B3'
  | 'C1'
  | 'C2'
  | 'C3'
  | 'C4'
  | 'C5'
  | 'C6'
  | 'C7'
  | 'C8'
  | 'C9'
  | 'D1'
  | 'D2'
  | 'D3'
  | 'E1'
  | 'E2'
  | 'E3'
  | 'E4'
  | 'F1'
  | 'F2'
  | 'F3'
  | 'F4'
  | 'F5'
  | 'F6'
  | 'F7'
  | 'F8'
  | 'F9'
  | 'G1'
  | 'G2'
  | 'G3'
  | 'G4'
  | 'G5'
  | 'G6'
  | 'G7'
  | 'G8'
  | 'H1'
  | 'H2'
  | 'H3'
  | 'H4'
  | 'H5'
  | 'H6'
  | 'Q3'
  | 'Q4'
  | 'I1'
  | 'I2'
  | 'I3'
  | 'I4'

/**
 * RuleBinding — アプリ固有バインディング
 *
 * Core の RuleDetectionSpec（description のみ）を補完し、
 * このアプリに固有の具体値（import パス、codeSignals、example、doc）を追加する。
 *
 * TypeScript の intersection 型により、correctPattern/outdatedPattern は
 * Core 側の description と Binding 側の imports/codeSignals/example がマージされる。
 * ルール定義データの変更は不要。
 *
 * @see aag/core/principles/core-boundary-policy.md — 原則 E: 具体名は後段へ落とす
 */
export interface RuleBinding {
  /** 参照ドキュメント（アプリ固有パス） */
  readonly doc?: string
  /** あるべき姿のバインディング（具体 import、コード例） */
  readonly correctPattern?: {
    readonly example?: string
    readonly imports?: readonly string[]
  }
  /** 禁止/旧パターンのバインディング（具体 import、検出シグナル） */
  readonly outdatedPattern?: {
    readonly imports?: readonly string[]
    readonly codeSignals?: readonly string[]
  }
}

/**
 * Architecture Rule = Core 4 層 + App バインディング
 *
 * - RuleSemantics: 何を守るか — id, what, why, principleRefs, slice（Core）
 * - RuleGovernance: 安定知識 — decisionCriteria, migrationRecipe, sunsetCondition（App Domain）
 * - RuleOperationalState: 案件運用 — fixNow, executionPlan, reviewPolicy, lifecyclePolicy（Project Overlay）
 * - RuleDetectionSpec: どう見つけるか — detection, description のみ（Core）
 * - RuleBinding: 具体バインディング — doc, imports, codeSignals, example（App）
 *
 * `type` + intersection を使用する理由:
 * `interface extends` は同名プロパティの型が完全一致でないと TS2320 になる。
 * correctPattern/outdatedPattern は Core（description のみ）と Binding（imports 等）で
 * 異なる部分型を持つため、intersection（`&`）でマージする必要がある。
 */
/**
 * BaseRule = App Domain 側のルール定義（operational state 除く）
 *
 * rules.ts が直接持つ型。RuleOperationalState は含まない。
 * Project Overlay が merge されて ArchitectureRule になる。
 */
export type BaseRule = _RuleSemantics &
  _RuleGovernance &
  _RuleDetectionSpec &
  RuleBinding & {
    /** Core の principleRefs を PrincipleId に narrowing（アプリ固有の原則 ID 体系） */
    readonly principleRefs?: readonly PrincipleId[]
  }

/**
 * Architecture Rule = BaseRule + RuleOperationalState
 *
 * 合成後のルール型。consumer が参照するのはこの型。
 * - BaseRule: rules.ts（App Domain: semantics + governance + detection + binding）
 * - RuleOperationalState: execution-overlay.ts（Project Overlay: fixNow + executionPlan 等）
 *
 * 合成ロジック: architectureRules/merged.ts
 */
export type ArchitectureRule = BaseRule & _RuleOperationalState
