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
 *   └── daily: Map<day, PrevYearDailyEntry>
 */
import type { DiscountEntry } from '@/domain/models'

// ── 月間 KPI 型 ──

/** 日別マッピング行: 前年の1日 → 当年の対応日 */
export interface DayMappingRow {
  /** 前年の日番号 */
  readonly prevDay: number
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

// ── 日別比較型 ──

/** 日別比較データの1エントリ */
export interface PrevYearDailyEntry {
  readonly sales: number
  readonly discount: number
  readonly customers: number
}

/** 日別比較データ（経過日数分のキャップ付き合計を含む） */
export interface PrevYearData {
  readonly hasPrevYear: boolean
  readonly daily: ReadonlyMap<number, PrevYearDailyEntry>
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
