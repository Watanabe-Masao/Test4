/**
 * ComparisonScope — 比較サブシステムの中核モデル
 *
 * PeriodSelection から比較に必要なすべての情報を導出する。
 * 比較日付の唯一の真実源として、JS集計・DuckDBクエリの両方がこのモデルを参照する。
 *
 * ## 設計原則
 *
 * - 比較の基準は periodSelection.period2 のみ。settings は参照しない
 * - 日付処理は実日付ベースの対応表（alignmentMap）で行う
 * - day番号操作（origDay - offset）を廃止し、sourceDate → targetDate の明示的対応
 * - 月跨ぎ・2月末・leap year をすべて Date 演算で吸収
 * - queryRanges で読込範囲と表示範囲を分離
 */
import type { CalendarDate, DateRange } from './CalendarDate'
import { toDateKey } from './CalendarDate'
import type { ComparisonFrame } from './ComparisonFrame'
import type { ComparisonPreset, PeriodSelection } from './PeriodSelection'
import { deriveDowOffset } from './PeriodSelection'
import { MILLISECONDS_PER_DAY, DOW_ALIGNMENT_WINDOW } from '@/domain/constants'

// ── 型定義 ──

/** 日付対応表のエントリ — 比較期の1日と当期の1日の対応 */
export interface AlignmentEntry {
  /** 比較期の実日付 */
  readonly sourceDate: CalendarDate
  /** 当期の対応日付 */
  readonly targetDate: CalendarDate
  /** 比較期の日付キー (YYYY-MM-DD) */
  readonly sourceDayKey: string
  /** 当期の日付キー (YYYY-MM-DD) */
  readonly targetDayKey: string
}

/** 比較のアライメントモード */
export type AlignmentMode = 'sameDate' | 'sameDayOfWeek'

/** 読込対象月 */
export interface QueryMonth {
  readonly year: number
  readonly month: number
}

/**
 * ComparisonScope — 全比較ロジックの入力を統一する中核モデル
 *
 * buildComparisonScope() が唯一の生成元。
 * JS集計・DuckDBクエリ・Explanation・UI表示のすべてがこのモデルを参照する。
 */
export interface ComparisonScope {
  /** 当期 */
  readonly period1: DateRange
  /** 比較期 */
  readonly period2: DateRange
  /** 適用中のプリセット */
  readonly preset: ComparisonPreset
  /** アライメントモード */
  readonly alignmentMode: AlignmentMode
  /** 同曜日オフセット (0-6)。sameDate なら 0 */
  readonly dowOffset: number
  /** 当期のうち実データが存在する範囲（elapsedDays で cap） */
  readonly effectivePeriod1: DateRange
  /** 比較期のうち実データ取得対象の範囲（offset + cap 調整済み） */
  readonly effectivePeriod2: DateRange
  /** IndexedDB から読み込む月の集合（±1ヶ月拡張済み） */
  readonly queryRanges: readonly QueryMonth[]
  /** 日付対応表 — 全集計・全クエリはこれを参照 */
  readonly alignmentMap: readonly AlignmentEntry[]
  /**
   * データロード・集計の基準月（alignmentMap のソース日付から導出）。
   *
   * findSourceMonth(queryRanges) の中央値ベースでは sameDayOfWeek 時に
   * 月跨ぎで誤った月を選択するバグがあったため、alignmentMap の最頻月を使う。
   */
  readonly sourceMonth: QueryMonth
}

// ── ユーティリティ（内部用） ──

/** CalendarDate を Date オブジェクトに変換 */
function toDate(cd: CalendarDate): Date {
  return new Date(cd.year, cd.month - 1, cd.day)
}

/** Date オブジェクトを CalendarDate に変換 */
function fromDate(d: Date): CalendarDate {
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  }
}

/** 2つの Date 間の日数差（inclusive で使う場合は +1 する側で調整） */
function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MILLISECONDS_PER_DAY)
}

/** 月を含む QueryMonth 集合を作る（period の from〜to が含む月 ±1 ヶ月） */
function buildQueryRanges(period: DateRange): QueryMonth[] {
  const months: QueryMonth[] = []
  const seen = new Set<string>()

  const addMonth = (y: number, m: number) => {
    const key = `${y}-${m}`
    if (!seen.has(key)) {
      seen.add(key)
      months.push({ year: y, month: m })
    }
  }

  // period が含む月をすべて追加
  const cur = new Date(period.from.year, period.from.month - 1, 1)
  const end = new Date(period.to.year, period.to.month - 1, 1)
  while (cur <= end) {
    addMonth(cur.getFullYear(), cur.getMonth() + 1)
    cur.setMonth(cur.getMonth() + 1)
  }

  // 前後 ±1 ヶ月を追加（OVERFLOW_DAYS 対応）
  const fromPrev = new Date(period.from.year, period.from.month - 2, 1)
  addMonth(fromPrev.getFullYear(), fromPrev.getMonth() + 1)
  const toNext = new Date(period.to.year, period.to.month, 1)
  addMonth(toNext.getFullYear(), toNext.getMonth() + 1)

  return months.sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))
}

/** effectivePeriod1 を算出（elapsedDays で cap） */
function buildEffectivePeriod1(period1: DateRange, elapsedDays?: number): DateRange {
  if (elapsedDays == null || elapsedDays <= 0) return period1

  const fromDate_ = toDate(period1.from)
  const toDate_ = toDate(period1.to)
  const totalDays = daysBetween(fromDate_, toDate_) + 1

  if (elapsedDays >= totalDays) return period1

  // from から elapsedDays 日目まで
  const cappedTo = new Date(fromDate_.getTime())
  cappedTo.setDate(cappedTo.getDate() + elapsedDays - 1)
  return {
    from: period1.from,
    to: fromDate(cappedTo),
  }
}

/**
 * sameDayOfWeek 用: 前年同日を anchor として ±7日から同曜日最近傍を選択
 *
 * comparisonRules.ts の resolveSameDayOfWeekDateKey と同一アルゴリズム。
 * domain 層内で完結させるため独立実装。
 *
 * 1. anchor = new Date(year - 1, month - 1, day)（Date 正規化に従う）
 * 2. 候補 = anchor ±7日（15日間）
 * 3. フィルタ = targetDate と同じ曜日
 * 4. ソート = anchor からの距離昇順、同距離なら未来側優先
 * 5. 先頭を採用
 */
function resolveSameDowSource(targetDate: Date): Date {
  const anchor = new Date(targetDate.getFullYear() - 1, targetDate.getMonth(), targetDate.getDate())
  const targetDow = targetDate.getDay()

  let bestCandidate = anchor
  let bestDist = Infinity

  for (let diff = -DOW_ALIGNMENT_WINDOW; diff <= DOW_ALIGNMENT_WINDOW; diff++) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + diff)
    if (d.getDay() !== targetDow) continue

    const dist = Math.abs(d.getTime() - anchor.getTime())
    if (dist < bestDist || (dist === bestDist && d.getTime() >= anchor.getTime())) {
      bestDist = dist
      bestCandidate = d
    }
  }

  return bestCandidate
}

/**
 * 日付対応表を構築する。
 *
 * effectivePeriod1 の各日に対して、比較期の対応日を 1:1 で算出する。
 *
 * - sameDate / prevMonth: period2.from + dayIndex の位置ベースマッピング
 * - sameDayOfWeek: 各日ごとに前年同日 anchor ±7日から同曜日最近傍を選択
 *
 * 月跨ぎ・2月末・leap year をすべて Date 演算で吸収する。
 */
function buildAlignmentMap(
  effectivePeriod1: DateRange,
  period2: DateRange,
  alignmentMode: AlignmentMode,
): AlignmentEntry[] {
  const entries: AlignmentEntry[] = []
  const p1From = toDate(effectivePeriod1.from)
  const p1To = toDate(effectivePeriod1.to)
  const p2From = toDate(period2.from)

  const p1Cur = new Date(p1From.getTime())
  let dayIndex = 0

  while (p1Cur <= p1To) {
    let sourceDateObj: Date

    if (alignmentMode === 'sameDayOfWeek') {
      // per-day DOW resolution: 前年同日 anchor ±7日から同曜日最近傍
      sourceDateObj = resolveSameDowSource(p1Cur)
    } else {
      // 位置ベースマッピング: period2.from + dayIndex
      sourceDateObj = new Date(p2From.getTime())
      sourceDateObj.setDate(sourceDateObj.getDate() + dayIndex)
    }

    const targetDate = fromDate(p1Cur)
    const sourceDate = fromDate(sourceDateObj)

    entries.push({
      sourceDate,
      targetDate,
      sourceDayKey: toDateKey(sourceDate),
      targetDayKey: toDateKey(targetDate),
    })

    p1Cur.setDate(p1Cur.getDate() + 1)
    dayIndex++
  }

  return entries
}

/**
 * alignmentMap のソース日付から最頻月を導出する。
 *
 * findSourceMonth(queryRanges) の中央値ベースでは、sameDayOfWeek 時に
 * effectivePeriod2 が月跨ぎすると queryRanges の要素数が偶数になり、
 * 中央が翌月側にずれて誤った月をデータロード基準に選んでしまう。
 * alignmentMap のソース日付をカウントして最頻月を使うことでこれを防ぐ。
 */
function deriveSourceMonth(alignmentMap: readonly AlignmentEntry[]): QueryMonth {
  if (alignmentMap.length === 0) {
    return { year: 0, month: 1 }
  }

  const counts = new Map<string, { count: number; year: number; month: number }>()
  for (const entry of alignmentMap) {
    const key = `${entry.sourceDate.year}-${entry.sourceDate.month}`
    const existing = counts.get(key)
    if (existing) {
      existing.count++
    } else {
      counts.set(key, { count: 1, year: entry.sourceDate.year, month: entry.sourceDate.month })
    }
  }

  let best: { count: number; year: number; month: number } = { count: 0, year: 0, month: 1 }
  for (const v of counts.values()) {
    if (v.count > best.count) best = v
  }
  return { year: best.year, month: best.month }
}

/** effectivePeriod2 を alignmentMap から導出 */
function deriveEffectivePeriod2(alignmentMap: readonly AlignmentEntry[]): DateRange | null {
  if (alignmentMap.length === 0) return null

  let minDate = alignmentMap[0].sourceDate
  let maxDate = alignmentMap[0].sourceDate

  for (const entry of alignmentMap) {
    const sd = entry.sourceDate
    if (
      sd.year < minDate.year ||
      (sd.year === minDate.year && sd.month < minDate.month) ||
      (sd.year === minDate.year && sd.month === minDate.month && sd.day < minDate.day)
    ) {
      minDate = sd
    }
    if (
      sd.year > maxDate.year ||
      (sd.year === maxDate.year && sd.month > maxDate.month) ||
      (sd.year === maxDate.year && sd.month === maxDate.month && sd.day > maxDate.day)
    ) {
      maxDate = sd
    }
  }

  return { from: minDate, to: maxDate }
}

// ── ファクトリ ──

/**
 * PeriodSelection から ComparisonScope を構築する。
 *
 * 比較に必要な全情報を一度に導出する唯一の生成関数。
 * JS集計・DuckDBクエリ・Explanation のすべてがこの結果を参照する。
 *
 * @param selection 期間選択状態（source of truth）
 * @param elapsedDays 当期の経過日数（データ可用性による上限）
 */
export function buildComparisonScope(
  selection: PeriodSelection,
  elapsedDays?: number,
): ComparisonScope {
  const { period1, period2, activePreset } = selection
  const dowOffset = deriveDowOffset(period1, activePreset)
  const alignmentMode: AlignmentMode =
    activePreset === 'prevYearSameDow' ? 'sameDayOfWeek' : 'sameDate'

  const effectivePeriod1 = buildEffectivePeriod1(period1, elapsedDays)

  // 日付対応表を構築
  const alignmentMap = buildAlignmentMap(effectivePeriod1, period2, alignmentMode)

  // effectivePeriod2 は alignmentMap のソース日付から導出
  const derivedP2 = deriveEffectivePeriod2(alignmentMap)
  const effectivePeriod2 = derivedP2 ?? period2

  // 読込対象月は effectivePeriod2（実際に必要な月 ± 1）
  const queryRanges = buildQueryRanges(effectivePeriod2)

  // データロード・集計の基準月を alignmentMap の最頻月から導出
  const sourceMonth = deriveSourceMonth(alignmentMap)

  return {
    period1,
    period2,
    preset: activePreset,
    alignmentMode,
    dowOffset,
    effectivePeriod1,
    effectivePeriod2,
    queryRanges,
    alignmentMap,
    sourceMonth,
  }
}

// ── 公開ユーティリティ ──

/**
 * 当年の日付に対応する前年の比較日を解決する。
 *
 * ComparisonFrame の policy に基づいて:
 * - sameDate: 単純に year-1（2月末/leap year は Date 正規化で吸収）
 * - sameDayOfWeek: 前年同日 anchor ±7日から同曜日最近傍を選択
 *
 * alignmentMap と同一のアルゴリズム（resolveSameDowSource）を使用し、
 * 個別の日に対して一貫した前年日付を返す。
 *
 * これにより presentation/ が独自の前年日付計算を行う必要がなくなる。
 */
export function resolvePrevDate(
  frame: Pick<ComparisonFrame, 'policy'>,
  currentDate: CalendarDate,
): CalendarDate {
  const cur = toDate(currentDate)

  if (frame.policy === 'sameDayOfWeek') {
    return fromDate(resolveSameDowSource(cur))
  }

  // sameDate: 単純に year-1
  const prev = new Date(cur.getFullYear() - 1, cur.getMonth(), cur.getDate())
  return fromDate(prev)
}
