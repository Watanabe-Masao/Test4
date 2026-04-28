/**
 * app-domain/integrity/index.ts — public API barrel
 *
 * canonicalization-domain-consolidation Phase B Step B-1 landing 時点では
 * 抽象型 4 種のみを公開する。具体 primitive (parsing / detection / reporting) は
 * Step B-2 以降で順次追加。
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
