/**
 * 自由期間 Department KPI — Zod 契約
 *
 * department_kpi テーブルから対象期間の部門別 KPI を集約する。
 * 月次データを対象期間で絞り込み、複数月分を合算。
 *
 * @see references/01-principles/free-period-budget-kpi-contract.md
 *
 * @responsibility R:unclassified
 */
import { z } from 'zod'

// ── 入力契約 ──

export const FreePeriodDeptKPIQueryInput = z.object({
  yearMonths: z.array(z.object({ year: z.number(), month: z.number() })),
})

export type FreePeriodDeptKPIQueryInput = z.infer<typeof FreePeriodDeptKPIQueryInput>

// ── 部門別行 ──

export const FreePeriodDeptKPIRow = z.object({
  deptCode: z.string(),
  deptName: z.string().nullable(),
  /** 売上予算合計 */
  salesBudget: z.number(),
  /** 売上実績合計 */
  salesActual: z.number(),
  /** 売上達成率 */
  salesAchievement: z.number().nullable(),
  /** 粗利率予算（加重平均） */
  gpRateBudget: z.number().nullable(),
  /** 粗利率実績（加重平均） */
  gpRateActual: z.number().nullable(),
  /** 値入率（加重平均） */
  markupRate: z.number().nullable(),
  /** 売変率（加重平均） */
  discountRate: z.number().nullable(),
})

export type FreePeriodDeptKPIRow = z.infer<typeof FreePeriodDeptKPIRow>

// ── ReadModel ──

export const FreePeriodDeptKPIReadModel = z.object({
  rows: z.array(FreePeriodDeptKPIRow),
  /** 対象月数 */
  monthCount: z.number(),
})

export type FreePeriodDeptKPIReadModel = z.infer<typeof FreePeriodDeptKPIReadModel>
