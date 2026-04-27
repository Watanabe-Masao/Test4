/**
 * 曜日ギャップ分析の型定義（ドメイン層）
 *
 * DowDayCount と DowGapAnalysis は純粋なドメイン概念。
 * PeriodSnapshot / ComparisonContext は PeriodMetrics に依存するため
 * application 層に配置する。
 *
 * @responsibility R:unclassified
 */

// ── 曜日ギャップ分析 ──

/** 曜日平均の算出手法 */
export type DowGapMethod = 'mean' | 'median' | 'adjustedMean'

/** 曜日ごとの日数カウント (0=日, 1=月, ..., 6=土) */
export interface DowDayCount {
  readonly dow: number
  readonly label: string
  readonly currentCount: number
  readonly previousCount: number
  /** 差分 (当年 - 前年)。正 = 当年が多い */
  readonly diff: number
}

/** 手法別の曜日ギャップ推定結果 */
export interface DowMethodResult {
  /** 売上影響額 = Σ(diff[dow] × dowAvgSales[dow]) */
  readonly salesImpact: number
  /** 客数影響 = Σ(diff[dow] × dowAvgCustomers[dow]) */
  readonly customerImpact: number
  /** 曜日別の日平均売上 (7要素) */
  readonly dowAvgSales: readonly number[]
  /** 曜日別の日平均客数 (7要素) */
  readonly dowAvgCustomers: readonly number[]
}

/** 曜日別の統計情報（UI表示・手法選択の判断材料用） */
export interface DowStatistics {
  /** 平均 */
  readonly mean: number
  /** 中央値 */
  readonly median: number
  /** 調整平均（外れ値除外） */
  readonly adjustedMean: number
  /** 変動係数 (coefficient of variation) */
  readonly cv: number
  /** データ件数 */
  readonly n: number
}

/**
 * 曜日ギャップ分析
 *
 * 前年同曜日と前年同日の差は曜日構成の違いに起因する。
 * 各曜日の日数差 × 前年の曜日別日平均売上 で影響額を見積もる。
 *
 * 3つの手法を提供:
 *   - mean: 単純平均（従来方式）
 *   - median: 中央値（外れ値に強い）
 *   - adjustedMean: 調整平均（z-score > 2σ の外れ値を除外）
 */
export interface DowGapAnalysis {
  /** 曜日別の日数比較 (7要素: 日〜土) */
  readonly dowCounts: readonly DowDayCount[]
  /** 曜日ギャップによる推定影響額（前年の曜日別日平均売上ベース、mean 手法） */
  readonly estimatedImpact: number
  /** 分析が有効か（データ不足なら false、値は 0） */
  readonly isValid: boolean
  /** 前年の曜日別日平均売上 (7要素: 日〜土)。曜日別データがない場合は全体平均で埋める */
  readonly prevDowDailyAvg: readonly number[]
  /** 前年の曜日別日平均客数 (7要素: 日〜土) */
  readonly prevDowDailyAvgCustomers: readonly number[]
  /** 手法別の推定結果。undefined = 日次データ未提供（後方互換） */
  readonly methodResults?: Readonly<Record<DowGapMethod, DowMethodResult>>
  /** 曜日別の統計情報（売上）。undefined = 日次データ未提供 */
  readonly dowSalesStats?: readonly DowStatistics[]
  /** 曜日別の統計情報（客数）。undefined = 日次データ未提供 */
  readonly dowCustomerStats?: readonly DowStatistics[]
  /** 実日法: 同曜日/同日マッピング差分から算出した影響額。undefined = 未算出 */
  readonly actualDayImpact?: ActualDayImpact
  /** 前年の曜日別売上データが提供されているか（false = 全体平均で代替） */
  readonly hasPrevDowSales: boolean
  /** 曜日構成が同一か（全曜日の日数差が0） */
  readonly isSameStructure: boolean
  /** 不足データの説明（バリデーション用） */
  readonly missingDataWarnings: readonly string[]
}

/** 実日法による曜日ギャップ分析: マッピング境界日の実売上ベース */
export interface ActualDayImpact {
  /** 実日ベースの推定影響額 = Σ(shiftedIn の売上) - Σ(shiftedOut の売上) */
  readonly estimatedImpact: number
  /** 実日ベースの客数影響 = Σ(shiftedIn の客数) - Σ(shiftedOut の客数) */
  readonly customerImpact: number
  /** 同曜日マッピングで加わった日（同日にはない前年日） */
  readonly shiftedIn: readonly ShiftedDay[]
  /** 同曜日マッピングで失われた日（同日にはあるが同曜日にない前年日） */
  readonly shiftedOut: readonly ShiftedDay[]
  /** 分析が有効か（マッピングデータ不足なら false） */
  readonly isValid: boolean
}

/** マッピング境界で加わった/失われた1日分のデータ */
export interface ShiftedDay {
  /** 前年の日番号 */
  readonly prevDay: number
  /** 前年の月 */
  readonly prevMonth: number
  /** 前年の年 */
  readonly prevYear: number
  /** 曜日 (0=日, ..., 6=土) */
  readonly dow: number
  /** 曜日ラベル */
  readonly label: string
  /** 前年の実売上 */
  readonly prevSales: number
  /** 前年の実客数 */
  readonly prevCustomers: number
}
