/**
 * 比較サブシステムの共有型定義
 *
 * 「前年同曜日/同日」比較の概念を統一的に表現する型群。
 * 生産は useComparisonModule が一元的に行い、各UIは消費のみ行う。
 *
 * ## 型の階層
 *
 * PrevYearMonthlyKpi          ← 月間集計の最上位コンテナ
 *   ├── sameDow: PrevYearMonthlyKpiEntry  ← 同曜日アライメント
 *   └── sameDate: PrevYearMonthlyKpiEntry ← 同日アライメント
 *         ├── dailyMapping: DayMappingRow[]       ← 日別対応表
 *         └── storeContributions: StoreContribution[] ← 店舗×日別根拠
 *
 * PrevYearData                ← 日別比較データ（経過日数キャップ付き）
 *   └── daily: Map<DateKey, PrevYearDailyEntry>
 */
import type { DiscountEntry } from '@/domain/models'

// ── 月間 KPI 型 ──

/** 日別マッピング行: 前年の1日 → 当年の対応日 */
export interface DayMappingRow {
  /** 前年のカレンダー日（1-31） */
  readonly prevDay: number
  /** 前年の月（1-12） */
  readonly prevMonth: number
  /** 前年の年 */
  readonly prevYear: number
  /** 当年の対応日番号 */
  readonly currentDay: number
  /** 前年売上 */
  readonly prevSales: number
  /** 前年客数 */
  readonly prevCustomers: number
}

/** 店舗×日別の計算根拠 */
export interface StoreContribution {
  readonly storeId: string
  /** 前年の実日付（日番号） */
  readonly originalDay: number
  /** 当年の対応日番号 */
  readonly mappedDay: number
  readonly sales: number
  readonly customers: number
}

/** 月間 KPI エントリ（同曜日 or 同日の1アライメント分） */
export interface PrevYearMonthlyKpiEntry {
  readonly sales: number
  readonly customers: number
  readonly transactionValue: number
  /** 日別マッピング（prevDay → currentDay + 前年売上・客数） */
  readonly dailyMapping: readonly DayMappingRow[]
  /** 店舗×日別の計算根拠（Explanation の evidenceRefs 構築に使用） */
  readonly storeContributions: readonly StoreContribution[]
}

/** 月間 KPI — 同曜日 + 同日の両アライメントを持つコンテナ */
export interface PrevYearMonthlyKpi {
  readonly hasPrevYear: boolean
  /** 前年同曜日: 月間フル集計 */
  readonly sameDow: PrevYearMonthlyKpiEntry
  /** 前年同日: 月間フル集計 */
  readonly sameDate: PrevYearMonthlyKpiEntry
  /** 前年データ元の年 */
  readonly sourceYear: number
  /** 前年データ元の月 */
  readonly sourceMonth: number
  /** 同曜日オフセット (0-6) */
  readonly dowOffset: number
}

// ── 同曜日比較の表示用モデル ──

/**
 * 同曜日比較の1日分の表示用モデル。
 *
 * DayMappingRow の全情報を保持したまま、UI が必要とするキーを付加する。
 * `buildPrevSameDowMap()` のように currentDay → number に劣化させず、
 * sourceDate の出典を末端まで保持する。
 *
 * ## 構造的再発防止
 *
 * 同曜日比較の UI は必ずこの型を経由する。
 * Map<number, number> や Map<number, { sales, customers }> を直接使わない。
 */
export interface SameDowPoint {
  /** 当年の日番号（表示位置） */
  readonly currentDay: number
  /** 前年のソース日付（出典） */
  readonly sourceDate: {
    readonly year: number
    readonly month: number
    readonly day: number
  }
  /** 前年売上 */
  readonly sales: number
  /** 前年客数 */
  readonly customers: number
}

/**
 * DayMappingRow[] から SameDowPoint の Map を構築する。
 *
 * 同曜日比較の UI 入力として唯一の入口。
 * source date を保持するため、デバッグ・ツールチップ・監査で出典を追跡できる。
 */
export function buildSameDowPoints(
  dailyMapping: readonly DayMappingRow[],
): ReadonlyMap<number, SameDowPoint> {
  const map = new Map<number, SameDowPoint>()
  for (const row of dailyMapping) {
    map.set(row.currentDay, {
      currentDay: row.currentDay,
      sourceDate: {
        year: row.prevYear,
        month: row.prevMonth,
        day: row.prevDay,
      },
      sales: row.prevSales,
      customers: row.prevCustomers,
    })
  }
  return map
}

// ── 日別比較型 ──

/** 日別比較データの1エントリ */
export interface PrevYearDailyEntry {
  readonly sales: number
  readonly discount: number
  readonly customers: number
}

// ── V2 比較型（Comparison/Alignment V2） ──

/** V2 比較モード — current row ごとに比較先を日単位で解決する */
export type CompareModeV2 = 'sameDate' | 'sameDayOfWeek' | 'prevMonth'

/** 整列に必要な最小フィールド（AlignableRow の上位互換、grainKey 付き） */
export interface MatchableRow {
  readonly dateKey: string
  readonly year: number
  readonly month: number
  readonly day: number
  readonly storeId: string
  readonly sales: number
  readonly customers: number
  /** 将来の部門別・カテゴリ別拡張用 */
  readonly grainKey?: string
}

/**
 * マッチ結果ステータス
 *
 * - matched: 1:1 で比較先が見つかった
 * - missing_previous: requested date に対応するデータが存在しない
 * - missing_current: 将来の full outer 対応用（current row 主導の V2 では通常発生しない）
 * - ambiguous_previous: 同一キーに複数行が存在する（データ契約違反の表面化）
 */
export type MatchStatus = 'matched' | 'missing_previous' | 'missing_current' | 'ambiguous_previous'

/**
 * V2 canonical row — 比較先が確定済みの1行
 *
 * current row ごとに resolveComparisonRows() が生成する。
 * requestedCompareDateKey と compareDateKey を分離し、
 * 「本来はこの日を見たかったが、存在しなかった」を追跡可能にする。
 */
export interface ResolvedComparisonRow {
  readonly compareMode: CompareModeV2
  /** 安定キー（requestedCompareDateKey ベース。missing/ambiguous でも一意） */
  readonly alignmentKey: string
  readonly storeId: string
  readonly grainKey?: string
  /** 当期の日付キー (YYYY-MM-DD) */
  readonly currentDateKey: string | null
  /** ルール上の比較先日付キー（暦上の要求値） */
  readonly requestedCompareDateKey: string | null
  /** 実際にマッチした比較先日付キー（matched 時のみ値あり） */
  readonly compareDateKey: string | null
  readonly currentSales: number | null
  readonly compareSales: number | null
  readonly currentCustomers: number | null
  readonly compareCustomers: number | null
  readonly status: MatchStatus
}

/** 日別比較データ（経過日数分のキャップ付き合計を含む） */
export interface PrevYearData {
  readonly hasPrevYear: boolean
  readonly daily: ReadonlyMap<string, PrevYearDailyEntry>
  /** 経過日数分の前年同曜日売上合計 */
  readonly totalSales: number
  /** 経過日数分の前年同曜日売変合計 */
  readonly totalDiscount: number
  /** 経過日数分の前年同曜日客数合計 */
  readonly totalCustomers: number
  /** 粗売上（= totalSales + totalDiscount） */
  readonly grossSales: number
  /** 売変率（= totalDiscount / totalSales, totalSales > 0 の場合） */
  readonly discountRate: number
  /** 経過日数分の売変種別内訳合計 */
  readonly totalDiscountEntries: readonly DiscountEntry[]
}
