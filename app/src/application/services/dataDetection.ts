/**
 * データ最大日検出
 *
 * 各データソースからデータの最大日（末日）を検出する。
 * スライダーのデフォルト値やリセット時のデータ末日として使用。
 *
 * @responsibility R:unclassified
 */

/**
 * StoreDayIndex から最大日を取得
 */
export function maxDayOfRecord(
  record: { readonly [storeId: string]: { readonly [day: number]: unknown } } | null | undefined,
): number {
  if (!record || typeof record !== 'object') return 0
  let max = 0
  for (const storeId of Object.keys(record)) {
    const days = record[storeId]
    if (!days || typeof days !== 'object') continue
    for (const dayStr of Object.keys(days)) {
      const d = Number(dayStr)
      if (d > max) max = d
    }
  }
  return max
}

/** flat record 配列から最大日を取得 */
export function maxDayOfFlatRecords(records: readonly { readonly day: number }[]): number {
  let max = 0
  for (const r of records) {
    if (r.day > max) max = r.day
  }
  return max
}

/**
 * 予算・消耗品以外の取込データ（販売金額データ）の最大日を検出する。
 * スライダーのデフォルト値やリセット時のデータ末日として使用。
 * 消耗品は売上とは異なる期間のデータが入る場合があるため除外する。
 */
export function detectDataMaxDay(data: {
  readonly purchase: { readonly records: readonly { readonly day: number }[] }
  readonly classifiedSales: { readonly records: readonly { readonly day: number }[] }
  readonly interStoreIn: { readonly records: readonly { readonly day: number }[] }
  readonly interStoreOut: { readonly records: readonly { readonly day: number }[] }
  readonly flowers: { readonly records: readonly { readonly day: number }[] }
  readonly directProduce: { readonly records: readonly { readonly day: number }[] }
}): number {
  return Math.max(
    0,
    maxDayOfFlatRecords(data.purchase.records),
    maxDayOfFlatRecords(data.classifiedSales.records),
    maxDayOfFlatRecords(data.interStoreIn.records),
    maxDayOfFlatRecords(data.interStoreOut.records),
    maxDayOfFlatRecords(data.flowers.records),
    maxDayOfFlatRecords(data.directProduce.records),
  )
}
