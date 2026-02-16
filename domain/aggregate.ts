/**
 * 集計仕様の統一入口。
 *
 * 比較対象だった既存3系統
 * 1) ensureAllAggregate
 * 2) ensureAllAggregateV19
 * 3) buildAggregateForStoreSet
 *
 * 統一仕様（最低限）
 * - 在庫: invStart / invEnd / estimatedInvEnd を合算
 * - 粗利: totalSales / grossProfit / grossProfitRate
 * - 値入: coreMarginRate / avgMargin
 * - 移動: transferDetails(店間入出・部門間入出)を非相殺で連結
 * - 予算: budget / budgetConsumed / gpBudget / budgetDaily
 * - 変ロス: baihen(符号付き) / baihenAbs / baihenRateSales
 */

export type AggregateScope = {
  storeIds?: string[];
  attachSourceStore?: boolean;
  markAsAll?: boolean;
};

export type AggregateInput = {
  result: Record<string, any>;
  defaultMarginRate?: number;
};

// 実体はブラウザ実行互換の aggregate.js 側を利用
export { buildAggregate } from './aggregate.js';
