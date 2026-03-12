/**
 * データ駆動型除数計算（平均の種類管理）
 *
 * 全ての平均計算はこのモジュールの AverageMode と
 * computeAverageDivisor / computeActiveDowDivisorMap を使用する。
 */

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
