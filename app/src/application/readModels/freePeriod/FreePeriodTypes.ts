/**
 * 自由期間分析 — Zod 契約
 *
 * AnalysisFrame（自由期間）を入力として、
 * 日別・店舗別の売上/仕入/粗利を統合した分析ファクトを定義する。
 *
 * この正本から導出可能なビュー:
 *   日別推移 / 店舗別比較 / 期間サマリー / 前年比較 / 累積推移
 *
 * ## 設計方針
 * - 取得正本: DuckDB から日別×店舗の raw rows を取得
 * - 計算正本: JS で粗利・達成率・累積を導出
 * - StoreResult（単月確定値）とは別系統
 */
import { z } from 'zod'

// ── 入力契約 ──

export const FreePeriodQueryInput = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  storeIds: z.array(z.string()).optional(),
  /** 比較期間（null = 比較なし） */
  comparisonDateFrom: z.string().optional(),
  comparisonDateTo: z.string().optional(),
})

export type FreePeriodQueryInput = z.infer<typeof FreePeriodQueryInput>

// ── 日別×店舗 行（取得正本の最小粒度） ──

export const FreePeriodDailyRow = z.object({
  storeId: z.string(),
  dateKey: z.string(),
  day: z.number(),
  dow: z.number(),
  /** 売上金額 */
  sales: z.number(),
  /** 客数 */
  customers: z.number(),
  /** 仕入原価 */
  purchaseCost: z.number(),
  /** 仕入売価 */
  purchasePrice: z.number(),
  /** 売変合計 */
  discount: z.number(),
  /** 比較期間フラグ */
  isPrevYear: z.boolean(),
})

export type FreePeriodDailyRow = z.infer<typeof FreePeriodDailyRow>

// ── 期間サマリー（計算正本） ──

export const FreePeriodSummary = z.object({
  /** 対象店舗数 */
  storeCount: z.number(),
  /** 対象日数 */
  dayCount: z.number(),
  /** 売上合計 */
  totalSales: z.number(),
  /** 客数合計 */
  totalCustomers: z.number(),
  /** 仕入原価合計 */
  totalPurchaseCost: z.number(),
  /** 売変合計 */
  totalDiscount: z.number(),
  /** 日平均売上 */
  averageDailySales: z.number(),
  /** 客単価 */
  transactionValue: z.number(),
  /** 売変率 */
  discountRate: z.number(),
})

export type FreePeriodSummary = z.infer<typeof FreePeriodSummary>

// ── ReadModel（取得正本 + 計算正本 統合） ──

export const FreePeriodReadModel = z.object({
  /** 当期の日別行 */
  currentRows: z.array(FreePeriodDailyRow),
  /** 比較期の日別行（比較なしなら空配列） */
  comparisonRows: z.array(FreePeriodDailyRow),
  /** 当期サマリー */
  currentSummary: FreePeriodSummary,
  /** 比較期サマリー（比較なしなら null） */
  comparisonSummary: FreePeriodSummary.nullable(),
})

export type FreePeriodReadModel = z.infer<typeof FreePeriodReadModel>
