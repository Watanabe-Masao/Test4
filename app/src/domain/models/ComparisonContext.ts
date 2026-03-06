/**
 * 曜日ギャップ分析の型定義（ドメイン層）
 *
 * DowDayCount と DowGapAnalysis は純粋なドメイン概念。
 * PeriodSnapshot / ComparisonContext は PeriodMetrics に依存するため
 * application 層に配置する。
 */

// ── 曜日ギャップ分析 ──

/** 曜日ごとの日数カウント (0=日, 1=月, ..., 6=土) */
export interface DowDayCount {
  readonly dow: number
  readonly label: string
  readonly currentCount: number
  readonly previousCount: number
  /** 差分 (当年 - 前年)。正 = 当年が多い */
  readonly diff: number
}

/**
 * 曜日ギャップ分析
 *
 * 前年同曜日と前年同日の差は曜日構成の違いに起因する。
 * 各曜日の日数差 × 前年の曜日別日平均売上 で影響額を見積もる。
 */
export interface DowGapAnalysis {
  /** 曜日別の日数比較 (7要素: 日〜土) */
  readonly dowCounts: readonly DowDayCount[]
  /** 曜日ギャップによる推定影響額（前年の曜日別日平均売上ベース） */
  readonly estimatedImpact: number
  /** 分析が有効か（データ不足なら false、値は 0） */
  readonly isValid: boolean
  /** 前年の曜日別日平均売上 (7要素: 日〜土)。曜日別データがない場合は全体平均で埋める */
  readonly prevDowDailyAvg: readonly number[]
}
