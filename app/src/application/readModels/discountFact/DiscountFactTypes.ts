/**
 * 値引き（売変） — 分析用正本ファクトの Zod 契約
 *
 * 71/72/73/74 の4種別を独立分析軸として管理。
 * 時間帯データは持たない（仕様として固定）。
 *
 * @see references/01-principles/discount-definition.md
 *
 * @responsibility R:unclassified
 */
import { z } from 'zod'

// ── 入力契約 ──

export const DiscountFactQueryInput = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  storeIds: z.array(z.string()).optional(),
  isPrevYear: z.boolean().optional(),
})

export type DiscountFactQueryInput = z.infer<typeof DiscountFactQueryInput>

// ── 日別×階層 行 ──

export const DiscountFactRow = z.object({
  storeId: z.string(),
  day: z.number(),
  deptCode: z.string(),
  deptName: z.string(),
  lineCode: z.string(),
  lineName: z.string(),
  klassCode: z.string(),
  klassName: z.string(),
  discount71: z.number(),
  discount72: z.number(),
  discount73: z.number(),
  discount74: z.number(),
  discountTotal: z.number(),
})

export type DiscountFactRow = z.infer<typeof DiscountFactRow>

// ── 複合正本（ReadModel） ──

export const DiscountFactReadModel = z.object({
  rows: z.array(DiscountFactRow),
  grandTotal: z.number(),
  grandTotal71: z.number(),
  grandTotal72: z.number(),
  grandTotal73: z.number(),
  grandTotal74: z.number(),
  meta: z.object({
    /** フォールバックが発生したか（現状は常に false — 将来の拡張点） */
    usedFallback: z.boolean(),
    missingPolicy: z.literal('zero'),
    dataVersion: z.number(),
  }),
})

export type DiscountFactReadModel = z.infer<typeof DiscountFactReadModel>
