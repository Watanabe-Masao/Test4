/**
 * app-domain/integrity/index.ts — public API barrel
 *
 * Phase B Step B-2〜B-5 完遂時点での export 一式。
 *
 * 設計詳細: `references/03-guides/integrity-domain-architecture.md`
 *
 * 不変条件: 本 barrel は re-export のみ (一切の logic を持たない、F1 後方互換維持)。
 */

export type {
  Registry,
  DriftReport,
  EnforcementSeverity,
  SyncDirection,
} from "./types";

export {
  parseSpecFrontmatter,
  inferKindFromId,
  findIdLine,
  findExportLine,
  type SpecKind,
  type SpecFrontmatter,
  type LifecycleStatus,
  type EvidenceLevel,
  type RiskLevel,
  type BehaviorClaim,
} from "./parsing";

export {
  checkBidirectionalExistence,
  checkPathExistence,
  checkRatchet,
  checkExpired,
  checkFreshness,
  type ExistenceCheckOptions,
  type ExistsCheck,
  type PathExistenceOptions,
  type RegisteredPath,
  type RatchetOptions,
  type RatchetResult,
  type ExpirationOptions,
  type ExpiringItem,
  type FreshnessOptions,
  type FreshnessTarget,
} from "./detection";

export { formatViolations, formatStringViolations } from "./reporting";
