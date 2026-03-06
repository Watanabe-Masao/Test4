/**
 * 安全な数値変換（null/undefined/NaN → 0）
 */
export function safeNumber(n: unknown): number {
  if (n == null) return 0
  const num = Number(n)
  return isNaN(num) ? 0 : num
}

/**
 * 安全な除算（ゼロ除算防止）
 */
export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  return denominator !== 0 ? numerator / denominator : fallback
}

/**
 * 金額フォーマット（四捨五入 → カンマ区切り）
 */
export function formatCurrency(n: number | null): string {
  if (n == null || isNaN(n)) return '-'
  return Math.round(n).toLocaleString('ja-JP')
}

/**
 * 万円表示フォーマット
 */
export function formatManYen(n: number | null): string {
  if (n == null || isNaN(n)) return '-'
  const manYen = Math.round(n / 10_000)
  return `${manYen > 0 ? '+' : ''}${manYen}万円`
}

/**
 * パーセント表示フォーマット
 */
export function formatPercent(n: number | null, decimals = 2): string {
  if (n == null || isNaN(n)) return '-'
  return (n * 100).toFixed(decimals) + '%'
}

/**
 * ポイント差表示フォーマット
 */
export function formatPointDiff(n: number | null, decimals = 1): string {
  if (n == null || isNaN(n)) return '-'
  const pt = n * 100
  return `${pt > 0 ? '+' : ''}${pt.toFixed(decimals)}pt`
}

/**
 * 客単価（1客あたり売上）を計算する
 */
export function calculateTransactionValue(sales: number, customers: number): number {
  return Math.round(safeDivide(sales, customers, 0))
}

/**
 * PI値（一人当たり点数）= 総点数 ÷ 来店客数
 * decompose3 の Q に相当: S = C × Q × P̄
 */
export function calculateItemsPerCustomer(totalQty: number, customers: number): number {
  return safeDivide(totalQty, customers, 0)
}

/**
 * 点単価（1点あたり売上）= 総売上 ÷ 総点数
 * decompose3 の P̄ に相当: S = C × Q × P̄
 */
export function calculateAveragePricePerItem(sales: number, totalQty: number): number {
  return safeDivide(sales, totalQty, 0)
}

/**
 * 移動平均を計算する
 * @param values 値の配列
 * @param window ウィンドウサイズ
 * @returns 各位置の移動平均（先頭 window-1 個は NaN）
 */
export function calculateMovingAverage(values: readonly number[], window: number): number[] {
  return values.map((_, i) => {
    if (i < window - 1) return NaN
    let sum = 0
    for (let j = i - window + 1; j <= i; j++) sum += values[j]
    return sum / window
  })
}

/**
 * 在庫法粗利率（実績）が利用可能ならそれを、なければ推定法マージン率を返す。
 * 在庫法は実際の在庫差から算出するため信頼度が高い。推定法は値入率から推定するため
 * 在庫法が利用できない場合のフォールバックとして使う。
 */
export function getEffectiveGrossProfitRate(result: {
  readonly invMethodGrossProfitRate: number | null
  readonly estMethodMarginRate: number
}): number {
  return result.invMethodGrossProfitRate ?? result.estMethodMarginRate
}

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

/**
 * 予算・消耗品以外の取込データ（販売金額データ）の最大日を検出する。
 * スライダーのデフォルト値やリセット時のデータ末日として使用。
 * 消耗品は売上とは異なる期間のデータが入る場合があるため除外する。
 */
/* ── データ駆動型除数計算（平均の種類管理） ───────────── */

/**
 * 集計モード
 *
 * 全ての平均計算はこの3種類のいずれかに分類される。
 * 新しい平均計算を追加する場合は必ずこの型を使い、
 * computeAverageDivisor で除数を算出すること。
 *
 * - `total`: 合計値をそのまま表示。除数は常に 1。
 * - `dailyAvg`: 実績データが存在する全日数で除算。
 *   曜日フィルタが指定されていれば、該当曜日の実データ日数のみをカウント。
 * - `dowAvg`: 各曜日ごとに異なる除数を使う。
 *   ヒートマップ等、曜日×時間帯の交差分析で使用。
 *   computeAverageDivisor ではなく computeActiveDowDivisorMap を使用。
 */
export type AverageMode = 'total' | 'dailyAvg' | 'dowAvg'

/**
 * 平均計算の文脈を表す型。
 *
 * 「何のデータの、どの範囲を、どのモードで平均するか」を構造体として保持する。
 * これを computeAverageDivisor に渡すことで、モードに応じた正しい除数を得る。
 */
export interface AveragingContext {
  /** 集計モード */
  readonly mode: AverageMode
  /** 実績が存在する日番号（例: DailyRecord Map の keys, Set<number> 等） */
  readonly activeDays: Iterable<number>
  /** 年（曜日計算用） */
  readonly year: number
  /** 月 1-12（曜日計算用） */
  readonly month: number
  /** 曜日フィルタ（0=日〜6=土）。指定時は dailyAvg モードで該当曜日のみカウント */
  readonly dowFilter?: readonly number[]
}

/**
 * 平均モードと文脈に応じた正しい除数を返す。
 *
 * 全ての平均計算でこの関数を通じて除数を取得すること。
 * 手動で日数をカウントしたり、daysInMonth で割ったりしてはならない。
 *
 * 不変条件:
 *   - 返り値は常に >= 1（0除算防止保証）
 *   - mode === 'total' → 必ず 1
 *   - mode === 'dailyAvg' + dowFilter → 該当曜日の営業日数
 *   - mode === 'dailyAvg' + dowFilter なし → 全営業日数
 */
export function computeAverageDivisor(ctx: AveragingContext): number {
  if (ctx.mode === 'total') return 1

  const hasDowFilter = ctx.dowFilter && ctx.dowFilter.length > 0
  if (hasDowFilter) {
    const dowSet = new Set(ctx.dowFilter)
    let count = 0
    for (const day of ctx.activeDays) {
      const dow = new Date(ctx.year, ctx.month - 1, day).getDay()
      if (dowSet.has(dow)) count++
    }
    return count > 0 ? count : 1
  }

  // フィルタなし: 全アクティブ日数
  const activeDaysArray = Array.isArray(ctx.activeDays) ? ctx.activeDays : [...ctx.activeDays]
  const count = activeDaysArray.length
  return count > 0 ? count : 1
}

/**
 * 曜日ごとの除数マップを営業日ベースで算出する。
 *
 * dowAvg モード専用。各曜日の実データ日数を Map で返す。
 * ヒートマップ等で曜日ごとに異なる除数を適用する場合に使用。
 *
 * @returns Map<曜日(0=日〜6=土), 実データ日数>（各値 >= 1）
 */
export function computeActiveDowDivisorMap(
  activeDays: Iterable<number>,
  year: number,
  month: number,
): Map<number, number> {
  const dowDays = new Map<number, number>()
  for (const day of activeDays) {
    const dow = new Date(year, month - 1, day).getDay()
    dowDays.set(dow, (dowDays.get(dow) ?? 0) + 1)
  }
  // >= 1 保証
  for (const [dow, count] of dowDays) {
    if (count <= 0) dowDays.set(dow, 1)
  }
  return dowDays
}

/** flat record 配列から最大日を取得 */
function maxDayOfFlatRecords(records: readonly { readonly day: number }[]): number {
  let max = 0
  for (const r of records) {
    if (r.day > max) max = r.day
  }
  return max
}

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
