/**
 * selectPrevYearSummaryFromFreePeriod — Phase 6 Step A summary projection
 *
 * unify-period-analysis Phase 6 Step A:
 * 旧 `PrevYearData` / `PrevYearMonthlyKpi` 命名で widget が消費している
 * summary 値を `FreePeriodReadModel.comparisonSummary` から射影する pure
 * selector + 同じ shape を返す legacy adapter + 両者を合成する composer。
 * `ConditionSummaryEnhanced` / `ExecSummaryBarWidget` の summary 差し替えで
 * 共通利用する。
 *
 * ## 射影対象 (Step A 範囲)
 *
 * - `prevYear.totalSales`               → `comparisonSummary.totalSales`
 * - `prevYear.totalCustomers`           → `comparisonSummary.totalCustomers`
 * - `prevYearMonthlyKpi.monthlyTotal.sales` (= legacy "prevYearMonthlySales")
 *                                        → `comparisonSummary.totalSales`
 *
 * ## 射影しないもの (Step A 範囲外)
 *
 * - `prevYear.daily` / `dailyMapping` — 日別粒度。Step B (readModel 次元拡張)
 *   待ち
 * - `dowGap` — alignmentMap ベースの曜日別計算。Step B 以降
 * - `prevYearStoreCostPrice` — store-level cost。Step B 以降
 * - 7-day trend 計算 — daily 必須。Step B 以降
 *
 * ## source タグの意味
 *
 * 射影は同じ shape を 3 source (`'freePeriod'` / `'legacy'` / `'none'`) から
 * 受け取り、widget は読み口を統一できる。`source` は debug / 観測のためだけ
 * に使い、業務ロジックの分岐には使わない (両 source は parity test で同値が
 * 担保されているため)。
 *
 * - `'freePeriod'`: `FreePeriodReadModel.comparisonSummary` 由来
 * - `'legacy'`: 旧 `prevYear` / `prevYearMonthlyKpi` 由来 (bundle 未ロード時の
 *   transition fallback)
 * - `'none'`: 前年データなし (`hasPrevYear=false`)
 *
 * ## hasPrevYear のセマンティクス
 *
 * `comparisonSummary` が null (= frame.comparison が無効) または totalSales が 0
 * の場合は `hasPrevYear: false` / `source: 'none'` を返す。caller 側で
 * legacy fallback の判断に使える。
 *
 * @see projects/completed/unify-period-analysis/inventory/05-phase6-widget-consumers.md
 *
 * @responsibility R:unclassified
 */
import { z } from 'zod'
import type { FreePeriodReadModel } from './FreePeriodTypes'

/**
 * `PrevYearSummaryProjection` は application/readModels/freePeriod/ 配下の
 * read-model 境界の小契約として扱う。型だけでなく Zod schema を正本とし、
 * 全 exported selector は出力を `.parse()` で検証する
 * (AAG F9 Raw=唯一真実源 / 第9原則: 全 readXxx / calculateXxx / selectXxx
 * に Zod .parse() 強制)。
 */
export const PrevYearSummarySourceSchema = z.enum(['freePeriod', 'legacy', 'none'])
export type PrevYearSummarySource = z.infer<typeof PrevYearSummarySourceSchema>

export const PrevYearSummaryProjectionSchema = z.object({
  /** comparisonSummary が存在し、totalSales > 0 のときのみ true */
  hasPrevYear: z.boolean(),
  /** comparisonSummary.totalSales (= legacy `prevYear.totalSales` 相当) */
  totalSales: z.number(),
  /** comparisonSummary.totalCustomers (= legacy `prevYear.totalCustomers` 相当) */
  totalCustomers: z.number(),
  /** comparisonSummary.totalSales を旧命名でも公開 (= legacy `prevYearMonthlySales`) */
  prevYearMonthlySales: z.number(),
  /** どこから来た値か (debug/観測専用、業務ロジックの分岐には使わない) */
  source: PrevYearSummarySourceSchema,
})

export type PrevYearSummaryProjection = z.infer<typeof PrevYearSummaryProjectionSchema>

const NONE: PrevYearSummaryProjection = PrevYearSummaryProjectionSchema.parse({
  hasPrevYear: false,
  totalSales: 0,
  totalCustomers: 0,
  prevYearMonthlySales: 0,
  source: 'none',
})

/**
 * `FreePeriodReadModel.comparisonSummary` を「旧 prev-year summary 命名」に
 * 射影する pure selector。
 *
 * ```ts
 * const fp = selectPrevYearSummaryFromFreePeriod(ctx.freePeriodLane?.bundle.fact ?? null)
 * // fp.source === 'freePeriod' or 'none'
 * ```
 */
export function selectPrevYearSummaryFromFreePeriod(
  fact: FreePeriodReadModel | null,
): PrevYearSummaryProjection {
  const cs = fact?.comparisonSummary ?? null
  if (!cs || cs.totalSales <= 0) return NONE
  return PrevYearSummaryProjectionSchema.parse({
    hasPrevYear: true,
    totalSales: cs.totalSales,
    totalCustomers: cs.totalCustomers,
    prevYearMonthlySales: cs.totalSales,
    source: 'freePeriod',
  })
}

/**
 * 旧 `PrevYearData` / `PrevYearMonthlyKpi` から legacy fallback projection を
 * 構築する pure adapter。Step A の transition 期間中、bundle 未ロード時の
 * 安全網として使う。
 *
 * **本 adapter は唯一の `prevYear.*` / `prevYearMonthlyKpi.*` 集約点**:
 * widget 内で散らばらせず、ここで一括で wrap する。`phase6SummarySwapGuard`
 * は対象 widget でのバラ参照を禁止する。
 */
export interface LegacyPrevYearSummaryInput {
  readonly hasPrevYear: boolean
  readonly totalSales: number
  readonly totalCustomers: number
  readonly prevYearMonthlySales: number
}

export function selectPrevYearSummaryFromLegacy(
  input: LegacyPrevYearSummaryInput | null,
): PrevYearSummaryProjection {
  if (!input || !input.hasPrevYear || input.totalSales <= 0) return NONE
  return PrevYearSummaryProjectionSchema.parse({
    hasPrevYear: true,
    totalSales: input.totalSales,
    totalCustomers: input.totalCustomers,
    prevYearMonthlySales: input.prevYearMonthlySales,
    source: 'legacy',
  })
}

/**
 * 「freePeriod を優先、なければ legacy にフォールバック」を表現する composer。
 *
 * - `fp.hasPrevYear === true` → fp を返す (`source: 'freePeriod'`)
 * - それ以外 → legacy を返す (`source: 'legacy'` or `'none'`)
 *
 * widget は本関数の戻り値だけを読み、`prevYear.*` をバラで参照しない。
 */
export function preferFreePeriodPrevYearSummary(
  fp: PrevYearSummaryProjection,
  legacy: PrevYearSummaryProjection,
): PrevYearSummaryProjection {
  return fp.hasPrevYear ? fp : legacy
}
