/**
 * 比較コンテキスト型定義（Application 層）
 *
 * PeriodMetrics に依存するため domain 層ではなく application 層に配置する。
 * DowDayCount / DowGapAnalysis は純粋なドメイン概念として domain 層に残る。
 *
 * ## 設計原則
 *
 * - 上の層がデータをリクエストする際に `if` チェック不要
 * - データが無い場合はゼロ値 + hasData: false（null/undefined を返さない）
 * - ヘッダ期間（期中の 3/1〜3/5 等）に関係なく月間全体の比較を提供
 *
 * @responsibility R:unclassified
 */
import type { PeriodMetrics } from '@/application/usecases/calculation/periodMetricsCalculator'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'

// ── 期間スナップショット ──

/**
 * 期間スナップショット — 1期間分のメトリクス + メタ情報
 *
 * データ有無は hasData で判別。hasData === false のとき metrics はゼロ値。
 * コンシューマーは null チェック不要で metrics に直接アクセスできる。
 */
export interface PeriodSnapshot {
  /** メトリクスデータ（hasData: false ならゼロ値） */
  readonly metrics: PeriodMetrics
  /** データが存在するか */
  readonly hasData: boolean
  /** この期間の年 */
  readonly year: number
  /** この期間の月 */
  readonly month: number
}

// ── 比較コンテキスト ──

/**
 * 比較コンテキスト — 月間全体の3期間比較 + 曜日ギャップ
 *
 * ヘッダの表示期間に関係なく、対象月の月間データを提供する。
 * KPI カードでの利用を想定:
 *   - 前年同曜日月間売上
 *   - 前年同日月間売上
 *   - 曜日ギャップ推定影響額
 *
 * コンシューマーは全フィールドに直接アクセスでき、null チェック不要。
 */
export interface ComparisonContext {
  /** 当年月間メトリクス */
  readonly current: PeriodSnapshot
  /** 前年同曜日寄せ月間メトリクス */
  readonly sameDow: PeriodSnapshot
  /** 前年同日付月間メトリクス */
  readonly sameDate: PeriodSnapshot
  /** 曜日ギャップ分析 */
  readonly dowGap: DowGapAnalysis
  /** コンテキスト全体が読み込み完了しているか */
  readonly isReady: boolean
}
