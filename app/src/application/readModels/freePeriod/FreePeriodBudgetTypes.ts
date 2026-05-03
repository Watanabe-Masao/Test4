/**
 * 自由期間 Budget Fact — Zod 契約
 *
 * 月予算を対象期間に日割り按分し、期間内の予算達成状況を提供する。
 * 粒度契約 (free-period-budget-kpi-contract.md):
 * - budget.daily があれば対象日の合計
 * - budget.daily がなければ total / daysInMonth × 対象日数
 * - 月跨ぎは各月独立に按分し合算
 *
 * @see references/01-foundation/free-period-budget-kpi-contract.md
 *
 * @responsibility R:unclassified
 */
import { z } from 'zod'

// ── 入力契約 ──

export const FreePeriodBudgetQueryInput = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  storeIds: z.array(z.string()).optional(),
})

export type FreePeriodBudgetQueryInput = z.infer<typeof FreePeriodBudgetQueryInput>

// ── 店舗別予算行 ──

export const FreePeriodBudgetRow = z.object({
  storeId: z.string(),
  /** 月予算合計 */
  monthlyBudgetTotal: z.number(),
  /** 日割り按分済み予算 */
  proratedBudget: z.number(),
  /** 対象期間内の日数 */
  dayCount: z.number(),
})

export type FreePeriodBudgetRow = z.infer<typeof FreePeriodBudgetRow>

// ── ReadModel ──

export const FreePeriodBudgetReadModel = z.object({
  /** 店舗別予算行 */
  storeRows: z.array(FreePeriodBudgetRow),
  /** 全店合計 日割り予算 */
  totalProratedBudget: z.number(),
  /** 全店合計 月予算 */
  totalMonthlyBudget: z.number(),
})

export type FreePeriodBudgetReadModel = z.infer<typeof FreePeriodBudgetReadModel>
