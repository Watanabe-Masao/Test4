/**
 * 売上・販売点数 — 分析用正本ファクトの Zod 契約
 *
 * 売上金額と販売点数を同一ファクトに載せ、
 * store × date × dept/line/klass × hour の粒度で管理する。
 *
 * この正本から全ての分析ビューを導出:
 *   店舗別 / 日別 / 曜日別 / 時間帯別 / 階層別 / ドリルダウン
 *
 * StoreResult.totalSales は既に正本として機能しているが、
 * 販売点数は StoreResult にないため、DuckDB 分析正本として統一する。
 *
 * @see references/01-principles/sales-definition.md
 *
 * @responsibility R:unclassified
 */
import { z } from 'zod'

// ── 入力契約 ──

export const SalesFactQueryInput = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  storeIds: z.array(z.string()).optional(),
  isPrevYear: z.boolean().optional(),
})

export type SalesFactQueryInput = z.infer<typeof SalesFactQueryInput>

// ── 日別×階層 行（category_time_sales 由来） ──

export const SalesFactDailyRow = z.object({
  storeId: z.string(),
  day: z.number(),
  dow: z.number(),
  deptCode: z.string(),
  deptName: z.string(),
  lineCode: z.string(),
  lineName: z.string(),
  klassCode: z.string(),
  klassName: z.string(),
  totalAmount: z.number(),
  totalQuantity: z.number(),
})

export type SalesFactDailyRow = z.infer<typeof SalesFactDailyRow>

// ── 時間帯行（time_slots 由来） ──

export const SalesFactHourlyRow = z.object({
  storeId: z.string(),
  day: z.number(),
  deptCode: z.string(),
  lineCode: z.string(),
  klassCode: z.string(),
  hour: z.number(),
  amount: z.number(),
  quantity: z.number(),
})

export type SalesFactHourlyRow = z.infer<typeof SalesFactHourlyRow>

// ── 複合正本（ReadModel） ──

export const SalesFactReadModel = z.object({
  /** 日別×階層の行データ（category_time_sales 由来） */
  daily: z.array(SalesFactDailyRow),
  /** 時間帯の行データ（time_slots 由来） */
  hourly: z.array(SalesFactHourlyRow),

  /** 全体合計 */
  grandTotalAmount: z.number(),
  grandTotalQuantity: z.number(),

  /** メタデータ */
  meta: z.object({
    /** フォールバックが発生したか（現状は常に false — 将来の拡張点） */
    usedFallback: z.boolean(),
    missingPolicy: z.literal('zero'),
    dataVersion: z.number(),
  }),
})

export type SalesFactReadModel = z.infer<typeof SalesFactReadModel>
