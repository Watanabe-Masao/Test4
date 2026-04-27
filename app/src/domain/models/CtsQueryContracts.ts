/**
 * CTS（Category Time Sales）クエリ結果の契約型
 *
 * @layer Domain — 取得対象の契約定義（A4）
 *
 * infrastructure/duckdb がこれらの型に合致するデータを返す。
 * application/presentation はこの型を通じてデータを受け取る。
 *
 * @responsibility R:unclassified
 */

/** 時間帯別集約行 */
export interface HourlyAggregationRow {
  readonly hour: number
  readonly totalAmount: number
  readonly totalQuantity: number
}
