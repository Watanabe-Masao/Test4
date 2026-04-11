/**
 * Architecture Rule — 互換 facade
 *
 * 本体は architectureRules/ ディレクトリに分割済み:
 * - types.ts: 型定義 + Core 型 re-export
 * - rules.ts: ARCHITECTURE_RULES 配列（140 ルール）
 * - helpers.ts: getRuleById, formatViolationMessage 等
 * - index.ts: barrel re-export
 *
 * 既存 consumer は全て `from '../architectureRules'` で import しており、
 * TypeScript は architectureRules.ts → architectureRules/index.ts の順で解決するため、
 * このファイルが存在する限り旧パスでのアクセスが維持される。
 *
 * ただし、TypeScript のモジュール解決では同名ファイルとディレクトリが共存する場合、
 * ファイル（.ts）が優先される。このファイルが全 export を re-export することで
 * consumer 変更 0 件を保証する。
 *
 * @responsibility R:utility
 */

// 全 export を architectureRules/index.ts から re-export
export {
  SLICE_GUIDANCE,
  ARCHITECTURE_RULES,
  getRuleById,
  getRulesByGuardTag,
  getRulesByDetectionType,
  getRuleByResponsibilityTag,
  checkRatchetDown,
  formatViolationMessage,
  buildAagResponse,
  renderAagResponse,
  buildObligationResponse,
} from './architectureRules/index'

export type {
  PrincipleId,
  RuleBinding,
  ArchitectureRule,
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
  MigrationPath,
  ReviewPolicy,
  LifecyclePolicy,
  RuleRelationships,
  RuleSemantics,
  RuleGovernance,
  RuleOperationalState,
  RuleDetectionSpec,
  AagResponse,
} from './architectureRules/index'
