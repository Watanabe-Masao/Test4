/**
 * 客数 — 分析用正本ファクトの Zod 契約
 *
 * 来店客数を storeId × date の粒度で管理する。
 * 時間帯データは持たない（花データに時間帯がないため契約として固定）。
 *
 * この正本から以下を導出:
 *   店舗別客数 / 日別客数 / 月間客数 / PI値入力 / 客数GAP入力
 *
 * @see references/01-principles/customer-definition.md
 * @see references/01-principles/canonical-input-sets.md
 */
import { z } from 'zod'

// ── 入力契約 ──

export const CustomerFactQueryInput = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  storeIds: z.array(z.string()).optional(),
  isPrevYear: z.boolean().optional(),
})

export type CustomerFactQueryInput = z.infer<typeof CustomerFactQueryInput>

// ── 日別行（store_day_summary.customers 由来） ──

export const CustomerFactDailyRow = z.object({
  storeId: z.string(),
  day: z.number(),
  customers: z.coerce.number().default(0),
})

export type CustomerFactDailyRow = z.infer<typeof CustomerFactDailyRow>

// ── ReadModel ──

export const CustomerFactReadModel = z.object({
  /** 日別の行データ（store_day_summary.customers 由来） */
  daily: z.array(CustomerFactDailyRow),

  /** 全体合計 — INV: grandTotalCustomers = Σ daily[].customers */
  grandTotalCustomers: z.coerce.number().default(0),

  /** メタデータ */
  meta: z.object({
    usedFallback: z.boolean(),
    missingPolicy: z.literal('zero'),
    dataVersion: z.number(),
  }),
})

export type CustomerFactReadModel = z.infer<typeof CustomerFactReadModel>
