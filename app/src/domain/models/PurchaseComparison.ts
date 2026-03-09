/**
 * 仕入比較分析 — 結果型定義
 *
 * 取引先別・カテゴリ別の当年 vs 前年仕入データを保持する。
 * infrastructure/duckdb クエリ結果を domain 型に変換して使う。
 */

/** 取引先別仕入比較 */
export interface SupplierComparisonRow {
  readonly supplierCode: string
  readonly supplierName: string
  /** 当年仕入原価 */
  readonly currentCost: number
  /** 当年仕入売価 */
  readonly currentPrice: number
  /** 前年仕入原価 */
  readonly prevCost: number
  /** 前年仕入売価 */
  readonly prevPrice: number
  /** 原価差額（当年 - 前年） */
  readonly costDiff: number
  /** 売価差額（当年 - 前年） */
  readonly priceDiff: number
  /** 原価増減率 */
  readonly costChangeRate: number
  /** 当年の原価構成比（全体に占める割合） */
  readonly currentCostShare: number
  /** 前年の原価構成比 */
  readonly prevCostShare: number
  /** 構成比変化（ポイント差） */
  readonly costShareDiff: number
  /** 当年値入率 (1 - cost/price) */
  readonly currentMarkupRate: number
  /** 前年値入率 */
  readonly prevMarkupRate: number
}

/** カテゴリ別仕入比較 */
export interface CategoryComparisonRow {
  readonly category: string
  readonly currentCost: number
  readonly currentPrice: number
  readonly prevCost: number
  readonly prevPrice: number
  readonly costDiff: number
  readonly priceDiff: number
  readonly costChangeRate: number
  readonly currentCostShare: number
  readonly prevCostShare: number
  readonly costShareDiff: number
  readonly currentMarkupRate: number
  readonly prevMarkupRate: number
}

/** 全体KPI */
export interface PurchaseComparisonKpi {
  /** 当年仕入原価合計 */
  readonly currentTotalCost: number
  /** 前年仕入原価合計 */
  readonly prevTotalCost: number
  /** 原価差額 */
  readonly totalCostDiff: number
  /** 原価増減率 */
  readonly totalCostChangeRate: number
  /** 当年仕入売価合計 */
  readonly currentTotalPrice: number
  /** 前年仕入売価合計 */
  readonly prevTotalPrice: number
  /** 売価差額 */
  readonly totalPriceDiff: number
  /** 当年値入率 */
  readonly currentMarkupRate: number
  /** 前年値入率 */
  readonly prevMarkupRate: number
  /** 値入率ポイント差 */
  readonly markupRateDiff: number
  /** 当年仕入対売上比率（仕入原価 ÷ 売上） */
  readonly currentCostToSalesRatio: number
  /** 前年仕入対売上比率 */
  readonly prevCostToSalesRatio: number
  /** 当年売上高 */
  readonly currentSales: number
  /** 前年売上高 */
  readonly prevSales: number
}

/** 仕入比較分析の全結果 */
export interface PurchaseComparisonResult {
  readonly kpi: PurchaseComparisonKpi
  readonly bySupplier: readonly SupplierComparisonRow[]
  readonly byCategory: readonly CategoryComparisonRow[]
  readonly isReady: boolean
}
