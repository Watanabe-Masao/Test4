/**
 * createPairedHandler — 既存の単発 handler を pair 化するファクトリ
 *
 * 同型 current/comparison に限定する。alignment が特殊なもの
 * （日付アライメント、累計比較等）は専用 pair handler を書くこと。
 *
 * @invariant INV-RUN-02 Comparison Integrity
 * @see references/01-principles/safe-performance-principles.md
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { QueryHandler, BaseQueryInput } from './QueryContract'
import type { PairedQueryInput, PairedQueryOutput, PairedQueryHandler } from './PairedQueryContract'
import { type PrevYearFlag, CURRENT_SCOPE, COMPARISON_SCOPE } from './comparisonQueryScope'

/** pair 化された handler の入力型 */
export type PairedInput<TBase extends BaseQueryInput> = TBase & PairedQueryInput

/**
 * 既存の単発 handler を pair 化する。
 *
 * - current: base の dateFrom/dateTo で実行
 * - comparison: comparisonDateFrom/To が指定された場合のみ実行
 * - 両方を Promise.all で並列実行
 *
 * 運用ルール:
 * - 同型 current/comparison のみ。alignment が特殊なものは専用 handler
 * - DailyQuantityPairHandler は既存実装を維持（alignPrevYearDay があるため）
 */
export function createPairedHandler<TBase extends BaseQueryInput, TOutput>(
  base: QueryHandler<TBase & { readonly isPrevYear?: PrevYearFlag }, TOutput>,
  options?: { readonly name?: string },
): PairedQueryHandler<PairedInput<TBase>, TOutput> {
  return {
    name: options?.name ?? `${base.name}Pair`,
    baseName: base.name,
    async execute(
      conn: AsyncDuckDBConnection,
      input: PairedInput<TBase>,
    ): Promise<PairedQueryOutput<TOutput>> {
      const { comparisonDateFrom, comparisonDateTo, ...rest } = input

      // DEBUG: paired handler の入力をログ
      const handlerName = options?.name ?? `${base.name}Pair`
      console.debug(`[${handlerName}] execute:`, {
        dateFrom: (rest as Record<string, unknown>).dateFrom,
        dateTo: (rest as Record<string, unknown>).dateTo,
        comparisonDateFrom: comparisonDateFrom ?? '(none)',
        comparisonDateTo: comparisonDateTo ?? '(none)',
        willRunComparison: !!(comparisonDateFrom && comparisonDateTo),
      })

      // current 側
      const currentInput = { ...rest, isPrevYear: CURRENT_SCOPE } as TBase & {
        readonly isPrevYear?: PrevYearFlag
      }
      const currentPromise = base.execute(conn, currentInput)

      // comparison 側: comparisonDateFrom/To が指定された場合のみ実行
      const comparisonPromise =
        comparisonDateFrom && comparisonDateTo
          ? base.execute(conn, {
              ...rest,
              dateFrom: comparisonDateFrom,
              dateTo: comparisonDateTo,
              isPrevYear: COMPARISON_SCOPE,
            } as TBase & { readonly isPrevYear?: PrevYearFlag })
          : Promise.resolve(null)

      const [current, comparison] = await Promise.all([currentPromise, comparisonPromise])

      // DEBUG: paired handler の結果をログ
      console.debug(`[${handlerName}] result:`, {
        currentIsNull: current == null,
        comparisonIsNull: comparison == null,
      })

      return { current, comparison }
    },
  }
}
