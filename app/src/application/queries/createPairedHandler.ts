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
import type { PairedQueryInput, PairedQueryOutput } from './PairedQueryContract'

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
  base: QueryHandler<TBase & { readonly isPrevYear?: boolean }, TOutput>,
  options?: { readonly name?: string },
): QueryHandler<PairedInput<TBase>, PairedQueryOutput<TOutput>> {
  return {
    name: options?.name ?? `${base.name}Pair`,
    async execute(
      conn: AsyncDuckDBConnection,
      input: PairedInput<TBase>,
    ): Promise<PairedQueryOutput<TOutput>> {
      const { comparisonDateFrom, comparisonDateTo, ...rest } = input

      // current 側: isPrevYear = false
      const currentInput = { ...rest, isPrevYear: false } as TBase & {
        readonly isPrevYear?: boolean
      }
      const currentPromise = base.execute(conn, currentInput)

      // comparison 側: comparisonDateFrom/To が指定された場合のみ実行
      const comparisonPromise =
        comparisonDateFrom && comparisonDateTo
          ? base.execute(conn, {
              ...rest,
              dateFrom: comparisonDateFrom,
              dateTo: comparisonDateTo,
              isPrevYear: true,
            } as TBase & { readonly isPrevYear?: boolean })
          : Promise.resolve(null)

      const [current, comparison] = await Promise.all([currentPromise, comparisonPromise])

      return { current, comparison }
    },
  }
}
